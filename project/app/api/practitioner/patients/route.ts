import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getPractitionerId(req: NextRequest): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      const user = await User.findById(payload.userId as string).lean();
      if (user && (user as any).role === 'practitioner') return (user as any)._id.toString();
    }
  } catch {}
  return req.headers.get('x-practitioner-id') || process.env.MOCK_PRACTITIONER_ID || '000000000000000000000000';
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const practitionerId = await getPractitionerId(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const riskFilter = searchParams.get('risk') || '';

    // Get all distinct patients who consulted this practitioner
    const patientIds = await Consultation.find({ practitionerId }).distinct('patientId');

    const patients = await User.find({ _id: { $in: patientIds }, role: 'patient' }, 'firstName lastName email mobile').lean();

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

        return {
          id: p._id.toString(),
          fullName,
          email: p.email,
          mobile: p.mobile,
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
