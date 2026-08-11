"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "40" });
      if (search) q.set("search", search);
      const res = await fetch(`/api/admin/audit?${q}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setLogs(json.data.logs);
      setPagination(json.data.pagination);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of admin actions"
        right={
          <Button size="sm" variant="outline" onClick={() => void load()} icon={<RefreshCw size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
            Refresh
          </Button>
        }
      />
      <Card className="!rounded-lg">
        <div className="max-w-md">
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search action, email, target…"
            icon={<Search size={18} />}
          />
        </div>
      </Card>
      <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit entries" description="Admin actions will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">When</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Actor</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleString("en-ZA")
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={a.action} status="info" className="!text-[10px] !px-2 !py-1" />
                    </td>
                    <td className="px-3 py-3 text-slate-700">{a.actorEmail || "—"}</td>
                    <td className="px-3 py-3 text-xs capitalize text-slate-500">{a.actorRole}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {a.targetType ? `${a.targetType}:${a.targetId || ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">{pagination.total} entries</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">
                ←
              </button>
              <span className="text-sm text-slate-600 px-2">
                {page} / {pagination.totalPages}
              </span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">
                →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
