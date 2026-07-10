"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BiSearch,
  BiLoaderAlt,
  BiDownload,
  BiMessageDetail,
  BiCalendar,
  BiFilter,
  BiX,
} from "react-icons/bi";
import { riskBandStyle } from "@/lib/riskScore";

export default function PractitionerPatientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  /** Open (or create) a direct message thread with this patient */
  const handleStartChat = async (patientId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!patientId || chatLoadingId) return;
    setChatLoadingId(patientId);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, contactId: patientId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversationId) {
        router.push(`/practitioner/messages?chatId=${data.conversationId}`);
      } else {
        router.push(`/practitioner/messages?patientId=${patientId}`);
      }
    } catch {
      router.push(`/practitioner/messages?patientId=${patientId}`);
    } finally {
      setChatLoadingId(null);
    }
  };

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/practitioner/patients?";
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (riskFilter) url += `risk=${riskFilter}&`;
      if (dateFrom) url += `dateFrom=${dateFrom}&`;
      if (dateTo) url += `dateTo=${dateTo}&`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setPatients(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle URL parameters for date filter
  useEffect(() => {
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    if (dateFromParam) setDateFrom(dateFromParam);
    if (dateToParam) setDateTo(dateToParam);
  }, [searchParams]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...patients].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === "lastVisit" || sortField === "dateJoined") {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    if (sortField === "riskScore" || sortField === "age") {
      aVal = a[sortField] ?? 0;
      bVal = b[sortField] ?? 0;
    }
    if (typeof aVal === "string")
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(patients.length / PAGE_SIZE);

  const exportCSV = () => {
    const headers = [
      "Name",
      "Age",
      "Gender",
      "Date Joined",
      "Last Visit",
      "Risk Score",
      "Risk Level",
    ];
    const rows = patients.map((p) => [
      p.fullName,
      p.age ?? "",
      p.gender || "",
      p.dateJoined ? new Date(p.dateJoined).toLocaleDateString("en-ZA") : "",
      p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("en-ZA") : "",
      p.riskScore || 0,
      p.riskLabel || riskBandStyle(p.riskScore || 0).label,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "patients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortTh = ({ field, label }: { field: string; label: string }) => (
    <th
      className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider cursor-pointer hover:text-primary select-none"
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  // Skeleton
  const Skeleton = () => (
    <div className="animate-pulse divide-y divide-slate-50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-100 rounded w-32" />
            <div className="h-2 bg-slate-100 rounded w-20" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-16" />
          <div className="h-6 bg-slate-100 rounded-full w-14" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Patients
          </h1>
          <p className="text-sm text-slate-500">
            {patients.length} patients under your care
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors w-fit"
        >
          <BiDownload size={18} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <BiFilter className="text-slate-500" size={18} />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Risk Levels</option>
            <option value="green">Low (0–35)</option>
            <option value="gray">Mild (36–50)</option>
            <option value="orange">Moderate (51–75)</option>
            <option value="red">High (76–100)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <BiCalendar className="text-slate-500" size={15} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm outline-none text-slate-700 font-medium"
          />
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <BiCalendar className="text-slate-500" size={15} />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm outline-none text-slate-700 font-medium"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <BiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <SortTh field="fullName" label="Patient" />
                  <SortTh field="age" label="Age" />
                  <SortTh field="dateJoined" label="Date Joined" />
                  <SortTh field="lastVisit" label="Last Visit" />
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Next Appt
                  </th>
                  <SortTh field="riskScore" label="Risk" />
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((p) => {
                  const risk = riskBandStyle(p.riskScore || 0);
                  return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.fullName} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {p.fullName}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {p.gender || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm font-semibold text-slate-700 tabular-nums">
                      {p.age != null ? p.age : "—"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {p.dateJoined
                        ? new Date(p.dateJoined).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {p.lastVisit
                        ? new Date(p.lastVisit).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {p.nextAppointment
                        ? new Date(p.nextAppointment).toLocaleDateString(
                            "en-ZA",
                            { day: "numeric", month: "short" },
                          )
                        : "—"}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border text-white ${risk.bgClass} ${risk.borderClass}`}
                        style={{ backgroundColor: risk.bg }}
                      >
                        <span className="tabular-nums">{p.riskScore ?? 0}</span>
                        <span className="opacity-90 font-medium">
                          {risk.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          href={`/practitioner/patients/${p.id}`}
                          className="px-3 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          title="Message patient"
                          disabled={chatLoadingId === p.id}
                          onClick={(e) => handleStartChat(p.id, e)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary bg-white transition-colors disabled:opacity-50"
                        >
                          {chatLoadingId === p.id ? (
                            <BiLoaderAlt size={14} className="animate-spin" />
                          ) : (
                            <BiMessageDetail size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      No patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {patients.length} patients total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
