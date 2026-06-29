import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import { Notification } from "@/lib/models/Communications";
import User from "@/lib/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 },
      );
    }

    // Verify current user is either the patient or practitioner for this consultation
    if (
      consultation.patientId.toString() !== userId &&
      consultation.practitionerId.toString() !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isPatient = consultation.patientId.toString() === userId;
    const otherPartyId = isPatient ? consultation.practitionerId : consultation.patientId;
    const currentUser = await User.findById(userId);

    // Delete the consultation
    await Consultation.findByIdAndDelete(id);

    // Notify the other party
    await Notification.create({
      userId: otherPartyId,
      type: "appointment_declined",
      title: "Appointment Declined",
      body: `${isPatient ? "Patient" : `Dr. ${currentUser?.firstName} ${currentUser?.lastName}`} has declined the consultation request for ${new Date(consultation.scheduledStartTime).toLocaleString()}.`,
      data: { consultationId: consultation._id },
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment declined and deleted",
    });
  } catch (error) {
    console.error("Decline API Error:", error);
    return NextResponse.json(
      { error: "Failed to decline consultation" },
      { status: 500 },
    );
  }
}
