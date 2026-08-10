import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric } from '@/lib/models/ClinicalData';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

const DEFAULT_VITALS = {
  heartRate: 75,
  weight: 70,
  height: null,
  bp: "120/80",
  spO2: 98,
  description: "No recent records found",
};

export async function GET() {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    // Postgres-native accounts have no Mongo identity (see
    // lib/utils/mongoId.ts) — Anthropometric is still Mongo-only, so they
    // genuinely have no vitals recorded rather than a lookup failure.
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(DEFAULT_VITALS);
    }

    const latest = await Anthropometric.findOne({ patientId: userId }).sort({ dateRecorded: -1 });

    if (!latest) {
      return NextResponse.json({
        heartRate: 75,
        weight: 70,
        height: null,
        bp: "120/80",
        spO2: 98,
        description: "No recent records found"
      });
    }

    return NextResponse.json({
      heartRate: latest.vitalSigns?.heartRateBpm || 75,
      weight: latest.weightKg || 70,
      height: latest.heightCm || null,
      bp: `${latest.vitalSigns?.systolicBP || 120}/${latest.vitalSigns?.diastolicBP || 80}`,
      spO2: latest.vitalSigns?.spO2 || 98,
      description: `Last recorded: ${new Date(latest.dateRecorded).toLocaleDateString()}`
    });
  } catch (error) {
    console.error('Vitals API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vitals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { error: 'Vitals tracking is not yet available for this account.' },
        { status: 400 },
      );
    }

    const data = await req.json();
    const { heartRate, bloodPressure, bodyMass, glucose, vitalType, value, height } = data;

    if (!vitalType && !heartRate && !bloodPressure && !bodyMass && !glucose && !height) {
      return NextResponse.json({ error: 'No vital data provided' }, { status: 400 });
    }

    // Get the latest anthropometric record or create a new one for today
    let record = await Anthropometric.findOne({ 
      patientId: userId,
      dateRecorded: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    if (!record) {
      // Find the most recent complete record to copy other vitals from, so we don't lose them
      const latest = await Anthropometric.findOne({ patientId: userId }).sort({ dateRecorded: -1 });
      record = new Anthropometric({
        patientId: userId,
        dateRecorded: new Date(),
        weightKg: latest?.weightKg,
        heightCm: latest?.heightCm,
        vitalSigns: {
          systolicBP: latest?.vitalSigns?.systolicBP,
          diastolicBP: latest?.vitalSigns?.diastolicBP,
          heartRateBpm: latest?.vitalSigns?.heartRateBpm,
        }
      });
    }

    if (!record.vitalSigns) {
        record.vitalSigns = {};
    }
    
    // Support legacy single vitalType format
    if (vitalType && value) {
      switch (vitalType) {
        case 'heartRate':
          record.vitalSigns.heartRateBpm = Number(value);
          break;
        case 'bloodPressure':
          const [sys, dia] = value.split('/').map(Number);
          if (sys && dia) {
            record.vitalSigns.systolicBP = sys;
            record.vitalSigns.diastolicBP = dia;
          }
          break;
        case 'weight':
          record.weightKg = Number(value);
          if (height) record.heightCm = Number(height);
          break;
        case 'glucose':
          (record as any).glucoseMmol = Number(value);
          break;
        default:
          return NextResponse.json({ error: 'Invalid vital type' }, { status: 400 });
      }
    }

    // Support new bulk update format
    if (heartRate) record.vitalSigns.heartRateBpm = Number(heartRate);
    if (bloodPressure && bloodPressure.includes('/')) {
      const [sys, dia] = bloodPressure.split('/').map(Number);
      if (sys && dia) {
        record.vitalSigns.systolicBP = sys;
        record.vitalSigns.diastolicBP = dia;
      }
    }
    if (bodyMass) record.weightKg = Number(bodyMass);
    if (glucose) (record as any).glucoseMmol = Number(glucose);
    if (height) record.heightCm = Number(height);

    // Auto-calculate BMI if both are available
    if (record.weightKg && record.heightCm) {
      const hMeters = record.heightCm / 100;
      record.bmi = parseFloat((record.weightKg / (hMeters * hMeters)).toFixed(1));
    }

    await record.save();

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Vitals API POST Error:', error);
    return NextResponse.json({ error: 'Failed to update vitals' }, { status: 500 });
  }
}
