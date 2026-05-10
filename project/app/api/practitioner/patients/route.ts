import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const practitionerId = user.userId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const riskFilter = searchParams.get('risk') || '';

    // 1. Get assigned patients from profile
    const profile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
    const assignedIds = profile?.assignedPatientIds?.map(id => id.toString()) || [];

    // 2. Get patients from consultations
    const consultedIds = await Consultation.find({ practitionerId }).distinct('patientId');
    const consultedIdStrings = consultedIds.map(id => id.toString());

    // Merge and unique
    const uniquePatientIds = [...new Set([...assignedIds, ...consultedIdStrings])];

    const patients = await User.find(
      { _id: { $in: uniquePatientIds }, role: 'patient' }, 
      'firstName lastName email mobile gender dateOfBirth'
    ).lean();

    const enriched = await Promise.all(
      patients.map(async (p: any) => {
        const fullName = `${p.firstName} ${p.lastName}`;
        if (search && !fullName.toLowerCase().includes(search.toLowerCase())) return null;

        const latestConsult = await Consultation.findOne({
          patientId: p._id,
          practitionerId,
          status: { $in: ['completed', 'cancelled'] }
        }).sort({ scheduledStartTime: -1 }).lean();

        const nextConsult = await Consultation.findOne({
          patientId: p._id,
          practitionerId,
          scheduledStartTime: { $gte: new Date() },
          status: { $in: ['scheduled', 'in_progress', 'pending'] }
        }).sort({ scheduledStartTime: 1 }).lean();

        const riskScore = latestConsult?.clinicalRisk?.score ?? null;
        const riskColor = latestConsult?.clinicalRisk?.color ?? 'green';

        if (riskFilter && riskColor !== riskFilter) return null;

        // Pull medical context if available
        let chronicConditions: string[] = [];
        let allergies: string[] = [];
        try {
          const ctx = await MedicalContext.findOne({ patientId: p._id }).lean();
          if (ctx) {
            chronicConditions = ctx.chronicConditions || [];
            allergies = (ctx.allergies || []).map((a: any) => a.allergen);
          }
        } catch {}

        let age = null;
        if (p.dateOfBirth) {
          const birth = new Date(p.dateOfBirth);
          age = new Date().getFullYear() - birth.getFullYear();
        }

        return {
          id: p._id.toString(),
          fullName,
          email: p.email,
          mobile: p.mobile,
          gender: p.gender,
          age,
          riskScore,
          riskColor,
          medicalHistory: chronicConditions,
          allergies,
          lastVisit: (latestConsult as any)?.scheduledStartTime || null,
          nextAppointment: (nextConsult as any)?.scheduledStartTime || null,
          totalConsultations: await Consultation.countDocuments({ patientId: p._id, practitionerId }),
        };
      })
    );

    const result = enriched.filter(Boolean);
    return NextResponse.json({ success: true, data: result, total: result.length });
  } catch (err: any) {
    console.error('[GET /api/practitioner/patients]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
