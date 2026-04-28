import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Consultation } from "@/lib/models/Consultation";
import { Notification } from "@/lib/models/Communications";
import User from "@/lib/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { practitionerId, date, time, type, chiefComplaint } =
      await request.json();

    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    // Create startTime and endTime
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60000); // 1 hour duration

    const newConsultation = await Consultation.create({
      patientId: userId,
      practitionerId,
      type: type || "video",
      status: "requested",
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      chiefComplaint: chiefComplaint || "Routine Medical Consultation",
    });

    // Create Notification for Practitioner
    const patientUser = await User.findById(userId);
    await Notification.create({
      userId: practitionerId,
      type: "new_appointment",
      title: "New Consultation Booked",
      body: `${patientUser?.firstName} ${patientUser?.lastName} has booked a ${type || "video"} consultation.`,
      data: { consultationId: newConsultation._id },
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      consultation: newConsultation,
    });
  } catch (error) {
    console.error("Booking API Error:", error);
    return NextResponse.json(
      { error: "Failed to book consultation" },
      { status: 500 },
    );
  }
}
