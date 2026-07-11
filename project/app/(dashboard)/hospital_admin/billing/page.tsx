"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import {
  BiDollarCircle,
  BiTime,
  BiHealth,
  BiDownload,
  BiLoaderAlt,
  BiCalendar,
  BiReceipt,
} from "react-icons/bi";
import { downloadBillingPdf } from "@/lib/billing/downloadPdf";

export default function BillingPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    medicalAidClaims: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchBilling = async () => {
    setLoading(true);
    try {
      let url = "/api/hospital/billing?";
      if (filterStatus !== "all") url += `status=${filterStatus}&`;
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

  const sorted = [...transactions]
    .filter((t) => {
      const name =
        `${t.patientId?.firstName} ${t.patientId?.lastName}`.toLowerCase();
      return !search || name.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortField === "amount")
        return sortDir === "asc" ? a.amount - b.amount : b.amount - a.amount;
      return sortDir === "asc"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const exportCSV = async () => {
    const a = document.createElement("a");
    a.href = "/api/hospital/reports/financial?format=csv";
    a.download = "financial_report.csv";
    a.click();
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pending: "bg-gray-50 text-gray-700 border-gray-200",
      refunded: "bg-slate-100 text-slate-600 border-slate-200",
    };
    return `px-2 py-1 rounded-lg text-xs font-bold  tracking-wider border ${styles[status] || styles.pending}`;
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Billing & Transactions
          </h1>
          <p className="text-sm text-slate-500">
            Revenue tracking and payment records
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadBillingPdf(
                  { type: "report", reportKind: "full" },
                  "facility_billing_report.pdf",
                );
              } catch (e: any) {
                alert(e?.message || "PDF download failed");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <BiReceipt size={18} /> Report PDF
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BiDownload size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Total Revenue"
          value={`R ${summary.totalRevenue.toLocaleString()}`}
          icon={<BiDollarCircle size={24} />}
          color="primary"
        />
        <KPICard
          label="Pending Payments"
          value={`R ${summary.pendingAmount.toLocaleString()}`}
          icon={<BiTime size={24} />}
          color="slate"
        />
        <KPICard
          label="Medical Aid Claims"
          value={`R ${summary.medicalAidClaims.toLocaleString()}`}
          icon={<BiHealth size={24} />}
          color="emerald"
        />
      </div>

      {/* Filters */}
      <Card className="flex flex-col p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-primary"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-500" size={16} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-500" size={16} />
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Patient
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Type
                  </th>
                  <th
                    className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("amount")}
                  >
                    Amount{" "}
                    {sortField === "amount"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Method
                  </th>
                  <th
                    className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("timestamp")}
                  >
                    Date{" "}
                    {sortField === "timestamp"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider text-right">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((t, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5 text-sm font-bold text-slate-700">
                      {t.patientId
                        ? `${t.patientId.firstName} ${t.patientId.lastName}`
                        : "Unknown"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600 capitalize">
                      {t.type?.replace("_", " ")}
                    </td>
                    <td className="py-4 px-5 text-sm font-bold text-slate-800">
                      R {t.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <span className={statusBadge(t.status)}>{t.status}</span>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500 capitalize">
                      {t.paymentMethod?.replace("_", " ")}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {new Date(t.timestamp).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        className="text-xs font-bold text-primary hover:underline"
                        onClick={async () => {
                          const id = t._id || t.id;
                          if (!id) {
                            alert("No transaction id");
                            return;
                          }
                          try {
                            await downloadBillingPdf(
                              {
                                type:
                                  t.status === "paid" ||
                                  t.status === "completed"
                                    ? "receipt"
                                    : "invoice",
                                transactionId: String(id),
                              },
                              "invoice.pdf",
                            );
                          } catch (e: any) {
                            alert(e?.message || "PDF download failed");
                          }
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-slate-500"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {sorted.length} transactions total
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
