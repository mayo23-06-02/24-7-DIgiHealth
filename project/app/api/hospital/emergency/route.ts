import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EmergencyIncident from '@/lib/models/EmergencyIncident';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const incidents = await EmergencyIncident.find().sort({ timestamp: -1 });

    return NextResponse.json({ success: true, data: incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
   // To update emergency status
   try {
     await connectToDatabase();
     const body = await req.json();
     const { id, status } = body;
     
     const incident = await EmergencyIncident.findByIdAndUpdate(id, { status }, { new: true });
     return NextResponse.json({ success: true, data: incident });
   } catch (error: any) {
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
   }
}
