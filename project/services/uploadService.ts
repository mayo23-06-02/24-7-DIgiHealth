"use client";

/**
 * Service to manage temporary file uploads and registration data submission.
 * This interacts with the Next.js API layer.
 */

interface UploadResponse {
  tempUrl: string;
  tempPublicId: string;
}

/**
 * Fetches short-lived upload token to prevent unauthorized temp-folder abuse.
 */
export async function fetchUploadToken(): Promise<string> {
  const res = await fetch("/api/upload/request-token"); // To be implemented in next step
  if (!res.ok) throw new Error("Failed to authenticate upload request.");
  const data = await res.json();
  return data.token;
}

/**
 * Uploads chosen file to a Cloudinary temporary directory via Next.js API.
 * The temp location is cleared after 24 hours if registration isn't completed.
 */
export async function uploadToTemp(file: File, token: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload/temp", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) throw new Error("File upload could not be processed.");
  return await res.json();
}

/**
 * Submits the final registration data for a specific role (Patient, Practitioner, etc.)
 */
export async function submitRegistration(role: string, data: any): Promise<any> {
  const res = await fetch(`/api/auth/register/${role.toLowerCase()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error?.message || "Registration failed. Please contact support.");
  }

  return result;
}
