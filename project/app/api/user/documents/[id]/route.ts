import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalDocument as DigitalDocument } from '@/lib/models/ReviewsDocs';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { storage, ref, deleteObject, isFirebaseConfigured } from '@/lib/firebase';

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

// DELETE /api/user/documents/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const doc = await DigitalDocument.findOneAndDelete({ _id: id, userId });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // If it was stored in Firebase, delete the storage object
    if (doc.cloudinaryUrl?.includes('firebasestorage.googleapis.com') && isFirebaseConfigured) {
      try {
        const storageRef = ref(storage, doc.publicId);
        await deleteObject(storageRef);
      } catch (err) {
        console.error('Failed to delete document from Firebase Storage:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/user/documents/[id] – update document type/label
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { type } = body;

    const doc = await DigitalDocument.findOneAndUpdate(
      { _id: id, userId },
      { type },
      { new: true }
    ).lean();

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: (doc as any)._id.toString(), type: (doc as any).type } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
