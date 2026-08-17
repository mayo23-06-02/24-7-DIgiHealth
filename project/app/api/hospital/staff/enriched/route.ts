import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePostgresHospitalId } from '@/lib/postgres/resolveId';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';

export async function GET(_req: Request) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    // Fetch staff from PostgreSQL
    const { data: staffList, error: staffError } = await getSupabaseAdmin()
      .from('staff')
      .select('*, users(first_name, last_name, email)')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false });
    
    if (staffError) throw new Error(staffError.message);

    // Filter only doctors
    const doctors = (staffList || []).filter((s: any) => s.role === 'doctor');

    // Get doctor user IDs for MongoDB queries
    const doctorUserIds = doctors
      .map((s: any) => s.user_id)
      .filter(Boolean);

    await connectToDatabase();

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
      const userId = s.user_id;
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
        _id: s.id,
        staffId: s.id,
        userId: s.user_id
          ? { 
              _id: s.user_id, 
              firstName: s.users?.first_name, 
              lastName: s.users?.last_name, 
              email: s.users?.email 
            }
          : null,
        facilityId: s.facility_id,
        role: s.role,
        department: s.department,
        shiftSchedule: { start: s.shift_start, end: s.shift_end, days: s.shift_days || [] },
        isOnDuty: s.is_on_duty,
        hourlyRate: s.hourly_rate,
        qualifications: s.qualifications || [],
        createdAt: s.created_at,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
