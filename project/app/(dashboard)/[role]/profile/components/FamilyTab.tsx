"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Baby,
  Mail,
  Loader2,
  X,
  Trash2,
  Copy,
  Check,
  TriangleAlert,
} from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge, { BadgeStatus } from "@/components/ui/Badge";
import Switch from "@/components/ui/Switch";
import Card from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import ProfileSection from "./ProfileSection";
import { useFamilyMembers } from "@/lib/family/FamilyMemberContext";

interface GuardianLink {
  id: string;
  member: { id: string | null; name: string | null; email: string | null };
  relationship: string;
  isMinor: boolean;
  status: "pending" | "active" | "revoked";
  linkedVia: "guardian_created" | "email_invite";
  inviteExpiresAt?: string;
}

interface MemberLink {
  id: string;
  guardian: { id: string; name: string; email: string };
  relationship: string;
  isMinor: boolean;
}

interface Slots {
  tier: string;
  maxFamilyMembers: number;
  used: number;
  remaining: number;
}

const STATUS_BADGE: Record<string, BadgeStatus> = {
  pending: "warning",
  active: "success",
  revoked: "neutral",
};

export default function FamilyTab({
  setToast,
}: {
  setToast: (
    t: { message: string; type: "success" | "error" | "info" } | null,
  ) => void;
}) {
  const [asGuardian, setAsGuardian] = useState<GuardianLink[]>([]);
  const [asMember, setAsMember] = useState<MemberLink[]>([]);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [isChild, setIsChild] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showChildForm, setShowChildForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [childForm, setChildForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    idNumber: "",
    ageRange: "",
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    relationship: "spouse",
  });

  const [confirmTarget, setConfirmTarget] = useState<GuardianLink | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { refetch: refetchFamilyMembers } = useFamilyMembers();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/patient/family");
      if (res.ok) {
        const json = await res.json();
        setAsGuardian(json.data.asGuardian);
        setAsMember(json.data.asMember);
        setSlots(json.data.slots);
        setIsChild(json.data.isChild || false);
      }
    } catch {
      /* silent */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddChild = async () => {
    if (
      !childForm.firstName.trim() ||
      !childForm.lastName.trim() ||
      !childForm.dateOfBirth
    ) {
      setToast({
        message: "First name, last name and date of birth are required.",
        type: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/patient/family/child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...childForm, relationship: "child" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ message: "Child added.", type: "success" });
        setShowChildForm(false);
        setChildForm({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "male",
          idNumber: "",
          ageRange: "",
        });
        load();
      } else {
        setToast({
          message: json.error || "Failed to add child.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      setToast({ message: "An email address is required.", type: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/patient/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({
          message: `Invite sent to ${inviteForm.email}.`,
          type: "success",
        });
        setShowInviteForm(false);
        setInviteForm({ email: "", relationship: "spouse" });
        load();
      } else {
        setToast({
          message: json.error || "Failed to send invite.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleToggleMinor = async (memberId: string, isMinor: boolean) => {
    setAsGuardian((prev) =>
      prev.map((l) => (l.member.id === memberId ? { ...l, isMinor } : l)),
    );
    try {
      const res = await fetch(`/api/patient/family/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMinor }),
      });
      if (!res.ok) throw new Error();
      setToast({
        message: isMinor
          ? "You can now view this member's medical records."
          : "Medical record access removed.",
        type: "success",
      });
    } catch {
      setToast({
        message: "Failed to update — please try again.",
        type: "error",
      });
      load();
    }
  };

  const handleRevoke = async (linkId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patient/family/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast({ message: "Family member removed.", type: "info" });
        setConfirmTarget(null);
        setConfirmInput("");
        load();
        refetchFamilyMembers();
      } else {
        setToast({ message: "Failed to remove.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsDeleting(false);
  };

  const confirmName = confirmTarget
    ? confirmTarget.member.name || confirmTarget.member.email || ""
    : "";
  const confirmMatches =
    confirmName.length > 0 &&
    confirmInput.trim().toLowerCase() === confirmName.trim().toLowerCase();

  const handleCopyConfirmName = async () => {
    try {
      await navigator.clipboard.writeText(confirmName);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — user can still type it manually */
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {!isChild && (
        <ProfileSection
          icon={<Users size={22} />}
          title="Family account"
          description="Link family members you manage and pay for. Adults keep their medical history private unless you flag them as a minor."
          color="primary"
        >
          {slots && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-surface-soft px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">
                {slots.used} of {slots.maxFamilyMembers} family slot
                {slots.maxFamilyMembers === 1 ? "" : "s"} used
                <span className="ml-1.5 font-normal text-slate-500 capitalize">
                  ({slots.tier.replace("_", " ")} plan)
                </span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            {asGuardian.length === 0 && !showChildForm && !showInviteForm && (
              <p className="text-sm text-slate-500 text-center py-6">
                No family members linked yet.
              </p>
            )}

            {asGuardian.map((link) => (
              <div
                key={link.id}
                className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-ink-900 truncate">
                      {link.member.name || link.member.email}
                    </p>
                    <Badge
                      label={link.relationship}
                      status="neutral"
                      size="sm"
                    />
                    <Badge
                      label={link.status}
                      status={STATUS_BADGE[link.status]}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {link.member.email}
                  </p>
                </div>
                {link.status === "active" && (
                  <Switch
                    checked={link.isMinor}
                    onChange={(v) =>
                      link.member.id && handleToggleMinor(link.member.id, v)
                    }
                    label="Guardian can view medical records"
                    className="shrink-0 lg:max-w-[220px] text-right flex-row-reverse"
                  />
                )}
                <button
                  onClick={() => {
                    setConfirmTarget(link);
                    setConfirmInput("");
                  }}
                  aria-label="Remove family member"
                  className="shrink-0 p-2 text-slate-400 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {showChildForm && (
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <Baby size={16} className="text-primary" /> Add child
                  </h4>
                  <button
                    onClick={() => setShowChildForm(false)}
                    aria-label="Cancel"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First name"
                    value={childForm.firstName}
                    onChange={(e) =>
                      setChildForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                  />
                  <Input
                    label="Last name"
                    value={childForm.lastName}
                    onChange={(e) =>
                      setChildForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                  />
                  <Input
                    label="Date of birth"
                    type="date"
                    value={childForm.dateOfBirth}
                    onChange={(e) =>
                      setChildForm((p) => ({
                        ...p,
                        dateOfBirth: e.target.value,
                      }))
                    }
                  />
                  <Select
                    label="Gender"
                    value={childForm.gender}
                    onChange={(v) =>
                      setChildForm((p) => ({ ...p, gender: v as string }))
                    }
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <Select
                    label="Age Range"
                    value={childForm.ageRange}
                    onChange={(v) =>
                      setChildForm((p) => ({ ...p, ageRange: v as string }))
                    }
                    options={[
                      { value: "0-2", label: "0-2 years" },
                      { value: "3-5", label: "3-5 years" },
                      { value: "5-12", label: "5-12 years" },
                      { value: "13-18", label: "13-18 years" },
                    ]}
                  />
                  <Input
                    label="ID Number"
                    value={childForm.idNumber}
                    onChange={(e) =>
                      setChildForm((p) => ({ ...p, idNumber: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <Button onClick={handleAddChild} loading={isSaving} fullWidth>
                  Add child
                </Button>
              </Card>
            )}

            {showInviteForm && (
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <Mail size={16} className="text-primary" /> Invite family
                    member
                  </h4>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    aria-label="Cancel"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email address"
                    type="email"
                    icon={<Mail size={16} />}
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="their@email.com"
                  />
                  <Select
                    label="Relationship"
                    value={inviteForm.relationship}
                    onChange={(v) =>
                      setInviteForm((p) => ({
                        ...p,
                        relationship: v as string,
                      }))
                    }
                    options={[
                      { value: "spouse", label: "Spouse" },
                      { value: "parent", label: "Parent" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  They'll get an email to accept — you won't get access until
                  they do, and their medical history always stays private to
                  them.
                </p>
                <Button onClick={handleInvite} loading={isSaving} fullWidth>
                  Send invite
                </Button>
              </Card>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              fullWidth
              icon={<Baby size={16} />}
              iconPosition="left"
              onClick={() => {
                setShowChildForm(true);
                setShowInviteForm(false);
              }}
              disabled={!!slots && slots.remaining <= 0}
            >
              Add Child
            </Button>
            <Button
              variant="outline"
              fullWidth
              icon={<UserPlus size={16} />}
              iconPosition="left"
              onClick={() => {
                setShowInviteForm(true);
                setShowChildForm(false);
              }}
              disabled={!!slots && slots.remaining <= 0}
            >
              Invite Family Member
            </Button>
          </div>
        </ProfileSection>
      )}

      {asMember.length > 0 && (
        <ProfileSection
          icon={<Users size={22} />}
          title="Managed by"
          description="Accounts that manage and pay for your subscription."
          color="slate"
        >
          <div className="space-y-3">
            {asMember.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900 truncate">
                    {link.guardian.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {link.guardian.email} ·{" "}
                    {link.relationship === "spouse" ||
                    link.relationship === "parent"
                      ? "manages your account"
                      : "guardian"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      <Dialog
        isOpen={!!confirmTarget}
        onClose={() => {
          setConfirmTarget(null);
          setConfirmInput("");
        }}
        title="Remove family member"
        size="sm"
      >
        {confirmTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-danger-500/20 bg-danger-50 p-3">
              <TriangleAlert
                size={18}
                className="text-danger-700 shrink-0 mt-0.5"
              />
              <p className="text-sm text-danger-700">
                This removes <span className="font-bold">{confirmName}</span>
                {confirmTarget.status === "pending"
                  ? " — the pending invite will be cancelled."
                  : " from your family account. They'll go back to self-pay."}{" "}
                This can't be undone.
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
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setConfirmTarget(null);
                  setConfirmInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={!confirmMatches || isDeleting}
                loading={isDeleting}
                icon={<Trash2 size={16} />}
                iconPosition="left"
                onClick={() => handleRevoke(confirmTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
