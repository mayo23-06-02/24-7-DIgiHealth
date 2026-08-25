import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePatientAccess } from "@/lib/auth/access";
import { apiError } from "@/lib/api/errors";
import { MedicalDocument as DigitalDocument } from "@/lib/models/ReviewsDocs";
import {
  durableUrl,
  isSupabaseConfigured,
  uploadBuffer,
} from "@/lib/supabase/media";
import { inferMimeFromFileName } from "@/lib/supabase/media-validation";

// POST /api/practitioner/patients/[id]/documents
// Practitioner attaches a document/image to a patient's record.
// Accepts:
// - multipart `file` (legacy), or
// - JSON `{ url, mediaId, type, mimeType, status }` (metadata-only for already-uploaded files)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();

    const { id: patientUserId } = await params;

    // Fourth and last private copy of the assigned-or-consulted rule; they are
    // all one function now.
    const userPayload = await requirePatientAccess(patientUserId);
    const practitionerId = userPayload.userId;

    const contentType = req.headers.get("content-type") || "";
    let fileUrl: string | null = null;
    let mediaId: string | null = null;
    let type = "Document";
    let mimeType = "application/octet-stream";
    let note = "";

    // Check if this is a metadata-only request (file already uploaded via useMediaUpload)
    if (!contentType.includes("multipart/form-data")) {
      const body = await req.json();
      const { url, mediaId: mid, type: t, mimeType: mt, status: st, note: n } = body;

      if (!url || !mid) {
        return NextResponse.json(
          { success: false, error: "url and mediaId are required (or use multipart file)" },
          { status: 400 },
        );
      }

      console.log("[POST /api/practitioner/patients/[id]/documents] Metadata-only request");
      fileUrl = url;
      mediaId = mid;
      type = t || "Document";
      mimeType = mt || "application/octet-stream";
      note = n || "";
    } else {
      // Legacy multipart form case
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { success: false, error: "Media storage is not configured" },
          { status: 503 },
        );
      }

      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name || "document";
      mimeType =
        file.type || inferMimeFromFileName(fileName) || "application/octet-stream";
      type = String(
        form.get("type") || fileName.replace(/\.[^.]+$/, "") || "Document",
      );
      note = String(form.get("note") || "");

      const asset = await uploadBuffer({
        buffer,
        fileName,
        mimeType,
        userId: patientUserId,
        purpose: "document",
        relatedType: "practitioner_document",
        patientId: patientUserId,
        isPublic: false,
      });

      fileUrl = durableUrl(asset);
      mediaId = asset.id;
    }

    const doc = await DigitalDocument.create({
      userId: patientUserId,
      uploadedBy: practitionerId,
      type,
      cloudinaryUrl: fileUrl!,
      publicId: mediaId!,
      mediaId: mediaId!,
      mimeType,
      note,
      status: "uploaded",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        type: doc.type,
        url: doc.cloudinaryUrl,
        mediaId: mediaId,
        mimeType: doc.mimeType,
        status: doc.status,
        createdAt: doc.createdAt,
        note: doc.note || "",
        uploadedByPractitioner: true,
      },
    });
  } catch (err: unknown) {
    // apiError already passes MediaValidationError and PublicError through
    // with their own message and status, and replaces anything else with copy
    // written for a person rather than the raw exception text.
    return apiError(err, "The document could not be uploaded. Please try again.");
  }
}
