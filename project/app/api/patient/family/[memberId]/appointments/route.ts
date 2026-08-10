import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { Consultation } from '@/lib/models/Consultation';
import { canManageMember } from '@/lib/family/access';

/** GET — guardian views a member's bookings for scheduling/management
 * purposes. Deliberately omits chiefComplaint/SOAP notes — management
 * access is separate from medical access, which requires isMinor === true
 * (see .../health-record). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { memberId } = await params;
    if (!(await canManageMember(guardian.userId, memberId))) {
      return NextResponse.json({ success: false, error: 'No active family link with this member' }, { status: 403 });
    }

    const consultations = await Consultation.find({ patientId: memberId })
      .populate('practitionerId', 'firstName lastName')
      .sort({ scheduledStartTime: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: consultations.map((c: any) => ({
        id: c._id.toString(),
        practitionerName: c.practitionerId ? `Dr. ${c.practitionerId.firstName} ${c.practitionerId.lastName}` : 'Unknown',
        scheduledStart: c.scheduledStartTime,
        scheduledEnd: c.scheduledEndTime,
        type: c.type,
        status: c.status,
      })),
    });
  } catch (err: any) {
    console.error('[GET /api/patient/family/[memberId]/appointments]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
