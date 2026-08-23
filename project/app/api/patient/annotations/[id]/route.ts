import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BodyAnnotation from '@/lib/models/BodyAnnotation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getPatientId() {
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = await getPatientId();
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMongoObjectId(patientId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await connectToDatabase();
  const { description, part } = await request.json();

  const update: any = { description: description.trim() };
  if (part) update.part = part;

  const annotation = await BodyAnnotation.findOneAndUpdate(
    { _id: id, patientId },
    update,
    { new: true }
  );
  if (!annotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(annotation);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = await getPatientId();
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMongoObjectId(patientId)) {
    return NextResponse.json({ ok: true });
  }

  await connectToDatabase();
  await BodyAnnotation.findOneAndDelete({ _id: id, patientId });
  return NextResponse.json({ ok: true });
}
