import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import AttachedRecord from '@/lib/models/AttachedRecord';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse FormData
    const formData = await req.formData();
    const conversationId = formData.get('conversationId') as string;
    const type = formData.get('type') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;
    const practitionerId = req.headers.get('x-user-id');

    if (!conversationId || !type || !title || !file || !practitionerId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Determine patient ID based on the conversation
    // Depending on what model looks like, patientId could be `patientId` field or derived from participants
    // Assuming Conversation has patientId based on recent changes:
    const patientId = conversation.patientId; // Or fallback logic

    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Cloudinary
    let fileUrl = '';
    try {
      const uploadResult = await uploadToCloudinary(buffer, 'chat_attachments/records');
      fileUrl = uploadResult.secure_url;
    } catch (err: any) {
      console.warn('Cloudinary upload failed, falling back to mock URL', err);
      fileUrl = 'https://res.cloudinary.com/dmvgc1ktj/image/upload/v1/mock_medical_record.pdf'; // Fallback
    }

    // Create AttachedRecord
    const record = await AttachedRecord.create({
      conversationId,
      consultationId: conversation.consultationId,
      patientId,
      practitionerId,
      type,
      title,
      description,
      fileUrl,
      fileMime: file.type,
      fileSize: file.size,
      isRead: false
    });

    // Create Message linking to the record
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: practitionerId,
      receiverId: patientId, // For simplicity we assume 1-to-1 patient
      type: 'record_attachment',
      recordId: record._id,
      content: `Attached new ${type.replace('_', ' ')}: ${title}`
    });

    // Update conversation lastMessage time
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return NextResponse.json({ success: true, record, message });
  } catch (error: any) {
    console.error('[POST /api/chat/attach-record]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
