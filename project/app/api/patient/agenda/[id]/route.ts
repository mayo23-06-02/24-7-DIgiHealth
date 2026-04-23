import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PatientEvent } from '@/lib/models/PatientEvent';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getPatientId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch { return null; }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const patientId = await getPatientId();
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  await PatientEvent.findOneAndDelete({ _id: params.id, patientId });
  return NextResponse.json({ ok: true });
}
