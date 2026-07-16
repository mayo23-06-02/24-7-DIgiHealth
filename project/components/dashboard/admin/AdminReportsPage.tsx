"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BiDownload,
  BiFile,
  BiLoaderAlt,
  BiRefresh,
  BiSearch,
  BiBulb,
  BiUser,
  BiBuildingHouse,
  BiCalendar,
  BiDollarCircle,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const TYPES = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "facilities", label: "Facilities" },
  { id: "consultations", label: "Consultations" },
  { id: "finance", label: "Finance" },
  { id: "audit", label: "Audit" },
] as const;

export default function AdminReportsPage() {
  const [type, setType] = useState<string>("overview");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const qs = useMemo(() => {
    const q = new URLSearchParams({ type });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (search) q.set("search", search);
    if (role) q.set("role", role);
    if (status) q.set("status", status);
    return q.toString();
  }, [type, from, to, search, role, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?${qs}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setData(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const tableRows = useMemo(() => {
    if (!data?.tables) return [];
    if (type === "users") return data.tables.users;
    if (type === "facilities") return data.tables.facilities;
    if (type === "consultations") return data.tables.consultations;
    if (type === "finance") return data.tables.finance;
    if (type === "audit") return data.tables.audit;
    return data.tables.users;
  }, [data, type]);

  const columns = useMemo(() => {
    if (!tableRows.length) return [] as string[];
    return Object.keys(tableRows[0]).filter(
      (k) => typeof tableRows[0][k] !== "object" || tableRows[0][k] === null,
    );
  }, [tableRows]);

  const downloadCsv = async () => {
    setExporting("csv");
    try {
      const res = await fetch(`/api/admin/reports?${qs}&format=csv`);
      if (!res.ok) throw new Error("CSV failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Platform_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "CSV failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    setExporting("pdf");
    toast.loading("Generating PDF…", { id: "admin-pdf" });
    try {
      const res = await fetch(`/api/admin/reports/export?${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "PDF failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download = m?.[1] || `Platform_Report_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: "admin-pdf" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "PDF failed", { id: "admin-pdf" });
    } finally {
      setExporting(null);
    }
  };

  const k = data?.kpi;

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Platform reports"
        subtitle="Filter, sort, and export system-wide intelligence"
        right={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} icon={<BiRefresh size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => void downloadCsv()} disabled={!!exporting} icon={exporting === "csv" ? <BiLoaderAlt className="animate-spin" size={16} /> : <BiDownload size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
              CSV
            </Button>
            <Button size="sm" variant="primary" onClick={() => void downloadPdf()} disabled={!!exporting} icon={exporting === "pdf" ? <BiLoaderAlt className="animate-spin" size={16} /> : <BiFile size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
              PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              type === t.id
                ? "border-primary bg-primary text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="!rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
          {(type === "users" || type === "overview") && (
            <select value={role} onChange={(e) => setRole(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white self-end">
              <option value="">All roles</option>
              <option value="patient">Patient</option>
              <option value="practitioner">Practitioner</option>
              <option value="hospital_admin">Hospital admin</option>
              <option value="super_admin">Super admin</option>
              <option value="mega_admin">Mega admin</option>
            </select>
          )}
          {(type === "users" || type === "finance" || type === "consultations") && (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white self-end">
              <option value="">All statuses</option>
              {type === "users" && (
                <>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </>
              )}
              {type === "finance" && (
                <>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </>
              )}
              {type === "consultations" && (
                <>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="scheduled">Scheduled</option>
                </>
              )}
            </select>
          )}
        </div>
      </Card>

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <>
          {k && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Users" value={k.totalUsers} color="primary" icon={<BiUser size={20} />} />
              <KPICard label="Facilities" value={k.facilities} color="slate" icon={<BiBuildingHouse size={20} />} />
              <KPICard label="Consults 30d" value={k.consults30d} color="emerald" icon={<BiCalendar size={20} />} />
              <KPICard label="Revenue 30d" value={`R ${k.revenue30d.toLocaleString("en-ZA")}`} color="emerald" icon={<BiDollarCircle size={20} />} />
            </div>
          )}

          {data.intelligence?.length > 0 && (
            <Card className="!rounded-lg">
              <SectionHeader compact icon={<BiBulb />} title="Report intelligence" className="mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.intelligence.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <Badge label={item.severity} status={item.severity === "critical" ? "error" : item.severity === "warning" ? "warning" : "info"} className="!text-[10px] !px-2 !py-1 capitalize" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <SectionHeader compact title={`${TYPES.find((t) => t.id === type)?.label || "Data"} table`} subtitle={`${tableRows.length} rows`} />
            </div>
            {tableRows.length === 0 ? (
              <EmptyState title="No rows" description="Adjust filters and try again." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {columns.map((c) => (
                        <th key={c} className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.slice(0, 80).map((row: any, i: number) => (
                      <tr key={row.id || i} className="hover:bg-slate-50/80">
                        {columns.map((c) => {
                          let v = row[c];
                          if (v instanceof Date || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))) {
                            try {
                              v = new Date(v).toLocaleDateString("en-ZA");
                            } catch { /* */ }
                          }
                          if (typeof v === "boolean") v = v ? "Yes" : "No";
                          return (
                            <td key={c} className="py-2.5 px-4 text-slate-600 max-w-[180px] truncate">
                              {String(v ?? "—")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
