import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  getMediaById,
  getSignedDownloadUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/media";
import Conversation from "@/lib/models/Conversation";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Permanent app URL for media: redirects to a fresh signed Supabase URL.
 * Stored as Message.fileUrl / Prescription.documentUrl for new uploads.
 * Legacy Cloudinary URLs are never rewritten to this path.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const asset = await getMediaById(id);
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let allowed = asset.userId === user.userId || user.role === "mega_admin";
    if (!allowed && asset.conversationId) {
      await connectToDatabase();
      const conv = await Conversation.findById(asset.conversationId).lean();
      if (conv) {
        const p = String((conv as any).patientId);
        const d = String((conv as any).practitionerId);
        allowed = p === user.userId || d === user.userId;
      }
    }
    // Linked patient may view practitioner-owned profile documents (vice versa)
    if (
      !allowed &&
      user.role === "patient" &&
      (asset.relatedType === "user_document" ||
        asset.filePath.includes("/documents/") ||
        asset.filePath.includes("/avatars/") ||
        asset.filePath.startsWith(`users/${asset.userId}/`))
    ) {
      await connectToDatabase();
      const { canPractitionerAccessPatient } = await import(
        "@/lib/auth/canAccessPatient"
      );
      // Reuse same link rules: patient ↔ practitioner who have a relationship
      allowed = await canPractitionerAccessPatient(
        asset.userId,
        user.userId,
        "practitioner",
      );
    }
    // Prescriptions path: allow if related_type prescription and user is patient in path
    if (!allowed && asset.filePath.startsWith("prescriptions/")) {
      const patientFromPath = asset.filePath.split("/")[1];
      if (patientFromPath === user.userId) allowed = true;
      // Linked practitioners can view scripts they issued / patient scripts
      if (!allowed && (user.role === "practitioner" || user.role === "mega_admin")) {
        await connectToDatabase();
        const { canPractitionerAccessPatient } = await import(
          "@/lib/auth/canAccessPatient"
        );
        allowed = await canPractitionerAccessPatient(
          user.userId,
          patientFromPath,
          user.role,
        );
      }
    }
    // Patient profile documents: practitioners linked to the patient may view
    if (
      !allowed &&
      (user.role === "practitioner" || user.role === "mega_admin") &&
      (asset.relatedType === "user_document" ||
        asset.filePath.includes("/documents/") ||
        asset.filePath.startsWith(`users/${asset.userId}/`))
    ) {
      await connectToDatabase();
      const { canPractitionerAccessPatient } = await import(
        "@/lib/auth/canAccessPatient"
      );
      allowed = await canPractitionerAccessPatient(
        user.userId,
        asset.userId,
        user.role,
      );
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (asset.isPublic && asset.publicUrl) {
      return NextResponse.redirect(asset.publicUrl);
    }

    const signed = await getSignedDownloadUrl(asset.filePath, 3600);
    return NextResponse.redirect(signed);
  } catch (err: any) {
    console.error("[GET /api/media/file/[id]]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
