"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import Link from "next/link";
import {
  BiSearch,
  BiLoaderAlt,
  BiDownload,
  BiMessageDetail,
  BiPhone,
  BiCalendar,
  BiFilter,
} from "react-icons/bi";

const RISK_LABELS = { green: "Low", amber: "Medium", red: "High" };
const RISK_STYLES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function PractitionerPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [sortField, setSortField] = useState("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/practitioner/patients?";
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (riskFilter) url += `risk=${riskFilter}&`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setPatients(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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
    if (sortField === "lastVisit") {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    if (sortField === "riskScore") {
      aVal = a.riskScore || 0;
      bVal = b.riskScore || 0;
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
      "Blood Type",
      "Last Visit",
      "Risk Score",
      "Risk Level",
    ];
    const rows = patients.map((p) => [
      p.fullName,
      p.age || "",
      p.gender || "",
      p.bloodType || "",
      p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("en-ZA") : "",
      p.riskScore || 0,
      RISK_LABELS[p.riskColor as keyof typeof RISK_LABELS] || "",
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
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">Patients</h1>
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
          <BiFilter className="text-slate-400" size={18} />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Risk Levels</option>
            <option value="green">Low Risk</option>
            <option value="amber">Medium Risk</option>
            <option value="red">High Risk</option>
          </select>
        </div>
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
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Conditions
                  </th>
                  <SortTh field="lastVisit" label="Last Visit" />
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Next Appt
                  </th>
                  <SortTh field="riskScore" label="Risk" />
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((p, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.fullName} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {p.fullName}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">
                            {p.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-slate-600">
                      {p.age || "—"}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(p.medicalHistory || [])
                          .slice(0, 2)
                          .map((h: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-medium"
                            >
                              {h}
                            </span>
                          ))}
                        {(p.medicalHistory || []).length > 2 && (
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-medium">
                            +{p.medicalHistory.length - 2}
                          </span>
                        )}
                      </div>
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
                      <div className="flex items-center gap-2">
                        <RiskScoreCard
                          score={p.riskScore || 0}
                          color={p.riskColor || "green"}
                          size="sm"
                          showRing={false}
                        />
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full border ${RISK_STYLES[p.riskColor] || RISK_STYLES.green}`}
                        >
                          {RISK_LABELS[
                            p.riskColor as keyof typeof RISK_LABELS
                          ] || "Low"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/practitioner/patients/${p.id}`}
                          className="px-3 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          View
                        </Link>
                        <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                          <BiMessageDetail size={14} />
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                          <BiCalendar size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400"
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
