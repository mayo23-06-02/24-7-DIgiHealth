import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric } from '@/lib/models/ClinicalData';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');

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
