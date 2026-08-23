import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BodyAnnotation from '@/lib/models/BodyAnnotation';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getUserInfo() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const userInfo = await getUserInfo();
  if (!userInfo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const patientIdQuery = searchParams.get('patientId');

  let patientId = userInfo.userId;
  // If practitioner, they can specify a patientId query param
  if (userInfo.role === 'practitioner' && patientIdQuery) {
    patientId = patientIdQuery;
  }

  // Skip database query if id is "mock" (used for UI placeholders)
  if (patientId === 'mock') {
    return NextResponse.json([]);
  }

  // Postgres-native accounts have no Mongo identity (see lib/utils/mongoId.ts)
  // — BodyAnnotation is still Mongo-only, so they genuinely have none rather
  // than a lookup failure.
  if (!isMongoObjectId(patientId)) {
    return NextResponse.json([]);
  }

  await connectToDatabase();
  const annotations = await BodyAnnotation.find({ patientId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(annotations);
}

export async function POST(request: Request) {
  const userInfo = await getUserInfo();
  if (!userInfo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const body = await request.json();
  const { description, point, part, patientId: bodyPatientId } = body;

  let patientId = userInfo.userId;
  // A practitioner can also create an annotation for a patient
  if (userInfo.role === 'practitioner' && bodyPatientId) {
    patientId = bodyPatientId;
  }

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  if (!isMongoObjectId(patientId)) {
    return NextResponse.json(
      { error: 'Body annotations are not yet available for this account.' },
      { status: 400 },
    );
  }

  const annotation = await BodyAnnotation.create({
    patientId,
    description: description.trim(),
    point,
    part: part || 'Surface Mapping'
  });
  return NextResponse.json(annotation, { status: 201 });
}
