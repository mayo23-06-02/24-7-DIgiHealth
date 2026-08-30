"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

interface FacilityRow {
  id: string;
  name: string;
  type: string;
  city: string;
  province: string;
  isOpen: boolean;
  staffCount: number;
  doctors: number;
  appointments30d: number;
}

const SORTS = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "staffCount:desc", label: "Most staff" },
  { value: "doctors:desc", label: "Most doctors" },
  { value: "appointments30d:desc", label: "Busiest (30d)" },
];

export default function AdminFacilitiesPage() {
  const [rows, setRows] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name:asc");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/facilities${q}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setRows(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /**
   * Type options come from the data rather than a hardcoded list — the
   * facility types are whatever hospital admins entered during onboarding, so
   * a fixed list would quietly omit any that were added later.
   */
  const typeOptions = useMemo(() => {
    const seen = Array.from(new Set(rows.map((r) => r.type).filter(Boolean)));
    seen.sort((a, b) => a.localeCompare(b));
    return seen.map((t) => ({ value: t, label: t }));
  }, [rows]);

  /*
   * Filtering and sorting happen here rather than in the API because the
   * endpoint already loads every facility and filters in memory — there is no
   * pagination to respect, so a round-trip per keystroke of a dropdown would
   * buy nothing.
   */
  const visible = useMemo(() => {
    const [field, dir] = sort.split(":") as [keyof FacilityRow, "asc" | "desc"];
    return rows
      .filter((r) => (type ? r.type === type : true))
      .filter((r) =>
        status ? (status === "open" ? r.isOpen : !r.isOpen) : true,
      )
      .slice()
      .sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return dir === "desc" ? -cmp : cmp;
      });
  }, [rows, type, status, sort]);

  const toggleOpen = async (id: string, isOpen: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/facilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !isOpen }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(!isOpen ? "Facility opened" : "Facility closed");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const location = (f: FacilityRow) =>
    [f.city, f.province].filter(Boolean).join(", ") || "—";

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-350 mx-auto">
      <PageHeader
        title="Facilities"
        subtitle="All hospitals and clinics on DigiHealth"
        right={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            icon={<RefreshCw size={16} />}
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case !tracking-normal"
          >
            Refresh
          </Button>
        }
      />

      <Card className="!rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities…"
            icon={<Search size={18} />}
          />
          <Select
            value={type}
            onChange={setType}
            options={[{ value: "", label: "All types" }, ...typeOptions]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All statuses" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ]}
          />
          <Select value={sort} onChange={setSort} options={SORTS} />
        </div>
      </Card>

      <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No facilities"
            description={
              rows.length === 0
                ? "Hospital admins create facilities during onboarding."
                : "No facility matches these filters."
            }
            icon={<Building2 size={32} />}
          />
        ) : (
          <>
            {/*
              Below md the table becomes stacked cards (design.md §3.5).
              Horizontally scrolling seven columns on a phone is the pattern
              that section exists to rule out.
            */}
            <div className="md:hidden divide-y divide-border">
              {visible.map((f) => (
                <div key={f.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900 truncate">{f.name}</p>
                      <p className="text-xs text-ink-400">{location(f)}</p>
                    </div>
                    <Badge
                      label={f.isOpen ? "Open" : "Closed"}
                      status={f.isOpen ? "success" : "error"}
                      className="!text-[10px] !px-2 !py-1 shrink-0"
                    />
                  </div>

                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {[
                      ["Type", f.type],
                      ["Staff", f.staffCount],
                      ["Doctors", f.doctors],
                      ["Appts 30d", f.appointments30d],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          {label}
                        </dt>
                        <dd className="text-sm font-semibold text-ink-900 tabular-nums">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <Button
                    size="sm"
                    variant="outline"
                    fullWidth
                    disabled={busyId === f.id}
                    onClick={() => void toggleOpen(f.id, f.isOpen)}
                    className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                  >
                    {f.isOpen ? "Close facility" : "Open facility"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-border text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Staff</th>
                    <th className="px-3 py-3">Doctors</th>
                    <th className="px-3 py-3">Appts 30d</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((f) => (
                    <tr key={f.id} className="hover:bg-surface-soft/60">
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink-900">{f.name}</p>
                        <p className="text-xs text-ink-400">{location(f)}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-600">{f.type}</td>
                      {/*
                        These three carried no text colour at all, so they
                        inherited it and rendered invisible against the row.
                      */}
                      <td className="px-3 py-3 text-ink-900 tabular-nums">
                        {f.staffCount}
                      </td>
                      <td className="px-3 py-3 text-ink-900 tabular-nums">
                        {f.doctors}
                      </td>
                      <td className="px-3 py-3 text-ink-900 tabular-nums">
                        {f.appointments30d}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          label={f.isOpen ? "Open" : "Closed"}
                          status={f.isOpen ? "success" : "error"}
                          className="!text-[10px] !px-2 !py-1"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === f.id}
                          onClick={() => void toggleOpen(f.id, f.isOpen)}
                          className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                        >
                          {f.isOpen ? "Close" : "Open"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
