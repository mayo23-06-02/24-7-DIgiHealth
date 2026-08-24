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
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import mongoose from 'mongoose';

import { apiError } from "@/lib/api/errors";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const userPayload = await getRequestUser();
    
    if (!userPayload || (userPayload.role !== 'practitioner' && userPayload.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: patientId } = await params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    // Authorization Check: Is this patient assigned to this practitioner OR has there been a consultation?
    const practitionerId = userPayload.userId;
    const practitionerProfile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
    const assignedIds = (practitionerProfile?.assignedPatientIds || []).map(id => id.toString());
    
    const hasConsultation = await Consultation.exists({ patientId, practitionerId });

    if (!assignedIds.includes(patientId) && !hasConsultation && userPayload.role !== 'mega_admin') {
      return NextResponse.json({ success: false, error: 'Access denied: Patient not linked to your practice' }, { status: 403 });
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
      Anthropometric.find({ patientId }).sort({ dateRecorded: -1 }).lean(),
      MedicalContext.findOne({ patientId }).lean(),
      Prescription.find({ patientId }).sort({ prescribedDate: -1 }).lean(),
      LabResult.find({ patientId }).sort({ dateReported: -1 }).lean(),
      Immunization.find({ patientId }).sort({ dateAdministered: -1 }).lean(),
      Consultation.find({ patientId }).sort({ scheduledStartTime: -1 }).populate('practitionerId', 'name').lean(),
      AITriageSession.find({ patientId }).sort({ createdAt: -1 }).lean()
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
          systolicBP: v.vitalSigns?.systolicBP,
          diastolicBP: v.vitalSigns?.diastolicBP,
          heartRate: v.vitalSigns?.heartRateBpm
        })),
        labs: labs.map((l: any) => ({
          id: l._id.toString(),
          name: l.testName,
          date: l.dateReported.toISOString(),
          orderedBy: 'Practitioner',
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
          prescribedDate: p.prescribedDate?.toISOString?.() || p.prescribedDate,
          refillsLeft: p.refillsRemaining,
          status: p.status,
          documentUrl: p.documentUrl || null,
          documentName: p.documentName || null,
          canDownload: !!p.documentUrl,
        })),
        allergies: medContext?.allergies || [],
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
    console.error('[GET /api/practitioner/patients/[id]/health-record]', err);
    return apiError(err);
  }
}
