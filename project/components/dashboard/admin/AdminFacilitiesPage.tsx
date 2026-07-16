"use client";

import React, { useEffect, useState } from "react";
import { BiRefresh, BiSearch, BiBuildingHouse } from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function AdminFacilitiesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  }, [search]);

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

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Facilities"
        subtitle="All hospitals and clinics on DigiHealth"
        right={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            icon={<BiRefresh size={16} />}
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case !tracking-normal"
          >
            Refresh
          </Button>
        }
      />
      <Card className="!rounded-lg">
        <div className="relative max-w-md">
          <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities…"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </Card>
      <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No facilities"
            description="Hospital admins create facilities during onboarding."
            icon={<BiBuildingHouse size={32} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Staff</th>
                  <th className="px-3 py-3">Doctors</th>
                  <th className="px-3 py-3">Appts 30d</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-400">
                        {[f.city, f.province].filter(Boolean).join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{f.type}</td>
                    <td className="px-3 py-3 tabular-nums">{f.staffCount}</td>
                    <td className="px-3 py-3 tabular-nums">{f.doctors}</td>
                    <td className="px-3 py-3 tabular-nums">{f.appointments30d}</td>
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
        )}
      </Card>
    </div>
  );
}
