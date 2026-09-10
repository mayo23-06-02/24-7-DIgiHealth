import { useEffect, useState } from "react";
import { useNavigate } from "@/hooks/useNavigate";

const RESEND_COOLDOWN_SECONDS = 30;

export function useLogin() {
  const { navigate, isPending } = useNavigate();
  const [role, setRole] = useState<"Patient" | "Practitioner" | "Admin">(
    "Patient",
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // MFA step — entered once the password has been accepted.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          role: role.toLowerCase(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.mfaRequired) {
        setMfaEmail(data.email || identifier);
        setMfaRequired(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setLoading(false);
        return;
      }

      if (res.ok) {
        // Deliberately do NOT clear `loading` here. The dashboard layout does
        // jwtVerify + a Mongo lookup, so the route takes a while; the button
        // must keep spinning until it commits. This component unmounts on
        // navigation, so the state cannot leak.
        navigate(`/${data.user?.role}`);
        return;
      }

      if (data.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email || identifier)}`);
        return;
      }

      setError(data.error || "Login failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifyingCode(true);
    setError("");

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfaEmail, code: code.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        // Same reasoning as handleLogin: keep spinning through navigation.
        navigate(`/${data.user?.role}`);
        return;
      }

      setError(data.error || "Verification failed");
      setVerifyingCode(false);
    } catch {
      setError("Network error");
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfaEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const handleBackToPassword = () => {
    setMfaRequired(false);
    setCode("");
    setError("");
    setPassword("");
  };

  return {
    role,
    setRole,
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading: loading || isPending,
    error,
    handleLogin,
    mfaRequired,
    mfaEmail,
    code,
    setCode,
    verifyingCode,
    resending,
    resendCooldown,
    handleVerifyMfa,
    handleResendCode,
    handleBackToPassword,
  };
}
