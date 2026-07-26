"use client";

import { useState } from "react";
import { useNavigate } from "@/hooks/useNavigate";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/passwordRules";

export function useForgotPassword() {
  const { navigate, isPending } = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side checks are UX only — the API re-validates.
    const next: typeof fieldErrors = {};
    if (!identifier.trim()) {
      next.identifier = "Enter the email or ID for your account.";
    }
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;

    const confirmError = validatePasswordConfirmation(
      password,
      confirmPassword,
    );
    if (confirmError) next.confirmPassword = confirmError;

    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Deliberately leave `loading` set: the button keeps its spinner
        // through the redirect rather than going idle mid-navigation.
        // `email` is the param LoginForm already reads to prefill the
        // identifier field, so the user lands with it filled in.
        setTimeout(() => {
          navigate(
            `/login?reset=true&email=${encodeURIComponent(identifier.trim())}`,
          );
        }, 1200);
        return;
      }

      setError(data.error || "Could not reset password.");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading: loading || isPending,
    error,
    success,
    fieldErrors,
    handleSubmit,
  };
}
