import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    // Postgres-native accounts have no Mongo identity (see
    // lib/utils/mongoId.ts) — Consultation is still Mongo-only, so they
    // genuinely can't own one.
    if (!isMongoObjectId(userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, scheduledStartTime, chiefComplaint } = body;

    // Ensure the patient owns this consultation
    const consultation = await Consultation.findOne({ _id: id, patientId: userId });
    if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (status) consultation.status = status;
    if (scheduledStartTime) {
        consultation.scheduledStartTime = new Date(scheduledStartTime);
        consultation.status = 'requested'; // Reset to requested so doctor must re-accept
    }
    if (chiefComplaint) consultation.chiefComplaint = chiefComplaint;

    await consultation.save();

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return PUT(req, { params });
}
