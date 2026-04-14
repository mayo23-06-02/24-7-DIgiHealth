import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import Consultation from '@/lib/models/Consultation';

export async function GET(req: Request, { params }: { params: Promise<{ consultationId: string }> }) {
  try {
    const { consultationId } = await params;
    await connectToDatabase();
    
    // Auto-create conversation if it doesn't exist
    let conv = await Conversation.findOne({ consultationId })
      .populate('patientId practitionerId', 'firstName lastName avatar');

    if (!conv) {
      const consultation = await Consultation.findById(consultationId);
      if (!consultation) {
        return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
      }
      
      const newConv = new Conversation({
        consultationId: consultation._id,
        patientId: consultation.patientId,
        practitionerId: consultation.practitionerId,
        minutesAllocated: 30, // Default 30 mins
      });
      await newConv.save();
      
      conv = await Conversation.findById(newConv._id)
        .populate('patientId practitionerId', 'firstName lastName avatar');
    }

    return NextResponse.json(conv);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
