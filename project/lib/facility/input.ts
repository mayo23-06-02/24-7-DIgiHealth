const TYPES = ["Public", "Private", "NGO"] as const;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const int = (v: unknown) => (v === "" || v == null ? undefined : Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : NaN);

export interface FacilityInput {
  name?: string;
  facilityType?: (typeof TYPES)[number];
  address?: { street?: string; city?: string; province?: string };
  contactInfo?: { phone?: string; emergencyPhone?: string; email?: string };
  bedCapacity?: { total?: number; generalAvailable?: number; icuAvailable?: number };
  specialties?: string[];
  emergencyServices?: boolean;
  isOpen?: boolean;
  fileNumberPrefix?: string;
}

/** Validate a create or update body. Unknown keys are ignored. */
export function parseFacilityInput(
  body: Record<string, any>,
  mode: "create" | "update",
): { ok: true; value: FacilityInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v: FacilityInput = {};
  const has = (k: string) => body[k] !== undefined;

  if (has("name") || mode === "create") {
    const name = str(body.name, 160);
    if (!name || name.length < 2) errors.push("name is required");
    else v.name = name;
  }
  if (has("facilityType") || mode === "create") {
    if (!TYPES.includes(body.facilityType)) errors.push(`facilityType must be one of ${TYPES.join(", ")}`);
    else v.facilityType = body.facilityType;
  }
  if (body.address) {
    v.address = { street: str(body.address.street), city: str(body.address.city, 80), province: str(body.address.province, 80) };
  }
  if (mode === "create" && !v.address?.city) errors.push("city is required");
  if (body.contactInfo) {
    const email = str(body.contactInfo.email)?.toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("contact email is invalid");
    v.contactInfo = { phone: str(body.contactInfo.phone, 40), emergencyPhone: str(body.contactInfo.emergencyPhone, 40), email };
  }
  if (body.bedCapacity) {
    const t = int(body.bedCapacity.total), g = int(body.bedCapacity.generalAvailable), i = int(body.bedCapacity.icuAvailable);
    if ([t, g, i].some((n) => Number.isNaN(n))) errors.push("bed numbers must be whole numbers");
    else v.bedCapacity = { total: t, generalAvailable: g, icuAvailable: i };
  }
  if (has("specialties")) {
    const list = Array.isArray(body.specialties) ? body.specialties : String(body.specialties ?? "").split(/[;,]/);
    v.specialties = list.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 40);
  }
  if (typeof body.emergencyServices === "boolean") v.emergencyServices = body.emergencyServices;
  if (typeof body.isOpen === "boolean") v.isOpen = body.isOpen;
  if (has("fileNumberPrefix")) {
    const p = str(body.fileNumberPrefix, 12)?.toUpperCase() ?? "";
    if (p && !/^[A-Z0-9-]+$/.test(p)) errors.push("file number prefix may only use letters, numbers and dashes");
    else v.fileNumberPrefix = p || undefined;
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: v };
}
