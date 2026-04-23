import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric } from '@/lib/models/ClinicalData';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

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

    const latest = await Anthropometric.findOne({ patientId: userId }).sort({ dateRecorded: -1 });

    if (!latest) {
      return NextResponse.json({
        heartRate: 75,
        weight: 70,
        bp: "120/80",
        spO2: 98,
        description: "No recent records found"
      });
    }

    return NextResponse.json({
      heartRate: latest.vitalSigns?.heartRateBpm || 75,
      weight: latest.weightKg || 70,
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

    const data = await req.json();
    const { vitalType, value } = data;

    if (!vitalType || !value) {
      return NextResponse.json({ error: 'Missing vitalType or value' }, { status: 400 });
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
        break;
      case 'glucose':
        // We'll store glucose in spO2 or a custom field if schema doesn't have it
        // Depending on strict mode, mongoose might strip it. Let's cast to any.
        (record as any).glucoseMmol = Number(value);
        break;
      default:
        return NextResponse.json({ error: 'Invalid vital type' }, { status: 400 });
    }

    await record.save();

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Vitals API POST Error:', error);
    return NextResponse.json({ error: 'Failed to update vitals' }, { status: 500 });
  }
}
