"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { BiCheckCircle, BiLockAlt, BiInfoCircle } from "react-icons/bi";

type Plan = {
  id: string;
  label: string;
  price: number;
  maxFamilyMembers: number;
  consultationsMax: number | null;
};

const BLANK_CARD = { number: "", name: "", expiry: "", cvv: "" };

export default function CheckoutFlow() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [card, setCard] = useState(BLANK_CARD);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<{ tier: string; last4: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/checkout");
        const json = await res.json();
        if (cancelled) return;
        if (json?.data?.plans) {
          setPlans(json.data.plans);
          // Billing's "Upgrade Plan" links here with ?tier=, so the plan the
          // user picked there is already selected when they arrive.
          const wanted = new URLSearchParams(window.location.search).get("tier");
          const preselect = json.data.plans.find((p: Plan) => p.id === wanted);
          setSelected(preselect?.id ?? json.data.plans[0]?.id ?? null);
        }
        // Someone who already holds a plan has no business on this page —
        // send them on rather than inviting a second payment.
        if (json?.data?.entitlement?.hasPlan) {
          router.replace("/patient");
          return;
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

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!selected) {
      setError("Choose a plan to continue.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected, card }),
      });
      const json = await res.json();

      if (res.ok) {
        setDone({ tier: json.data.tier, last4: json.data.last4 });
        // A full navigation, not a client push: the session cookie was just
        // re-issued with the plan claim and middleware has to read the new one.
        setTimeout(() => {
          window.location.href = "/patient";
        }, 1600);
        return;
      }

      if (json.fieldErrors) setFieldErrors(json.fieldErrors);
      setError(json.error || "Payment could not be completed.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setPaying(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8">
          <BiCheckCircle size={40} className="text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-ink-900 font-grotesk mb-1">
            You&apos;re all set
          </h1>
          <p className="text-sm text-ink-600">
            Your {done.tier.replace("_", " ")} plan is active — card ending{" "}
            {done.last4}. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900 font-grotesk mb-1">
          Choose your medical cover
        </h1>
        <p className="text-sm text-ink-600">
          Select a plan to activate your account. You can change or cancel it
          later from Billing.
        </p>
      </header>

      {/* Nobody should mistake this for a real payment screen. */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 mb-6 text-amber-900">
        <BiInfoCircle size={18} className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <b>Demonstration checkout.</b> No payment gateway is connected and no
          card is charged. Any valid-looking card number is accepted; one ending
          in <code className="font-mono">0000</code> will be declined so the
          failure path can be tested.
        </p>
      </div>

      <form onSubmit={pay} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <fieldset className="space-y-3">
          <legend className="sr-only">Available plans</legend>
          {plans.map((p) => {
            const active = p.id === selected;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={active}
                  onChange={() => setSelected(p.id)}
                  className="mt-1 accent-[#4493b8]"
                />
                <span className="flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-ink-900 font-grotesk">
                      {p.label}
                    </span>
                    <span className="font-bold text-ink-900 tabular-nums">
                      R{p.price}
                      <span className="text-xs font-normal text-ink-600">
                        /month
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-ink-600">
                    {p.consultationsMax === null
                      ? "Unlimited consultations"
                      : `${p.consultationsMax} consultations a month`}
                    {p.maxFamilyMembers > 0
                      ? ` · up to ${p.maxFamilyMembers} family members`
                      : " · one person"}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="rounded-lg border border-slate-200 p-4 space-y-4 h-fit">
          <h2 className="font-bold text-ink-900 font-grotesk flex items-center gap-2">
            <BiLockAlt size={16} className="text-primary" />
            Card details
          </h2>

          <Input
            label="Card number"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: e.target.value })}
            error={fieldErrors.number}
            placeholder="4111 1111 1111 1111"
            inputMode="numeric"
            autoComplete="off"
          />
          <Input
            label="Name on card"
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            error={fieldErrors.name}
            placeholder="T Mokoena"
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiry"
              value={card.expiry}
              onChange={(e) => setCard({ ...card, expiry: e.target.value })}
              error={fieldErrors.expiry}
              placeholder="MM/YY"
              autoComplete="off"
            />
            <Input
              label="CVV"
              value={card.cvv}
              onChange={(e) => setCard({ ...card, cvv: e.target.value })}
              error={fieldErrors.cvv}
              placeholder="123"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={paying}>
            {plan ? `Pay R${plan.price} & activate` : "Choose a plan"}
          </Button>
          <p className="text-center text-[11px] text-ink-400">
            Billed monthly. Cancel any time from Billing.
          </p>
        </div>
      </form>
    </div>
  );
}
