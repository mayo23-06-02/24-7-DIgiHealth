"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BiWallet,
  BiCreditCard,
  BiReceipt,
  BiTrendingUp,
  BiTrendingDown,
  BiDownload,
  BiRefresh,
  BiCheckCircle,
  BiXCircle,
  BiTime,
  BiShield,
  BiCog,
  BiBuildings,
  BiUser,
  BiGroup,
  BiFilter,
  BiDotsVerticalRounded,
  BiChevronDown,
  BiChevronRight,
  BiEdit,
  BiPlus,
  BiMinus,
  BiAperture,
  BiInfoCircle,
  BiHistory,
  BiDollarCircle,
  BiTransfer,
  BiHotel,
  BiChart,
  BiSearch,
  BiBuilding,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BillingData {
  role: string;
  summary: Record<string, any>;
  transactions?: any[];
  subscription?: any;
  paymentMethods?: any[];
  payoutRequests?: any[];
  monthlyBreakdown?: Record<string, number>;
  revenues?: any[];
  departmentBreakdown?: any[];
  facilities?: any[];
  allTransactions?: any[];
  allPayouts?: any[];
  feeConfig?: any;
  auditLogs?: any[];
  revenueByMonth?: Record<string, number>;
  patientCount?: number;
  practitionerCount?: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmtZAR = (n: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
  active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  approved: "bg-blue-50 text-blue-600 border-blue-100",
  pending: "bg-gray-50 text-gray-600 border-gray-100",
  trial: "bg-purple-50 text-purple-600 border-purple-100",
  failed: "bg-red-50 text-red-600 border-red-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  refunded: "bg-orange-50 text-orange-600 border-orange-100",
  past_due: "bg-red-50 text-red-600 border-red-100",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`px-3 py-1 rounded-lg text-xs font-bold  tracking-normal border ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-400 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-50 text-emerald-600",
    gray: "bg-gray-50 text-gray-600",
    rose: "bg-rose-50 text-rose-500",
    slate: "bg-slate-100 text-slate-500",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl ${accents[accent] ?? accents.primary}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400  tracking-normal truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-800 leading-tight truncate">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>
        )}
      </div>
    </Card>
  );
}

// ─── Transaction Table ─────────────────────────────────────────────────────────
function TransactionTable({
  transactions,
  title = "Transaction History",
  showDownload = false,
}: {
  transactions: any[];
  title?: string;
  showDownload?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        !search ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.includes(search.toLowerCase());
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <Card noPadding>
      <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          {title}
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <BiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search transactions..."
              className="pl-9 pr-4 py-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white outline-none w-48 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:border-primary outline-none px-3 py-3 transition-all"
          >
            <option value="">All Statuses</option>
            {["completed", "pending", "failed", "refunded"].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          {showDownload && (
            <button
              onClick={() => {
                const csv = [
                  [
                    "Date",
                    "Description",
                    "Category",
                    "Amount",
                    "Status",
                    "Provider",
                  ].join(","),
                  ...filtered.map((t) =>
                    [
                      fmtDate(t.timestamp),
                      `"${t.description}"`,
                      t.category,
                      t.amount,
                      t.status,
                      t.provider,
                    ].join(","),
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "transactions.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-xs font-bold  tracking-normal hover:bg-primary/80 transition-all shadow-none active:scale-95"
            >
              <BiDownload size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Date",
                "Description",
                "Category",
                "Amount",
                "Provider",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-xs font-bold text-slate-400  tracking-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-slate-400 text-sm font-medium"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              paginated.map((t, i) => (
                <tr
                  key={t._id || i}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {fmtDate(t.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                      {t.description || "—"}
                    </p>
                    {t.medicalAidClaimRef && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Ref: {t.medicalAidClaimRef}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg capitalize">
                      {t.category || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-800">
                      {fmtZAR(t.amount)}
                    </p>
                    {t.platformFeeAmount && (
                      <p className="text-xs text-slate-400 font-medium">
                        Fee: {fmtZAR(t.platformFeeAmount)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 capitalize">
                      {(t.provider || "—").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="px-6 py-4">
                    <button className="w-8 h-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                      <BiDownload size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            {filtered.length} results · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <BiChevronDown className="rotate-90" size={16} />
            </button>
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <BiChevronDown className="-rotate-90" size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
function MiniBarChart({
  data,
  label,
}: {
  data: Record<string, number>;
  label: string;
}) {
  const entries = Object.entries(data).slice(-6);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <Card>
      <p className="text-xs font-bold text-slate-400  tracking-normal mb-4">
        {label}
      </p>
      <div className="flex items-end gap-2 h-24">
        {entries.map(([k, v], i) => (
          <div
            key={k}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <span className="text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {fmtZAR(v)}
            </span>
            <div
              className="w-full rounded-t transition-all duration-500 bg-primary/20 hover:bg-primary relative"
              style={{ height: `${(v / max) * 80}px` }}
            >
              {i === entries.length - 1 && (
                <div className="absolute top-0 left-0 right-0 h-full rounded-t bg-primary shadow-none shadow-primary/30" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-400">{k}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Patient Billing View ──────────────────────────────────────────────────────
function PatientBillingView({
  data,
  onAction,
  actionLoading,
}: {
  data: BillingData;
  onAction: (action: string, payload?: any) => void;
  actionLoading: boolean;
}) {
  const {
    summary,
    transactions = [],
    subscription,
    paymentMethods = [],
  } = data;
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState("pro");

  const tiers = [
    {
      id: "full_access",
      label: "Full Access",
      price: 250,
      features: [
        "Unlimited consultations",
        "Full AI triage & diagnostic tools",
        "Complete medical health record PDF",
        "Medication refills & reminders",
        "Secure cloud health vault",
        "Self-pay or Insurance covered",
      ],
    },
  ];

  const cardIcons: Record<string, string> = {
    Visa: "💳",
    Mastercard: "💳",
    "American Express": "🟦",
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard
          label="Total Spent"
          value={fmtZAR(summary.totalSpent)}
          icon={<BiWallet />}
          accent="primary"
        />
        <SummaryCard
          label="Completed Txns"
          value={summary.completedCount}
          icon={<BiCheckCircle />}
          accent="emerald"
        />
        <SummaryCard
          label="Pending Txns"
          value={summary.pendingCount}
          icon={<BiTime />}
          accent="gray"
        />
      </div>

      {/* Subscription Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 font-grotesk">
              Subscription Plan
            </h3>
            <StatusPill status={subscription?.status || "free"} />
          </div>
          {subscription ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold bg-primary/10 text-primary`}
                >
                  🚀
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 capitalize">
                    Full Access Plan
                  </p>
                  <p className="text-sm text-slate-400 font-medium">
                    {fmtZAR(250)} / month
                  </p>
                </div>
              </div>
              <div className="flex gap-4 pt-2 border-t border-slate-100 text-xs font-medium text-slate-500">
                <span>Started {fmtDate(subscription.startDate)}</span>
                <span>·</span>
                <span>
                  Next billing {fmtDate(subscription.nextBillingDate)}
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={() => setUpgradeModal(true)} fullWidth>
                  Update Payment
                </Button>
                {subscription.status !== "cancelled" && (
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={() =>
                      confirm("Cancel your subscription?") &&
                      onAction("cancel_subscription")
                    }
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm font-medium mb-4">
                No active subscription
              </p>
              <Button
                onClick={() => setUpgradeModal(true)}
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold  tracking-normal  shadow-primary/20 hover:bg-primary/80 transition-all"
              >
                Get Started
              </Button>
            </div>
          )}
        </Card>

        {/* Payment Methods */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 font-grotesk">
              Payment Methods
            </h3>
            <button className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <BiPlus size={14} /> Add New
            </button>
          </div>
          <div className="space-y-3">
            {paymentMethods.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                No payment methods saved
              </p>
            ) : (
              paymentMethods.map((pm: any, i: number) => (
                <div
                  key={pm._id || i}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${pm.isDefault ? "border-primary/30 bg-primary/[0.02]" : "border-slate-100 hover:border-slate-200"}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl shrink-0">
                    {pm.type === "card"
                      ? cardIcons[pm.cardBrand] || "💳"
                      : pm.type === "medical_aid"
                        ? "🏥"
                        : "🏦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {pm.type === "card" && (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          {pm.cardBrand} •••• {pm.last4}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Expires {pm.expiryMonth}/{pm.expiryYear}
                        </p>
                      </>
                    )}
                    {pm.type === "medical_aid" && (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          {pm.medicalAidProvider}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Member: {pm.medicalAidNumber}
                        </p>
                      </>
                    )}
                    {pm.type === "eft" && (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          {pm.bankName}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Acc: •••• {pm.accountNumber?.slice(-4)}
                        </p>
                      </>
                    )}
                    {pm.medicalAidNumber && pm.insuranceProvider && (
                      <p className="text-[9px] text-slate-300 font-bold  tracking-wide mt-0.5">
                        {pm.insuranceProvider} • {pm.coverageType}
                      </p>
                    )}
                  </div>
                  {pm.isDefault && (
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg  tracking-normal shrink-0">
                      Default
                    </span>
                  )}
                  <button className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <BiXCircle size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <TransactionTable
        transactions={transactions}
        title="Payment History"
        showDownload
      />

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setUpgradeModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 ">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 font-grotesk">
                Platform Access Plan
              </h3>
              <button
                onClick={() => setUpgradeModal(false)}
                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-8">
              <div className="p-6 rounded-2xl border-2 border-primary bg-primary/[0.03] text-left">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold  tracking-normal text-primary">
                    Recommended Plan
                  </p>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg ">
                    Insurance Accepted
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-2">
                  R250
                  <span className="text-sm font-medium text-slate-400">
                    /mo
                  </span>
                </p>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                  Complete access to all 24/7 DigiHealth features for
                  individuals.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {tiers[0].features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs font-medium text-slate-600"
                    >
                      <BiCheckCircle
                        className="text-emerald-500 shrink-0 mt-0.5"
                        size={14}
                      />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => {
                  onAction("upgrade_subscription", { tier: selectedTier });
                  setUpgradeModal(false);
                }}
                disabled={actionLoading}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-xs  tracking-normal shadow-none shadow-primary/20 hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {actionLoading
                  ? "Processing..."
                  : `Upgrade to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Practitioner Billing View ─────────────────────────────────────────────────
function PractitionerBillingView({
  data,
  onAction,
  actionLoading,
}: {
  data: BillingData;
  onAction: (action: string, payload?: any) => void;
  actionLoading: boolean;
}) {
  const {
    summary,
    payoutRequests = [],
    transactions = [],
    monthlyBreakdown = {},
  } = data;
  const [requestModal, setRequestModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          label="Total Earned"
          value={fmtZAR(summary.totalEarned)}
          icon={<BiTrendingUp />}
          accent="emerald"
        />
        <SummaryCard
          label="Total Paid Out"
          value={fmtZAR(summary.totalPaid)}
          icon={<BiBuilding />}
          accent="primary"
        />
        <SummaryCard
          label="Pending Payouts"
          value={fmtZAR(summary.totalPending)}
          icon={<BiTime />}
          accent="gray"
        />
        <SummaryCard
          label="Payout Requests"
          value={String(summary.pendingPayouts)}
          icon={<BiTransfer />}
          accent="purple"
        />
      </div>

      {/* Chart + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MiniBarChart
            data={monthlyBreakdown}
            label="Monthly Earnings (ZAR)"
          />
        </div>
        <Card>
          <p className="text-xs font-bold text-slate-400  tracking-normal mb-4">
            Quick Actions
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setRequestModal(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-primary text-white font-bold text-xs  tracking-normal hover:bg-primary/80 transition-all  shadow-primary/20 active:scale-95"
            >
              <BiTransfer size={18} /> Request Payout
            </button>
            <button
              onClick={() => setBankModal(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs  tracking-normal hover:bg-slate-200 transition-all"
            >
              <BiBuilding size={18} /> Update Bank Account
            </button>
            <button
              onClick={() => {
                const csv =
                  ["Date,Amount,Status,Consultations,Period"].join("\n") +
                  "\n" +
                  payoutRequests
                    .map(
                      (p: any) =>
                        `${fmtDate(p.requestedAt)},${p.amount},${p.status},${p.consultationCount},${fmtDate(p.periodFrom)}-${fmtDate(p.periodTo)}`,
                    )
                    .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "payout_report.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs  tracking-normal hover:bg-slate-200 transition-all"
            >
              <BiDownload size={18} /> Download Payout Report
            </button>
          </div>
        </Card>
      </div>

      {/* Payout History */}
      <Card noPadding>
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 font-grotesk">
            Payout History
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Period",
                  "Consultations",
                  "Gross",
                  "Platform Fee",
                  "Net Payout",
                  "Status",
                  "Date",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-xs font-bold text-slate-400  tracking-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payoutRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-400 text-sm"
                  >
                    No payout history
                  </td>
                </tr>
              ) : (
                payoutRequests.map((p: any, i: number) => (
                  <tr
                    key={p._id || i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {fmtDate(p.periodFrom)} – {fmtDate(p.periodTo)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 text-center">
                      {p.consultationCount}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">
                      {fmtZAR((p.amount || 0) + (p.platformFeeDeducted || 0))}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-red-500">
                      -{fmtZAR(p.platformFeeDeducted)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                      {fmtZAR(p.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {fmtDate(p.requestedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction breakdown */}
      <TransactionTable
        transactions={transactions}
        title="Consultation Revenue Breakdown"
        showDownload
      />

      {/* Request Payout Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setRequestModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8  animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 font-grotesk">
              Request Payout
            </h3>
            <div className="space-y-4">
              <div>
                <h1 className="block text-sm font-bold text-slate-400  tracking-normal mb-2">
                  Amount (ZAR)
                </h1>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none font-bold"
                  placeholder="0.00"
                />
              </div>
              <div>
                <h1 className="block text-sm font-bold text-slate-400  tracking-normal mb-2">
                  Notes (optional)
                </h1>
                <input
                  type="text"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none"
                  placeholder="Monthly payout request"
                />
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Platform fee of 12% will be deducted. Net amount:{" "}
                <strong>
                  {fmtZAR(parseFloat(requestAmount || "0") * 0.88)}
                </strong>
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setRequestModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAction("request_payout", {
                    amount: parseFloat(requestAmount) * 0.88,
                    notes: requestNotes,
                    periodFrom: new Date(
                      Date.now() - 30 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    periodTo: new Date().toISOString(),
                    consultationCount: 0,
                  });
                  setRequestModal(false);
                }}
                disabled={!requestAmount || actionLoading}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs  tracking-normal  disabled:opacity-50 hover:bg-primary/80 transition-all"
              >
                {actionLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {bankModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setBankModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8  animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 font-grotesk">
              Bank Account Details
            </h3>
            <div className="space-y-4">
              {[
                "Account Holder",
                "Bank Name",
                "Account Number",
                "Branch Code",
                "Tax Number",
              ].map((field) => (
                <div key={field}>
                  <h1 className="block text-sm font-bold text-slate-400  tracking-normal mb-1.5">
                    {field}
                  </h1>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none"
                    placeholder={field}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBankModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setBankModal(false)}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs  tracking-normal  hover:bg-primary/80 transition-all"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hospital Admin Billing View ───────────────────────────────────────────────
function HospitalAdminBillingView({
  data,
  onAction,
  actionLoading,
}: {
  data: BillingData;
  onAction: (action: string, payload?: any) => void;
  actionLoading: boolean;
}) {
  const {
    summary,
    revenues = [],
    payoutRequests = [],
    departmentBreakdown = [],
  } = data;

  const totalRevThisMonth = revenues[0]?.totalRevenue || 0;
  const revenueByMonthMap: Record<string, number> = {};
  revenues.forEach((r: any) => {
    const key = new Date(r.date).toLocaleDateString("en-ZA", {
      month: "short",
      year: "2-digit",
    });
    revenueByMonthMap[key] = (revenueByMonthMap[key] || 0) + r.totalRevenue;
  });

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard
          label="Total Revenue"
          value={fmtZAR(summary.totalRevenue)}
          icon={<BiChart />}
          accent="primary"
        />
        <SummaryCard
          label="This Month"
          value={fmtZAR(totalRevThisMonth)}
          icon={<BiTrendingUp />}
          accent="emerald"
        />
        <SummaryCard
          label="Pending Payouts"
          value={String(summary.pendingPayoutCount)}
          icon={<BiTime />}
          accent="gray"
        />
      </div>

      {/* Revenue Chart + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MiniBarChart data={revenueByMonthMap} label="Monthly Revenue (ZAR)" />

        <Card noPadding>
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 font-grotesk">
              Revenue by Department
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {departmentBreakdown.slice(0, 6).map((d: any) => {
              const pct =
                departmentBreakdown[0]?.revenue > 0
                  ? (d.revenue / departmentBreakdown[0].revenue) * 100
                  : 0;
              return (
                <div key={d.department} className="flex items-center gap-4">
                  <p className="text-xs font-bold text-slate-600 w-28 shrink-0 truncate">
                    {d.department}
                  </p>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-700 w-24 text-right shrink-0">
                    {fmtZAR(d.revenue)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Practitioner Payout Management */}
      <Card noPadding>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 font-grotesk">
            Practitioner Payouts
          </h3>
          <button
            onClick={() => {
              const csv =
                ["Practitioner,Amount,Status,Period,Consultations"].join("\n") +
                "\n" +
                payoutRequests
                  .map((p: any) => {
                    const pract = p.practitionerId;
                    const name = pract?.firstName
                      ? `${pract.firstName} ${pract.lastName}`
                      : "—";
                    return `"${name}",${p.amount},${p.status},"${fmtDate(p.periodFrom)}-${fmtDate(p.periodTo)}",${p.consultationCount}`;
                  })
                  .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "payouts.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <BiDownload size={14} /> Export Report
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Practitioner",
                  "Period",
                  "Consultations",
                  "Amount",
                  "Fee",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-xs font-bold text-slate-400  tracking-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payoutRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-400 text-sm"
                  >
                    No payout requests
                  </td>
                </tr>
              ) : (
                payoutRequests.map((p: any, i: number) => {
                  const pract = p.practitionerId;
                  const name = pract?.firstName
                    ? `Dr. ${pract.firstName} ${pract.lastName}`
                    : "—";
                  return (
                    <tr
                      key={p._id || i}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {name}
                        </p>
                        <p className="text-xs text-slate-400">{pract?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {fmtDate(p.periodFrom)} – {fmtDate(p.periodTo)}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 text-center">
                        {p.consultationCount}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                        {fmtZAR(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-red-500">
                        {fmtZAR(p.platformFeeDeducted)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        {p.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                onAction("update_payout", {
                                  payoutId: p._id,
                                  status: "approved",
                                })
                              }
                              disabled={actionLoading}
                              className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                onAction("update_payout", {
                                  payoutId: p._id,
                                  status: "rejected",
                                })
                              }
                              disabled={actionLoading}
                              className="px-3 py-2 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Super/Mega Admin Billing View ─────────────────────────────────────────────
function AdminBillingView({
  data,
  onAction,
  actionLoading,
}: {
  data: BillingData;
  onAction: (action: string, payload?: any) => void;
  actionLoading: boolean;
}) {
  const {
    summary,
    allTransactions = [],
    allPayouts = [],
    feeConfig,
    auditLogs = [],
    revenueByMonth = {},
  } = data;
  const [feeModal, setFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState({
    platformFeePercent: feeConfig?.platformFeePercent ?? 15,
    consultationFeePercent: feeConfig?.consultationFeePercent ?? 12,
    subscriptionFeePercent: feeConfig?.subscriptionFeePercent ?? 10,
  });
  const [activeSubTab, setActiveSubTab] = useState<
    "transactions" | "payouts" | "audit"
  >("transactions");

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <SummaryCard
          label="Platform Revenue"
          value={fmtZAR(summary.platformRevenue)}
          icon={<BiDollarCircle />}
          accent="primary"
        />
        <SummaryCard
          label="Total Transacted"
          value={fmtZAR(summary.totalRevenue)}
          icon={<BiTrendingUp />}
          accent="emerald"
        />
        <SummaryCard
          label="Pending Payouts"
          value={String(summary.pendingPayouts)}
          icon={<BiTime />}
          accent="gray"
        />
        <SummaryCard
          label="Patients"
          value={String(summary.patientCount)}
          icon={<BiUser />}
          accent="slate"
        />
        <SummaryCard
          label="Practitioners"
          value={String(summary.practitionerCount)}
          icon={<BiGroup />}
          accent="purple"
        />
      </div>

      {/* Platform Fee Config + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MiniBarChart
            data={revenueByMonth}
            label="Platform-Wide Revenue by Month (ZAR)"
          />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold text-slate-400  tracking-normal">
              Platform Fee Config
            </p>
            <button
              onClick={() => setFeeModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <BiEdit size={13} /> Adjust
            </button>
          </div>
          <div className="space-y-4">
            {[
              {
                label: "Platform Fee",
                value: feeConfig?.platformFeePercent ?? 15,
              },
              {
                label: "Consultation Fee",
                value: feeConfig?.consultationFeePercent ?? 12,
              },
              {
                label: "Subscription Fee",
                value: feeConfig?.subscriptionFeePercent ?? 10,
              },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between py-3 border-b border-slate-50"
              >
                <p className="text-xs font-bold text-slate-600">{f.label}</p>
                <span className="text-lg font-bold text-primary">
                  {f.value}%
                </span>
              </div>
            ))}
          </div>
          {feeConfig && (
            <p className="text-xs text-slate-300 font-medium mt-4">
              Last updated:{" "}
              {fmtDate(feeConfig.updatedAt || feeConfig.createdAt)}
            </p>
          )}
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(["transactions", "payouts", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 py-4 text-xs font-bold  tracking-normal transition-all ${
                activeSubTab === tab
                  ? "bg-primary/5 text-primary border-b-2 border-primary"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "transactions"
                ? "All Transactions"
                : tab === "payouts"
                  ? "Payout Management"
                  : "Audit Log"}
            </button>
          ))}
        </div>

        {activeSubTab === "transactions" && (
          <TransactionTable
            transactions={allTransactions}
            title="All Platform Transactions"
            showDownload
          />
        )}

        {activeSubTab === "payouts" && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50">
                  {[
                    "Practitioner",
                    "Amount",
                    "Consultations",
                    "Status",
                    "Requested",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-xs font-bold text-slate-400  tracking-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allPayouts.map((p: any, i: number) => {
                  const pract = p.practitionerId;
                  const name = pract?.firstName
                    ? `Dr. ${pract.firstName} ${pract.lastName}`
                    : "—";
                  return (
                    <tr
                      key={p._id || i}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">
                        {name}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                        {fmtZAR(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 text-center">
                        {p.consultationCount}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {fmtDate(p.requestedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {p.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                onAction("update_payout", {
                                  payoutId: p._id,
                                  status: "approved",
                                })
                              }
                              disabled={actionLoading}
                              className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                onAction("update_payout", {
                                  payoutId: p._id,
                                  status: "rejected",
                                })
                              }
                              disabled={actionLoading}
                              className="px-3 py-2 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "audit" && (
          <div className="divide-y divide-slate-50">
            {auditLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No audit logs</p>
            ) : (
              auditLogs.map((log: any, i: number) => {
                const actor = log.actorId;
                const name = actor?.firstName
                  ? `${actor.firstName} ${actor.lastName}`
                  : "System";
                return (
                  <div
                    key={log._id || i}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 text-sm">
                      <BiHistory />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {log.actionType}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {name}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {fmtDate(log.timestamp)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                          {Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Fee Config Modal */}
      {feeModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setFeeModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-8  animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 font-grotesk">
              Adjust Platform Fees
            </h3>
            <div className="space-y-4">
              {(
                [
                  ["Platform Fee %", "platformFeePercent"],
                  ["Consultation Fee %", "consultationFeePercent"],
                  ["Subscription Fee %", "subscriptionFeePercent"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <h1 className="block text-sm font-bold text-slate-400  tracking-normal mb-1.5">
                    {label}
                  </h1>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={feeForm[key]}
                    onChange={(e) =>
                      setFeeForm((f) => ({
                        ...f,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-3 mt-4">
              ⚠️ Changes apply to all future transactions.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setFeeModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAction("update_fee_config", { config: feeForm });
                  setFeeModal(false);
                }}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs  tracking-normal  hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Config"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setAL] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = useCallback(
    async (action: string, payload?: any) => {
      setAL(true);
      try {
        const res = await fetch("/api/billing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (json.success) {
          showToast(
            action === "cancel_subscription"
              ? "Subscription cancelled."
              : action === "upgrade_subscription"
                ? "Plan upgraded successfully!"
                : action === "request_payout"
                  ? "Payout request submitted."
                  : action === "update_payout"
                    ? `Payout ${payload?.status}.`
                    : action === "update_fee_config"
                      ? "Platform fees updated."
                      : "Action completed.",
          );
          fetchData();
        } else {
          showToast(json.error || "Action failed.", "error");
        }
      } catch {
        showToast("Network error. Please try again.", "error");
      } finally {
        setAL(false);
      }
    },
    [fetchData],
  );

  // Role-specific nav label
  const roleLabel: Record<string, string> = {
    patient: "Patient Billing",
    practitioner: "Earnings & Payouts",
    hospital_admin: "Facility Finance",
    super_admin: "Platform Finance",
    mega_admin: "Platform Finance",
    inspector: "Finance Overview",
  };

  const roleIcon: Record<string, React.ReactNode> = {
    patient: <BiCreditCard size={22} />,
    practitioner: <BiWallet size={22} />,
    hospital_admin: <BiBuildings size={22} />,
    super_admin: <BiShield size={22} />,
    mega_admin: <BiShield size={22} />,
    inspector: <BiChart size={22} />,
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-grotesk">
              {data ? (roleLabel[data.role] ?? "Billing") : "Billing"}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {data?.role === "patient" &&
                "Manage your payments, subscription, and insurance"}
              {data?.role === "practitioner" &&
                "Track earnings, request payouts, and manage bank account"}
              {data?.role === "hospital_admin" &&
                "Facility revenue, department billing, and payouts"}
              {(data?.role === "super_admin" ||
                data?.role === "mega_admin" ||
                data?.role === "inspector") &&
                "Platform-wide financial oversight and configuration"}
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <BiRefresh size={16} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
          <p className="text-sm font-bold text-slate-400 ">
            Loading Financial Data...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-24 space-y-4">
          <BiAperture size={48} className="mx-auto text-slate-200" />
          <p className="text-slate-400 font-bold">
            Could not load billing data.
          </p>
          <button
            onClick={fetchData}
            className="text-xs font-bold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          {data.role === "patient" && (
            <PatientBillingView
              data={data}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          )}
          {data.role === "practitioner" && (
            <PractitionerBillingView
              data={data}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          )}
          {data.role === "hospital_admin" && (
            <HospitalAdminBillingView
              data={data}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          )}
          {(data.role === "super_admin" ||
            data.role === "mega_admin" ||
            data.role === "inspector") && (
            <AdminBillingView
              data={data}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          )}
        </>
      ) : null}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl font-bold text-sm  animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <BiCheckCircle size={18} />
          ) : (
            <BiXCircle size={18} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
