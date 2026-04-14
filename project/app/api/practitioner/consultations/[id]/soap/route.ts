import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid consultation ID' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { subjective, objective, assessment, plan } = body;

    const updated = await Consultation.findByIdAndUpdate(
      id,
      {
        $set: {
          soapNotes: {
            subjective: subjective || '',
            objective: objective || '',
            assessment: assessment || '',
            plan: plan || '',
            savedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Consultation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { soapNotes: updated.soapNotes },
    });
  } catch (err) {
    console.error('[POST /api/practitioner/consultations/[id]/soap]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save SOAP notes' },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid consultation ID' },
        { status: 400 },
      );
    }

    const consultation = await Consultation.findById(id).lean();

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { soapNotes: consultation.soapNotes || {} },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/consultations/[id]/soap]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SOAP notes' },
      { status: 500 },
    );
  }
}
