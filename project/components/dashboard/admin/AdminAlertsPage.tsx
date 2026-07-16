"use client";

import React, { useEffect, useState } from "react";
import { BiRefresh, BiBell } from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import KPICard from "@/components/ui/KPICard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function AdminAlertsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts");
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
  }, []);

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Platform alerts"
        subtitle="Operational, billing, and system signals"
        right={
          <Button size="sm" variant="outline" onClick={() => void load()} icon={<BiRefresh size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
            Refresh
          </Button>
        }
      />

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPICard label="Critical" value={data.counts.critical} color="primary" icon={<BiBell size={20} />} />
            <KPICard label="Warning" value={data.counts.warning} color="slate" icon={<BiBell size={20} />} />
            <KPICard label="Info" value={data.counts.info} color="emerald" icon={<BiBell size={20} />} />
          </div>
          {data.system?.maintenanceMode && (
            <Card className="!bg-rose-50 !border-rose-200 text-rose-800 text-sm font-semibold">
              Maintenance mode is active.
            </Card>
          )}
          <div className="space-y-3">
            {data.alerts.map((a: any) => (
              <Card key={a.id} className="!rounded-lg flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BiBell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">{a.title}</p>
                    <Badge
                      label={a.severity}
                      status={
                        a.severity === "critical"
                          ? "error"
                          : a.severity === "warning"
                            ? "warning"
                            : a.severity === "success"
                              ? "success"
                              : "info"
                      }
                      className="!text-[10px] !px-2 !py-1 capitalize"
                    />
                    <Badge label={a.source} status="neutral" className="!text-[10px] !px-2 !py-1" />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{a.detail}</p>
                  {a.metric && (
                    <p className="text-[11px] font-bold text-primary mt-1">{a.metric}</p>
                  )}
                </div>
              </Card>
            ))}
            {!data.alerts.length && (
              <EmptyState title="No alerts" description="Platform signals will appear here." icon={<BiBell size={32} />} />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
