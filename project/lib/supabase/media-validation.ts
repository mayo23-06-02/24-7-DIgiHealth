import {
  ALLOWED_MIME,
  EXT_BY_MIME,
  MAX_SIZE_BY_TYPE,
  type MediaFileType,
  type MediaPurpose,
} from "./media-types";

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export function inferFileType(mimeType: string): MediaFileType {
  const mime = (mimeType || "").toLowerCase().split(";")[0].trim();
  if (ALLOWED_MIME.image.includes(mime)) return "image";
  if (ALLOWED_MIME.pdf.includes(mime)) return "pdf";
  if (ALLOWED_MIME.video.includes(mime)) return "video";
  if (ALLOWED_MIME.audio.includes(mime)) return "audio";
  if (ALLOWED_MIME.document.includes(mime)) return "document";
  throw new MediaValidationError(`Unsupported file type: ${mimeType || "unknown"}`);
}

/** Infer MIME from extension when browser leaves file.type empty */
export function inferMimeFromFileName(fileName: string): string | null {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  return null;
}

export function validateFileMeta(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  purpose?: MediaPurpose;
}): { fileType: MediaFileType; safeName: string; ext: string } {
  const { fileName, fileSize } = input;

  if (!fileName?.trim()) {
    throw new MediaValidationError("File name is required");
  }
  let mimeType = (input.mimeType || "").trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    mimeType = inferMimeFromFileName(fileName) || mimeType;
  }
  if (!mimeType) {
    throw new MediaValidationError(
      "Could not detect file type. Use PDF, Word, JPG, or PNG.",
    );
  }
  if (!fileSize || fileSize <= 0) {
    throw new MediaValidationError("File is empty");
  }

  const mime = mimeType.toLowerCase().split(";")[0].trim();
  const fileType = inferFileType(mime);
  const max = MAX_SIZE_BY_TYPE[fileType];
  if (fileSize > max) {
    throw new MediaValidationError(
      `File too large for ${fileType} (max ${Math.round(max / (1024 * 1024))}MB)`,
    );
  }

  // Double-extension / path tricks
  const base = fileName.replace(/\\/g, "/").split("/").pop() || "file";
  if (base.includes("..") || /[\0]/.test(base)) {
    throw new MediaValidationError("Invalid file name");
  }
  const parts = base.split(".");
  if (parts.length > 3) {
    throw new MediaValidationError("Invalid file name (too many extensions)");
  }

  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    throw new MediaValidationError(`No extension mapping for ${mime}`);
  }

  // Prescriptions: force private document/pdf/image only
  if (input.purpose === "prescription") {
    if (!["pdf", "image", "document"].includes(fileType)) {
      throw new MediaValidationError("Prescriptions must be PDF or image");
    }
  }

  const safeName = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);

  return { fileType, safeName, ext };
}

/**
 * Optional virus scan hook — no-op until a provider is configured.
 * Wire ClamAV / third-party scanner here without changing call sites.
 */
export async function scanFileOptional(
  _payload: { buffer?: Buffer; url?: string; mimeType?: string },
): Promise<{ clean: boolean; detail?: string }> {
  // TODO: integrate virus scanning provider when available
  return { clean: true };
}

/** True if URL is a legacy Cloudinary/Firebase asset (leave as-is). */
export function isLegacyMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("res.cloudinary.com") ||
    url.includes("firebasestorage.googleapis.com") ||
    url.includes("storage.googleapis.com")
  );
}

/** True if app-relative media proxy path */
export function isMediaProxyPath(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/media/file/") || url.includes("/api/media/file/");
}
