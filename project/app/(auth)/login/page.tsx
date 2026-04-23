"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { BiLogoFacebook, BiLogoGoogle } from "react-icons/bi";

function LoginFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams?.get("registered") === "true";

  const [role, setRole] = useState("Patient");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For MFA
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
      const data = await res.json();

      if (res.ok) {
        if (data.mfaRequired) {
          setMfaRequired(true);
          setTempUserId(data.userId);
        } else {
          router.push(`/${data.user.role}`);
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
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
        router.push(`/${data.user.role}`);
      } else {
        setError(data.error || "MFA verification failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoPatient = () => {
    setRole("Patient");
    setIdentifier("demo@telehealth.co.za");
    setPassword("password123");
    router.push("/patient");
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[85vh] w-full max-w-6xl mx-auto rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-700">
      {/* Left Side: Form */}
      <div className="bg-white  w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center px-10">
        {/* Sophisticated Badge */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-extrabold text-xl">+</span>
          </div>
          <span className="text-primary font-bold tracking-normal  text-xs">
            Secure Portal Access
          </span>
        </div>

        <div className="mb-12 my-5 gap-2.5">
          <h2 className="text-4xl md:text-4xl font-medium text-slate-900 leading-[0.95] tracking-tighter mb-2.5 font-grotesk">
            Welcome back to{" "}
            <span className="text-primary font-bold">24/7 Care</span>
          </h2>
          <p className="text-sm text-slate-400   max-w-[380px]">
            Login for 24/7 expert medical support across South Africa.
          </p>
        </div>

        {/* Role Selection (High-Fidelity Pill) */}

        {isRegistered && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-500">
            <span className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
              ✓
            </span>
            Registration successful! Please login to continue.
          </div>
        )}

        {mfaRequired ? (
          <form onSubmit={handleMfaVerify} className="space-y-8">
            <div className="space-y-6 mb-8">
              <p className="text-sm text-slate-500 text-center">
                Please enter the MFA code sent to your registered device.
              </p>
              <Input
                label="MFA Token"
                required
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="6-digit code"
                className="border-none bg-slate-50/80 focus:bg-white transition-all py-4 text-center tracking-normal text-xl"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-bold text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="py-5 text-base tracking-normal  font-bold"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </Button>

            <button
              type="button"
              onClick={() => setMfaRequired(false)}
              className="w-full mt-4 text-xs font-bold text-slate-400 hover:text-primary transition-colors text-center"
            >
              Cancel & Return
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-6 mb-7.5">
                <Input
                  label={
                    role === "Patient"
                      ? "Email or SA ID"
                      : "Email or HPCSA Number"
                  }
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === "Patient"
                      ? "e.g. 900101 5678 087"
                      : "e.g. MP0123456"
                  }
                  className=" border-none bg-slate-50/80 focus:bg-white transition-all py-4 mb-3.75"
                />

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-bold text-slate-700 ">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-slate-400 hover:text-primary transition-all   hover:underline decoration-2 underline-offset-4"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50/80 border-none rounded-full focus:ring-4 focus:ring-primary/10 focus:bg-white text-slate-900 placeholder-slate-300 outline-none transition-all duration-500 font-medium"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="py-5 text-base tracking-normal  font-bold"
              >
                {loading ? "Authenticating..." : "Login"}
              </Button>
            </form>

            <div className="mt-12 relative flex flex-col items-center gap-6 px-2 py-5">
              <div className="w-full flex items-center gap-4">
                <div className="h-px bg-slate-100 grow"></div>
                <span className="text-xs font-semibold tracking-normal text-slate-300  whitespace-nowrap">
                  OR LOGIN VIA
                </span>
                <div className="h-px bg-slate-100 grow"></div>
              </div>
            </div>

            <div className=" w-full flex justify-center items-center gap-2 pb-5">
              <button
                className="flex items-center justify-center gap-3 py-3 px-8 bg-white border-2 border-slate-100 rounded-lg hover:border-primary/30 hover:bg-slate-50 transition-all duration-300 group/btn"
                type="button"
              >
                <BiLogoGoogle className="text-primary" />
                <span className="text-xs font-bold text-slate-600 ">
                  Google
                </span>
              </button>
              <button
                className="flex items-center justify-center gap-3 py-3 px-8 bg-white border-2 border-slate-100 rounded-lg hover:border-primary/30 hover:bg-slate-50 transition-all duration-300 group/btn"
                type="button"
              >
                <BiLogoFacebook className="text-primary" />
                <span className="text-xs font-bold text-slate-600 ">
                  Facebook
                </span>
              </button>
            </div>

            <p className="mt-8 text-center text-xs font-medium text-slate-400 ">
              Don't have a record yet?{" "}
              <Link
                href="/register"
                className="font-bold text-primary hover:text-secondary border-b-2 border-primary/20 transition-all ml-1 pb-1"
              >
                Apply Now
              </Link>
            </p>
          </>
        )}
      </div>

      {/* Right Side: Image with Overlay */}
      <div className="hidden lg:block w-3/5 relative p-5">
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] p-5"></div>
        <div className="absolute inset-0 bg-linear-to-tr from-primary/80 via-primary/40 to-transparent"></div>

        {/* Floating Content on Image */}

        <div className="absolute inset-x-0 bottom-16 px-16 text-white space-y-6 p-10">
          <div className="w-16 h-px bg-white/40 mb-5"></div>

          <h3 className="text-4xl font-bold  tracking-tighter font-grotesk">
            Smart Healthcare <br /> for a Digital World
          </h3>
          <p className="text-white/80 font-light leading-relaxed max-w-md mb-2.5">
            Connecting patients with medical experts across South Africa.
            Professional, immediate, and accessible care 24/7.
          </p>
          <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col">
              <span className="text-2xl font-bold">20k+</span>
              <span className="text-xs  font-bold tracking-normal opacity-60">
                Patients Joined
              </span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">9 Provinces</span>
              <span className="text-xs  font-bold tracking-normal opacity-60">
                Country Coverage
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-slate-50 animate-pulse"></div>
      }
    >
      <LoginFormComponent />
    </Suspense>
  );
}
