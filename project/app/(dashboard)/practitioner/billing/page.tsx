"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import {
  BiDollarCircle,
  BiTime,
  BiLoaderAlt,
  BiDownload,
  BiCalendar,
  BiFilter,
} from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-600 border-rose-200",
};

export default function PractitionerBillingPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalEarned: 0,
    pendingPayouts: 0,
    lastPayoutAmount: 0,
    lastPayoutDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchBilling = async () => {
    setLoading(true);
    try {
      let url = "/api/practitioner/billing?";
      if (filterStatus) url += `status=${filterStatus}&`;
      if (dateFrom) url += `from=${dateFrom}&`;
      if (dateTo) url += `to=${dateTo}&`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
        setSummary(json.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, [filterStatus, dateFrom, dateTo]);

  const filtered = transactions.filter(
    (t) =>
      !search ||
      (t.patientName || "").toLowerCase().includes(search.toLowerCase()),
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const headers = ["Patient", "Type", "Date", "Amount", "Status", "Method"];
    const rows = transactions.map((t) => [
      t.patientName || "Unknown",
      t.type || "",
      t.date ? new Date(t.date).toLocaleDateString("en-ZA") : "",
      t.amount || 0,
      t.status || "",
      t.paymentMethod || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Billing & Earnings
          </h1>
          <p className="text-sm text-slate-500">
            Track your consultation fees and payouts
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors w-fit"
        >
          <BiDownload size={18} /> Export CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Total Earned (Month)"
          value={`R ${summary.totalEarned.toLocaleString()}`}
          icon={<BiDollarCircle size={24} />}
          color="primary"
        />
        <KPICard
          label="Pending Payouts"
          value={`R ${summary.pendingPayouts.toLocaleString()}`}
          icon={<BiTime size={24} />}
          color="slate"
        />
        <KPICard
          label="Last Payout"
          value={`R ${summary.lastPayoutAmount.toLocaleString()}`}
          icon={<BiDollarCircle size={24} />}
          color="emerald"
          description={
            summary.lastPayoutDate
              ? new Date(summary.lastPayoutDate).toLocaleDateString("en-ZA")
              : "No payouts yet"
          }
        />
      </div>

      {/* Filters */}
      <Card className="flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <BiFilter className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-400" size={15} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-400" size={15} />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BiLoaderAlt className="animate-spin text-primary text-3xl" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Patient
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Type
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((t, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.patientName || "?"} size="sm" />
                        <p className="text-sm font-bold text-slate-700">
                          {t.patientName || "Unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs capitalize text-slate-600">
                      {t.type || "—"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {t.date
                        ? new Date(t.date).toLocaleDateString("en-ZA")
                        : "—"}
                    </td>
                    <td className="py-4 px-5 text-sm font-bold text-slate-800">
                      R {(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`text-xs font-bold  tracking-wider px-2 py-1 rounded-lg border ${STATUS_BADGE[t.status] || STATUS_BADGE.pending}`}
                      >
                        {t.status || "pending"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button className="text-xs font-bold text-primary hover:underline">
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400"
                    >
                      No transactions found.
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
              {filtered.length} records
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
