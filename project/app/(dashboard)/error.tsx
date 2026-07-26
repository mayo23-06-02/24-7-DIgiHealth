"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BiErrorCircle, BiRefresh } from "react-icons/bi";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/**
 * Renders in place of {children} inside DashboardShell, so the user keeps their
 * sidebar and can navigate away instead of hitting a dead end.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <Card noPadding>
      <div
        className="flex flex-col items-center justify-center text-center gap-4 min-h-[50vh]"
        style={{ padding: 24 }}
      >
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-400">
          <BiErrorCircle size={32} />
        </div>
        <h4 className="text-lg font-semibold text-slate-700 tracking-tight font-grotesk">
          Something went wrong
        </h4>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          We couldn&apos;t load this page. This is usually temporary — try again,
          or head back to your dashboard.
        </p>
        {error.digest && (
          <p className="text-[11px] text-slate-400">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()} icon={<BiRefresh size={18} />}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="white">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
