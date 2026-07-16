import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MedicalDocument as DigitalDocument } from "@/lib/models/ReviewsDocs";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Consultation } from "@/lib/models/Consultation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import mongoose from "mongoose";

async function assertAccess(practitionerId: string, patientUserId: string) {
  const practitionerProfile = await PractitionerProfile.findOne({
    userId: practitionerId,
  }).lean();
  const assignedIds = (
    (practitionerProfile as any)?.assignedPatientIds || []
  ).map((pid: any) => pid.toString());
  const hasConsultation = await Consultation.exists({
    patientId: patientUserId,
    practitionerId,
  });
  return assignedIds.includes(patientUserId) || !!hasConsultation;
}

// PATCH /api/practitioner/patients/[id]/documents/[docId] — update note/label
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    await connectToDatabase();
    const userPayload = await getRequestUser();
    if (
      !userPayload ||
      (userPayload.role !== "practitioner" && userPayload.role !== "mega_admin")
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: patientUserId, docId } = await params;
    if (
      !mongoose.Types.ObjectId.isValid(patientUserId) ||
      !mongoose.Types.ObjectId.isValid(docId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const allowed = await assertAccess(userPayload.userId, patientUserId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Access denied: Patient not linked to your practice" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { type, note } = body;
    const update: Record<string, string> = {};
    if (type !== undefined) update.type = type;
    if (note !== undefined) update.note = note;

    const doc = await DigitalDocument.findOneAndUpdate(
      { _id: docId, userId: patientUserId },
      update,
      { new: true },
    ).lean();

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (doc as any)._id.toString(),
        type: (doc as any).type,
        note: (doc as any).note || "",
      },
    });
  } catch (err: any) {
    console.error("[PATCH /api/practitioner/patients/[id]/documents/[docId]]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Update failed" },
      { status: 500 },
    );
  }
}
