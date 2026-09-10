"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import {
  Check,
  CreditCard,
  Landmark,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { TIER_COPY } from "@/lib/billing/tierCopy";
import { downloadBillingPdf } from "@/lib/billing/downloadPdf";

type Plan = {
  id: string;
  label: string;
  price: number;
  maxFamilyMembers: number;
  consultationsMax: number | null;
};

type Method = "card" | "eft";

const STEPS = ["Choose a plan", "Payment details"] as const;

const BLANK = {
  number: "",
  name: "",
  expiry: "",
  cvv: "",
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  branchCode: "",
  addressLine: "",
  city: "",
  postalCode: "",
};

const SA_BANKS = [
  "Absa",
  "Capitec",
  "Discovery Bank",
  "FNB",
  "Investec",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
];

/**
 * Two-step checkout: pick a plan, then pay.
 *
 * Built on the shared primitives and tokens from design.md — lucide icons
 * only, Card/Input/Select/Alert/Badge rather than hand-rolled equivalents,
 * semantic status colours via the success/warning/danger scales, and laid out
 * mobile-first. The plan cards deliberately mirror the public /pricing cards
 * (same copy source, same shape) so the plan a patient chose on the marketing
 * site is recognisably the same thing here.
 */
export default function CheckoutFlow() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [form, setForm] = useState(BLANK);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<{
    label: string;
    last4: string;
    transactionId?: string;
  } | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/checkout");
        const json = await res.json();
        if (cancelled) return;
        if (json?.data?.entitlement?.hasPlan) {
          router.replace("/patient");
          return;
        }
        if (json?.data?.plans) {
          setPlans(json.data.plans);
          const wanted = new URLSearchParams(window.location.search).get("tier");
          const pre = json.data.plans.find((p: Plan) => p.id === wanted);
          setSelected(pre?.id ?? json.data.plans[1]?.id ?? json.data.plans[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) setError("Could not load plans. Refresh to try again.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const plan = plans.find((p) => p.id === selected) || null;
  const set = (k: keyof typeof BLANK, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!selected) {
      setError("Choose a plan to continue.");
      setStep(0);
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected, method, card: form, billing: form }),
      });
      const json = await res.json();

      if (res.ok) {
        setDone({
          label: plan?.label ?? "",
          last4: json.data.last4,
          transactionId: json.data.transactionId,
        });
        // No auto-redirect: it used to bounce to the dashboard after 1.8s,
        // which pulled the receipt out from under anyone reaching for it.
        // They leave when they choose to.
        return;
      }
      if (json.fieldErrors) setFieldErrors(json.fieldErrors);
      setError(json.error || "Payment could not be completed.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setPaying(false);
  };

  /* ---------------------------------------------------------- loading --- */
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
        <div className="h-8 w-56 rounded-md bg-surface-soft animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-surface-soft animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------ confirmation --- */
  if (done) {
    return (
      <div className="mx-auto w-full max-w-lg p-4 sm:p-6">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
            <CheckCircle2 size={28} className="text-success-500" />
          </div>
          <h1 className="text-h3 font-grotesk text-ink-900 mb-2">
            Your cover is active
          </h1>
          <p className="text-body text-ink-600">
            {done.label} plan confirmed
            {done.last4 ? ` — ending ${done.last4}` : ""}. We&apos;ve emailed
            your receipt, and you can download it any time from Billing.
          </p>

          {receiptError && (
            <Alert status="error" title={receiptError} className="mt-4 text-left" />
          )}

          <div className="mt-6 space-y-3">
            <Button onClick={() => (window.location.href = "/patient")} fullWidth>
              Go to dashboard
            </Button>
            {done.transactionId && (
              <Button
                variant="outline"
                fullWidth
                loading={downloading}
                onClick={async () => {
                  setReceiptError("");
                  setDownloading(true);
                  try {
                    await downloadBillingPdf(
                      { type: "receipt", transactionId: done.transactionId! },
                      "receipt.pdf",
                    );
                  } catch (err) {
                    setReceiptError(
                      err instanceof Error
                        ? err.message
                        : "Could not download the receipt.",
                    );
                  }
                  setDownloading(false);
                }}
              >
                Download receipt
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------- ui --- */
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-h2 font-grotesk text-ink-900 mb-1">
          Activate your medical cover
        </h1>
        <p className="text-body text-ink-600">
          Choose a plan and complete payment to start using the platform.
        </p>
      </header>

      {/* Step indicator. Non-interactive on purpose: step 2 is not reachable
          until a plan is chosen, and a clickable-looking dead control is worse
          than a plain one. */}
      <ol className="mb-6 flex items-center gap-3" aria-label="Checkout progress">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-small font-semibold transition-colors ${
                  state === "done"
                    ? "bg-success-500 text-white"
                    : state === "current"
                      ? "bg-primary text-white"
                      : "bg-surface-soft text-ink-400"
                }`}
              >
                {state === "done" ? <Check size={16} /> : i + 1}
              </span>
              <span
                className={`text-small font-semibold ${
                  state === "todo" ? "text-ink-400" : "text-ink-900"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="hidden h-px flex-1 bg-border sm:block" />
              )}
            </li>
          );
        })}
      </ol>

      {/* ---------------------------------------------- step 1: plans --- */}
      {step === 0 && (
        <>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const copy = TIER_COPY[p.id];
              const active = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  aria-pressed={active}
                  className={`flex h-full flex-col rounded-2xl p-6 text-left transition-all duration-200 ${
                    active
                      ? "bg-primary text-white shadow-md ring-2 ring-primary"
                      : "bg-surface-soft text-ink-900 hover:ring-2 hover:ring-primary/30"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2
                      className={`text-h3 font-grotesk ${
                        active ? "text-white" : "text-ink-900"
                      }`}
                    >
                      {p.label}
                    </h2>
                    {copy?.highlight && !active && (
                      <Badge label="Popular" status="info" />
                    )}
                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                        <Check size={14} className="text-white" />
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-small mb-5 ${
                      active ? "text-white/80" : "text-ink-600"
                    }`}
                  >
                    {copy?.tagline}
                  </p>

                  <p className="mb-5">
                    <span className="font-grotesk text-3xl font-bold tabular-nums">
                      R{p.price}
                    </span>
                    <span
                      className={`text-small ${
                        active ? "text-white/70" : "text-ink-400"
                      }`}
                    >
                      /month
                    </span>
                  </p>

                  <ul className="flex-1 space-y-2.5">
                    {(copy?.features ?? []).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check
                          size={16}
                          className={`mt-0.5 shrink-0 ${
                            active ? "text-white" : "text-primary"
                          }`}
                        />
                        <span
                          className={`text-small ${
                            active ? "text-white/90" : "text-ink-600"
                          }`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {error && (
            <Alert status="error" title={error} className="mt-6" />
          )}

          <div className="mt-6 flex justify-end">
            {/* Deliberately no `icon` prop: Button hides its label below sm
                when one is present, which turned this primary CTA into an
                unlabelled arrow on a phone. The words matter more than the
                chevron here. */}
            <Button
              onClick={() => setStep(1)}
              disabled={!selected}
              className="w-full sm:w-auto"
            >
              {plan ? `Continue with ${plan.label}` : "Choose a plan"}
            </Button>
          </div>
        </>
      )}

      {/* -------------------------------------------- step 2: payment --- */}
      {step === 1 && (
        <form onSubmit={pay} className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <h2 className="text-h4 font-grotesk text-ink-900 mb-4">
                How would you like to pay?
              </h2>

              <div
                role="radiogroup"
                aria-label="Payment method"
                className="grid grid-cols-2 gap-3"
              >
                {(
                  [
                    { id: "card", label: "Card", icon: CreditCard },
                    { id: "eft", label: "Bank / EFT", icon: Landmark },
                  ] as const
                ).map(({ id, label, icon: Icon }) => {
                  const active = method === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMethod(id)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-3 text-small font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-surface text-ink-600 hover:border-primary/40"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h2 className="text-h4 font-grotesk text-ink-900 mb-4">
                {method === "card" ? "Card details" : "Bank account details"}
              </h2>

              {method === "card" ? (
                <div className="space-y-4">
                  <Input
                    label="Card number"
                    value={form.number}
                    onChange={(e) => set("number", e.target.value)}
                    error={fieldErrors.number}
                    placeholder="4111 1111 1111 1111"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <Input
                    label="Name on card"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={fieldErrors.name}
                    placeholder="T Mokoena"
                    autoComplete="off"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry"
                      value={form.expiry}
                      onChange={(e) => set("expiry", e.target.value)}
                      error={fieldErrors.expiry}
                      placeholder="MM/YY"
                      autoComplete="off"
                    />
                    <Input
                      label="CVV"
                      value={form.cvv}
                      onChange={(e) => set("cvv", e.target.value)}
                      error={fieldErrors.cvv}
                      placeholder="123"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Account holder"
                    value={form.accountHolder}
                    onChange={(e) => set("accountHolder", e.target.value)}
                    error={fieldErrors.accountHolder}
                    placeholder="T Mokoena"
                  />
                  <Select
                    label="Bank"
                    value={form.bankName}
                    onChange={(v) => set("bankName", v)}
                    error={fieldErrors.bankName}
                    options={[
                      { value: "", label: "Select your bank" },
                      ...SA_BANKS.map((b) => ({ value: b, label: b })),
                    ]}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Account number"
                      value={form.accountNumber}
                      onChange={(e) => set("accountNumber", e.target.value)}
                      error={fieldErrors.accountNumber}
                      inputMode="numeric"
                    />
                    <Input
                      label="Branch code"
                      value={form.branchCode}
                      onChange={(e) => set("branchCode", e.target.value)}
                      error={fieldErrors.branchCode}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-h4 font-grotesk text-ink-900 mb-4">
                Billing address
              </h2>
              <div className="space-y-4">
                <Input
                  label="Street address"
                  value={form.addressLine}
                  onChange={(e) => set("addressLine", e.target.value)}
                  error={fieldErrors.addressLine}
                  placeholder="12 Long Street"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    error={fieldErrors.city}
                    placeholder="Johannesburg"
                  />
                  <Input
                    label="Postal code"
                    value={form.postalCode}
                    onChange={(e) => set("postalCode", e.target.value)}
                    error={fieldErrors.postalCode}
                    inputMode="numeric"
                    placeholder="2000"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Order summary. Sticky only from lg up — on a phone it belongs in
              the flow, above the submit button, not pinned over the form. */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <h2 className="text-h4 font-grotesk text-ink-900 mb-4">
                Order summary
              </h2>

              <dl className="space-y-3 text-small">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">Plan</dt>
                  <dd className="font-semibold text-ink-900">{plan?.label}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">Consultations</dt>
                  <dd className="font-semibold text-ink-900">
                    {plan?.consultationsMax === null
                      ? "Unlimited"
                      : `${plan?.consultationsMax} / month`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">Family members</dt>
                  <dd className="font-semibold text-ink-900">
                    {plan?.maxFamilyMembers
                      ? `Up to ${plan.maxFamilyMembers}`
                      : "One person"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <dt className="font-semibold text-ink-900">Billed monthly</dt>
                  <dd className="font-grotesk text-h3 font-bold text-ink-900 tabular-nums">
                    R{plan?.price ?? 0}
                  </dd>
                </div>
              </dl>

              {error && (
                <Alert status="error" title={error} className="mt-4" />
              )}

              <div className="mt-5 space-y-3">
                <Button type="submit" fullWidth loading={paying}>
                  {`Pay R${plan?.price ?? 0} and activate`}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setStep(0)}
                >
                  Back to plans
                </Button>
              </div>

              <p className="mt-4 flex items-start gap-2 text-small text-ink-400">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                Cancel any time from Billing. No lock-in contract.
              </p>
            </Card>
          </aside>
        </form>
      )}
    </div>
  );
}
