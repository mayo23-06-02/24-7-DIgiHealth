import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Staff from '@/lib/models/Staff';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const staffId = params.id;

    const updatedStaff = await Staff.findByIdAndUpdate(staffId, body, { new: true }).populate('userId', 'firstName lastName email');

    if (!updatedStaff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStaff });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
      await connectToDatabase();
      const staffId = params.id;
  
      const deletedStaff = await Staff.findByIdAndDelete(staffId);
  
      if (!deletedStaff) {
        return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
      }
  
      return NextResponse.json({ success: true, data: {} });
  
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
