"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, CircleDollarSign, Loader2, Receipt } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { downloadBillingPdf } from "@/lib/billing/downloadPdf";

export default function AdminFinancePage({ isMega = false }: { isMega?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance?days=${days}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setData(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [days]);

  const setPayoutStatus = async (id: string, status: string) => {
    if (!confirm(`Are you sure you want to mark this payout as ${status}? This cannot be undone.`)) return;

    setBusyId(id);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(`Payout ${status}`);
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const s = data?.summary;

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-350 mx-auto">
      <PageHeader
        title="Revenue & payouts"
        subtitle="Platform GMV, fees, and practitioner payout queue"
        right={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg ${
                    days === d ? "bg-white text-primary " : "text-slate-500"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                try {
                  await downloadBillingPdf(
                    { type: "report", reportKind: "full" },
                    "platform_finance_report.pdf",
                  );
                  toast.success("Report downloaded");
                } catch (e: unknown) {
                  toast.error(
                    e instanceof Error ? e.message : "PDF download failed",
                  );
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
              onClick={() => void load()}
              icon={<RefreshCw size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-28" />
          ))}
        </div>
      ) : s ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <KPICard label="GMV" value={`R ${s.gmv.toLocaleString("en-ZA")}`} icon={<CircleDollarSign size={22} />} color="emerald" />
          <KPICard label="Platform fees" value={`R ${s.platformFees.toLocaleString("en-ZA")}`} icon={<CircleDollarSign size={22} />} color="primary" />
          <KPICard label="Practitioner earnings" value={`R ${s.practitionerEarnings.toLocaleString("en-ZA")}`} icon={<CircleDollarSign size={22} />} color="slate" />
          <KPICard label="Pending payouts" value={s.pendingPayouts} icon={<CircleDollarSign size={22} />} color="primary" description={`R ${s.pendingAmount.toLocaleString("en-ZA")}`} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <SectionHeader compact title="Payout queue" subtitle="Approve or reject requests" />
          </div>
          <ul className="divide-y divide-slate-50 max-h-[400px] overflow-auto">
            {(data?.payouts || []).map((p: any) => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    R {(p.amount || 0).toLocaleString("en-ZA")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.requestedAt
                      ? new Date(p.requestedAt).toLocaleDateString("en-ZA")
                      : "—"}{" "}
                    · {p.consultationCount || 0} consults
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    label={p.status}
                    status={
                      p.status === "paid"
                        ? "success"
                        : p.status === "rejected"
                          ? "error"
                          : "warning"
                    }
                    className="!text-[10px] !px-2 !py-1 capitalize"
                  />
                  {p.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busyId === p.id}
                        onClick={() => void setPayoutStatus(p.id, "approved")}
                        className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px] !px-2"
                      >
                        {busyId === p.id ? <Loader2 className="animate-spin" size={14} /> : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === p.id}
                        onClick={() => void setPayoutStatus(p.id, "rejected")}
                        className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px] !px-2"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {p.status === "approved" && isMega && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id}
                      onClick={() => void setPayoutStatus(p.id, "paid")}
                      className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                    >
                      Mark paid
                    </Button>
                  )}
                  {p.status === "approved" && !isMega && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Awaiting mega admin
                    </span>
                  )}
                </div>
              </li>
            ))}
            {!data?.payouts?.length && (
              <li className="px-5 py-10 text-center text-sm text-slate-400">No payouts</li>
            )}
          </ul>
        </Card>

        <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <SectionHeader compact title="Recent transactions" />
          </div>
          <ul className="divide-y divide-slate-50 max-h-[400px] overflow-auto">
            {(data?.transactions || []).map((t: any) => (
              <li key={t.id} className="px-5 py-3 flex justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    R {(t.amount || 0).toLocaleString("en-ZA")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.category || "—"} · {t.provider || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge label={t.status} status="neutral" className="!text-[10px] !px-2 !py-1" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t.timestamp
                      ? new Date(t.timestamp).toLocaleDateString("en-ZA")
                      : "—"}
                  </p>
                </div>
              </li>
            ))}
            {!data?.transactions?.length && (
              <li className="px-5 py-10 text-center text-sm text-slate-400">No transactions</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
