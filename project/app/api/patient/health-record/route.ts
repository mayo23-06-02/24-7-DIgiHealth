import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { 
  Anthropometric, 
  MedicalContext, 
  Prescription, 
  LabResult, 
  Immunization 
} from '@/lib/models/ClinicalData';
import { Consultation } from '@/lib/models/Consultation';
import { AITriageSession } from '@/lib/models/AIDecision';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getUserId(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch (e) {
    return null;
  }
}

const EMPTY_HEALTH_RECORD = {
  timeline: [],
  vitals: [],
  labs: [],
  medications: [],
  allergies: [],
  immunizations: [],
};

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Postgres-native accounts have no Mongo identity (see
    // lib/utils/mongoId.ts) — every collection below is still Mongo-only,
    // so they genuinely have an empty record rather than a lookup failure.
    if (!isMongoObjectId(userId)) {
      return NextResponse.json({ success: true, data: EMPTY_HEALTH_RECORD });
    }

    // Fetch all data types in parallel
    const [
      vitals,
      medContext,
      prescriptions,
      labs,
      immunizations,
      consultations,
      triageSessions
    ] = await Promise.all([
      Anthropometric.find({ patientId: userId }).sort({ dateRecorded: -1 }).lean(),
      MedicalContext.findOne({ patientId: userId }).lean(),
      Prescription.find({ patientId: userId }).sort({ prescribedDate: -1 }).lean(),
      LabResult.find({ patientId: userId }).sort({ dateReported: -1 }).lean(),
      Immunization.find({ patientId: userId }).sort({ dateAdministered: -1 }).lean(),
      Consultation.find({ patientId: userId }).sort({ scheduledStartTime: -1 }).populate('practitionerId', 'name').lean(),
      AITriageSession.find({ patientId: userId }).sort({ createdAt: -1 }).lean()
    ]);

    // Build timeline events
    const timelineEvents: any[] = [];

    consultations.forEach((c: any) => {
      timelineEvents.push({
        id: c._id.toString(),
        type: 'consultation',
        date: c.scheduledStartTime.toISOString(),
        title: `${c.type === 'video' ? 'Video' : c.type === 'chat' ? 'Chat' : 'Telehealth'} Consultation`,
        description: c.chiefComplaint || 'General consultation',
        metadata: {
          doctor: c.practitionerId?.name || 'Medical Practitioner',
          status: c.status
        }
      });
    });

    prescriptions.forEach((p: any) => {
      timelineEvents.push({
        id: p._id.toString(),
        type: 'medication',
        date: p.prescribedDate.toISOString(),
        title: `Prescription: ${p.medicationName}`,
        description: p.documentUrl
          ? `${p.dosage || ''} — Formal pharmacy script available for download`.trim()
          : `${p.dosage || ''} - ${p.instructions || ''}`.trim(),
        metadata: {
          dosage: p.dosage,
          status: p.status,
          documentUrl: p.documentUrl || null,
          documentName: p.documentName || null,
        }
      });
    });

    labs.forEach((l: any) => {
      timelineEvents.push({
        id: l._id.toString(),
        type: 'lab',
        date: l.dateReported.toISOString(),
        title: `Lab Result: ${l.testName}`,
        description: `Ordered by clinical team.`,
        metadata: {
          status: 'Available'
        }
      });
    });

    immunizations.forEach((i: any) => {
      timelineEvents.push({
        id: i._id.toString(),
        type: 'immunization',
        date: i.dateAdministered.toISOString(),
        title: `Immunization: ${i.vaccineName}`,
        description: i.dosage,
        metadata: {
          doctor: i.administeredBy
        }
      });
    });

    triageSessions.forEach((t: any) => {
      timelineEvents.push({
        id: t._id.toString(),
        type: 'ai_triage',
        date: t.createdAt.toISOString(),
        title: 'AI Symptom Triage',
        description: t.recommendation || 'AI health assessment complete.',
      });
    });

    // Sort timeline by date descending
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        timeline: timelineEvents,
        vitals: vitals.map((v: any) => ({
          date: new Date(v.dateRecorded).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
          weight: v.weightKg,
          height: v.heightCm,
          systolicBP: v.vitalSigns?.systolicBP,
          diastolicBP: v.vitalSigns?.diastolicBP,
          heartRate: v.vitalSigns?.heartRateBpm
        })),
        labs: labs.map((l: any) => ({
          id: l._id.toString(),
          name: l.testName,
          date: l.dateReported.toISOString(),
          orderedBy: 'Practitioner', // In real app, populate this
          values: l.parameters.map((p: any) => ({
            parameter: p.name,
            value: p.value,
            unit: p.unit,
            referenceRange: p.referenceRange,
            status: p.status
          }))
        })),
        medications: prescriptions.map((p: any) => ({
          id: p._id.toString(),
          name: p.medicationName,
          dosage: p.dosage,
          instructions: p.instructions,
          prescribedDate: p.prescribedDate.toISOString(),
          refillsLeft: p.refillsRemaining,
          status: p.status,
          documentUrl: p.documentUrl || null,
          documentName: p.documentName || null,
          canDownload: !!p.documentUrl,
        })),
        allergies: medContext?.allergies || [],
        // Surfaced back to the patient so they can see -- and later correct --
        // what they entered at registration.
        bloodType:
          (medContext as any)?.bloodType ||
          (vitals?.[0] as any)?.bloodType ||
          null,
        activityLevel: (medContext as any)?.activityLevel || null,
        immunizations: immunizations.map((i: any) => ({
          id: i._id.toString(),
          vaccine: i.vaccineName,
          date: i.dateAdministered.toISOString(),
          dose: i.dosage,
          batch: i.batchNumber,
          administeredBy: i.administeredBy,
          nextDue: i.nextDueDate?.toISOString()
        }))
      }
    });

  } catch (err: any) {
    console.error('[GET /api/patient/health-record]', err);
    return apiError(err);
  }
}
