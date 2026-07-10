import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { buildHealthProfilePdf } from "@/lib/pdf/buildHealthProfilePdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";
import { connectToDatabase } from "@/lib/mongodb";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Consultation } from "@/lib/models/Consultation";

export const runtime = "nodejs";

/**
 * GET /api/chat/report/[id]
 * id = patient user id (or conversation id resolved to patient).
 * Patient may download own; practitioner if linked; mega_admin always.
 * No MFA required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    let patientId = id;

    // Resolve conversation → patient if needed
    try {
      const Conversation =
        mongoose.models.Conversation ||
        (await import("@/lib/models/Conversation")).default;
      const conversation = await Conversation.findById(id).lean();
      if (conversation && (conversation as any).patientId) {
        patientId = (conversation as any).patientId.toString();
      }
    } catch {
      /* id is patient */
    }

    const isSelf =
      user.role === "patient" && user.userId === patientId;
    const isAdmin = user.role === "mega_admin";
    let isLinkedPractitioner = false;

    if (user.role === "practitioner") {
      const profile = await PractitionerProfile.findOne({
        userId: user.userId,
      }).lean();
      const assigned = (profile?.assignedPatientIds || []).map((x: any) =>
        x.toString(),
      );
      const hasConsult = await Consultation.exists({
        patientId,
        practitionerId: user.userId,
      });
      isLinkedPractitioner =
        assigned.includes(patientId) || !!hasConsult;
    }

    if (!isSelf && !isAdmin && !isLinkedPractitioner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { buffer, fullName } = await buildHealthProfilePdf(patientId, {
      doctorId:
        user.role === "practitioner" ? user.userId : undefined,
    });
    const filename = `${fullName.replace(/\s+/g, "_")}_Health_Profile.pdf`;
    return pdfResponse(buffer, filename);
  } catch (error: any) {
    console.error("[GET /api/chat/report/[id]]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 },
    );
  }
}
