import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MedicalDocument as DigitalDocument } from "@/lib/models/ReviewsDocs";
import User from "@/lib/models/User";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  uploadBuffer,
} from "@/lib/supabase/media";
import { inferMimeFromFileName } from "@/lib/supabase/media-validation";
import { isMongoObjectId } from "@/lib/utils/mongoId";

import { apiError } from "@/lib/api/errors";
// GET /api/user/documents – list all documents for the current user
export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docs = await DigitalDocument.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      success: true,
      data: docs.map((d: any) => ({
        id: d._id.toString(),
        type: d.type,
        url: d.cloudinaryUrl,
        mediaId: d.mediaId || d.publicId || null,
        mimeType: d.mimeType,
        status: d.status,
        createdAt: d.createdAt,
        note: d.note || "",
      })),
    });
  } catch (err: any) {
    return apiError(err);
  }
}

/**
 * POST /api/user/documents
 * Accepts:
 * - multipart `file` (preferred), or
 * - JSON `{ dataUrl, mimeType, type, isAvatar }` (legacy profile page), or
 * - JSON `{ url, mediaId, type, mimeType, status }` (metadata-only for already-uploaded files)
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let mimeType: string;
    let fileName: string;
    let type = "general";
    let isAvatar = false;
    let note = "";
    let fileUrl: string | null = null;
    let mediaId: string | null = null;

    // Check if this is a metadata-only request (file already uploaded via useMediaUpload)
    if (!contentType.includes("multipart/form-data")) {
      const body = await req.json();
      const { url, mediaId: mid, type: t, mimeType: mt, status: st, dataUrl, isAvatar: av } = body;

      // Metadata-only case (file already uploaded)
      if (url && mid) {
        console.log("[POST /api/user/documents] Metadata-only request for already-uploaded file");
        const doc = await DigitalDocument.create({
          userId: user.userId,
          uploadedBy: user.userId,
          type: t || "Document",
          cloudinaryUrl: url,
          publicId: mid,
          mediaId: mid,
          mimeType: mt || "application/octet-stream",
          note: body.note || "",
          status: st || "uploaded",
        });

        return NextResponse.json({
          success: true,
          data: {
            id: doc._id.toString(),
            type: doc.type,
            url: doc.cloudinaryUrl,
            mediaId: doc.mediaId,
            mimeType: doc.mimeType,
            status: doc.status,
            createdAt: doc.createdAt,
            note: doc.note || "",
          },
        });
      }

      // Legacy dataUrl case
      if (!dataUrl || !mt) {
        return NextResponse.json(
          { error: "dataUrl and mimeType are required (or use multipart file)" },
          { status: 400 },
        );
      }
      mimeType = mt;
      type = t || "general";
      isAvatar = !!av;
      const base64 = String(dataUrl).includes("base64,")
        ? String(dataUrl).split("base64,")[1]
        : String(dataUrl);
      buffer = Buffer.from(base64, "base64");
      const ext = mimeType.includes("pdf")
        ? "pdf"
        : mimeType.includes("png")
          ? "png"
          : "jpg";
      fileName = isAvatar ? `avatar.${ext}` : `document.${ext}`;
    } else {
      // Multipart form case
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { error: "Media storage is not configured" },
          { status: 503 },
        );
      }

      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name || "document";
      // Some browsers leave file.type empty — infer from extension
      mimeType =
        file.type ||
        inferMimeFromFileName(fileName) ||
        "application/octet-stream";
      type = String(
        form.get("type") || fileName.replace(/\.[^.]+$/, "") || "Document",
      );
      isAvatar = form.get("isAvatar") === "true";
      note = String(form.get("note") || "");
    }

    // Upload to Supabase if we have a buffer (multipart or legacy dataUrl)
    if (buffer) {
      const asset = await uploadBuffer({
        buffer,
        fileName,
        mimeType,
        userId: user.userId,
        purpose: isAvatar ? "avatar" : "document",
        relatedType: isAvatar ? "avatar" : "user_document",
        isPublic: false,
      });

      fileUrl = durableUrl(asset);
      mediaId = asset.id;

      if (isAvatar) {
        // The Supabase asset (purpose: "avatar") is now the source of truth —
        // see getUserAvatarUrl(). Nothing else needs to be written for the
        // picture to take effect.
        //
        // The Mongo column is still mirrored, best-effort, purely so any
        // remaining reader of `User.avatarUrl` stays consistent. It is skipped
        // for Postgres-native accounts, whose uuid can never be a Mongo `_id` —
        // attempting it is what used to make this whole endpoint 500.
        if (isMongoObjectId(user.userId)) {
          try {
            await User.findByIdAndUpdate(user.userId, { avatarUrl: fileUrl });
          } catch (mirrorErr) {
            console.warn(
              "[POST /api/user/documents] avatar mirror to Mongo failed:",
              mirrorErr,
            );
          }
        }

        return NextResponse.json({
          success: true,
          data: { url: fileUrl, mediaId: asset.id },
        });
      }
    }

    const doc = await DigitalDocument.create({
      userId: user.userId,
      uploadedBy: user.userId,
      type,
      cloudinaryUrl: fileUrl!,
      publicId: mediaId!,
      mediaId: mediaId!,
      mimeType,
      note,
      // Visible immediately on patient profile + to linked doctors
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
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/user/documents]", err);
    // Surface a clear message when Supabase media env is missing / misconfigured
    const msg =
      err?.message?.includes("not configured") ||
      err?.message?.includes("Supabase")
        ? "Document storage is not configured. Contact support or check SUPABASE media env vars."
        : err.message || "Upload failed";
    return NextResponse.json({ error: msg }, { status });
  }
}
