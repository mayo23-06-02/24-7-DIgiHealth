"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNavigate } from "@/hooks/useNavigate";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/passwordRules";

/**
 * The /forgot-password screen serves two stages of one flow:
 *
 *   "request" — no token in the URL. Ask for the account's email or SA ID and
 *               have /api/auth/forgot-password send a reset link.
 *   "reset"   — arrived from that emailed link, which carries ?token=. Choose
 *               the new password.
 *
 * Previously the screen only ever rendered the second stage and posted
 * { identifier, password } to /api/auth/reset-password — which requires a
 * token. The two were never compatible, so the form failed with "Reset token
 * is required." every single time, for everyone. It was not an edge case.
 *
 * The token is deliberately still required. Resetting a password from an
 * identifier alone would let anyone who knows an email address take over the
 * account, so proving control of the inbox is the whole point of the flow.
 */
export function useForgotPassword() {
  const { navigate, isPending } = useNavigate();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const mode: "request" | "reset" = token ? "reset" : "request";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  /** Stage 1 — ask for a reset link. */
  const requestLink = async () => {
    if (!identifier.trim()) {
      setFieldErrors({ identifier: "Enter the email or ID for your account." });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // The response is deliberately the same whether or not the account
        // exists, so this must not claim an email "has been sent".
        setSent(true);
      } else {
        setError(data.error || "Could not send a reset link. Try again.");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  /** Stage 2 — set the new password using the emailed token. */
  const submitNewPassword = async () => {
    const next: typeof fieldErrors = {};
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    const confirmError = validatePasswordConfirmation(password, confirmPassword);
    if (confirmError) next.confirmPassword = confirmError;

    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        // Deliberately leave `loading` set: the button keeps its spinner
        // through the redirect rather than going idle mid-navigation.
        setTimeout(() => navigate("/login?reset=true"), 1200);
        return;
      }

      setError(data.error || "Could not reset password.");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "request") return requestLink();
    return submitNewPassword();
  };

  return {
    mode,
    sent,
    identifier,
    setIdentifier,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    fieldErrors,
    handleSubmit,
    isPending,
  };
}
