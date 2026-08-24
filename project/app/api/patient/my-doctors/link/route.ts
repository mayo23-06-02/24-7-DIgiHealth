import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // Get current user (patient)
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const patientUserId = payload.userId as string;
    if (!isMongoObjectId(patientUserId)) {
      return NextResponse.json(
        { error: 'Favorite doctors are not yet available for this account.' },
        { status: 400 },
      );
    }

    const { practitionerId, action } = await req.json(); // practitionerId is the User._id of the doctor

    if (!practitionerId) {
      return NextResponse.json({ error: 'Practitioner ID required' }, { status: 400 });
    }

    if (action === 'link') {
      // 1. Add doctor to patient's myDoctorIds
      await PatientProfile.updateOne(
        { userId: patientUserId },
        { $addToSet: { myDoctorIds: practitionerId } }
      );

      // 2. Add patient to doctor's assignedPatientIds
      await PractitionerProfile.updateOne(
        { userId: practitionerId },
        { $addToSet: { assignedPatientIds: patientUserId } }
      );

      return NextResponse.json({ success: true, message: 'Linked successfully' });
    } else if (action === 'unlink') {
      // 1. Remove doctor from patient's myDoctorIds
      await PatientProfile.updateOne(
        { userId: patientUserId },
        { $pull: { myDoctorIds: practitionerId } }
      );

      // 2. Remove patient from doctor's assignedPatientIds
      await PractitionerProfile.updateOne(
        { userId: practitionerId },
        { $pull: { assignedPatientIds: patientUserId } }
      );

      return NextResponse.json({ success: true, message: 'Unlinked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Link API error:', error);
    return apiError(error);
  }
}
