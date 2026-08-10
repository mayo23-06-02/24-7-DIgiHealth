"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  Calendar,
  Info,
  Loader2,
  MessageSquare,
  CreditCard,
  Clock,
  Plus,
  XCircle,
  Download,
  ChevronDown,
  Search,
  Receipt,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge, { BadgeStatus } from "@/components/ui/Badge";
import { downloadBillingPdf } from "@/lib/billing/downloadPdf";
import { TIER_ORDER, TIER_CONFIG } from "@/lib/billing/tiers";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BillingTabProps {
  currentRole: string;
  patientData: any;
  billingData: any;
  setBillingData: React.Dispatch<React.SetStateAction<any>>;
  setToast: (
    toast: { message: string; type: "success" | "error" | "info" } | null,
  ) => void;
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

const STATUS_TO_BADGE: Record<string, BadgeStatus> = {
  completed: "success",
  paid: "success",
  active: "success",
  pending: "neutral",
  trial: "info",
  failed: "error",
  cancelled: "neutral",
  refunded: "info",
};

function StatusPill({ status }: { status: string }) {
  return (
    <Badge label={status} status={STATUS_TO_BADGE[status] ?? "neutral"} />
  );
}

// ─── Plan Tiers ─────────────────────────────────────────────────────────────
// Sourced from lib/billing/tiers.ts (single source of truth, also used by
// app/api/billing/route.ts and the family-linking cap checks) rather than
// hardcoded here — this array used to drift out of sync with the real
// pricing/quotas enforced server-side.
const TIERS = TIER_ORDER.map((id) => {
  const t = TIER_CONFIG[id];
  const consultationsLabel = Number.isFinite(t.consultationsMax) ? `${t.consultationsMax}` : "Unlimited";
  const features = [
    `${consultationsLabel} consultation${t.consultationsMax === 1 ? "" : "s"} per month`,
    "24/7 platform access",
    "AI triage & symptom checker",
    "Digital health record",
    "Secure messaging",
  ];
  if (t.maxFamilyMembers > 0) {
    features.splice(1, 0, `Up to ${t.maxFamilyMembers} family member${t.maxFamilyMembers === 1 ? "" : "s"} included`);
  }
  return {
    id: t.id,
    label: t.label,
    price: t.price,
    consultations: Number.isFinite(t.consultationsMax) ? t.consultationsMax : 999,
    chats: 999,
    maxFamilyMembers: t.maxFamilyMembers,
    features,
  };
});

// ─── Transaction Mini-Table ───────────────────────────────────────────────────
function MiniTransactionTable({ transactions }: { transactions: any[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          !search ||
          t.description?.toLowerCase().includes(search.toLowerCase()),
      ),
    [transactions, search],
  );

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 text-sm font-medium">
        No payment history yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
          size={14}
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search transactions..."
          className="w-full pl-9 pr-4 p-2 text-xs font-medium rounded-lg border border-slate-200 bg-surface-soft focus:border-primary focus:bg-white outline-none transition-all"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left min-w-[480px]">
          <thead>
            <tr className="bg-surface-soft">
              {["Date", "Description", "Amount", "Status", ""].map((h) => (
                <th
                  key={h || "actions"}
                  className="px-4 py-3 text-xs font-bold text-slate-500 tracking-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginated.map((t, i) => (
              <tr
                key={t._id || i}
                className="hover:bg-surface-soft transition-colors"
              >
                <td className="px-4 py-3 text-xs text-slate-500">
                  {fmtDate(t.timestamp)}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-ink-900 max-w-[160px] truncate">
                  {t.description || "—"}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-ink-900">
                  {fmtZAR(t.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={t.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    title="Download receipt PDF"
                    disabled={loadingId === String(t._id || t.id)}
                    onClick={async () => {
                      const id = t._id || t.id;
                      if (!id) return;
                      setLoadingId(String(id));
                      try {
                        await downloadBillingPdf(
                          {
                            type:
                              t.status === "completed"
                                ? "receipt"
                                : "invoice",
                            transactionId: String(id),
                          },
                          "receipt.pdf",
                        );
                      } catch (e: any) {
                        alert(e?.message || "Download failed");
                      } finally {
                        setLoadingId(null);
                      }
                    }}
                    className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40"
                  >
                    <Download size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {filtered.length} results · Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:border-primary/30 transition-all"
            >
              <ChevronDown className="rotate-90" size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:border-primary/30 transition-all"
            >
              <ChevronDown className="-rotate-90" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BillingTab({
  currentRole,
  patientData,
  billingData,
  setBillingData,
  setToast,
}: BillingTabProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState("basic");

  // ── Non-patient roles ─────────────────────────────────────────────────────
  if (currentRole !== "patient") {
    return (
      <Card className="p-12 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden shadow-slate-900/40 animate-in slide-in-from-left-4 duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
        <div className="relative z-10 space-y-10">
          <div>
            <h1 className="text-sm text-primary mb-4 font-bold tracking-widest uppercase">
              Current Subscription Architecture
            </h1>
            <h1 className="text-4xl text-white md:text-5xl font-bold tracking-tighter font-grotesk">
              Professional Access
            </h1>
            <p className="text-slate-400 mt-4 max-w-md">
              Practitioner portals and facility managers are granted
              enterprise-tier access privileges by default.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="white"
              size="lg"
              onClick={() =>
                setToast({
                  message: "Enterprise licenses cannot be self-cancelled.",
                  type: "info",
                })
              }
            >
              Request Cancellation
            </Button>
            <a
              href="/billing"
              className="h-16 rounded-lg px-10 text-xs font-bold text-white/70 border border-white/10 hover:text-white hover:bg-white/5 flex items-center justify-center transition-all"
            >
              Billing Ledger
            </a>
          </div>
        </div>
      </Card>
    );
  }

  // ── Patient billing data ──────────────────────────────────────────────────
  const subscription = billingData?.subscription || {
    tier: "individual",
    status: "active",
    startDate: new Date(),
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    price: 0,
    autoRenew: false,
  };

  const utilization = billingData?.utilization || {
    consultationsUsed: 0,
    consultationsMax: 1,
    chatsUsed: 0,
    chatsMax: 5,
  };

  const transactions: any[] = billingData?.transactions || [];
  const paymentMethods: any[] = billingData?.paymentMethods || [];

  const currentTier = TIERS.find((t) => t.id === subscription.tier) ?? TIERS[0];

  // Days until next billing
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(subscription.nextBillingDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // Usage percentages
  const consultPercent = Math.min(
    100,
    Math.round(
      (utilization.consultationsUsed / utilization.consultationsMax) * 100,
    ),
  );
  const chatsPercent =
    utilization.chatsMax === 999
      ? 100
      : Math.min(
          100,
          Math.round((utilization.chatsUsed / utilization.chatsMax) * 100),
        );

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your clinical subscription renewal?",
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_subscription" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({
          message: "Subscription renewal cancelled successfully.",
          type: "success",
        });
        setBillingData((prev: any) =>
          prev
            ? {
                ...prev,
                subscription: {
                  ...prev.subscription,
                  status: "cancelled",
                  autoRenew: false,
                },
              }
            : prev,
        );
      } else {
        setToast({
          message: data.error || "Failed to cancel subscription.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setActionLoading(false);
  };

  const handleUpgrade = async (tierId: string) => {
    setActionLoading(true);
    try {
      const tier = TIERS.find((t) => t.id === tierId);
      const res = await fetch("/api/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade_subscription", tier: tierId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({
          message: `Switched to ${tier?.label} plan successfully.`,
          type: "success",
        });
        setBillingData((prev: any) =>
          prev
            ? {
                ...prev,
                subscription: {
                  ...prev.subscription,
                  tier: tierId,
                  price: tier?.price ?? 0,
                  status: "active",
                },
              }
            : prev,
        );
        setUpgradeModal(false);
      } else {
        setToast({
          message: data.error || "Failed to change plan.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
      {/* ── Active Plan Hero ────────────────────────────────────────── */}
      <Card className="bg-slate-800 text-white relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                ACTIVE PLAN
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-grotesk text-white mt-4 capitalize">
                {currentTier.label} Clinical Access
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Status
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${
                    subscription.status === "cancelled"
                      ? "bg-slate-700 text-slate-300 border-slate-600"
                      : "bg-success-500/10 text-success-500 border-success-500/20"
                  }`}
                >
                  {subscription.status === "cancelled"
                    ? "Ending Soon"
                    : subscription.status}
                </span>
              </div>
            </div>
          </div>

          {/* Days counter */}
          <div className="flex flex-col gap-3 bg-white/5 backdrop-blur-md p-6 rounded-lg border border-white/10 text-center items-center justify-center">
            <Calendar size={28} className="text-primary animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Next Payment In
              </p>
              <h3 className="text-4xl font-extrabold text-white mt-1 font-grotesk">
                {daysRemaining}
                <span className="text-lg font-bold ml-1">days</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {fmtDate(subscription.nextBillingDate)}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              {subscription.status === "cancelled"
                ? "Access ends at cycle completion."
                : "Auto-renews on the date above."}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Plan & Payment Methods ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription card */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-ink-900 font-grotesk">
              Subscription Plan
            </h3>
            <StatusPill status={subscription.status || "free"} />
          </div>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-primary/10">
                <Wallet size={26} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900">
                  {currentTier.label} Plan
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  {currentTier.price === 0
                    ? "Free"
                    : fmtZAR(currentTier.price) + " / month"}{" "}
                  &middot; {currentTier.consultations} consultations
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {currentTier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs text-slate-600 font-medium"
                >
                  <CheckCircle2
                    className="text-success-500 shrink-0"
                    size={13}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex gap-3 pt-2 border-t border-slate-200">
              <Button
                onClick={() => {
                  setSelectedTier(currentTier.id);
                  setUpgradeModal(true);
                }}
                fullWidth
              >
                Change Plan
              </Button>
              {subscription.status !== "cancelled" && (
                <Button
                  fullWidth
                  variant="danger"
                  loading={actionLoading}
                  onClick={handleCancelSubscription}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Payment methods */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-ink-900 font-grotesk">
              Payment Methods
            </h3>
            <button className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <Plus size={14} /> Add New
            </button>
          </div>
          <div className="space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CreditCard size={32} className="mx-auto text-slate-200" />
                <p className="text-slate-400 text-sm font-medium">
                  No payment methods saved
                </p>
                <button className="text-xs font-bold text-primary hover:underline">
                  Add a card or medical aid
                </button>
              </div>
            ) : (
              paymentMethods.map((pm: any, i: number) => (
                <div
                  key={pm._id || i}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    pm.isDefault
                      ? "border-primary/30 bg-primary/[0.02]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-soft flex items-center justify-center text-xl shrink-0">
                    {pm.type === "card"
                      ? "💳"
                      : pm.type === "medical_aid"
                        ? "🏥"
                        : "🏦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {pm.type === "card" && (
                      <>
                        <p className="text-xs font-bold text-ink-900">
                          {pm.cardBrand} •••• {pm.last4}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires {pm.expiryMonth}/{pm.expiryYear}
                        </p>
                      </>
                    )}
                    {pm.type === "medical_aid" && (
                      <>
                        <p className="text-xs font-bold text-ink-900">
                          {pm.medicalAidProvider}
                        </p>
                        <p className="text-xs text-slate-500">
                          Member: {pm.medicalAidNumber}
                        </p>
                      </>
                    )}
                    {pm.type === "eft" && (
                      <>
                        <p className="text-xs font-bold text-ink-900">
                          {pm.bankName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Acc: •••• {pm.accountNumber?.slice(-4)}
                        </p>
                      </>
                    )}
                  </div>
                  {pm.isDefault && (
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">
                      Default
                    </span>
                  )}
                  <button className="text-slate-200 hover:text-danger-500 transition-colors shrink-0">
                    <XCircle size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Usage Utilization ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink-900 font-grotesk flex items-center gap-2">
          <Info className="text-primary" size={20} />
          Current Cycle Package Utilization
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consultations */}
          <Card className="p-6 bg-white border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  CONSULTATION QUOTA
                </span>
                <h4 className="text-xl font-bold text-ink-900 font-grotesk mt-1">
                  Telehealth Sessions
                </h4>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">Used</span>
                <span className="text-ink-900">
                  {utilization.consultationsUsed} /{" "}
                  {utilization.consultationsMax} sessions
                </span>
              </div>
              <div className="h-3 w-full bg-surface-soft rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 rounded-full ${
                    consultPercent >= 90
                      ? "bg-danger-500"
                      : consultPercent >= 70
                        ? "bg-warning-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${consultPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Includes GP visits, video clinics and mental health follow-ups.
              </p>
            </div>
          </Card>

          {/* AI Triage */}
          <Card className="p-6 bg-white border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  AI DECISION ENGINE
                </span>
                <h4 className="text-xl font-bold text-ink-900 font-grotesk mt-1">
                  AI Symptom Triage Checks
                </h4>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-500 rounded-lg">
                <MessageSquare size={22} />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">Used</span>
                <span className="text-ink-900">
                  {utilization.chatsMax === 999
                    ? `${utilization.chatsUsed} / Unlimited`
                    : `${utilization.chatsUsed} / ${utilization.chatsMax} checks`}
                </span>
              </div>
              <div className="h-3 w-full bg-surface-soft rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${chatsPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                AI triage checks symptom severity and generates clinical
                recommendations.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Transaction History ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900 font-grotesk flex items-center gap-2">
            <Clock className="text-primary" size={20} />
            Payment History
          </h3>
          {transactions.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadBillingPdf(
                      { type: "report", reportKind: "statement" },
                      "billing_statement.pdf",
                    );
                  } catch (e: any) {
                    alert(e?.message || "Download failed");
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Receipt size={14} /> Statement PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const csv = [
                    ["Date", "Description", "Amount", "Status"].join(","),
                    ...transactions.map((t) =>
                      [
                        fmtDate(t.timestamp),
                        `"${t.description}"`,
                        t.amount,
                        t.status,
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
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:underline"
              >
                <Download size={14} /> CSV
              </button>
            </div>
          )}
        </div>
        <Card>
          <MiniTransactionTable transactions={transactions} />
        </Card>
      </div>

      {/* ── Footer banner ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-surface-soft p-6 rounded-lg border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-primary">
            <Wallet size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink-900">
              Need to modify payment methods or view full receipts?
            </h4>
            <p className="text-xs text-slate-500">
              Go to the billing portal for invoices, plan upgrades and medical
              aid claims.
            </p>
          </div>
        </div>
        <a
          href="/patient/billing"
          className="px-6 h-12 bg-primary hover:bg-primary/90 text-white rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-all"
        >
          Open Billing Portal
        </a>
      </div>

      {/* ── Plan Upgrade Modal ───────────────────────────────────────── */}
      {upgradeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setUpgradeModal(false)}
          />
          <div className="relative w-full max-w-5xl bg-white rounded-lg overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-ink-900 font-grotesk">
                  Choose Your Plan
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  All plans include 24/7 platform access
                </p>
              </div>
              <button
                onClick={() => setUpgradeModal(false)}
                aria-label="Close"
                className="w-10 h-10 rounded-lg bg-surface-soft text-slate-500 hover:bg-danger-50 hover:text-danger-700 flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIERS.map((tier) => {
                const isCurrent = currentTier.id === tier.id;
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`relative text-left p-5 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        Current
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Wallet size={18} className="text-primary" />
                    </div>
                    <p className="text-base font-bold text-ink-900 mb-0.5">
                      {tier.label}
                    </p>
                    <p className="text-xl font-bold text-primary mb-0.5">
                      {tier.price === 0 ? "Free" : `R${tier.price}`}
                      {tier.price > 0 && (
                        <span className="text-sm font-medium text-slate-400">
                          /mo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      {tier.consultations} consult
                      {tier.consultations > 1 ? "s" : ""} ·{" "}
                      {tier.chats === 999 ? "Unlimited" : tier.chats} AI checks
                    </p>
                    <ul className="space-y-2">
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-1.5 text-sm font-medium text-slate-600"
                        >
                          <CheckCircle2
                            className="text-success-500 shrink-0 mt-0.5"
                            size={12}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="px-8 pb-8">
              <Button
                fullWidth
                size="lg"
                onClick={() => handleUpgrade(selectedTier)}
                disabled={currentTier.id === selectedTier}
                loading={actionLoading}
              >
                {currentTier.id === selectedTier
                  ? "This is your current plan"
                  : `Switch to ${TIERS.find((t) => t.id === selectedTier)?.label}${
                      TIERS.find((t) => t.id === selectedTier)?.price
                        ? ` — R${TIERS.find((t) => t.id === selectedTier)?.price}/mo`
                        : " — Free"
                    }`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
