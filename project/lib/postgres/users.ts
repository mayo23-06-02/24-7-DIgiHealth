/**
 * Dual-write sync helpers: mirror Mongo User/Profile writes into the new
 * Postgres tables (migration Phase 2). Every function is best-effort —
 * callers should invoke these AFTER the Mongo write succeeds and wrap the
 * call in try/catch (or rely on the fact these never throw), since Mongo
 * stays the source of truth until Phase 3 cuts reads over. A Postgres sync
 * failure must never fail the user-facing request.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

function admin() {
  return getSupabaseAdmin();
}

/** Best-effort wrapper — logs and swallows errors, never throws. */
async function safe(label: string, fn: () => Promise<{ error: any } | void>) {
  try {
    const result = await fn();
    if (result && "error" in result && result.error) {
      console.warn(`[pg-sync] ${label} failed:`, result.error.message || result.error);
    }
  } catch (err: any) {
    console.warn(`[pg-sync] ${label} threw:`, err?.message || err);
  }
}

export async function syncUser(mongoUser: {
  _id: any;
  email: string;
  passwordHash?: string;
  role: string;
  status?: string;
  firstName: string;
  lastName: string;
  saId?: string;
  mobile?: string;
  phoneE164?: string;
  mfaEnabled?: boolean;
  supabaseUid?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  otpCodeHash?: string | null;
  otpExpiresAt?: Date | null;
}) {
  const row = {
    mongo_id: mongoUser._id.toString(),
    email: mongoUser.email,
    password_hash: mongoUser.passwordHash || null,
    role: mongoUser.role,
    status: mongoUser.status || "active",
    first_name: mongoUser.firstName,
    last_name: mongoUser.lastName,
    sa_id: mongoUser.saId || null,
    mobile: mongoUser.mobile || null,
    phone_e164: mongoUser.phoneE164 || null,
    mfa_enabled: !!mongoUser.mfaEnabled,
    supabase_uid: mongoUser.supabaseUid || null,
    email_verified: mongoUser.emailVerified !== false,
    email_verified_at: mongoUser.emailVerifiedAt || null,
    otp_code_hash: mongoUser.otpCodeHash || null,
    otp_expires_at: mongoUser.otpExpiresAt || null,
  };

  await safe("syncUser", async () => {
    const result = await admin()
      .from("users")
      .upsert(row, { onConflict: "mongo_id" });

    if (!result.error) return result;

    /*
     * `email` is unique as well as `mongo_id`. When a Postgres row already
     * exists for this address under a different (or null) mongo_id, the upsert
     * above resolves to an INSERT and dies on the email constraint — and this
     * helper is best-effort, so the failure was logged and dropped.
     *
     * That left Postgres holding a stale password_hash while Mongo held the
     * real one. Login reads Postgres first and never consults Mongo when a row
     * exists, so the account was locked out permanently: correct password,
     * "Invalid credentials", and a password reset could not repair it either
     * because updateUserByMongoId keys on the very mongo_id that was missing.
     *
     * Reconciling by email adopts the existing row and stamps the link on it.
     */
    return admin().from("users").update(row).eq("email", mongoUser.email);
  });
}

/**
 * Partial update by mongo_id — for status/role/otp-only changes.
 *
 * `email` is accepted as a fallback key because a row whose `mongo_id` was
 * never linked matches nothing here. That is how a password reset could report
 * success while leaving the Postgres hash untouched — and Postgres is what
 * login reads.
 */
export async function updateUserByMongoId(
  mongoId: string,
  updates: Record<string, unknown>,
  email?: string,
) {
  await safe("updateUserByMongoId", async () => {
    const result = await admin()
      .from("users")
      .update(updates)
      .eq("mongo_id", mongoId)
      .select("id");

    if (result.error || (result.data && result.data.length > 0) || !email) {
      return result;
    }

    // Nothing matched on the link — fall back to the address, and stamp the
    // link on so the next write finds it directly.
    return admin()
      .from("users")
      .update({ ...updates, mongo_id: mongoId })
      .eq("email", email);
  });
}

async function pgUserIdFor(mongoId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("users")
    .select("id")
    .eq("mongo_id", mongoId)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function syncPatientProfile(mongoUserId: string, p: {
  _id: any;
  dateOfBirth?: Date;
  gender?: string;
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  medicalAid?: { provider?: string; planName?: string; memberNumber?: string };
  subscriptionTier?: string;
  popiaConsentDate?: Date;
  profilePhoto?: string;
  medicalDocuments?: string[];
}) {
  await safe("syncPatientProfile", async () => {
    const userId = await pgUserIdFor(mongoUserId);
    if (!userId) return { error: new Error(`no pg user for mongo_id ${mongoUserId}`) };
    return admin()
      .from("patient_profiles")
      .upsert(
        {
          mongo_id: p._id.toString(),
          user_id: userId,
          date_of_birth: p.dateOfBirth || null,
          gender: p.gender || null,
          emergency_contact_name: p.emergencyContact?.name || null,
          emergency_contact_phone: p.emergencyContact?.phone || null,
          emergency_contact_relationship: p.emergencyContact?.relationship || null,
          medical_aid_provider: p.medicalAid?.provider || null,
          medical_aid_plan_name: p.medicalAid?.planName || null,
          medical_aid_member_number: p.medicalAid?.memberNumber || null,
          subscription_tier: p.subscriptionTier || "free",
          popia_consent_date: p.popiaConsentDate || null,
          profile_photo: p.profilePhoto || null,
          medical_documents: p.medicalDocuments || [],
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function syncPractitionerProfile(mongoUserId: string, p: {
  _id: any;
  specialisation?: string;
  bio?: string;
  hpcsaNumber: string;
  experienceYears?: number;
  languages?: string[];
  acceptedMedicalAids?: string[];
  achievements?: string[];
  rating?: number;
  reviewCount?: number;
  isOnline?: boolean;
  profilePhoto?: string;
  hpcsaCertificate?: string;
  bankAccount?: {
    accountHolder?: string;
    bankName?: string;
    accountNumber?: string;
    branchCode?: string;
    taxNumber?: string;
  };
  address?: { street?: string; city?: string; province?: string };
}) {
  await safe("syncPractitionerProfile", async () => {
    const userId = await pgUserIdFor(mongoUserId);
    if (!userId) return { error: new Error(`no pg user for mongo_id ${mongoUserId}`) };
    return admin()
      .from("practitioner_profiles")
      .upsert(
        {
          mongo_id: p._id.toString(),
          user_id: userId,
          specialisation: p.specialisation || null,
          bio: p.bio || null,
          hpcsa_number: p.hpcsaNumber,
          experience_years: p.experienceYears ?? null,
          languages: p.languages || [],
          accepted_medical_aids: p.acceptedMedicalAids || [],
          achievements: p.achievements || [],
          rating: p.rating || 0,
          review_count: p.reviewCount || 0,
          is_online: !!p.isOnline,
          profile_photo: p.profilePhoto || null,
          hpcsa_certificate: p.hpcsaCertificate || null,
          bank_account_holder: p.bankAccount?.accountHolder || null,
          bank_name: p.bankAccount?.bankName || null,
          bank_account_number: p.bankAccount?.accountNumber || null,
          bank_branch_code: p.bankAccount?.branchCode || null,
          tax_number: p.bankAccount?.taxNumber || null,
          address_street: p.address?.street || null,
          address_city: p.address?.city || null,
          address_province: p.address?.province || null,
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function syncHospitalAdminProfile(mongoUserId: string, p: {
  _id: any;
  department?: string;
  permissions?: string[];
}) {
  await safe("syncHospitalAdminProfile", async () => {
    const userId = await pgUserIdFor(mongoUserId);
    if (!userId) return { error: new Error(`no pg user for mongo_id ${mongoUserId}`) };
    return admin()
      .from("hospital_admin_profiles")
      .upsert(
        {
          mongo_id: p._id.toString(),
          user_id: userId,
          department: p.department || null,
          permissions: p.permissions || [],
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function addPatientPractitionerLink(
  patientMongoId: string,
  practitionerMongoId: string,
  linkType: "favorite" | "my_doctor" | "assigned",
) {
  await safe("addPatientPractitionerLink", async () => {
    const [patientId, practitionerId] = await Promise.all([
      pgUserIdFor(patientMongoId),
      pgUserIdFor(practitionerMongoId),
    ]);
    if (!patientId || !practitionerId) {
      return { error: new Error("missing pg user id for link") };
    }
    return admin()
      .from("patient_practitioner_links")
      .upsert(
        { patient_id: patientId, practitioner_id: practitionerId, link_type: linkType },
        { onConflict: "patient_id,practitioner_id,link_type" },
      );
  });
}

export async function removePatientPractitionerLink(
  patientMongoId: string,
  practitionerMongoId: string,
  linkType: "favorite" | "my_doctor" | "assigned",
) {
  await safe("removePatientPractitionerLink", async () => {
    const [patientId, practitionerId] = await Promise.all([
      pgUserIdFor(patientMongoId),
      pgUserIdFor(practitionerMongoId),
    ]);
    if (!patientId || !practitionerId) return;
    return admin()
      .from("patient_practitioner_links")
      .delete()
      .eq("patient_id", patientId)
      .eq("practitioner_id", practitionerId)
      .eq("link_type", linkType);
  });
}

export async function writeAuditLog(entry: {
  actorMongoId?: string;
  actorRole?: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  await safe("writeAuditLog", async () => {
    const actorId = entry.actorMongoId ? await pgUserIdFor(entry.actorMongoId) : null;
    return admin()
      .from("audit_logs")
      .insert({
        actor_id: actorId,
        actor_role: entry.actorRole || null,
        actor_email: entry.actorEmail || null,
        action: entry.action,
        target_type: entry.targetType || null,
        target_id: entry.targetId || null,
        metadata: entry.metadata || {},
        ip: entry.ip || null,
        user_agent: entry.userAgent || null,
      });
  });
}
