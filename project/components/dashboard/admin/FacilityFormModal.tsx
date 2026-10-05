"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface Props {
  /** Facility id to edit, or null to create. */
  facilityId: string | null;
  canRename: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";
const label = "block text-xs font-medium text-slate-700";

const EMPTY = {
  name: "", facilityType: "Private", street: "", city: "", province: "",
  phone: "", emergencyPhone: "", email: "", bedTotal: "", bedGeneral: "", bedIcu: "",
  specialties: "", fileNumberPrefix: "", emergencyServices: false, isOpen: true,
};

/** Create or edit a facility (platform admins). */
export default function FacilityFormModal({ facilityId, canRename, onClose, onSaved }: Props) {
  const [f, setF] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(!!facilityId);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: keyof typeof EMPTY, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!facilityId) return;
    fetch(`/api/admin/facilities/${facilityId}`)
      .then((r) => r.json())
      .then((j) => {
        const x = j?.data?.facility;
        if (!x) throw new Error(j?.error || "Could not load facility");
        setF({
          name: x.name ?? "", facilityType: x.facilityType ?? "Private",
          street: x.address?.street ?? "", city: x.address?.city ?? "", province: x.address?.province ?? "",
          phone: x.contactInfo?.phone ?? "", emergencyPhone: x.contactInfo?.emergencyPhone ?? "", email: x.contactInfo?.email ?? "",
          bedTotal: String(x.bedCapacity?.total ?? ""), bedGeneral: String(x.bedCapacity?.generalAvailable ?? ""), bedIcu: String(x.bedCapacity?.icuAvailable ?? ""),
          specialties: (x.specialties ?? []).join(", "), fileNumberPrefix: x.fileNumberPrefix ?? "",
          emergencyServices: !!x.emergencyServices, isOpen: x.isOpen !== false,
        });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [facilityId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const body: Record<string, unknown> = {
        facilityType: f.facilityType,
        address: { street: f.street, city: f.city, province: f.province },
        contactInfo: { phone: f.phone, emergencyPhone: f.emergencyPhone, email: f.email },
        bedCapacity: { total: f.bedTotal, generalAvailable: f.bedGeneral, icuAvailable: f.bedIcu },
        specialties: f.specialties,
        fileNumberPrefix: f.fileNumberPrefix,
        emergencyServices: f.emergencyServices,
        isOpen: f.isOpen,
      };
      if (!facilityId || canRename) body.name = f.name;
      const res = await fetch(facilityId ? `/api/admin/facilities/${facilityId}` : "/api/admin/facilities", {
        method: facilityId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.errors ?? [json.error ?? "Could not save"]);
        return;
      }
      toast.success(facilityId ? "Facility updated" : "Facility created");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={save} className="my-8 w-full max-w-2xl space-y-4 rounded-lg bg-white p-5 md:p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900">{facilityId ? "Edit facility" : "Add new facility"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800">
            Close
          </button>
        </div>

        {errors.length > 0 && (
          <ul role="alert" className="list-disc rounded-lg border border-red-200 bg-red-50 p-3 pl-7 text-sm text-red-700">
            {errors.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        )}

        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className={`${label} md:col-span-2`}>
              Name *
              <input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} required disabled={!!facilityId && !canRename} />
              {!!facilityId && !canRename && <span className="text-[11px] text-slate-500">Only a mega admin can rename a facility.</span>}
            </label>
            <label className={label}>
              Type *
              <select className={field} value={f.facilityType} onChange={(e) => set("facilityType", e.target.value)}>
                <option>Private</option><option>Public</option><option>NGO</option>
              </select>
            </label>
            <label className={label}>
              File number prefix
              <input className={field} value={f.fileNumberPrefix} onChange={(e) => set("fileNumberPrefix", e.target.value)} placeholder="e.g. MP" maxLength={12} />
            </label>
            <label className={`${label} md:col-span-2`}>
              Street
              <input className={field} value={f.street} onChange={(e) => set("street", e.target.value)} />
            </label>
            <label className={label}>
              City *
              <input className={field} value={f.city} onChange={(e) => set("city", e.target.value)} required />
            </label>
            <label className={label}>
              Province
              <input className={field} value={f.province} onChange={(e) => set("province", e.target.value)} />
            </label>
            <label className={label}>
              Phone
              <input className={field} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label className={label}>
              Emergency phone
              <input className={field} value={f.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
            </label>
            <label className={`${label} md:col-span-2`}>
              Email
              <input type="email" className={field} value={f.email} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label className={label}>
              Total beds
              <input inputMode="numeric" className={field} value={f.bedTotal} onChange={(e) => set("bedTotal", e.target.value)} />
            </label>
            <label className={label}>
              General beds available
              <input inputMode="numeric" className={field} value={f.bedGeneral} onChange={(e) => set("bedGeneral", e.target.value)} />
            </label>
            <label className={label}>
              ICU beds available
              <input inputMode="numeric" className={field} value={f.bedIcu} onChange={(e) => set("bedIcu", e.target.value)} />
            </label>
            <label className={label}>
              Specialties (comma separated)
              <input className={field} value={f.specialties} onChange={(e) => set("specialties", e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={f.emergencyServices} onChange={(e) => set("emergencyServices", e.target.checked)} />
              Emergency services
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={f.isOpen} onChange={(e) => set("isOpen", e.target.checked)} />
              Open
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">
            Cancel
          </button>
          <button disabled={busy || loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Saving…" : facilityId ? "Save changes" : "Create facility"}
          </button>
        </div>
      </form>
    </div>
  );
}
