import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import Staff from '@/lib/models/Staff';
import { Consultation } from '@/lib/models/Consultation';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';

import { apiError } from "@/lib/api/errors";
export async function GET(_req: Request) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    const staffList = await Staff.find({ facilityId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    // Filter only doctors
    const doctors = (staffList || []).filter((s: any) => s.role === 'doctor');

    const doctorUserIds = doctors
      .map((s: any) => s.userId?._id)
      .filter(Boolean);

    // Fetch practitioner profiles
    const profiles = doctorUserIds.length
      ? await PractitionerProfile.find({
          userId: { $in: doctorUserIds },
        }).lean()
      : [];
    const profileByUser = new Map(
      profiles.map((p: any) => [p.userId.toString(), p]),
    );

    // Fetch consultations for load calculations
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const consultations = doctorUserIds.length
      ? await Consultation.find({
          practitionerId: { $in: doctorUserIds },
        }).lean()
      : [];

    // Enrich doctor data
    const enrichedDoctors = doctors.map((s: any) => {
      const userId = s.userId?._id ? String(s.userId._id) : undefined;
      const prof = userId ? profileByUser.get(userId) : null;

      const doctorConsultations = consultations.filter(
        (c: any) => c.practitionerId?.toString() === userId,
      );

      const todayLoad = doctorConsultations.filter(
        (c: any) => new Date(c.scheduledStartTime) >= today,
      ).length;

      const completedMonth = doctorConsultations.filter(
        (c: any) => {
          const cd = new Date(c.scheduledStartTime);
          return cd >= monthStart && c.status === 'completed';
        },
      ).length;

      return {
        ...s,
        staffId: s._id,
        // Enriched fields
        specialisation: prof?.specialisation || s.department,
        rating: prof?.rating || 0,
        reviewCount: prof?.reviewCount || 0,
        patientLoad: doctorConsultations.length,
        appointmentsToday: todayLoad,
        completedMonth,
      };
    });

    // Sort: on duty first, then by patient load
    enrichedDoctors.sort((a: any, b: any) => {
      if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
      return b.patientLoad - a.patientLoad;
    });

    return NextResponse.json({ success: true, data: enrichedDoctors });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff/enriched]', error);
    return apiError(error);
  }
}
