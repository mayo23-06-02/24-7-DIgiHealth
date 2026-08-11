/**
 * Dual-write sync helpers for the facility/staff domain (migration Phase 4).
 * Same contract as lib/postgres/users.ts: best-effort, never throws, Mongo
 * stays authoritative until reads are cut over for this domain.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

function admin() {
  return getSupabaseAdmin();
}

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

async function userIdFor(mongoId?: string | null): Promise<string | null> {
  if (!mongoId) return null;
  const { data } = await admin().from("users").select("id").eq("mongo_id", mongoId).maybeSingle();
  return data?.id || null;
}

export async function facilityIdFor(mongoId?: string | null): Promise<string | null> {
  if (!mongoId) return null;
  const { data } = await admin().from("facilities").select("id").eq("mongo_id", mongoId).maybeSingle();
  return data?.id || null;
}

function mapFacilityType(t?: string): "Public" | "Private" | "NGO" | null {
  if (!t) return null;
  if (t === "Public" || t === "Private" || t === "NGO") return t as any;
  const norm = t.toLowerCase();
  if (norm === "public") return "Public";
  if (norm === "private") return "Private";
  if (norm === "ngo") return "NGO";
  return null;
}

export async function syncFacility(f: {
  _id: any;
  name: string;
  facilityType?: string;
  address?: { street?: string; city?: string; province?: string; coordinates?: [number, number] };
  contactInfo?: { phone?: string; emergencyPhone?: string; email?: string };
  bedCapacity?: { total?: number; generalAvailable?: number; icuAvailable?: number };
  currentWaitTimeMins?: number;
  isOpen?: boolean;
  specialties?: string[];
  emergencyServices?: boolean;
  logo?: string;
  wallpaper?: string;
  regCertificate?: string;
}) {
  await safe("syncFacility", async () =>
    admin()
      .from("facilities")
      .upsert(
        {
          mongo_id: f._id.toString(),
          name: f.name,
          facility_type: mapFacilityType(f.facilityType),
          address_street: f.address?.street || null,
          address_city: f.address?.city || null,
          address_province: f.address?.province || null,
          location_lat: f.address?.coordinates?.[1] ?? null,
          location_lng: f.address?.coordinates?.[0] ?? null,
          contact_phone: f.contactInfo?.phone || null,
          contact_emergency_phone: f.contactInfo?.emergencyPhone || null,
          contact_email: f.contactInfo?.email || null,
          bed_total: f.bedCapacity?.total || 0,
          bed_general_available: f.bedCapacity?.generalAvailable || 0,
          bed_icu_available: f.bedCapacity?.icuAvailable || 0,
          current_wait_time_mins: f.currentWaitTimeMins || 0,
          is_open: f.isOpen !== false,
          specialties: f.specialties || [],
          emergency_services: !!f.emergencyServices,
          logo: f.logo || null,
          wallpaper: f.wallpaper || null,
          reg_certificate: f.regCertificate || null,
        },
        { onConflict: "mongo_id" },
      ),
  );
}

export async function updateFacilityLogo(mongoId: string, logoUrl: string) {
  await safe("updateFacilityLogo", async () =>
    admin().from("facilities").update({ logo: logoUrl }).eq("mongo_id", mongoId),
  );
}

export async function syncStaff(facilityMongoId: string, s: {
  _id: any;
  userId?: any;
  role: string;
  department: string;
  shiftSchedule?: { start?: string; end?: string; days?: number[] };
  isOnDuty?: boolean;
  hourlyRate: number;
  qualifications?: string[];
}) {
  await safe("syncStaff", async () => {
    const facilityId = await facilityIdFor(facilityMongoId);
    if (!facilityId) return { error: new Error(`no pg facility for mongo_id ${facilityMongoId}`) };
    const userId = s.userId ? await userIdFor(s.userId.toString()) : null;
    return admin()
      .from("staff")
      .upsert(
        {
          mongo_id: s._id.toString(),
          user_id: userId,
          facility_id: facilityId,
          role: s.role,
          department: s.department,
          shift_start: s.shiftSchedule?.start || null,
          shift_end: s.shiftSchedule?.end || null,
          shift_days: s.shiftSchedule?.days || [],
          is_on_duty: !!s.isOnDuty,
          hourly_rate: s.hourlyRate || 0,
          qualifications: s.qualifications || [],
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function updateStaffByMongoId(mongoId: string, updates: Record<string, unknown>) {
  await safe("updateStaffByMongoId", async () =>
    admin().from("staff").update(updates).eq("mongo_id", mongoId),
  );
}

export async function deleteStaffByMongoId(mongoId: string) {
  await safe("deleteStaffByMongoId", async () =>
    admin().from("staff").delete().eq("mongo_id", mongoId),
  );
}

export async function syncStaffInvite(facilityMongoId: string, invitedByMongoId: string, inv: {
  _id: any;
  email: string;
  token: string;
  status?: string;
  shiftStart?: string;
  shiftEnd?: string;
  hourlyRate?: number;
  expiresAt: any;
  acceptedAt?: any;
}) {
  await safe("syncStaffInvite", async () => {
    const [facilityId, invitedBy] = await Promise.all([
      facilityIdFor(facilityMongoId),
      userIdFor(invitedByMongoId),
    ]);
    if (!facilityId || !invitedBy) {
      return { error: new Error("missing facility or inviter for staff invite sync") };
    }
    return admin()
      .from("staff_invites")
      .upsert(
        {
          mongo_id: inv._id.toString(),
          email: inv.email,
          facility_id: facilityId,
          invited_by: invitedBy,
          token: inv.token,
          status: inv.status || "pending",
          shift_start: inv.shiftStart || "08:00",
          shift_end: inv.shiftEnd || "16:00",
          hourly_rate: inv.hourlyRate || 0,
          expires_at: inv.expiresAt,
          accepted_at: inv.acceptedAt || null,
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function updateStaffInviteByMongoId(mongoId: string, updates: Record<string, unknown>) {
  await safe("updateStaffInviteByMongoId", async () =>
    admin().from("staff_invites").update(updates).eq("mongo_id", mongoId),
  );
}

export async function syncHospitalAppointment(
  facilityMongoId: string,
  patientMongoId: string,
  practitionerMongoId: string,
  a: {
    _id: any;
    type: string;
    scheduledStart: any;
    scheduledEnd: any;
    status?: string;
    room: string;
  },
) {
  await safe("syncHospitalAppointment", async () => {
    const [facilityId, patientId, practitionerId] = await Promise.all([
      facilityIdFor(facilityMongoId),
      userIdFor(patientMongoId),
      userIdFor(practitionerMongoId),
    ]);
    if (!facilityId || !patientId || !practitionerId) {
      return { error: new Error("missing facility/patient/practitioner for appointment sync") };
    }
    return admin()
      .from("hospital_appointments")
      .upsert(
        {
          mongo_id: a._id.toString(),
          facility_id: facilityId,
          patient_id: patientId,
          practitioner_id: practitionerId,
          type: a.type,
          scheduled_start: a.scheduledStart,
          scheduled_end: a.scheduledEnd,
          status: a.status || "scheduled",
          room: a.room,
        },
        { onConflict: "mongo_id" },
      );
  });
}

export async function updateHospitalAppointmentByMongoId(
  mongoId: string,
  updates: Record<string, unknown>,
) {
  await safe("updateHospitalAppointmentByMongoId", async () =>
    admin().from("hospital_appointments").update(updates).eq("mongo_id", mongoId),
  );
}
