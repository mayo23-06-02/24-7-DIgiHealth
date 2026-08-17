import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { PractitionerProfile, PatientProfile } from '@/lib/models/RoleProfiles';
import RiskScore from '@/lib/models/RiskScore';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { calcAge, riskBandFromScore, riskBandStyle } from '@/lib/riskScore';
import mongoose from 'mongoose';

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

    const profile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
    const assignedIds = profile?.assignedPatientIds?.map(id => id.toString()) || [];

    const consultedIds = await Consultation.find({ practitionerId }).distinct('patientId');
    const consultedIdStrings = consultedIds.map(id => id.toString());

    const uniquePatientIds = [...new Set([...assignedIds, ...consultedIdStrings])];

    if (uniquePatientIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0 });
    }

    const oids = uniquePatientIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const patients = await User.find(
      { _id: { $in: oids }, role: 'patient' },
      'firstName lastName email mobile gender dateOfBirth createdAt',
    ).lean();

    // Batch patient profiles for DOB and child status
    const profiles = await PatientProfile.find({
      userId: { $in: oids },
    })
      .select('userId dateOfBirth gender ageRange emergencyContact')
      .lean();
    const profileByUser = new Map(
      profiles.map((p: any) => [p.userId.toString(), p]),
    );

    // Latest risk scores for these patients
    const latestRisks = await RiskScore.aggregate([
      { $match: { patientId: { $in: oids } } },
      { $sort: { calculatedAt: -1 } },
      {
        $group: {
          _id: '$patientId',
          score: { $first: '$score' },
          color: { $first: '$color' },
          calculatedAt: { $first: '$calculatedAt' },
        },
      },
    ]);
    const riskByUser = new Map(
      latestRisks.map((r: any) => [r._id.toString(), r]),
    );

    const enriched = await Promise.all(
      patients.map(async (p: any) => {
        const fullName = `${p.firstName} ${p.lastName}`;
        if (search && !fullName.toLowerCase().includes(search.toLowerCase())) {
          return null;
        }

        const pp = profileByUser.get(p._id.toString());
        const dob = pp?.dateOfBirth || p.dateOfBirth;
        const age = calcAge(dob);
        const gender = pp?.gender || p.gender || '';

        // Determine if patient is a child
        let isChild = false;
        let guardianName = null;
        if (pp) {
          if (pp.ageRange) {
            isChild = true;
          } else if (dob && age !== null) {
            isChild = age < 18;
          }
          if (isChild && pp.emergencyContact?.name) {
            guardianName = pp.emergencyContact.name;
          }
        }

        const latestConsult = await Consultation.findOne({
          patientId: p._id,
          practitionerId,
          status: { $in: ['completed', 'cancelled'] },
        })
          .sort({ scheduledStartTime: -1 })
          .select('scheduledStartTime clinicalRisk')
          .lean();

        const nextConsult = await Consultation.findOne({
          patientId: p._id,
          practitionerId,
          scheduledStartTime: { $gte: new Date() },
          status: { $in: ['scheduled', 'in_progress', 'pending', 'requested'] },
        })
          .sort({ scheduledStartTime: 1 })
          .select('scheduledStartTime')
          .lean();

        const storedRisk = riskByUser.get(p._id.toString());
        const riskScore =
          storedRisk?.score ??
          latestConsult?.clinicalRisk?.score ??
          0;
        const riskColor = riskBandFromScore(riskScore);
        const riskLabel = riskBandStyle(riskScore).label;

        // Optional risk filter: green | gray | orange | red
        if (riskFilter && riskColor !== riskFilter) return null;

        let chronicConditions: string[] = [];
        try {
          const ctx = await MedicalContext.findOne({ patientId: p._id })
            .select('chronicConditions')
            .lean();
          if (ctx) chronicConditions = ctx.chronicConditions || [];
        } catch {
          /* ignore */
        }

        return {
          id: p._id.toString(),
          fullName,
          email: p.email,
          mobile: p.mobile,
          gender,
          age,
          dateOfBirth: dob || null,
          isChild,
          guardianName,
          dateJoined: p.createdAt || null,
          riskScore,
          riskColor,
          riskLabel,
          medicalHistory: chronicConditions,
          lastVisit: (latestConsult as any)?.scheduledStartTime || null,
          nextAppointment: (nextConsult as any)?.scheduledStartTime || null,
        };
      }),
    );

    const result = enriched.filter(Boolean);
    return NextResponse.json({ success: true, data: result, total: result.length });
  } catch (err: any) {
    console.error('[GET /api/practitioner/patients]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
