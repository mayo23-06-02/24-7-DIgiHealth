"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  CreditCard,
  Receipt,
  TrendingUp,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Building2,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  History,
  CircleDollarSign,
  ArrowLeftRight,
  BarChart3,
  Search,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import { downloadBillingPdf } from "@/lib/billing/downloadPdf";
import { TIER_ORDER, TIER_CONFIG, isValidTier } from "@/lib/billing/tiers";

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

const STATUS_MAP: Record<string, BadgeStatus> = {
  completed: "success",
  paid: "success",
  active: "success",
  approved: "info",
  pending: "warning",
  trial: "premium",
  failed: "error",
  rejected: "error",
  cancelled: "neutral",
  refunded: "warning",
  past_due: "error",
};

function StatusPill({ status }: { status: string }) {
  return (
    <Badge
      label={status}
      status={STATUS_MAP[status] ?? "neutral"}
      className="capitalize"
    />
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
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    neutral: "bg-surface-soft text-ink-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card variant="glass" className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-xl ${accents[accent] ?? accents.primary}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500  tracking-normal truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-800 leading-tight truncate">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p>
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
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
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

  const downloadTxnPdf = async (t: any, kind: "receipt" | "invoice") => {
    const id = t._id || t.id;
    if (!id) return;
    setPdfLoadingId(String(id));
    try {
      await downloadBillingPdf(
        { type: kind, transactionId: String(id) },
        `${kind}.pdf`,
      );
    } catch (e: any) {
      alert(e?.message || "Could not download PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const downloadReportPdf = async () => {
    setReportLoading(true);
    try {
      await downloadBillingPdf(
        { type: "report", reportKind: "statement" },
        "billing_report.pdf",
      );
    } catch (e: any) {
      alert(e?.message || "Could not download report");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Card noPadding>
      <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
          {title}
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            fullWidth={false}
            icon={<Search size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="w-48 h-10 text-xs"
          />
          <Select
            fullWidth={false}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="w-40 h-10 text-xs"
            options={[
              { value: "", label: "All Statuses" },
              ...["completed", "pending", "failed", "refunded"].map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            ]}
          />
          {showDownload && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => void downloadReportPdf()}
                loading={reportLoading}
              >
                Report PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
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
              >
                Report CSV
              </Button>
            </>
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
                  className="px-6 py-4 text-xs font-bold text-slate-500  tracking-normal"
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
                  className="py-16 text-center text-slate-500 text-sm font-medium"
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
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Ref: {t.medicalAidClaimRef}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge label={t.category || "—"} status="neutral" size="sm" className="capitalize" />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-800">
                      {fmtZAR(t.amount)}
                    </p>
                    {t.platformFeeAmount && (
                      <p className="text-xs text-slate-500 font-medium">
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
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Download receipt / invoice PDF"
                        disabled={
                          pdfLoadingId === String(t._id || t.id)
                        }
                        onClick={() =>
                          void downloadTxnPdf(
                            t,
                            t.status === "completed" ? "receipt" : "invoice",
                          )
                        }
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all disabled:opacity-40"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        type="button"
                        title="Download invoice PDF"
                        disabled={
                          pdfLoadingId === String(t._id || t.id)
                        }
                        onClick={() => void downloadTxnPdf(t, "invoice")}
                        className="hidden md:flex w-8 h-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 items-center justify-center transition-all disabled:opacity-40"
                      >
                        <Receipt size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            {filtered.length} results · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`w-11 h-11 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${p === page ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight size={16} />
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
      <p className="text-xs font-bold text-slate-500  tracking-normal mb-4">
        {label}
      </p>
      <div className="flex items-end gap-2 h-24">
        {entries.map(([k, v], i) => (
          <div
            key={k}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <span className="text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <p className="text-xs font-bold text-slate-500">{k}</p>
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
  const [selectedTier, setSelectedTier] = useState(TIER_ORDER[0]);
  const [paymentMethodModal, setPaymentMethodModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "card",
    cardNumber: "",
    cardHolder: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);

  const BASELINE_FEATURES = [
    "Video, chat & voice consultations",
    "Digital prescriptions",
    "Secure, POPIA-compliant health records",
  ];

  const tiers = TIER_ORDER.map((id, idx) => {
    const cfg = TIER_CONFIG[id];
    const prevLabel = idx > 0 ? TIER_CONFIG[TIER_ORDER[idx - 1]].label : null;
    const consultLine =
      cfg.consultationsMax === Infinity
        ? "Unlimited consultations"
        : `${cfg.consultationsMax} consultations / month`;
    const features = prevLabel
      ? [
          `Everything in ${prevLabel}, plus`,
          consultLine,
          ...(cfg.maxFamilyMembers > 0
            ? [`Up to ${cfg.maxFamilyMembers} family members`]
            : []),
        ]
      : [
          consultLine,
          ...(cfg.maxFamilyMembers > 0
            ? [`Up to ${cfg.maxFamilyMembers} family members`]
            : []),
          ...BASELINE_FEATURES,
        ];
    return {
      id: cfg.id,
      label: cfg.label,
      price: cfg.price,
      tagline:
        cfg.id === "individual"
          ? "For one person's everyday care."
          : cfg.id === "family"
            ? "For couples and small households."
            : "For larger families who need it all.",
      popular: cfg.id === "family",
      features,
    };
  });

  const cardIcons: Record<string, string> = {
    Visa: "💳",
    Mastercard: "💳",
    "American Express": "🟦",
  };

  const detectCardBrand = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, "");
    if (/^4/.test(cleaned)) return "Visa";
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "Mastercard";
    if (/^3[47]/.test(cleaned)) return "American Express";
    return "Visa"; // Default fallback
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:gap-6 gap-2">
        <SummaryCard
          label="Total Spent"
          value={fmtZAR(summary.totalSpent)}
          icon={<Wallet />}
          accent="primary"
        />
        <SummaryCard
          label="Completed Transactions"
          value={summary.completedCount}
          icon={<CheckCircle2 />}
          accent="primary"
        />
        <SummaryCard
          label="Pending Transactions"
          value={summary.pendingCount}
          icon={<Clock />}
          accent="primary"
        />
      </div>

      {/* Subscription Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
              Subscription Plan
            </h3>
            <StatusPill status={subscription?.status || "free"} />
          </div>
          {subscription ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
              
                <div>
                  <p className="text-xl font-bold text-slate-800">
                    {(() => {
                      const rawTier: string = subscription.tier;
                      return isValidTier(rawTier)
                        ? TIER_CONFIG[rawTier].label
                        : rawTier;
                    })()}{" "}
                    Plan
                  </p>
                  <p className="text-sm text-slate-500 font-medium">
                    {fmtZAR(subscription.price || 0)} / month
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
                <Button fullWidth size="sm" onClick={() => setUpgradeModal(true)}>
                  Upgrade Plan
                </Button>
                {subscription.status !== "cancelled" && (
                  <Button
                    fullWidth
                    size="sm"
                    variant="ghost"
                    disabled={actionLoading}
                    onClick={() =>
                      confirm("Cancel your subscription?") &&
                      onAction("cancel_subscription")
                    }
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm font-medium mb-4">
                No active subscription
              </p>
              <Button size="sm" onClick={() => setUpgradeModal(true)}>
                Get Started
              </Button>
            </div>
          )}
        </Card>

        {/* Payment Methods */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
              Payment Methods
            </h3>
            <button
              onClick={() => setPaymentMethodModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <Plus size={14} /> Add New
            </button>
          </div>
          <div className="space-y-3">
            {paymentMethods.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">
                No payment methods saved
              </p>
            ) : (
              paymentMethods.map((pm: any, i: number) => (
                <div
                  key={pm._id || i}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${pm.isDefault ? "border-primary/30 bg-primary/[0.02]" : "border-slate-100 hover:border-slate-200"}`}
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
                        <p className="text-xs text-slate-500 font-medium">
                          Expires {pm.expiryMonth}/{pm.expiryYear}
                        </p>
                      </>
                    )}
                    {pm.type === "medical_aid" && (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          {pm.medicalAidProvider}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          Member: {pm.medicalAidNumber}
                        </p>
                      </>
                    )}
                    {pm.type === "eft" && (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          {pm.bankName}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
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
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this payment method?')) {
                        try {
                          const res = await fetch(`/api/billing/payment-methods/${pm._id}`, {
                            method: 'DELETE',
                          });
                          if (res.ok) {
                            window.location.reload();
                          }
                        } catch (err) {
                          console.error('Failed to delete payment method', err);
                        }
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                    title="Delete payment method"
                  >
                    <XCircle size={18} />
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

      {/* Payment Method Modal */}
      {paymentMethodModal && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPaymentMethodModal(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[90vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 sm:slide-in-from-bottom-0 fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
                Add Payment Method
              </h3>
              <button
                onClick={() => setPaymentMethodModal(false)}
                aria-label="Close"
                className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 hover:bg-danger-50 hover:text-danger-500 flex items-center justify-center transition-all"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Card Number
                </label>
                <Input
                  fullWidth
                  value={newPaymentMethod.cardNumber}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Cardholder Name
                </label>
                <Input
                  fullWidth
                  value={newPaymentMethod.cardHolder}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardHolder: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Expiry Month
                  </label>
                  <Select
                    fullWidth
                    value={newPaymentMethod.expiryMonth}
                    onChange={(v) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: v })}
                    options={[
                      { value: "", label: "MM" },
                      ...Array.from({ length: 12 }, (_, i) => ({
                        value: String(i + 1).padStart(2, "0"),
                        label: String(i + 1).padStart(2, "0"),
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Expiry Year
                  </label>
                  <Select
                    fullWidth
                    value={newPaymentMethod.expiryYear}
                    onChange={(v) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: v })}
                    options={[
                      { value: "", label: "YY" },
                      ...Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return {
                          value: String(year).slice(-2),
                          label: String(year).slice(-2),
                        };
                      }),
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  CVV
                </label>
                <Input
                  fullWidth
                  value={newPaymentMethod.cvv}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 shrink-0">
              <Button
                fullWidth
                loading={savingPaymentMethod}
                onClick={async () => {
                  if (!newPaymentMethod.cardNumber || !newPaymentMethod.cardHolder || 
                      !newPaymentMethod.expiryMonth || !newPaymentMethod.expiryYear || !newPaymentMethod.cvv) {
                    alert("Please fill in all card details");
                    return;
                  }
                  setSavingPaymentMethod(true);
                  try {
                    const res = await fetch("/api/billing/payment-methods", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "card",
                        cardNumber: newPaymentMethod.cardNumber.replace(/\s/g, ""),
                        cardHolder: newPaymentMethod.cardHolder,
                        expiryMonth: newPaymentMethod.expiryMonth,
                        expiryYear: newPaymentMethod.expiryYear,
                        last4: newPaymentMethod.cardNumber.slice(-4),
                        cardBrand: detectCardBrand(newPaymentMethod.cardNumber),
                      }),
                    });
                    if (res.ok) {
                      setPaymentMethodModal(false);
                      setNewPaymentMethod({
                        type: "card",
                        cardNumber: "",
                        cardHolder: "",
                        expiryMonth: "",
                        expiryYear: "",
                        cvv: "",
                      });
                      window.location.reload();
                    } else {
                      alert("Failed to add payment method");
                    }
                  } catch (err) {
                    console.error("Failed to add payment method", err);
                    alert("Failed to add payment method");
                  } finally {
                    setSavingPaymentMethod(false);
                  }
                }}
              >
                Add Payment Method
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal — same centered-desktop/bottom-sheet-mobile contract as
          Dialog, but wider to fit the 3-column tier grid Dialog's max size can't. */}
      {upgradeModal && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setUpgradeModal(false)}
          />
          <div className="relative w-full sm:max-w-4xl bg-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[90vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 sm:slide-in-from-bottom-0 fade-in duration-200">
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 shrink-0">
              <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
                Choose Your Plan
              </h3>
              <button
                onClick={() => setUpgradeModal(false)}
                aria-label="Close"
                className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 hover:bg-danger-50 hover:text-danger-500 flex items-center justify-center transition-all"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 lg:gap-3 gap-6 overflow-y-auto custom-scrollbar items-start">
              {tiers.map((t) => {
                const isSelected = selectedTier === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    className={`relative text-left rounded-xl h-full border p-4 transition-all ${
                      t.popular
                        ? "border-primary/40 bg-gradient-to-b from-primary/[0.06] to-transparent shadow-lg shadow-primary/10"
                        : "border-slate-200"
                    } ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:border-slate-300"
                    }`}
                  >
                    {t.popular && (
                      <span className="absolute -top-3 left-4 px-2.5 py-1 rounded-full bg-accent text-ink-600 text-[10px] font-bold tracking-wide">
                        MOST POPULAR
                      </span>
                    )}

                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {t.label}
                    </p>

                    <div className="flex items-baseline gap-1 mt-2 mb-1">
                      <span className="text-3xl font-bold text-ink-600 font-grotesk tabular-nums">
                        R{t.price}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        /mo
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mb-4 leading-snug">
                      {t.tagline}
                    </p>

                    <span
                      className={`block w-full text-center py-2 rounded-full text-xs font-bold mb-4 transition-colors ${
                        t.popular
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-700"
                      } ${isSelected ? "ring-2 ring-primary/50" : ""}`}
                    >
                      {isSelected ? "Selected" : "Select plan"}
                    </span>

                    <ul className="space-y-2">
                      {t.features.map((f, i) => (
                        <li
                          key={f}
                          className={`flex items-start gap-2 text-xs leading-snug ${
                            i === 0 && t.features.length > 1 && f.startsWith("Everything")
                              ? "font-bold text-ink-900"
                              : "font-medium text-slate-600"
                          }`}
                        >
                          {!(i === 0 && f.startsWith("Everything")) && (
                            <CheckCircle2
                              className="text-success-500 shrink-0 mt-0.5"
                              size={13}
                            />
                          )}
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 shrink-0">
              <Button
                fullWidth
                loading={actionLoading}
                onClick={() => {
                  onAction("upgrade_subscription", { tier: selectedTier });
                  setUpgradeModal(false);
                }}
              >
                {`Upgrade to ${isValidTier(selectedTier) ? TIER_CONFIG[selectedTier].label : selectedTier}`}
              </Button>
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
          icon={<TrendingUp />}
          accent="success"
        />
        <SummaryCard
          label="Total Paid Out"
          value={fmtZAR(summary.totalPaid)}
          icon={<Building2 />}
          accent="primary"
        />
        <SummaryCard
          label="Pending Payouts"
          value={fmtZAR(summary.totalPending)}
          icon={<Clock />}
          accent="warning"
        />
        <SummaryCard
          label="Payout Requests"
          value={String(summary.pendingPayouts)}
          icon={<ArrowLeftRight />}
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
          <p className="text-xs font-bold text-slate-500  tracking-normal mb-4">
            Quick Actions
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setRequestModal(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-lg bg-primary text-white font-bold text-xs  tracking-normal hover:bg-primary/80 transition-all  shadow-primary/20 active:scale-95"
            >
              <ArrowLeftRight size={18} /> Request Payout
            </button>
            <button
              onClick={() => setBankModal(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs  tracking-normal hover:bg-slate-200 transition-all"
            >
              <Building2 size={18} /> Update Bank Account
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "payouts" },
                    "payout_report.pdf",
                  );
                } catch (e: any) {
                  alert(e?.message || "Failed to download payout report");
                }
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs tracking-normal hover:bg-slate-200 transition-all"
            >
              <Download size={18} /> Download Payout Report (PDF)
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "full" },
                    "earnings_report.pdf",
                  );
                } catch (e: any) {
                  alert(e?.message || "Failed to download earnings report");
                }
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs tracking-normal hover:bg-slate-200 transition-all"
            >
              <Receipt size={18} /> Full Earnings Report (PDF)
            </button>
          </div>
        </Card>
      </div>

      {/* Payout History */}
      <Card noPadding>
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
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
                    className="px-6 py-4 text-xs font-bold text-slate-500  tracking-normal"
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
                    className="py-16 text-center text-slate-500 text-sm"
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
                    <td className="px-6 py-4 text-xs text-slate-500">
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
      <Dialog
        isOpen={requestModal}
        onClose={() => setRequestModal(false)}
        title="Request Payout"
        size="sm"
        onConfirm={() => {
          if (!requestAmount) return;
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
        confirmLabel="Submit Request"
        confirmLoading={actionLoading}
      >
        <div className="space-y-4">
          <Input
            label="Amount (ZAR)"
            type="number"
            value={requestAmount}
            onChange={(e) => setRequestAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Notes (optional)"
            type="text"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="Monthly payout request"
          />
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            Platform fee of 12% will be deducted. Net amount:{" "}
            <strong>{fmtZAR(parseFloat(requestAmount || "0") * 0.88)}</strong>
          </p>
        </div>
      </Dialog>

      {/* Bank Account Modal */}
      <Dialog
        isOpen={bankModal}
        onClose={() => setBankModal(false)}
        title="Bank Account Details"
        size="sm"
        onConfirm={() => setBankModal(false)}
        confirmLabel="Save Account"
      >
        <div className="space-y-4">
          {[
            "Account Holder",
            "Bank Name",
            "Account Number",
            "Branch Code",
            "Tax Number",
          ].map((field) => (
            <Input key={field} label={field} placeholder={field} />
          ))}
        </div>
      </Dialog>
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
          icon={<BarChart3 />}
          accent="primary"
        />
        <SummaryCard
          label="This Month"
          value={fmtZAR(totalRevThisMonth)}
          icon={<TrendingUp />}
          accent="success"
        />
        <SummaryCard
          label="Pending Payouts"
          value={String(summary.pendingPayoutCount)}
          icon={<Clock />}
          accent="warning"
        />
      </div>

      {/* Revenue Chart + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MiniBarChart data={revenueByMonthMap} label="Monthly Revenue (ZAR)" />

        <Card noPadding>
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
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
          <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
            Practitioner Payouts
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "full" },
                    "facility_billing_report.pdf",
                  );
                } catch (e: any) {
                  alert(e?.message || "Failed to download PDF");
                }
              }}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
            >
              <Receipt size={14} /> Export PDF
            </button>
            <button
              type="button"
              onClick={() => {
                const csv =
                  ["Practitioner,Amount,Status,Period,Consultations"].join(
                    "\n",
                  ) +
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
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:underline"
            >
              <Download size={14} /> CSV
            </button>
          </div>
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
                    className="px-6 py-4 text-xs font-bold text-slate-500  tracking-normal"
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
                    className="py-16 text-center text-slate-500 text-sm"
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
                        <p className="text-xs text-slate-500">{pract?.email}</p>
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
          icon={<CircleDollarSign />}
          accent="primary"
        />
        <SummaryCard
          label="Total Transacted"
          value={fmtZAR(summary.totalRevenue)}
          icon={<TrendingUp />}
          accent="success"
        />
        <SummaryCard
          label="Pending Payouts"
          value={String(summary.pendingPayouts)}
          icon={<Clock />}
          accent="warning"
        />
        <SummaryCard
          label="Patients"
          value={String(summary.patientCount)}
          icon={<User />}
          accent="neutral"
        />
        <SummaryCard
          label="Practitioners"
          value={String(summary.practitionerCount)}
          icon={<Users />}
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
            <p className="text-xs font-bold text-slate-500  tracking-normal">
              Platform Fee Config
            </p>
            <button
              onClick={() => setFeeModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Pencil size={13} /> Adjust
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
      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(["transactions", "payouts", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 py-4 text-xs font-bold  tracking-normal transition-all ${
                activeSubTab === tab
                  ? "bg-primary/5 text-primary border-b-2 border-primary"
                  : "text-slate-500 hover:text-slate-600"
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
                      className="px-6 py-4 text-xs font-bold text-slate-500  tracking-normal"
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
                      <td className="px-6 py-4 text-xs text-slate-500">
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
              <p className="text-center text-slate-500 py-12">No audit logs</p>
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
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 text-sm">
                      <History />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {log.actionType}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {name}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {fmtDate(log.timestamp)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">
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
      <Dialog
        isOpen={feeModal}
        onClose={() => setFeeModal(false)}
        title="Adjust Platform Fees"
        size="sm"
        onConfirm={() => {
          onAction("update_fee_config", { config: feeForm });
          setFeeModal(false);
        }}
        confirmLabel="Save Config"
        confirmLoading={actionLoading}
      >
        <div className="space-y-4">
          {(
            [
              ["Platform Fee %", "platformFeePercent"],
              ["Consultation Fee %", "consultationFeePercent"],
              ["Subscription Fee %", "subscriptionFeePercent"],
            ] as const
          ).map(([label, key]) => (
            <Input
              key={key}
              label={label}
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
            />
          ))}
          <p className="text-xs text-warning-700 bg-warning-50 border border-warning-500/20 rounded-lg p-3">
            Changes apply to all future transactions.
          </p>
        </div>
      </Dialog>
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
    patient: <CreditCard size={22} />,
    practitioner: <Wallet size={22} />,
    hospital_admin: <Building2 size={22} />,
    super_admin: <Shield size={22} />,
    mega_admin: <Shield size={22} />,
    inspector: <BarChart3 size={22} />,
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {data ? (
              (roleIcon[data.role] ?? <Wallet size={22} />)
            ) : (
              <Wallet size={22} />
            )}
          </div>
          <div>
            <h1 className="text-h3 font-bold text-ink-900 tracking-tight font-grotesk">
              {data ? (roleLabel[data.role] ?? "Billing") : "Billing"}
            </h1>
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
        <div className="flex items-center gap-2 flex-wrap">
          {data && (
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "full" },
                    "billing_report.pdf",
                  );
                } catch (e: any) {
                  alert(e?.message || "Failed to download report");
                }
              }}
            >
              Download report PDF
            </Button>
          )}
        
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
          <p className="text-sm font-bold text-slate-500  tracking-normal">
            Loading Financial Data...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-24 space-y-4">
          <AlertCircle size={48} className="mx-auto text-slate-200" />
          <p className="text-slate-500 font-bold">
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
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg font-bold text-sm  animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <XCircle size={18} />
          )}

          {toast.msg}
        </div>
      )}
    </div>
  );
}
