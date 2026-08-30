"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Search,
  RefreshCw,
  UserX,
  UserCheck,
  TriangleAlert,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { canAssignRole } from "@/lib/auth/adminRoles";

const ROLES = [
  "patient",
  "practitioner",
  "hospital_admin",
  "inspector",
  "super_admin",
  "mega_admin",
];

export default function AdminUsersPage({
  rolePrefix,
  actorRole,
}: {
  rolePrefix: string;
  actorRole: string;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** The account awaiting a typed-name confirmation before it is suspended. */
  const [suspendTarget, setSuspendTarget] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Fall back to the email when an account has no name, so there is always
  // something specific to type — a blank prompt would confirm nothing.
  const confirmName = suspendTarget
    ? suspendTarget.name || suspendTarget.email || ""
    : "";
  const confirmMatches =
    confirmName.length > 0 &&
    confirmInput.trim().toLowerCase() === confirmName.trim().toLowerCase();

  const closeSuspendDialog = () => {
    setSuspendTarget(null);
    setConfirmInput("");
    setCopied(false);
  };

  const handleCopyConfirmName = async () => {
    try {
      await navigator.clipboard.writeText(confirmName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — type the name instead.");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: "25",
        sort,
        sortDir,
      });
      if (search) q.set("search", search);
      if (role) q.set("role", role);
      if (status) q.set("status", status);
      const res = await fetch(`/api/admin/users?${q}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setUsers(json.data.users);
      setPagination(json.data.pagination);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status, sort, sortDir]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  /**
   * Suspending is confirmed by typing the account's name, the same way removing
   * a family member is.
   *
   * A browser `confirm()` is dismissed by reflex, and every row's button looks
   * identical — the only thing distinguishing "suspend the test account" from
   * "suspend a real practitioner mid-consultation" was which row the pointer
   * happened to be over. Typing the name makes you read which account it is.
   *
   * Reactivating keeps its simple confirm: it restores access rather than
   * removing it, so getting it wrong is not the same kind of mistake.
   */
  const suspend = async (id: string, action: "suspend" | "unsuspend") => {
    if (action === "unsuspend") {
      if (!confirm("Are you sure you want to reactivate this user?")) return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(action === "suspend" ? "User suspended" : "User reactivated");
      closeSuspendDialog();
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (id: string, newRole: string) => {
    if (!canAssignRole(actorRole, newRole)) {
      toast.error("You cannot assign this role");
      return;
    }
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Role updated");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-350 mx-auto">
      <PageHeader
        title="User management"
        subtitle="Search, filter, suspend, and manage platform roles"
        right={
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
        }
      />

      <Card className="!rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search name or email…"
              icon={<Search size={18} />}
            />
          </div>
          <Select
            value={role}
            onChange={(v) => {
              setPage(1);
              setRole(v);
            }}
            options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r }))]}
          />
          <Select
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "pending_verification", label: "Pending" },
            ]}
          />
          <Select
            value={`${sort}:${sortDir}`}
            onChange={(v) => {
              const [s, d] = v.split(":");
              setSort(s);
              setSortDir(d as "asc" | "desc");
            }}
            options={[
              { value: "createdAt:desc", label: "Newest" },
              { value: "createdAt:asc", label: "Oldest" },
              { value: "firstName:asc", label: "Name A–Z" },
              { value: "role:asc", label: "Role" },
            ]}
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
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting filters." />
        ) : (
          <>
            {/*
              Stacked cards below md, per design.md §3.5. Six columns behind a
              horizontal scrollbar is the fallback that section rules out.
            */}
            <div className="md:hidden divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900 truncate">{u.name}</p>
                      <p className="text-xs text-ink-400 truncate">{u.email}</p>
                    </div>
                    <Badge
                      label={u.status}
                      status={u.status === "suspended" ? "error" : "success"}
                      className="!text-[10px] !px-2 !py-1 shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-600">
                    <span className="font-semibold">
                      MFA {u.mfaEnabled ? "on" : "off"}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      Joined{" "}
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("en-ZA")
                        : "—"}
                    </span>
                  </div>
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => void changeRole(u.id, e.target.value)}
                    aria-label={`Role for ${u.name}`}
                    className="w-full text-xs text-ink-900 border border-border rounded-md px-2 py-2 bg-surface"
                  >
                    {ROLES.filter(
                      (r) => canAssignRole(actorRole, r) || r === u.role,
                    ).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant={u.status === "suspended" ? "outline" : "danger"}
                    fullWidth
                    disabled={busyId === u.id}
                    onClick={() =>
                      u.status === "suspended"
                        ? void suspend(u.id, "unsuspend")
                        : setSuspendTarget({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                          })
                    }
                    className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                  >
                    {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-soft border-b border-border text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">MFA</th>
                  <th className="px-3 py-3">Joined</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-soft/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink-900">{u.name}</p>
                      <p className="text-xs text-ink-400">{u.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => void changeRole(u.id, e.target.value)}
                        aria-label={`Role for ${u.name}`}
                        className="text-xs text-ink-900 border border-border rounded-md px-2 py-2 bg-surface max-w-[140px]"
                      >
                        {ROLES.filter((r) => canAssignRole(actorRole, r) || r === u.role).map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        label={u.status}
                        status={u.status === "suspended" ? "error" : "success"}
                        className="!text-[10px] !px-2 !py-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-ink-600">
                      {u.mfaEnabled ? "On" : "Off"}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-600 whitespace-nowrap">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("en-ZA")
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {u.status === "suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => void suspend(u.id, "unsuspend")}
                          icon={
                            busyId === u.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )
                          }
                          iconPosition="left"
                          className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === u.id}
                          onClick={() =>
                            setSuspendTarget({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                            })
                          }
                          icon={
                            busyId === u.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <UserX size={14} />
                            )
                          }
                          iconPosition="left"
                          className="!rounded-lg !max-w-none normal-case !tracking-normal !text-[10px]"
                        >
                          Suspend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-soft">
            <span className="text-xs text-ink-600">{pagination.total} users</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm text-ink-600 px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        isOpen={!!suspendTarget}
        onClose={closeSuspendDialog}
        title="Suspend user"
        size="sm"
      >
        {suspendTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-danger-500/20 bg-danger-50 p-3">
              <TriangleAlert
                size={18}
                className="text-danger-700 shrink-0 mt-0.5"
              />
              <p className="text-sm text-danger-700">
                This suspends{" "}
                <span className="font-bold">{confirmName}</span> — they lose
                access to all services immediately, including any consultation
                in progress. You can reactivate them afterwards.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-ink-600 mb-1.5">
                Type their name to confirm
              </p>
              <div className="flex items-center gap-2 mb-3 rounded-lg bg-surface-soft border border-border px-3 py-2">
                <span className="flex-1 text-sm font-mono text-ink-900 truncate">
                  {confirmName}
                </span>
                <button
                  type="button"
                  onClick={handleCopyConfirmName}
                  aria-label="Copy name"
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmName}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" fullWidth onClick={closeSuspendDialog}>
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={!confirmMatches || busyId === suspendTarget.id}
                loading={busyId === suspendTarget.id}
                icon={<UserX size={16} />}
                iconPosition="left"
                onClick={() => void suspend(suspendTarget.id, "suspend")}
              >
                Suspend
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
