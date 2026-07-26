import { useState } from "react";
import { useNavigate } from "@/hooks/useNavigate";

export function useLogin() {
  const { navigate, isPending } = useNavigate();
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
        // Deliberately do NOT clear `loading` here. The dashboard layout does
        // jwtVerify + a Mongo lookup, so the route takes a while; the button
        // must keep spinning until it commits. This component unmounts on
        // navigation, so the state cannot leak.
        navigate(`/${data.user?.role}`);
        return;
      }

      setError(data.error || "Login failed");
      setLoading(false);
    } catch {
      setError("Network error");
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
    loading: loading || isPending,
    error,
    handleLogin,
  };
}
