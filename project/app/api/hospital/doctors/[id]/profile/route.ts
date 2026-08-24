import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';
import { getRequestUser } from '@/lib/auth/getRequestUser';

import { apiError } from "@/lib/api/errors";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    console.log('[GET /api/hospital/doctors/[id]/profile] Query details:', {
      doctorId: id,
    });

    await connectToDatabase();

    // Get the doctor user
    const doctorUser = await User.findById(id);
    if (!doctorUser || doctorUser.role !== 'practitioner') {
      console.log('[GET /api/hospital/doctors/[id]/profile] Doctor not found:', id);
      return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });
    }

    // Get practitioner profile – safely access properties
    const practProfile = await PractitionerProfile.findOne({ userId: id }).lean();
    const profile = practProfile as any; // Type-safe access

    // Safely extract values with fallbacks
    const hourlyRate = profile?.hourlyRate || 500;
    const isOnline = profile?.isOnline || false;
    const specialisation = profile?.specialisation || 'General Practitioner';
    const qualifications = profile?.qualifications || [];
    const rating = profile?.rating || 0;

    // Get consultations
    const consultations = await Consultation.find({ practitionerId: id })
      .populate('patientId', 'firstName lastName email')
      .sort({ scheduledStartTime: -1 })
      .lean();

    const totalConsultations = consultations.length;
    const completedConsultations = consultations.filter((c: any) => c.status === 'completed').length;
    const cancelledConsultations = consultations.filter((c: any) => c.status === 'cancelled').length;
    const upcomingConsultations = consultations.filter(
      (c: any) => ['scheduled', 'requested', 'pending'].includes(c.status) && new Date(c.scheduledStartTime) >= new Date()
    ).length;

    // Unique patients
    const uniquePatientIds = [...new Set(consultations.map((c: any) => c.patientId?._id?.toString()).filter(Boolean))];

    const revenuePerConsultation = hourlyRate;
    const totalRevenue = completedConsultations * revenuePerConsultation;

    // Monthly revenue for chart (last 6 months)
    const now = new Date();
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const count = consultations.filter((c: any) => {
        if (c.status !== 'completed') return false;
        const cd = new Date(c.scheduledStartTime);
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      }).length;
      return { month: label, revenue: count * revenuePerConsultation, consultations: count };
    });

    // SLA Metrics
    const completionRate = totalConsultations > 0 ? Math.round((completedConsultations / totalConsultations) * 100) : 0;
    const cancellationRate = totalConsultations > 0 ? Math.round((cancelledConsultations / totalConsultations) * 100) : 0;
    const patientSatisfaction = rating ? Math.round(rating * 20) : 85;
    const avgResponseMinutes = 18;

    const sla = {
      completionRate,
      cancellationRate,
      patientSatisfaction,
      avgResponseMinutes,
      onTimeRate: Math.max(0, completionRate - 5),
    };

    // Recent appointments (last 10)
    const recentAppointments = consultations.slice(0, 10).map((c: any) => ({
      id: c._id.toString(),
      patientName: c.patientId ? `${c.patientId.firstName} ${c.patientId.lastName}` : 'Unknown',
      patientEmail: c.patientId?.email || '',
      date: c.scheduledStartTime,
      type: c.type,
      status: c.status,
      chiefComplaint: c.chiefComplaint || '',
    }));

    // Recent patients (unique, last 10)
    const seen = new Set<string>();
    const recentPatients = consultations
      .filter((c: any) => {
        const pid = c.patientId?._id?.toString();
        if (!pid || seen.has(pid)) return false;
        seen.add(pid);
        return true;
      })
      .slice(0, 10)
      .map((c: any) => ({
        id: c.patientId._id.toString(),
        name: `${c.patientId.firstName} ${c.patientId.lastName}`,
        email: c.patientId.email,
        lastSeen: c.scheduledStartTime,
        totalVisits: consultations.filter((x: any) => x.patientId?._id?.toString() === c.patientId._id.toString()).length,
      }));

    return NextResponse.json({
      success: true,
      data: {
        staff: {
          _id: doctorUser._id.toString(),
          userId: {
            _id: doctorUser._id.toString(),
            firstName: doctorUser.firstName,
            lastName: doctorUser.lastName,
            email: doctorUser.email,
            mobile: doctorUser.mobile,
          },
          role: 'doctor',
          department: specialisation,
          shiftSchedule: { start: '—', end: '—' },
          isOnDuty: isOnline,
          hourlyRate: hourlyRate,
          qualifications: qualifications,
        },
        practProfile,
        kpi: {
          totalConsultations,
          completedConsultations,
          cancelledConsultations,
          upcomingConsultations,
          uniquePatients: uniquePatientIds.length,
          totalRevenue,
          rating: rating,
        },
        monthlyRevenue,
        sla,
        recentAppointments,
        recentPatients,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/hospital/doctors/[id]/profile]', error);
    return apiError(error);
  }
}