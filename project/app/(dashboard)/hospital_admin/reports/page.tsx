"use client";

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import KPICard from "@/components/ui/KPICard";
import {
  BiDownload,
  BiPrinter,
  BiLoaderAlt,
  BiCalendar,
  BiFile,
  BiGroup,
  BiBarChartAlt2,
} from "react-icons/bi";

const REPORT_TYPES = [
  {
    id: "financial",
    label: "Financial Report",
    description: "Revenue, payments, and billing summary",
    icon: "💳",
    apiPath: "/api/hospital/reports/financial",
  },
  {
    id: "staff",
    label: "Staff Records",
    description: "Staff directory, schedules, and duty hours",
    icon: "👥",
    apiPath: "/api/hospital/staff",
  },
  {
    id: "consultations",
    label: "Consultation Volume",
    description: "6-month consultation analytics and trends",
    icon: "📊",
    apiPath: "/api/hospital/appointments",
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState("financial");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const selected = REPORT_TYPES.find((r) => r.id === selectedType)!;

  const downloadCSV = async () => {
    setLoading(true);
    try {
      let url = `${selected.apiPath}?format=csv`;
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo) url += `&to=${dateTo}`;

      const res = await fetch(url);
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/csv")) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${selectedType}_report_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // JSON response — convert to CSV client-side
        const json = await res.json();
        const rows: any[] = json.data || [];
        if (rows.length === 0) {
          alert("No data to export.");
          return;
        }
        const headers = Object.keys(rows[0]).filter(
          (k) => typeof rows[0][k] !== "object",
        );
        const csvContent = [
          headers.join(","),
          ...rows.map((r) =>
            headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
          ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${selectedType}_report_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    setPreviewing(true);
    try {
      let url = `${selected.apiPath}`;
      if (dateFrom) url += `?from=${dateFrom}`;
      if (dateTo) url += `${dateFrom ? "&" : "?"}to=${dateTo}`;
      const res = await fetch(url);
      const json = await res.json();
      setPreviewData((json.data || []).slice(0, 8));
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
          Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate and export operational reports for your facility
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            onClick={() => {
              setSelectedType(rt.id);
              setPreviewData([]);
            }}
            className={`p-5 rounded-lg border text-left transition-all ${
              selectedType === rt.id
                ? "border-primary bg-primary/5 shadow-none"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="text-3xl block mb-3">{rt.icon}</span>
            <h1
              className={`font-bold ${selectedType === rt.id ? "text-primary" : "text-slate-800"}`}
            >
              {rt.label}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Settings & Actions */}
      <Card className="flex flex-col gap-6">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 font-grotesk">
          Export Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h1 className="text-xs font-bold text-slate-500 tracking-wider mb-1 block">
              From Date
            </h1>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <BiCalendar className="text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm outline-none flex-1"
              />
            </div>
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-500 tracking-wider mb-1 block">
              To Date
            </h1>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <BiCalendar className="text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm outline-none flex-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm">
          <h1 className="font-bold text-slate-700">
            {selected.icon} {selected.label}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{selected.description}</p>
          {dateFrom && dateTo ? (
            <p className="text-xs text-primary font-bold mt-2">
              Period: {dateFrom} → {dateTo}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-2">
              ℹ️ No date range — full dataset will be exported.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={loadPreview}
            variant="outline"
            disabled={previewing}
            icon={
              previewing ? (
                <BiLoaderAlt className="animate-spin" />
              ) : (
                <BiBarChartAlt2 size={18} />
              )
            }
            className="flex-1 min-w-[140px] justify-center"
          >
            Preview Data
          </Button>
          <Button
            onClick={downloadCSV}
            disabled={loading}
            icon={
              loading ? (
                <BiLoaderAlt className="animate-spin" />
              ) : (
                <BiDownload size={18} />
              )
            }
            className="flex-1 min-w-[140px] justify-center"
          >
            Download CSV
          </Button>
          <button
            onClick={() => window.print()}
            className="flex-1 min-w-[140px] justify-center flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BiPrinter size={18} /> Print Report
          </button>
        </div>
      </Card>

      {/* Data Preview */}
      {previewData.length > 0 && (
        <Card className="flex flex-col gap-4 overflow-hidden p-0">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 font-grotesk">
              Preview (first 8 rows)
            </h3>
            <span className="text-xs text-slate-500">
              Full data in the CSV download
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-slate-50">
                  {Object.keys(previewData[0])
                    .filter((k) => typeof previewData[0][k] !== "object")
                    .map((key) => (
                      <th
                        key={key}
                        className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    {Object.entries(row)
                      .filter(([, v]) => typeof v !== "object")
                      .map(([k, v]: any) => (
                        <td
                          key={k}
                          className="py-3 px-5 text-slate-600 truncate max-w-[200px]"
                        >
                          {String(v ?? "—")}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
