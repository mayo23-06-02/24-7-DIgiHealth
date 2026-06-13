import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalDocument as DigitalDocument } from '@/lib/models/ReviewsDocs';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary with fallback defaults if env vars are malformed
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dmvgc1ktj',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '445174386726859',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'hQVkKbA_kvuRlj6MioPdIrZVTIE',
});

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

// GET /api/user/documents – list all documents for the current user
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const docs = await DigitalDocument.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      data: docs.map((d: any) => ({
        id: d._id.toString(),
        type: d.type,
        url: d.cloudinaryUrl,
        mimeType: d.mimeType,
        status: d.status,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/user/documents – upload a new document (base64 encoded)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, dataUrl, mimeType, isAvatar } = body;

    if (!dataUrl || !mimeType) {
      return NextResponse.json({ error: 'dataUrl and mimeType are required' }, { status: 400 });
    }

    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(dataUrl, {
      folder: 'digihealth_user_docs',
      resource_type: 'auto', // Auto-detect image vs raw (pdf, doc)
    });

    const fileUrl = uploadRes.secure_url;
    const publicId = uploadRes.public_id;

    // If this is an avatar upload, update the user's avatarUrl directly
    if (isAvatar) {
      await User.findByIdAndUpdate(userId, { avatarUrl: fileUrl });
      return NextResponse.json({ success: true, data: { url: fileUrl } });
    }

    const doc = await DigitalDocument.create({
      userId,
      uploadedBy: userId,
      type: type || 'general',
      cloudinaryUrl: fileUrl,   
      publicId: publicId,
      mimeType,
      status: 'pending_review',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        type: doc.type,
        url: doc.cloudinaryUrl,
        mimeType: doc.mimeType,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
