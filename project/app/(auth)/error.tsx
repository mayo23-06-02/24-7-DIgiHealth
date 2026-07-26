"use client";

import { useEffect } from "react";
import { BiErrorCircle, BiRefresh } from "react-icons/bi";
import Button from "@/components/ui/Button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth route error:", error);
  }, [error]);

  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl bg-white/85 backdrop-blur-xl border border-white/50 shadow-2xl flex flex-col items-center text-center gap-4"
      style={{ padding: 32 }}
    >
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-400">
        <BiErrorCircle size={32} />
      </div>
      <h4 className="text-lg font-semibold text-slate-700 tracking-tight font-grotesk">
        Something went wrong
      </h4>
      <p className="text-sm text-slate-500 leading-relaxed">
        We couldn&apos;t complete that step. Please try again.
      </p>
      {error.digest && (
        <p className="text-[11px] text-slate-400">Reference: {error.digest}</p>
      )}
      <Button onClick={() => reset()} icon={<BiRefresh size={18} />}>
        Try again
      </Button>
    </div>
  );
}
