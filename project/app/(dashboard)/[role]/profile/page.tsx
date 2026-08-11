"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useMediaUpload } from "@/components/media/useMediaUpload";
import {
  User,
  ShieldCheck,
  Bell,
  Wallet,
  Briefcase,
  FileText,
  Loader2,
  Star,
  IdCard,
  Building2,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  Users,
} from "lucide-react";

import Toast from "@/components/ui/Toast";
import { inferMimeFromFileName } from "@/lib/supabase/media-validation";

import ProfileHero from "./components/ProfileHero";
import ProfileNavigation from "./components/ProfileNavigation";
import IdentityTab from "./components/IdentityTab";
import RoleDataTab from "./components/RoleDataTab";
const DocumentsTab = dynamic(() => import("./components/DocumentsTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16 rounded-lg border border-slate-200 bg-white">
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  ),
});
import SecurityTab from "./components/SecurityTab";
import NotificationsTab from "./components/NotificationsTab";
import BillingTab from "./components/BillingTab";
import FamilyTab from "./components/FamilyTab";
import ProfileSidebar from "./components/ProfileSidebar";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  /** E.164 for Firebase phone MFA (+27 / +268) */
  phoneE164?: string;
  phoneMasked?: string;
  saId: string;
  role: string;
  mfaEnabled: boolean;
  avatarUrl: string | null;
  status: string;
}

interface PatientRoleData {
  medicalAid: { provider: string; planName: string; memberNumber: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  subscriptionTier: string;
  dateOfBirth?: string;
  gender?: string;
}

interface PractitionerRoleData {
  specialisation: string;
  hpcsaNumber: string;
  experienceYears: number;
  bio: string;
  languages: string[];
  acceptedMedicalAids: string[];
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    taxNumber: string;
  };
  hpcsaVerified: boolean;
  rating: number;
  reviewCount: number;
}

interface HospitalAdminRoleData {
  department: string;
  permissions: string[];
  facility: {
    name: string;
    facilityType: string;
    contactInfo: { phone: string; email: string };
    address: { city: string; province: string; street?: string };
    bedCapacity: {
      total: number;
      generalAvailable: number;
      icuAvailable: number;
    };
    specialties: string[];
    emergencyServices: boolean;
  };
}

interface Device {
  id: string;
  name: string;
  lastUsed: string;
  active: boolean;
}

interface UserDocument {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  status: string;
  createdAt: string;
  note?: string;
}

interface NotifPrefs {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function ProfilePage() {
  const { role } = useParams();
  const currentRole = (role as string) || "patient";

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocLabel, setEditDocLabel] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { upload: uploadMedia, progress: mediaUploadProgress, uploading: mediaUploading, error: mediaUploadError } = useMediaUpload();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [patientData, setPatientData] = useState<PatientRoleData | null>(null);
  const [practitionerData, setPractitionerData] =
    useState<PractitionerRoleData | null>(null);
  const [hospitalData, setHospitalData] =
    useState<HospitalAdminRoleData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notifications, setNotifications] = useState<NotifPrefs>({
    email: true,
    push: true,
    sms: false,
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [billingData, setBillingData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, roleDataRes, notifsRes, devicesRes, docsRes, billingRes] =
        await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/role-data"),
          fetch("/api/user/notifications"),
          fetch("/api/user/devices"),
          fetch("/api/user/documents"),
          fetch("/api/billing"),
        ]);

      if (profileRes.ok) {
        const d = await profileRes.json();
        setUser(d.data);
      }
      if (notifsRes.ok) {
        const d = await notifsRes.json();
        setNotifications(d.data);
      }
      if (devicesRes.ok) {
        const d = await devicesRes.json();
        setDevices(d.data || []);
      }
      if (roleDataRes.ok) {
        const d = await roleDataRes.json();
        if (currentRole === "patient") setPatientData(d.data);
        else if (currentRole === "practitioner") setPractitionerData(d.data);
        else if (currentRole === "hospital_admin") setHospitalData(d.data);
      }
      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocuments(d.data || []);
      }
      if (billingRes.ok) {
        const d = await billingRes.json();
        setBillingData(d);
      }
    } catch (err) {
      console.error("Failed to load profile data", err);
    }
    setIsLoading(false);
  }, [currentRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          mobile: user.mobile,
        }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.data) {
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  ...json.data,
                  id: prev.id,
                  email: prev.email,
                  saId: prev.saId,
                  role: prev.role,
                  status: prev.status,
                }
              : prev,
          );
        }
        setToast({
          message: "Profile synchronized successfully.",
          type: "success",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleSaveRoleData = async () => {
    setIsSaving(true);
    try {
      const body =
        currentRole === "patient"
          ? {
              medicalAid: patientData?.medicalAid,
              emergencyContact: patientData?.emergencyContact,
            }
          : currentRole === "practitioner"
            ? {
                bankAccount: practitionerData?.bankAccount,
                bio: practitionerData?.bio,
                languages: practitionerData?.languages,
              }
            : {
                facility: hospitalData?.facility,
                department: hospitalData?.department,
              };
      const res = await fetch("/api/user/role-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setToast({
        message: res.ok ? "Configuration updated." : "Save failed.",
        type: res.ok ? "success" : "error",
      });
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });
      setToast({ message: "Preferences updated.", type: "success" });
    } catch {
      setToast({ message: "Save error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await fetch(`/api/user/devices/${id}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setToast({ message: "Device revoked.", type: "info" });
    } catch {
      setToast({ message: "Error.", type: "error" });
    }
  };

  const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const ALLOWED_DOC = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ...ALLOWED_IMAGE,
  ];

  const uploadOneFile = async (
    file: File,
    opts: { isAvatar?: boolean; type?: string },
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.isAvatar) form.append("isAvatar", "true");
    if (opts.type) form.append("type", opts.type);
    const res = await fetch("/api/user/documents", {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to upload ${file.name}`);
    }
    return data.data as {
      id?: string;
      url: string;
      type?: string;
      mimeType?: string;
      status?: string;
      createdAt?: string;
      mediaId?: string;
    };
  };

  /** Same as uploadOneFile but reports real upload progress via XHR. */
  const uploadOneFileWithProgress = (
    file: File,
    opts: { type?: string },
    onProgress: (pct: number) => void,
  ): Promise<{
    id?: string;
    url: string;
    type?: string;
    mimeType?: string;
    status?: string;
    createdAt?: string;
    mediaId?: string;
  }> => {
    console.log("[uploadOneFileWithProgress] Starting upload for:", file.name, "opts:", opts);
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      if (opts.type) form.append("type", opts.type);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/user/documents");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          console.log("[uploadOneFileWithProgress] Progress:", pct, "for", file.name);
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        console.log("[uploadOneFileWithProgress] Upload complete for", file.name, "status:", xhr.status);
        let data: any = {};
        try {
          data = JSON.parse(xhr.responseText || "{}");
          console.log("[uploadOneFileWithProgress] Response data:", data);
        } catch {
          console.log("[uploadOneFileWithProgress] Failed to parse response");
          /* ignore parse error, handled below */
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          onProgress(100);
          resolve(data.data);
        } else {
          console.error("[uploadOneFileWithProgress] Upload failed:", data.error || `Status ${xhr.status}`);
          reject(new Error(data.error || `Failed to upload ${file.name}`));
        }
      };
      xhr.onerror = () => {
        console.error("[uploadOneFileWithProgress] Network error for", file.name);
        reject(new Error(`Network error uploading ${file.name}`));
      };
      xhr.send(form);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const effectiveType = file.type || inferMimeFromFileName(file.name) || "";
    if (!ALLOWED_IMAGE.includes(effectiveType)) {
      setToast({
        message: "Use JPG, PNG, WebP or GIF for your photo.",
        type: "error",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: "Photo must be under 10MB.", type: "error" });
      return;
    }
    setIsUploadingDoc(true);
    try {
      const data = await uploadOneFile(file, { isAvatar: true });
      // Prefer durable server URL; fall back to local preview
      const previewUrl = data.url || URL.createObjectURL(file);
      setUser((prev) => (prev ? { ...prev, avatarUrl: previewUrl } : prev));
      setToast({ message: "Profile photo updated.", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : "Photo upload failed.",
        type: "error",
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleFilesUpload = async (
    files: FileList | File[],
    kind: "photo" | "document" | "auto" = "auto",
  ) => {
    const list = Array.from(files || []);
    if (!list.length) {
      console.log("[handleFilesUpload] No files selected");
      return;
    }

    console.log("[handleFilesUpload] Starting upload for", list.length, "files, kind:", kind);
    setUploadError(null);
    setIsUploadingDoc(true);

    // Show a queue row for every selected file immediately — the user sees
    // feedback the instant they pick a file, before any network call happens.
    const entries = list.map((file) => ({
      file,
      queueId: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    console.log("[handleFilesUpload] Created upload queue entries:", entries);
    setUploadQueue((prev) => [
      ...entries.map(({ file, queueId }) => ({
        id: queueId,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
      })),
      ...prev,
    ]);

    let ok = 0;
    for (const { file, queueId } of entries) {
      const effectiveType = file.type || inferMimeFromFileName(file.name) || "";
      const isImage = ALLOWED_IMAGE.includes(effectiveType);
      const isDoc = ALLOWED_DOC.includes(effectiveType);

      let rejectReason: string | null = null;
      if (kind === "photo" && !isImage) {
        rejectReason = `Not a supported photo (JPG/PNG/WebP/GIF).`;
      } else if (kind === "document" && !isDoc) {
        rejectReason = `Not supported. Use PDF, Word, or images.`;
      } else if (!isImage && !isDoc) {
        rejectReason = `File type is not allowed.`;
      } else {
        const max = isImage ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
        if (file.size > max) {
          rejectReason = `Too large (max ${isImage ? 10 : 15}MB).`;
        }
      }

      if (rejectReason) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, status: "error", error: rejectReason! } : q,
          ),
        );
        continue;
      }

      try {
        const label =
          kind === "photo" || (kind === "auto" && isImage)
            ? file.name.replace(/\.[^.]+$/, "") || "Photo"
            : file.name.replace(/\.[^.]+$/, "") || "Document";

        console.log("[handleFilesUpload] Uploading file via useMediaUpload:", file.name);
        const uploadedMedia = await uploadMedia(file, {
          purpose: "document",
          isPublic: false,
          onProgress: (pct) => {
            console.log("[handleFilesUpload] Progress:", pct, "for", file.name);
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === queueId ? { ...q, progress: pct } : q)),
            );
          },
        });

        console.log("[handleFilesUpload] Upload successful:", uploadedMedia);

        // Save document metadata to MongoDB
        const docRes = await fetch("/api/user/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: label,
            url: uploadedMedia.url,
            mediaId: uploadedMedia.id,
            mimeType: effectiveType,
            status: "uploaded",
          }),
        });

        if (!docRes.ok) {
          throw new Error("Failed to save document metadata");
        }

        const docData = await docRes.json();

        setDocuments((prev) => [
          {
            id: docData.data.id,
            type: docData.data.type || label,
            url: docData.data.url,
            mimeType: docData.data.mimeType || effectiveType,
            status: docData.data.status || "uploaded",
            createdAt: docData.data.createdAt || new Date().toISOString(),
            note: "",
          },
          ...prev,
        ]);
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, progress: 100, status: "success" } : q,
          ),
        );
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((q) => q.id !== queueId));
        }, 4000);
        ok += 1;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : `Failed: ${file.name}`;
        console.error("[handleFilesUpload] Upload error:", errorMsg);
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, status: "error", error: errorMsg } : q,
          ),
        );
        if (errorMsg.includes("not configured") || errorMsg.includes("Supabase")) {
          setUploadError(errorMsg);
        }
      }
    }
    setIsUploadingDoc(false);
    if (docInputRef.current) docInputRef.current.value = "";

    if (ok > 0) {
      setToast({
        message:
          ok === 1
            ? "File uploaded successfully."
            : `${ok} files uploaded successfully.`,
        type: "success",
      });
    }
  };

  const handleDismissUploadItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log("[handleDocUpload] Files:", files, "length:", files?.length);
    if (files && files.length > 0) {
      void handleFilesUpload(files, "auto");
    }
    // Clear after processing
    e.target.value = "";
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/user/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setToast({ message: "File deleted.", type: "info" });
      } else {
        setToast({ message: "Delete failed.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
  };

  const handleRenameDoc = async (id: string) => {
    if (!editDocLabel.trim()) return;
    try {
      const res = await fetch(`/api/user/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: editDocLabel.trim() }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, type: editDocLabel.trim() } : d,
          ),
        );
        setEditDocId(null);
        setEditDocLabel("");
        setToast({ message: "Label updated.", type: "success" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
  };

  const handleUpdateDocNote = async (id: string, note: string) => {
    try {
      const res = await fetch(`/api/user/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, note } : d)),
        );
        setToast({ message: "Note saved.", type: "success" });
      } else {
        setToast({ message: "Failed to save note.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
  };

  const handleSavePassword = async () => {
    if (!passwordState.currentPassword || !passwordState.newPassword) {
      setToast({ message: "Please fill all password fields.", type: "error" });
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setToast({ message: "New passwords do not match.", type: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordState.currentPassword,
          newPassword: passwordState.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({
          message: "Credentials rotated successfully.",
          type: "success",
        });
        setPasswordState({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setToast({
          message: data.error || "Failed to update password.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const health = useMemo(() => {
    if (!user) {
      return {
        completeness: 0,
        identity: 0,
        role: 0,
        security: 0,
        documents: 0,
        tips: [] as string[],
      };
    }

    let identityPts = 0;
    const identityMax = 4;
    if (user.firstName?.trim()) identityPts += 1;
    if (user.lastName?.trim()) identityPts += 1;
    if (user.mobile?.trim()) identityPts += 1;
    if (user.email?.trim()) identityPts += 1;
    const identity = Math.round((identityPts / identityMax) * 100);

    let rolePts = 0;
    let roleMax = 3;
    const tips: string[] = [];
    if (currentRole === "practitioner" && practitionerData) {
      roleMax = 5;
      if (practitionerData.specialisation) rolePts += 1;
      if (practitionerData.hpcsaNumber) rolePts += 1;
      if (practitionerData.bio?.trim()) rolePts += 1;
      else tips.push("Add a professional bio for patients to review.");
      if (practitionerData.languages?.length) rolePts += 1;
      if (practitionerData.bankAccount?.accountNumber) rolePts += 1;
      else tips.push("Complete bank details for payouts.");
    } else if (currentRole === "patient" && patientData) {
      roleMax = 4;
      if (patientData.emergencyContact?.name) rolePts += 1;
      else tips.push("Add an emergency contact.");
      if (patientData.emergencyContact?.phone) rolePts += 1;
      if (patientData.medicalAid?.provider) rolePts += 1;
      if (patientData.dateOfBirth || patientData.gender) rolePts += 1;
    } else if (currentRole === "hospital_admin" && hospitalData) {
      roleMax = 4;
      if (hospitalData.facility?.name) rolePts += 1;
      if (hospitalData.facility?.contactInfo?.phone) rolePts += 1;
      if (hospitalData.facility?.address?.city) rolePts += 1;
      if (hospitalData.department) rolePts += 1;
    }
    const role = Math.round((rolePts / Math.max(roleMax, 1)) * 100);

    let securityPts = 0;
    if (user.mfaEnabled) securityPts += 60;
    else tips.push("Enable multi-factor authentication.");
    if (user.mobile?.trim()) securityPts += 20;
    securityPts += 20; // password exists if logged in
    const security = Math.min(100, securityPts);

    const documentsScore =
      documents.length === 0
        ? 15
        : Math.min(100, 40 + documents.length * 15);
    if (documents.length === 0) {
      tips.push("Upload verification documents.");
    }

    const completeness = Math.round(
      identity * 0.3 + role * 0.3 + security * 0.25 + documentsScore * 0.15,
    );

    return {
      completeness,
      identity,
      role,
      security,
      documents: documentsScore,
      tips: tips.slice(0, 4),
    };
  }, [
    user,
    currentRole,
    practitionerData,
    patientData,
    hospitalData,
    documents.length,
  ]);

  if (isLoading || !user) {
    return (
      <div className="w-full max-w-[1400px] mx-auto pb-16 space-y-6 animate-pulse">
        <div className="h-48 rounded-lg bg-gradient-to-br from-primary/30 to-slate-200" />
        <div className="h-28 -mt-14 mx-4 rounded-lg bg-white border border-slate-200" />
        <div className="h-14 rounded-lg bg-surface-soft" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            <div className="h-64 rounded-lg bg-white border border-slate-200" />
            <div className="h-40 rounded-lg bg-white border border-slate-200" />
          </div>
          <div className="xl:col-span-4 h-80 rounded-lg bg-white border border-slate-200" />
        </div>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 pt-4">
          <Loader2 className="animate-spin text-primary" size={18} />
          Loading your profile…
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const roleLabel =
    currentRole === "practitioner"
      ? "Practitioner"
      : currentRole === "hospital_admin"
        ? "Hospital admin"
        : currentRole === "patient"
          ? "Patient"
          : user.role?.replace(/_/g, " ") || "Member";

  const subtitle =
    currentRole === "practitioner" && practitionerData
      ? [
          practitionerData.specialisation,
          practitionerData.experienceYears
            ? `${practitionerData.experienceYears} yrs experience`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : currentRole === "hospital_admin" && hospitalData?.facility?.name
        ? hospitalData.facility.name
        : currentRole === "patient" && patientData?.subscriptionTier
          ? `${patientData.subscriptionTier} plan`
          : undefined;

  const metaChips: { icon?: React.ReactNode; label: string }[] = [];
  if (currentRole === "practitioner" && practitionerData) {
    if (practitionerData.hpcsaNumber) {
      metaChips.push({
        icon: <IdCard size={13} className="text-slate-400" />,
        label: `HPCSA ${practitionerData.hpcsaNumber}`,
      });
    }
    if (practitionerData.rating > 0) {
      metaChips.push({
        icon: <Star size={13} className="text-warning-500" />,
        label: `${practitionerData.rating}/5 · ${practitionerData.reviewCount || 0} reviews`,
      });
    }
    if (practitionerData.hpcsaVerified) {
      metaChips.push({
        icon: <CheckCircle2 size={13} className="text-success-500" />,
        label: "HPCSA verified",
      });
    }
    if (practitionerData.languages?.length) {
      metaChips.push({
        label: practitionerData.languages.slice(0, 3).join(", "),
      });
    }
  }
  if (currentRole === "hospital_admin" && hospitalData?.facility) {
    metaChips.push({
      icon: <Building2 size={13} className="text-slate-400" />,
      label: hospitalData.facility.facilityType || "Facility",
    });
    if (hospitalData.facility.address?.city) {
      metaChips.push({
        label: [
          hospitalData.facility.address.city,
          hospitalData.facility.address.province,
        ]
          .filter(Boolean)
          .join(", "),
      });
    }
  }
  if (currentRole === "patient" && patientData?.medicalAid?.provider) {
    metaChips.push({
      label: patientData.medicalAid.provider,
    });
  }

  const tabs = [
    { id: "general", label: "Identity", icon: User },
    {
      id: "role-data",
      label:
        currentRole === "patient"
          ? "Clinical"
          : currentRole === "hospital_admin"
            ? "Facility"
            : "Practice",
      icon: Briefcase,
    },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "billing", label: "Billing", icon: Wallet },
    ...(currentRole === "patient" ? [{ id: "family", label: "Family", icon: Users }] : []),
  ];

  const healthItems = [
    {
      label: "Identity",
      value: health.identity,
      color: "bg-success-500",
      icon: <User size={14} />,
    },
    {
      label:
        currentRole === "patient"
          ? "Clinical"
          : currentRole === "hospital_admin"
            ? "Facility"
            : "Practice",
      value: health.role,
      color: "bg-primary",
      icon: <Briefcase size={14} />,
    },
    {
      label: "Security",
      value: health.security,
      color: "bg-warning-500",
      icon: <Lock size={14} />,
    },
    {
      label: "Documents",
      value: health.documents,
      color: "bg-violet-500",
      icon: <FileText size={14} />,
    },
  ];

  const accountFacts = [
    {
      label: "Email",
      value: user.email,
      icon: <Mail size={14} />,
    },
    {
      label: "Mobile",
      value: user.mobile || "Not set",
      icon: <Phone size={14} />,
    },
    {
      label: "Role",
      value: roleLabel,
      icon: <Briefcase size={14} />,
    },
    {
      label: "MFA",
      value: user.mfaEnabled ? "Enabled" : "Off",
      icon: <ShieldCheck size={14} />,
    },
  ];

  return (
    <div className="w-full max-full mx-auto space-y-6 md:space-y-7 pb-16 animate-in fade-in duration-500">
      <ProfileHero
        fullName={fullName}
        user={user}
        currentRole={currentRole}
        roleLabel={roleLabel}
        subtitle={subtitle}
        metaChips={metaChips}
        completeness={health.completeness}
        activeTab={activeTab}
        isUploadingDoc={isUploadingDoc}
        isSaving={isSaving}
        avatarInputRef={avatarInputRef}
        handleAvatarUpload={handleAvatarUpload}
        handleSaveNotifications={handleSaveNotifications}
        handleSaveRoleData={handleSaveRoleData}
        handleSaveProfile={handleSaveProfile}
      />

      <ProfileNavigation
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        <div className="xl:col-span-8 min-w-0 space-y-5">
          {activeTab === "general" && (
            <IdentityTab
              user={user}
              setUser={setUser}
              isSaving={isSaving}
              handleSaveProfile={handleSaveProfile}
            />
          )}

          {activeTab === "role-data" && (
            <RoleDataTab
              currentRole={currentRole}
              patientData={patientData}
              setPatientData={setPatientData}
              practitionerData={practitionerData}
              setPractitionerData={setPractitionerData}
              hospitalData={hospitalData}
              setHospitalData={setHospitalData}
              isSaving={isSaving}
              handleSaveRoleData={handleSaveRoleData}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              setDocuments={setDocuments}
              isUploadingDoc={isUploadingDoc}
              docInputRef={docInputRef}
              handleDocUpload={handleDocUpload}
              handleFilesUpload={handleFilesUpload}
              handleDeleteDoc={handleDeleteDoc}
              handleRenameDoc={handleRenameDoc}
              handleUpdateDocNote={handleUpdateDocNote}
              editDocId={editDocId}
              setEditDocId={setEditDocId}
              editDocLabel={editDocLabel}
              setEditDocLabel={setEditDocLabel}
              uploadError={uploadError}
              uploadQueue={uploadQueue}
              onDismissUploadItem={handleDismissUploadItem}
            />
          )}

          {activeTab === "security" && (
            <SecurityTab
              passwordState={passwordState}
              setPasswordState={setPasswordState}
              isSaving={isSaving}
              handleSavePassword={handleSavePassword}
              devices={devices}
              handleRevokeDevice={handleRevokeDevice}
              mfaEnabled={false}
              email={user.email}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              notifications={notifications}
              setNotifications={setNotifications}
              isSaving={isSaving}
              handleSaveNotifications={handleSaveNotifications}
            />
          )}

          {activeTab === "billing" && (
            <BillingTab
              currentRole={currentRole}
              patientData={patientData}
              billingData={billingData}
              setBillingData={setBillingData}
              setToast={setToast}
            />
          )}

          {activeTab === "family" && currentRole === "patient" && (
            <FamilyTab setToast={setToast} />
          )}
        </div>

        <ProfileSidebar
          setToast={setToast}
          completeness={health.completeness}
          healthItems={healthItems}
          accountFacts={accountFacts}
          tips={health.tips}
        />
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
