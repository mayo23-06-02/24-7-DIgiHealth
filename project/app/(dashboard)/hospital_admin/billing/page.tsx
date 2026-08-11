"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import {
  CircleDollarSign,
  Clock,
  HeartPulse,
  Download,
  Loader2,
  Calendar,
  Receipt,
} from "lucide-react";
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

  const billingStatusMap: Record<string, BadgeStatus> = {
    paid: "success",
    pending: "warning",
    refunded: "neutral",
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <PageHeader
        title="Billing & Transactions"
        subtitle="Revenue tracking and payment records"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "full" },
                    "facility_billing_report.pdf",
                  );
                } catch (e: any) {
                  toast.error(e?.message || "PDF download failed");
                }
              }}
              icon={<Receipt size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Report PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportCSV()}
              icon={<Download size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Total Revenue"
          value={`R ${summary.totalRevenue.toLocaleString()}`}
          icon={<CircleDollarSign size={24} />}
          color="primary"
        />
        <KPICard
          label="Pending Payments"
          value={`R ${summary.pendingAmount.toLocaleString()}`}
          icon={<Clock size={24} />}
          color="slate"
        />
        <KPICard
          label="Medical Aid Claims"
          value={`R ${summary.medicalAidClaims.toLocaleString()}`}
          icon={<HeartPulse size={24} />}
          color="emerald"
        />
      </div>

      {/* Filters */}
      <Card className="flex flex-col p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            type="text"
            placeholder="Search patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "all", label: "All statuses" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
              { value: "refunded", label: "Refunded" },
            ]}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            icon={<Calendar size={18} />}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            icon={<Calendar size={18} />}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Try adjusting your filters or search."
            className="py-12"
          />
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
                      <Badge
                        label={t.status}
                        status={billingStatusMap[t.status] ?? "neutral"}
                        size="sm"
                        className="capitalize"
                      />
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
                            toast.error("No transaction id");
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
                            toast.error(e?.message || "PDF download failed");
                          }
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
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
