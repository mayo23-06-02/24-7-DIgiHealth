"use client";

import React from "react";
import {
  SkeletonPageHeader,
  SkeletonStatRow,
  SkeletonCardGrid,
  SkeletonTable,
  SkeletonDetail,
  SkeletonChatPane,
  SkeletonChart,
} from "./primitives";

export type PageSkeletonVariant =
  | "dashboard"
  | "table"
  | "cardGrid"
  | "detail"
  | "chat"
  | "analytics"
  | "lobby";

/**
 * Composer so each `loading.tsx` is a one-liner, and so a page's own internal
 * `loading` state can render the exact same shape as its route-level fallback
 * (most pages here are `'use client'` + `useEffect` fetch, so the wait has two
 * phases — they should look like one).
 *
 *   export default function Loading() {
 *     return <PageSkeleton variant="table" />;
 *   }
 */
export default function PageSkeleton({
  variant = "dashboard",
}: {
  variant?: PageSkeletonVariant;
}) {
  if (variant === "chat") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading conversations…</span>
        <SkeletonChatPane />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading details…</span>
        <SkeletonPageHeader withAction />
        <SkeletonDetail />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading records…</span>
        <SkeletonPageHeader withAction />
        <SkeletonTable />
      </div>
    );
  }

  if (variant === "cardGrid") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading…</span>
        <SkeletonPageHeader withAction />
        <SkeletonCardGrid />
      </div>
    );
  }

  if (variant === "analytics") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading analytics…</span>
        <SkeletonPageHeader withAction />
        <SkeletonStatRow count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart bars={6} />
        </div>
      </div>
    );
  }

  if (variant === "lobby") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 min-h-[60vh]"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Preparing your consultation room…</span>
        <SkeletonCardGrid count={1} columns={2} />
      </div>
    );
  }

  // "dashboard" — the catch-all for every route without its own loading.tsx
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <SkeletonPageHeader withAction />
      <SkeletonStatRow count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonTable rows={5} columns={3} />
        <SkeletonCardGrid count={2} columns={2} />
      </div>
    </div>
  );
}
