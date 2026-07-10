/** Unified media types for DigiHealth Supabase media system */

export type MediaFileType = "image" | "pdf" | "video" | "audio" | "document";

export type MediaPurpose =
  | "avatar"
  | "document"
  | "chat"
  | "prescription"
  | "registration"
  | "facility"
  | "other";

export interface MediaAsset {
  id: string;
  userId: string;
  conversationId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  fileName: string;
  filePath: string;
  publicUrl?: string | null;
  mimeType: string;
  fileSize: number;
  fileType: MediaFileType;
  isPublic: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SignUploadInput {
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  purpose: MediaPurpose;
  conversationId?: string;
  relatedType?: string;
  relatedId?: string;
  isPublic?: boolean;
  /** For unauthenticated registration pending uploads */
  registrationToken?: string;
  patientId?: string;
  facilityId?: string;
}

export interface SignedUploadResult {
  filePath: string;
  signedUrl: string;
  token: string;
  fileType: MediaFileType;
  expiresAt: string;
  bucket: string;
}

export interface CompleteUploadInput {
  userId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileType: MediaFileType;
  purpose: MediaPurpose;
  conversationId?: string;
  relatedType?: string;
  relatedId?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ListMediaFilter {
  userId?: string;
  conversationId?: string;
  relatedType?: string;
  relatedId?: string;
  fileType?: MediaFileType;
  limit?: number;
}

/** Permanent app URL that redirects to a fresh signed download */
export function mediaProxyPath(mediaId: string): string {
  return `/api/media/file/${mediaId}`;
}

export const MEDIA_BUCKET = "media";

/** Max sizes in bytes by file type */
export const MAX_SIZE_BY_TYPE: Record<MediaFileType, number> = {
  image: 10 * 1024 * 1024,
  pdf: 15 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 15 * 1024 * 1024,
};

export const ALLOWED_MIME: Record<MediaFileType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
  video: ["video/mp4", "video/webm"],
  audio: ["audio/mpeg", "audio/webm", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
