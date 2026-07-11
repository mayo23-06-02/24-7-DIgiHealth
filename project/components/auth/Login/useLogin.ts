import { useState } from "react";
import { useRouter } from "next/navigation";

export function useLogin() {
  const router = useRouter();
  const [role, setRole] = useState<"Patient" | "Practitioner" | "Admin">(
    "Patient",
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      if (res.ok) {
        router.push(`/${data.user?.role}`);
        return;
      }

      // Unverified email — send user to verify page
      if (
        res.status === 403 &&
        (data.requiresEmailVerification || data.emailVerified === false)
      ) {
        const email = (data.email || identifier || "").toString().trim();
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}&from=login`,
        );
        return;
      }

      setError(data.error || "Login failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
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
    handleLogin,
  };
}
