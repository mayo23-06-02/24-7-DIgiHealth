import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric } from '@/lib/models/ClinicalData';
import { requirePatientAccess } from '@/lib/auth/access';

import { apiError } from "@/lib/api/errors";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id: patientUserId } = await params;

    /*
     * Being a practitioner is not the same as being THIS patient's
     * practitioner. The check here used to stop at the role, so any
     * practitioner account could write vitals onto any patient's record in the
     * system by id — a silent, unattributed change to a clinical record.
     *
     * requirePatientAccess also validates the id shape and rejects a caller
     * who is neither, so nothing below needs to re-check either.
     */
    await requirePatientAccess(patientUserId);

    const body = await req.json();
    const { heartRate, bloodPressure, bodyMass, glucose } = body;

    // Get the latest anthropometric record for today, or create new one based on previous
    let record = await Anthropometric.findOne({ 
      patientId: patientUserId,
      dateRecorded: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    if (!record) {
      // Find the most recent complete record to copy other vitals from, so we don't lose them
      const latest = await Anthropometric.findOne({ patientId: patientUserId }).sort({ dateRecorded: -1 });
      record = new Anthropometric({
        patientId: patientUserId,
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

    // Process bulk updates
    if (heartRate) {
      record.vitalSigns.heartRateBpm = Number(heartRate);
    }
    
    if (bloodPressure && bloodPressure.includes('/')) {
      const [sys, dia] = bloodPressure.split('/').map(Number);
      if (sys && dia && !isNaN(sys) && !isNaN(dia)) {
        record.vitalSigns.systolicBP = sys;
        record.vitalSigns.diastolicBP = dia;
      }
    }
    
    if (bodyMass) {
      record.weightKg = Number(bodyMass);
    }
    
    if (glucose) {
      (record as any).glucoseMmol = Number(glucose);
    }

    // Auto-calculate BMI if both are available
    if (record.weightKg && record.heightCm) {
      const hMeters = record.heightCm / 100;
      record.bmi = parseFloat((record.weightKg / (hMeters * hMeters)).toFixed(1));
    }

    await record.save();

    return NextResponse.json({ 
      success: true, 
      data: {
        heartRate: record.vitalSigns?.heartRateBpm,
        bloodPressure: (record.vitalSigns?.systolicBP && record.vitalSigns?.diastolicBP) ? `${record.vitalSigns.systolicBP}/${record.vitalSigns.diastolicBP}` : undefined,
        weight: record.weightKg,
        glucose: (record as any).glucoseMmol || undefined,
        dateRecorded: record.dateRecorded
      } 
    });

  } catch (err: any) {
    console.error('Vitals API POST Error:', err);
    return apiError(err);
  }
}
