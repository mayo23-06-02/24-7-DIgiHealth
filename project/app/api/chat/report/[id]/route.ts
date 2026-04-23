import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Patient from '@/lib/models/Patient';
import { MedicalContext, Prescription, LabResult } from '@/lib/models/ClinicalData';
import PDFDocument from 'pdfkit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!id || id === 'undefined' || id === '[id]') {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[API/Report] Invalid ID format: ${id}`);
      return NextResponse.json({ error: 'Invalid patient/conversation ID' }, { status: 400 });
    }

    let patientId = id;
    
    // Proactively try to resolve conversationId -> patientId
    try {
      const ConversationModel = mongoose.models.Conversation || (await import('@/lib/models/Conversation')).Conversation;
      if (ConversationModel) {
        const conversation = await ConversationModel.findById(id).lean();
        if (conversation && conversation.patientId) {
          patientId = conversation.patientId.toString();
          console.log(`[API/Report] Resolved conversation ${id} to patient ${patientId}`);
        }
      }
    } catch (e) {
      console.warn(`[API/Report] Conversation lookup failed (might be a patient ID):`, e);
    }

    const patientUser: any = await User.findById(patientId).lean();
    const patientProfile: any = await Patient.findOne({ userId: patientId }).lean();
    const medicalCtx: any = await MedicalContext.findOne({ patientId }).lean();
    
    if (!patientUser) {
       console.error(`[API/Report] No User found for id: ${patientId}`);
       return NextResponse.json({ error: 'Patient account not found' }, { status: 404 });
    }

    const fullName = `${patientUser.firstName} ${patientUser.lastName}`.trim();
    const dob = patientProfile?.dateOfBirth ? new Date(patientProfile.dateOfBirth).toLocaleDateString('en-ZA') : 'N/A';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = new ReadableStream({
      start(controller) {
        doc.on('data', (chunk) => controller.enqueue(chunk));
        doc.on('end', () => controller.close());
        doc.on('error', (err) => controller.error(err));
        
        try {
          doc.fontSize(24).font('Helvetica-Bold').fillColor('#0052cc').text('24/7 DigiHealth', { align: 'center' });
          doc.fontSize(10).font('Helvetica').fillColor('gray').text('Strictly Confidential Clinical Information', { align: 'center' });
          doc.moveDown(2);

          doc.fontSize(16).fillColor('black').font('Helvetica-Bold').text('Patient Clinical Report', { underline: true });
          doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Patient ID: ${patientId.toUpperCase()}`);
          doc.moveDown(1.5);

          const addSectionHeader = (title: string) => {
            doc.moveDown(1);
            doc.fontSize(14).fillColor('#0052cc').font('Helvetica-Bold').text(title);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            doc.moveDown(0.5);
          };

          addSectionHeader('Demographics');
          doc.fontSize(11).font('Helvetica').fillColor('#333');
          doc.text(`Full Name: `, { continued: true }).font('Helvetica-Bold').text(fullName);
          doc.font('Helvetica').text(`Date of Birth: `, { continued: true }).font('Helvetica-Bold').text(dob);
          doc.font('Helvetica').text(`Gender: `, { continued: true }).font('Helvetica-Bold').text(patientProfile?.gender || 'N/A');
          doc.font('Helvetica').text(`Mobile: `, { continued: true }).font('Helvetica-Bold').text(patientUser.mobile || patientProfile?.mobileNumber || 'N/A');
          doc.font('Helvetica').text(`Emergency Contact: `, { continued: true }).font('Helvetica-Bold').text(`${patientProfile?.emergencyContact?.name || 'N/A'} (${patientProfile?.emergencyContact?.phone || 'N/A'})`);
          
          addSectionHeader('Clinical Background');
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Chronic Conditions:');
          doc.fontSize(11).font('Helvetica').fillColor('#555');
          const conditions = medicalCtx?.chronicConditions || patientProfile?.medicalHistory || [];
          if (conditions.length > 0) {
            conditions.forEach((c: string) => doc.text(`• ${c}`));
          } else {
             doc.text('No chronic conditions recorded.');
          }
          doc.moveDown(1);

          doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Allergies:');
          const allergies = medicalCtx?.allergies || patientProfile?.allergies || [];
          if (allergies.length > 0) {
            allergies.forEach((a: any) => {
               const allergenName = typeof a === 'string' ? a : a.allergen;
               const reaction = typeof a === 'string' ? '' : ` (${a.reaction})`;
               doc.text(`• ${allergenName}${reaction}`);
            });
          } else {
             doc.text('No known allergies.');
          }

          addSectionHeader('Active Medications');
          const meds = medicalCtx?.currentMedications || patientProfile?.currentMedications || [];
          if (meds.length > 0) {
            meds.forEach((m: string) => doc.text(`• ${m}`));
          } else {
            doc.text('No active medications on record.');
          }

          const bottom = doc.page.height - 50;
          doc.fontSize(8).fillColor('gray').text(
            `Generated on ${new Date().toLocaleString('en-ZA')} securely via 24/7 DigiHealth Platform.`,
            50,
            bottom,
            { align: 'center', width: 500 }
          );

          doc.end();
        } catch (genErr) {
          console.error('[API/Report] Generation logic error:', genErr);
          controller.error(genErr);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fullName.replace(/ /g, '_')}_Clinical_Report.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[GET /api/chat/report/[id]] Final Catch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
