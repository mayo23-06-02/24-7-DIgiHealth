"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useNavigate } from "@/hooks/useNavigate";
import {
  BiSearch,
  BiLoaderAlt,
  BiDownload,
  BiMessageDetail,
  BiFilterAlt,
  BiSortAlt2,
  BiX,
  BiShow,
  BiChevronDown,
  BiFile,
  BiTable,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import { riskBandStyle } from "@/lib/riskScore";
import Input from "@/components/ui/Input";
import Table, { Column } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "fullName", label: "Patient name" },
  { value: "age", label: "Age" },
  { value: "dateJoined", label: "Date joined" },
  { value: "lastVisit", label: "Last visit" },
  { value: "riskScore", label: "Risk score" },
];

export default function PractitionerPatientsPage() {
  const searchParams = useSearchParams();
  const { navigate, beginNavigation } = useNavigate();
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // Draft state inside modals so Apply commits
  const [draftRisk, setDraftRisk] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftSortField, setDraftSortField] = useState("fullName");
  const [draftSortDir, setDraftSortDir] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [exportOpen]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (riskFilter) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    return n;
  }, [riskFilter, dateFrom, dateTo]);

  const handleStartChat = async (patientId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!patientId || chatLoadingId) return;
    setChatLoadingId(patientId);
    beginNavigation(); // every branch navigates; cover the fetch too
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, contactId: patientId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversationId) {
        navigate(`/practitioner/messages?chatId=${data.conversationId}`);
      } else {
        navigate(`/practitioner/messages?patientId=${patientId}`);
      }
    } catch {
      navigate(`/practitioner/messages?patientId=${patientId}`);
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

  useEffect(() => {
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    if (dateFromParam) setDateFrom(dateFromParam);
    if (dateToParam) setDateTo(dateToParam);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, riskFilter, dateFrom, dateTo, sortField, sortDir]);

  const sorted = useMemo(() => {
    return [...patients].sort((a, b) => {
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
          ? aVal.localeCompare(bVal || "")
          : (bVal || "").localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [patients, sortField, sortDir]);

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortField)?.label || "Name";

  const exportCSV = () => {
    setExportOpen(false);
    const headers = [
      "Name",
      "Age",
      "Gender",
      "Date Joined",
      "Last Visit",
      "Next Appointment",
      "Risk Score",
      "Risk Level",
    ];
    const rows = sorted.map((p) => [
      `"${String(p.fullName || "").replace(/"/g, '""')}"`,
      p.age ?? "",
      p.gender || "",
      p.dateJoined ? new Date(p.dateJoined).toLocaleDateString("en-ZA") : "",
      p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("en-ZA") : "",
      p.nextAppointment
        ? new Date(p.nextAppointment).toLocaleDateString("en-ZA")
        : "",
      p.riskScore || 0,
      p.riskLabel || riskBandStyle(p.riskScore || 0).label,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Patients_${sorted.length}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sorted.length} patients as CSV`);
  };

  const exportPDF = async () => {
    if (exportingPdf) return;
    setExportOpen(false);
    setExportingPdf(true);
    toast.loading("Generating patient list PDF…", { id: "patients-pdf" });
    try {
      const payload = {
        patients: sorted.map((p) => ({
          fullName: p.fullName,
          age: p.age ?? null,
          gender: p.gender || null,
          dateJoined: p.dateJoined || null,
          lastVisit: p.lastVisit || null,
          nextAppointment: p.nextAppointment || null,
          riskScore: p.riskScore ?? 0,
          riskLabel: p.riskLabel || riskBandStyle(p.riskScore || 0).label,
        })),
        filters: {
          search: search || undefined,
          risk: riskFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortLabel: `${sortLabel} (${sortDir === "asc" ? "A→Z" : "Z→A"})`,
        },
      };
      const res = await fetch("/api/practitioner/patients/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "PDF export failed");
      }
      const blob = await res.blob();
      if (blob.type?.includes("application/json")) {
        throw new Error("Server returned an error instead of a PDF");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download =
        match?.[1] ||
        `Patients_${sorted.length}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sorted.length} patients as PDF`, {
        id: "patients-pdf",
      });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to export PDF",
        { id: "patients-pdf" },
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const openFilter = () => {
    setDraftRisk(riskFilter);
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setRiskFilter(draftRisk);
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setDraftRisk("");
    setDraftFrom("");
    setDraftTo("");
    setRiskFilter("");
    setDateFrom("");
    setDateTo("");
    setFilterOpen(false);
  };

  const openSort = () => {
    setDraftSortField(sortField);
    setDraftSortDir(sortDir);
    setSortOpen(true);
  };

  const applySort = () => {
    setSortField(draftSortField);
    setSortDir(draftSortDir);
    setSortOpen(false);
  };

  const fmtDate = (
    d?: string | Date | null,
    opts?: Intl.DateTimeFormatOptions,
  ) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(
      "en-ZA",
      opts || { day: "numeric", month: "short", year: "numeric" },
    );
  };

  const fmtDateShort = (d?: string | Date | null) =>
    fmtDate(d, { day: "numeric", month: "short" });

  const getRiskStatus = (score: number): "success" | "warning" | "error" | "neutral" => {
    if (score >= 76) return "error";
    if (score >= 51) return "warning";
    if (score >= 36) return "neutral";
    return "success";
  };

  const columns: Column<any>[] = [
    {
      key: "fullName",
      header: "Patient",
      isTitle: true,
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink-900 truncate">{row.fullName}</p>
          <p className="text-small text-slate-500 capitalize">
            {row.gender || "—"}
            {row.age != null && <span className="lg:hidden"> · {row.age} yrs</span>}
          </p>
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      sortable: true,
      align: "right",
      render: (row) => row.age != null ? row.age : "—",
    },
    {
      key: "dateJoined",
      header: "Date Joined",
      sortable: true,
      render: (row) => fmtDate(row.dateJoined),
    },
    {
      key: "lastVisit",
      header: "Last Visit",
      sortable: true,
      render: (row) => fmtDateShort(row.lastVisit),
    },
    {
      key: "nextAppointment",
      header: "Next Appt",
      sortable: true,
      render: (row) => fmtDateShort(row.nextAppointment),
    },
    {
      key: "riskScore",
      header: "Risk",
      sortable: true,
      align: "right",
      render: (row) => (
        <Badge
          label={String(row.riskScore ?? 0)}
          status={getRiskStatus(row.riskScore || 0)}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <Link href={`/practitioner/patients/${row.id}`}>
            <Button size="sm" variant="primary">
              View
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            type="button"
            title="Message patient"
            disabled={chatLoadingId === row.id}
            loading={chatLoadingId === row.id}
            onClick={(e) => handleStartChat(row.id, e)}
          >
            Chat
          </Button>
          
        </div>
      ),
    },
  ];

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
        <div className="relative" ref={exportMenuRef}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setExportOpen((o) => !o)}
            disabled={exportingPdf || loading}
        
          >
            <span className="inline-flex items-center gap-1.5">
              {exportingPdf ? "Exporting…" : "Export"}
              {!exportingPdf && (
                <BiChevronDown
                  size={16}
                  className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}
                />
              )}
            </span>
          </Button>

          {exportOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-40 w-64 rounded-lg border border-slate-200 bg-white  shadow-slate-200/60 overflow-hidden"
              role="menu"
            >
              <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/80">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Download roster
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sorted.length} patient{sorted.length === 1 ? "" : "s"}
                  {(activeFilterCount > 0 || search) && " · filtered"}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={exportPDF}
                disabled={exportingPdf}
                className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-primary/5 transition-colors border-b border-slate-50 disabled:opacity-50"
              >
                <span className="mt-0.5 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BiFile size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    PDF report
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                    Branded roster with summary stats and risk scores
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={exportCSV}
                className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="mt-0.5 w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <BiTable size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    CSV spreadsheet
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                    Open in Excel or Sheets for further analysis
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search + filter / sort icons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={18}
          />
          <input
            type="text"
            placeholder="Search patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 p-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
          />
        </div>
        <button
          type="button"
          onClick={openFilter}
          title="Filters"
          className={`relative w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${
            activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
          }`}
        >
          <BiFilterAlt size={20} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={openSort}
          title="Sort"
          className="w-11 h-11 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary flex items-center justify-center transition-colors"
        >
          <BiSortAlt2 size={20} />
        </button>
      </div>

      {/* Active chips */}
      {(activeFilterCount > 0 || sortField !== "fullName" || sortDir !== "asc") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {riskFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
              Risk: {riskFilter}
              <button type="button" onClick={() => setRiskFilter("")}>
                <BiX size={14} />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
              From {dateFrom}
              <button type="button" onClick={() => setDateFrom("")}>
                <BiX size={14} />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
              To {dateTo}
              <button type="button" onClick={() => setDateTo("")}>
                <BiX size={14} />
              </button>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            Sort: {sortLabel} ({sortDir === "asc" ? "A→Z" : "Z→A"})
          </span>
        </div>
      )}

      {/* List / table */}
      <Table
        columns={columns}
        data={paginated}
        keyField="id"
        loading={loading}
        emptyTitle="No patients found"
        emptyDescription="Try adjusting your search or filters."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500 shrink-0">
            <span className="hidden sm:inline">{sorted.length} patients total</span>
            <span className="sm:hidden">{sorted.length} total</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              ←
            </button>
            <span className="px-2 py-1 text-sm text-slate-600 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Filter modal */}
      <Modal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter patients"
        width="sm"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Risk level
            </label>
            <select
              value={draftRisk}
              onChange={(e) => setDraftRisk(e.target.value)}
              className="w-full border border-slate-200 rounded-full px-3 py-3 text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="">All risk levels</option>
              <option value="green">Low (0–35)</option>
              <option value="gray">Mild (36–50)</option>
              <option value="orange">Moderate (51–75)</option>
              <option value="red">High (76–100)</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Date from
              </label>
              <Input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Date to
              </label>
              <Input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={clearFilter}
            >
              Clear
            </Button>
            <Button
              size="sm"
              fullWidth
              onClick={applyFilter}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sort modal */}
      <Modal
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort patients"
        width="sm"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sort by
            </label>
            <select
              value={draftSortField}
              onChange={(e) => setDraftSortField(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 p-2 text-sm bg-white focus:outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraftSortDir("asc")}
                className={`p-2 rounded-lg text-sm font-bold border transition-colors ${
                  draftSortDir === "asc"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Ascending
              </button>
              <button
                type="button"
                onClick={() => setDraftSortDir("desc")}
                className={`p-2 rounded-lg text-sm font-bold border transition-colors ${
                  draftSortDir === "desc"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Descending
              </button>
            </div>
          </div>
          <Button
            size="sm"
            fullWidth
            onClick={applySort}
            className="!rounded-lg normal-case"
          >
            Apply sort
          </Button>
        </div>
      </Modal>
    </div>
  );
}
