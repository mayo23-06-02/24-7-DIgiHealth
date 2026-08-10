"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("invite") || "";

  const [status, setStatus] = useState<"loading" | "ready" | "error" | "done">("loading");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<{ guardianName: string; relationship: string } | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setError("This invite link is missing its token.");
      setStatus("error");
      return;
    }
    try {
      const res = await fetch(`/api/invites/family/${token}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setInvite(json.data);
        setStatus("ready");
      } else {
        setError(json.error || "This invite link is not valid.");
        setStatus("error");
      }
    } catch {
      setError("Network error.");
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await fetch("/api/patient/family/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("done");
      } else {
        setError(json.error || "Failed to accept invite.");
        setStatus("error");
      }
    } catch {
      setError("Network error.");
      setStatus("error");
    }
    setIsAccepting(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Users size={26} />
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-sm text-slate-500">Checking invite…</p>
          </div>
        )}

        {status === "error" && <Alert status="error" title={error} />}

        {status === "ready" && invite && (
          <>
            <div>
              <h1 className="text-lg font-bold text-ink-900 font-grotesk">
                {invite.guardianName} wants to add you as their {invite.relationship}
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Accepting lets them manage your appointments and billing on 24/7 DigiHealth.
              </p>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-success-50 border border-success-500/20 text-left">
              <ShieldCheck size={20} className="text-success-500 shrink-0 mt-0.5" />
              <p className="text-xs text-success-700 font-medium">
                Your medical history, prescriptions, and consultation notes always stay private to you — linking never changes that.
              </p>
            </div>
            <Button fullWidth loading={isAccepting} onClick={handleAccept}>
              Accept
            </Button>
          </>
        )}

        {status === "done" && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-success-50 flex items-center justify-center text-success-500 -mt-2">
              <CheckCircle2 size={26} />
            </div>
            <h1 className="text-lg font-bold text-ink-900 font-grotesk">You're linked</h1>
            <p className="text-sm text-slate-500">Your account is now part of their family plan.</p>
            <Button fullWidth onClick={() => router.push("/patient")}>
              Go to my dashboard
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export default function FamilyAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
