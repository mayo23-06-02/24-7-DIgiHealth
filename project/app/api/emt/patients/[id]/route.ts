import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import { MedicalContext } from '@/lib/models/ClinicalData';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Check if the user exists and is a patient
    const user = await User.findById(params.id).lean();
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const profile = await PatientProfile.findOne({ userId: params.id }).lean();
    const medicalContext = await MedicalContext.findOne({ patientId: params.id }).lean();

    const data = {
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      mobile: user.mobile,
      dateOfBirth: profile?.dateOfBirth,
      gender: profile?.gender,
      bloodType: (medicalContext as any)?.bloodType, // In case it's stored here
      emergencyContact: profile?.emergencyContact,
      chronicConditions: (medicalContext as any)?.chronicConditions || [],
      allergies: (medicalContext as any)?.allergies || [],
      medications: (medicalContext as any)?.currentMedications || []
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
