"use client";

import React, { useEffect, useState } from "react";
import { Save, Loader2, Settings } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const FEATURE_KEYS = [
  { key: "telehealth", label: "Telehealth" },
  { key: "aiDiagnizer", label: "AI Diagnoser" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "registrations", label: "Open registrations" },
];

export default function AdminSettingsPage({ isMega }: { isMega: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    maintenanceMode: false,
    features: {} as Record<string, boolean>,
    popiaVersion: "1.0",
    consultationFeeDefault: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setData(json);
      const d = json.data || {};
      setForm({
        maintenanceMode: !!d.maintenanceMode,
        features: {
          telehealth: d.features?.telehealth !== false,
          aiDiagnizer: d.features?.aiDiagnizer !== false,
          prescriptions: d.features?.prescriptions !== false,
          registrations: d.features?.registrations !== false,
        },
        popiaVersion: d.popiaVersion || "1.0",
        consultationFeeDefault: d.consultationFeeDefault || 0,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!isMega) {
      toast.error("Only mega admin can change settings");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success("Settings saved");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-[900px] mx-auto">
        <SkeletonLoader className="h-12 w-48" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState title="Settings unavailable" description="Could not load system config." actionLabel="Retry" onAction={() => void load()} />
    );
  }

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[900px] mx-auto">
      <PageHeader
        title="System settings"
        subtitle={
          isMega
            ? "Platform-wide configuration (mega admin)"
            : "Read-only for super admin — mega admin can edit"
        }
        right={
          isMega ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void save()}
              disabled={saving}
              icon={saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Save
            </Button>
          ) : (
            <Badge label="Read only" status="warning" />
          )
        }
      />

      <Card className="!rounded-lg space-y-5">
        <SectionHeader compact icon={<Settings />} title="Operations" />
        <label className="flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
          <div>
            <p className="text-sm font-bold text-slate-800">Maintenance mode</p>
            <p className="text-xs text-slate-500">Restrict platform access for non-admins</p>
          </div>
          <input
            type="checkbox"
            disabled={!isMega}
            checked={form.maintenanceMode}
            onChange={(e) => {
              if (e.target.checked && !confirm('⚠️ Maintenance mode will take the entire platform offline. Are you sure?')) {
                e.preventDefault();
                return;
              }
              setForm((f) => ({ ...f, maintenanceMode: e.target.checked }));
            }}
            className="w-5 h-5 accent-primary"
          />
        </label>
      </Card>

      <Card className="!rounded-lg space-y-4">
        <SectionHeader compact title="Feature flags" />
        {FEATURE_KEYS.map((f) => (
          <label
            key={f.key}
            className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 cursor-pointer"
          >
            <span className="text-sm font-semibold text-slate-700">{f.label}</span>
            <input
              type="checkbox"
              disabled={!isMega}
              checked={!!form.features[f.key]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  features: { ...prev.features, [f.key]: e.target.checked },
                }))
              }
              className="w-5 h-5 accent-primary"
            />
          </label>
        ))}
      </Card>

      <Card className="!rounded-lg space-y-4">
        <SectionHeader compact title="Defaults" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="POPIA version"
            disabled={!isMega}
            value={form.popiaVersion}
            onChange={(e) => setForm((f) => ({ ...f, popiaVersion: e.target.value }))}
          />
          <Input
            type="number"
            label="Default consult fee (ZAR)"
            disabled={!isMega}
            value={form.consultationFeeDefault}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                consultationFeeDefault: Number(e.target.value) || 0,
              }))
            }
          />
        </div>
      </Card>
    </div>
  );
}
