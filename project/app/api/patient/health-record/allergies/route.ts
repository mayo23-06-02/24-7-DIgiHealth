import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getUserId(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

// POST /api/patient/health-record/allergies – add a new allergy
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Allergy tracking is not yet available for this account.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { allergen, severity, reaction } = body;

    if (!allergen || !severity || !reaction) {
      return NextResponse.json({ success: false, error: 'allergen, severity and reaction are required' }, { status: 400 });
    }

    const newAllergy = { allergen: allergen.trim(), severity, reaction: reaction.trim(), source: 'patient' as const };

    // Upsert MedicalContext – push the new allergy into the array
    const updated = await MedicalContext.findOneAndUpdate(
      { patientId: userId },
      { $push: { allergies: newAllergy } },
      { new: true, upsert: true }
    ).lean();

    const added = (updated as any).allergies.at(-1);

    return NextResponse.json({ success: true, data: { ...added, id: added?._id?.toString() } });
  } catch (err: any) {
    console.error('[POST /api/patient/health-record/allergies]', err);
    return apiError(err);
  }
}

// DELETE /api/patient/health-record/allergies – remove an allergy by _id
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Allergy tracking is not yet available for this account.' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const allergyId = searchParams.get('id');
    if (!allergyId) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    await MedicalContext.findOneAndUpdate(
      { patientId: userId },
      { $pull: { allergies: { _id: allergyId } } }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/patient/health-record/allergies]', err);
    return apiError(err);
  }
}
