"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Baby, Mail, Loader2, X, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge, { BadgeStatus } from "@/components/ui/Badge";
import Switch from "@/components/ui/Switch";
import Card from "@/components/ui/Card";
import ProfileSection from "./ProfileSection";

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

const STATUS_BADGE: Record<string, BadgeStatus> = { pending: "warning", active: "success", revoked: "neutral" };

export default function FamilyTab({
  setToast,
}: {
  setToast: (t: { message: string; type: "success" | "error" | "info" } | null) => void;
}) {
  const [asGuardian, setAsGuardian] = useState<GuardianLink[]>([]);
  const [asMember, setAsMember] = useState<MemberLink[]>([]);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChildForm, setShowChildForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [childForm, setChildForm] = useState({ firstName: "", lastName: "", dateOfBirth: "", gender: "male" });
  const [inviteForm, setInviteForm] = useState({ email: "", relationship: "spouse" });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/patient/family");
      if (res.ok) {
        const json = await res.json();
        setAsGuardian(json.data.asGuardian);
        setAsMember(json.data.asMember);
        setSlots(json.data.slots);
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
    if (!childForm.firstName.trim() || !childForm.lastName.trim() || !childForm.dateOfBirth) {
      setToast({ message: "First name, last name and date of birth are required.", type: "error" });
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
        setChildForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "male" });
        load();
      } else {
        setToast({ message: json.error || "Failed to add child.", type: "error" });
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
        setToast({ message: `Invite sent to ${inviteForm.email}.`, type: "success" });
        setShowInviteForm(false);
        setInviteForm({ email: "", relationship: "spouse" });
        load();
      } else {
        setToast({ message: json.error || "Failed to send invite.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
    }
    setIsSaving(false);
  };

  const handleToggleMinor = async (memberId: string, isMinor: boolean) => {
    setAsGuardian((prev) => prev.map((l) => (l.member.id === memberId ? { ...l, isMinor } : l)));
    try {
      const res = await fetch(`/api/patient/family/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMinor }),
      });
      if (!res.ok) throw new Error();
      setToast({
        message: isMinor ? "You can now view this member's medical records." : "Medical record access removed.",
        type: "success",
      });
    } catch {
      setToast({ message: "Failed to update — please try again.", type: "error" });
      load();
    }
  };

  const handleRevoke = async (memberId: string) => {
    try {
      const res = await fetch(`/api/patient/family/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: "Family member removed.", type: "info" });
        load();
      } else {
        setToast({ message: "Failed to remove.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error.", type: "error" });
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
      <ProfileSection
        icon={<Users size={22} />}
        title="Family account"
        description="Link family members you manage and pay for. Adults keep their medical history private unless you flag them as a minor."
        color="primary"
      >
        {slots && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-surface-soft px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">
              {slots.used} of {slots.maxFamilyMembers} family slot{slots.maxFamilyMembers === 1 ? "" : "s"} used
              <span className="ml-1.5 font-normal text-slate-500 capitalize">({slots.tier.replace("_", " ")} plan)</span>
            </p>
            {slots.remaining <= 0 && (
              <span className="text-xs font-semibold text-primary">Upgrade to add more</span>
            )}
          </div>
        )}

        <div className="space-y-3">
          {asGuardian.length === 0 && !showChildForm && !showInviteForm && (
            <p className="text-sm text-slate-500 text-center py-6">No family members linked yet.</p>
          )}

          {asGuardian.map((link) => (
            <div key={link.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-ink-900 truncate">{link.member.name || link.member.email}</p>
                  <Badge label={link.relationship} status="neutral" size="sm" />
                  <Badge label={link.status} status={STATUS_BADGE[link.status]} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{link.member.email}</p>
              </div>
              {link.status === "active" && (
                <Switch
                  checked={link.isMinor}
                  onChange={(v) => link.member.id && handleToggleMinor(link.member.id, v)}
                  label="Guardian can view medical records"
                  className="shrink-0 max-w-[220px] text-right flex-row-reverse"
                />
              )}
              <button
                onClick={() => link.member.id && handleRevoke(link.member.id)}
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
                <button onClick={() => setShowChildForm(false)} aria-label="Cancel">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={childForm.firstName}
                  onChange={(e) => setChildForm((p) => ({ ...p, firstName: e.target.value }))}
                />
                <Input
                  label="Last name"
                  value={childForm.lastName}
                  onChange={(e) => setChildForm((p) => ({ ...p, lastName: e.target.value }))}
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={childForm.dateOfBirth}
                  onChange={(e) => setChildForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                />
                <Select
                  label="Gender"
                  value={childForm.gender}
                  onChange={(v) => setChildForm((p) => ({ ...p, gender: v as string }))}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
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
                  <Mail size={16} className="text-primary" /> Invite family member
                </h4>
                <button onClick={() => setShowInviteForm(false)} aria-label="Cancel">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email address"
                  type="email"
                  icon={<Mail size={16} />}
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="their@email.com"
                />
                <Select
                  label="Relationship"
                  value={inviteForm.relationship}
                  onChange={(v) => setInviteForm((p) => ({ ...p, relationship: v as string }))}
                  options={[
                    { value: "spouse", label: "Spouse" },
                    { value: "parent", label: "Parent" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <p className="text-xs text-slate-500">
                They'll get an email to accept — you won't get access until they do, and their medical history always stays private to them.
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

      {asMember.length > 0 && (
        <ProfileSection
          icon={<Users size={22} />}
          title="Managed by"
          description="Accounts that manage and pay for your subscription."
          color="slate"
        >
          <div className="space-y-3">
            {asMember.map((link) => (
              <div key={link.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900 truncate">{link.guardian.name}</p>
                  <p className="text-xs text-slate-500">{link.guardian.email} · {link.relationship === "spouse" || link.relationship === "parent" ? "manages your account" : "guardian"}</p>
                </div>
                <p className="text-xs font-semibold text-success-700">Your medical history stays private</p>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}
    </div>
  );
}
