import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  user?: { role: string };
  mfaRequired?: boolean;
  userId?: string;
  error?: string;
}

export function useLogin() {
  const router = useRouter();
  const [role, setRole] = useState<"Patient" | "Practitioner" | "Admin">("Patient");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [tempUserId, setTempUserId] = useState("");

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
      const data: LoginResponse = await res.json();

      if (res.ok) {
        if (data.mfaRequired) {
          setMfaRequired(true);
          setTempUserId(data.userId || "");
        } else {
          router.push(`/${data.user?.role}`);
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: tempUserId, token: mfaToken }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/${data.user?.role}`);
      } else {
        setError(data.error || "MFA verification failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const resetMfa = () => {
    setMfaRequired(false);
    setMfaToken("");
    setTempUserId("");
  };

  return {
    role,
    setRole,
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    error,
    mfaRequired,
    mfaToken,
    setMfaToken,
    handleLogin,
    handleMfaVerify,
    resetMfa,
  };
}