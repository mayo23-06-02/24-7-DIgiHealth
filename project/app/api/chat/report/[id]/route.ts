import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Patient from '@/lib/models/Patient';
import { MedicalContext, Prescription, LabResult } from '@/lib/models/ClinicalData';
import PDFDocument from 'pdfkit';

/* 
  Creates a PDF matching the exact clinical summary format.
*/
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    // id could be conversationId or patientId. We'll find patientId directly from it or assume it's patientId for easy fetching
    const { id } = await params;
    
    // In our simplified logic, let's assume id is conversationId and we lookup the patient.
    const Conversation = (await import('@/lib/models/Conversation')).default;
    const conversation = await Conversation.findById(id).lean();
    
    let patientId = id;
    if (conversation && conversation.patientId) {
      patientId = conversation.patientId.toString();
    }

    const patientUser = await User.findById(patientId).lean();
    const patientProfile = await Patient.findOne({ userId: patientId }).lean();
    const medicalCtx = await MedicalContext.findOne({ patientId }).lean();
    const prescriptions = await Prescription.find({ patientId }).lean();
    
    if (!patientUser && !patientProfile) {
       return NextResponse.json({ error: 'Patient data not found' }, { status: 404 });
    }

    const fullName = patientUser?.profile?.fullName || 'Unknown Patient';
    const dob = patientProfile?.dateOfBirth ? new Date(patientProfile.dateOfBirth).toLocaleDateString() : 'N/A';

    return new Promise<NextResponse>((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      let buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        const response = new NextResponse(pdfData, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fullName.replace(/ /g, '_')}_Clinical_Report.pdf"`
          }
        });
        resolve(response);
      });

      // -- Document Header
      doc.fontSize(24).font('Helvetica-Bold').text('24/7 DigiHealth', { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor('gray').text('Comprehensive Clinical Profile Report', { align: 'center' });
      doc.moveDown(2);

      // -- Patient Demographics
      doc.fontSize(16).fillColor('black').font('Helvetica-Bold').text('Patient Demographics');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`Full Name: ${fullName}`);
      doc.text(`Date of Birth: ${dob}`);
      doc.text(`Gender: ${patientProfile?.gender || 'N/A'}`);
      doc.text(`Blood Type: ${patientProfile?.bloodType || 'N/A'}`);
      doc.text(`Emergency Contact: ${patientProfile?.emergencyContact?.name || 'N/A'} (${patientProfile?.emergencyContact?.phone || 'N/A'})`);
      doc.moveDown(2);

      // -- Medical History
      doc.fontSize(16).fillColor('black').font('Helvetica-Bold').text('Clinical Background');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      doc.fontSize(12).font('Helvetica-Bold').text('Chronic Conditions:');
      doc.fontSize(10).font('Helvetica');
      const conditions = medicalCtx?.chronicConditions || patientProfile?.medicalHistory || [];
      if (conditions.length > 0) {
        conditions.forEach((c: string) => doc.text(`• ${c}`));
      } else {
         doc.text('No chronic conditions recorded.');
      }
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('Allergies:');
      doc.fontSize(10).font('Helvetica');
      const allergies = medicalCtx?.allergies || patientProfile?.allergies || [];
      if (allergies.length > 0) {
        allergies.forEach((a: any) => {
           const allergenName = typeof a === 'string' ? a : a.allergen;
           doc.text(`• ${allergenName}`);
        });
      } else {
         doc.text('No known allergies.');
      }
      doc.moveDown(2);

      // -- Active Medications
      doc.fontSize(16).fillColor('black').font('Helvetica-Bold').text('Active Medications');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      
      const meds = medicalCtx?.currentMedications || patientProfile?.currentMedications || [];
      if (meds.length > 0) {
        meds.forEach((m: string) => doc.text(`• ${m}`));
      } else {
        doc.text('No active medications on record.');
      }
      doc.moveDown(2);

      // Footer
      const bottom = doc.page.height - 50;
      doc.page.margins.bottom = 0;
      doc.fontSize(8).fillColor('gray').text(
        `Generated on ${new Date().toLocaleString('en-ZA')} securely via 24/7 DigiHealth Platform.`,
        50,
        bottom,
        { align: 'center', width: 500 }
      );

      doc.end();
    });
  } catch (error) {
    console.error('[GET /api/chat/report/[id]]', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
