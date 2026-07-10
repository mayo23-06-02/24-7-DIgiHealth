import { randomUUID } from "crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "./server";
import {
  MEDIA_BUCKET,
  mediaProxyPath,
  type CompleteUploadInput,
  type ListMediaFilter,
  type MediaAsset,
  type MediaPurpose,
  type SignUploadInput,
  type SignedUploadResult,
} from "./media-types";
import {
  MediaValidationError,
  scanFileOptional,
  validateFileMeta,
} from "./media-validation";

export {
  MEDIA_BUCKET,
  mediaProxyPath,
  isSupabaseConfigured,
  MediaValidationError,
  type MediaAsset,
  type SignUploadInput,
  type SignedUploadResult,
  type CompleteUploadInput,
  type ListMediaFilter,
  type MediaPurpose,
};

export type { MediaFileType } from "./media-types";

type DbRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  related_type: string | null;
  related_id: string | null;
  file_name: string;
  file_path: string;
  public_url: string | null;
  mime_type: string;
  file_size: number;
  file_type: MediaAsset["fileType"];
  is_public: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): MediaAsset {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    relatedType: row.related_type,
    relatedId: row.related_id,
    fileName: row.file_name,
    filePath: row.file_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    fileType: row.file_type,
    isPublic: row.is_public,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Build storage object path from purpose + ownership context */
export function prepareUploadPath(
  input: SignUploadInput & { ext: string },
): string {
  const id = randomUUID();
  const { purpose, userId, conversationId, patientId, facilityId, registrationToken, ext } =
    input;

  switch (purpose) {
    case "avatar":
      return `users/${userId}/avatars/${id}.${ext}`;
    case "document":
      return `users/${userId}/documents/${id}.${ext}`;
    case "chat":
      if (!conversationId) {
        throw new MediaValidationError("conversationId required for chat media");
      }
      return `conversations/${conversationId}/${id}.${ext}`;
    case "prescription":
      return `prescriptions/${patientId || userId}/${id}.${ext}`;
    case "facility":
      return `facilities/${facilityId || userId}/${id}.${ext}`;
    case "registration":
      if (registrationToken) {
        return `registration/pending/${registrationToken}/${id}.${ext}`;
      }
      return `users/${userId}/registration/${id}.${ext}`;
    default:
      return `users/${userId}/other/${id}.${ext}`;
  }
}

export async function createSignedUpload(
  input: SignUploadInput,
): Promise<SignedUploadResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { fileType, safeName, ext } = validateFileMeta({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    purpose: input.purpose,
  });

  // Prescriptions are never public
  const isPublic =
    input.purpose === "prescription" ? false : !!input.isPublic;

  const filePath = prepareUploadPath({ ...input, ext });
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    throw new Error(error?.message || "Failed to create signed upload URL");
  }

  return {
    filePath,
    signedUrl: data.signedUrl,
    token: data.token,
    fileType,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    bucket: MEDIA_BUCKET,
  };
}

/** Server-side buffer upload (chat/prescriptions/API multipart) */
export async function uploadBuffer(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
  purpose: MediaPurpose;
  conversationId?: string;
  relatedType?: string;
  relatedId?: string;
  patientId?: string;
  facilityId?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<MediaAsset> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { fileType, safeName, ext } = validateFileMeta({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
    purpose: input.purpose,
  });

  await scanFileOptional({ buffer: input.buffer, mimeType: input.mimeType });

  const isPublic =
    input.purpose === "prescription" ? false : !!input.isPublic;

  const filePath = prepareUploadPath({
    userId: input.userId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
    purpose: input.purpose,
    conversationId: input.conversationId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    isPublic,
    ext,
  });

  const supabase = getSupabaseAdmin();
  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, input.buffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(upErr.message || "Storage upload failed");
  }

  return completeUpload({
    userId: input.userId,
    filePath,
    fileName: safeName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
    fileType,
    purpose: input.purpose,
    conversationId: input.conversationId,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    isPublic,
    metadata: input.metadata,
  });
}

export async function completeUpload(
  input: CompleteUploadInput,
): Promise<MediaAsset> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  // Path ownership: must start with expected prefix for this user (or registration pending)
  const pathOk =
    input.filePath.includes(`/${input.userId}/`) ||
    input.filePath.startsWith(`users/${input.userId}/`) ||
    input.filePath.startsWith(`conversations/`) ||
    input.filePath.startsWith(`prescriptions/`) ||
    input.filePath.startsWith(`facilities/`) ||
    input.filePath.startsWith(`registration/pending/`);

  if (!pathOk) {
    throw new MediaValidationError("Invalid file path for user");
  }

  const supabase = getSupabaseAdmin();

  // Verify object exists
  const folder = input.filePath.split("/").slice(0, -1).join("/");
  const name = input.filePath.split("/").pop()!;
  const { data: listed, error: listErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .list(folder, { search: name });

  if (listErr) {
    throw new Error(listErr.message || "Failed to verify upload");
  }
  const found = (listed || []).some((f) => f.name === name);
  if (!found) {
    throw new MediaValidationError("Upload not found in storage — complete after upload finishes");
  }

  let publicUrl: string | null = null;
  if (input.isPublic) {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(input.filePath);
    publicUrl = data.publicUrl;
  }

  const { data: row, error } = await supabase
    .from("media_assets")
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId || null,
      related_type: input.relatedType || input.purpose || null,
      related_id: input.relatedId || null,
      file_name: input.fileName,
      file_path: input.filePath,
      public_url: publicUrl,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      file_type: input.fileType,
      is_public: !!input.isPublic,
      metadata: input.metadata || {},
    })
    .select("*")
    .single();

  if (error || !row) {
    // Best-effort cleanup orphan storage object
    await supabase.storage.from(MEDIA_BUCKET).remove([input.filePath]);
    throw new Error(error?.message || "Failed to save media asset");
  }

  return mapRow(row as DbRow);
}

export async function getMediaById(id: string): Promise<MediaAsset | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as DbRow) : null;
}

export async function getSignedDownloadUrl(
  filePath: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed URL");
  }
  return data.signedUrl;
}

export async function listMedia(filter: ListMediaFilter): Promise<MediaAsset[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase.from("media_assets").select("*").order("created_at", {
    ascending: false,
  });

  if (filter.userId) q = q.eq("user_id", filter.userId);
  if (filter.conversationId) q = q.eq("conversation_id", filter.conversationId);
  if (filter.relatedType) q = q.eq("related_type", filter.relatedType);
  if (filter.relatedId) q = q.eq("related_id", filter.relatedId);
  if (filter.fileType) q = q.eq("file_type", filter.fileType);
  q = q.limit(Math.min(filter.limit || 50, 100));

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r) => mapRow(r as DbRow));
}

export async function deleteMedia(id: string): Promise<void> {
  const asset = await getMediaById(id);
  if (!asset) return;

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(MEDIA_BUCKET).remove([asset.filePath]);
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Replace existing asset: upload new buffer, delete old storage, update row */
export async function replaceMediaBuffer(
  id: string,
  input: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    userId: string;
    purpose: MediaPurpose;
    conversationId?: string;
    patientId?: string;
  },
): Promise<MediaAsset> {
  const existing = await getMediaById(id);
  if (!existing) throw new MediaValidationError("Media not found");
  if (existing.userId !== input.userId) {
    throw new MediaValidationError("Not allowed to replace this file");
  }

  const created = await uploadBuffer({
    ...input,
    relatedType: existing.relatedType || undefined,
    relatedId: existing.relatedId || undefined,
    isPublic: existing.isPublic,
  });

  // Remove old
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(MEDIA_BUCKET).remove([existing.filePath]);
  await supabase.from("media_assets").delete().eq("id", existing.id);

  return created;
}

/** Claim registration-pending assets for a newly created user */
export async function claimRegistrationMedia(
  registrationToken: string,
  userId: string,
): Promise<MediaAsset[]> {
  const supabase = getSupabaseAdmin();
  const prefix = `registration/pending/${registrationToken}/`;

  const { data: rows, error } = await supabase
    .from("media_assets")
    .select("*")
    .like("file_path", `${prefix}%`);

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const updated: MediaAsset[] = [];
  for (const row of rows as DbRow[]) {
    const { data, error: uErr } = await supabase
      .from("media_assets")
      .update({ user_id: userId })
      .eq("id", row.id)
      .select("*")
      .single();
    if (!uErr && data) updated.push(mapRow(data as DbRow));
  }
  return updated;
}

/**
 * Resolve a durable app URL for an asset.
 * Private files use the permanent proxy path (fresh signed URL on each hit).
 */
export function durableUrl(asset: MediaAsset): string {
  if (asset.isPublic && asset.publicUrl) return asset.publicUrl;
  return mediaProxyPath(asset.id);
}

/** Image transform URL (Supabase image transformation when enabled on project) */
export function buildImageTransformUrl(
  filePath: string,
  opts: { width?: number; height?: number; quality?: number } = {},
): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  const q = params.toString();
  return `${base}/storage/v1/render/image/public/${MEDIA_BUCKET}/${filePath}${q ? `?${q}` : ""}`;
}
