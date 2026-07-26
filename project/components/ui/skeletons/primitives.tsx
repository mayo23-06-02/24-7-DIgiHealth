"use client";

import React from "react";
import SkeletonLoader from "../SkeletonLoader";
import Card from "../Card";

/**
 * Skeleton primitives, composed from the existing SkeletonLoader shimmer.
 *
 * Note on spacing: the `@layer utilities` block at the bottom of globals.css
 * redefines every padding/margin utility with `!important`, which beats
 * responsive variants like `sm:p-4`. Inline `style={{ padding }}` is used where
 * the exact inset matters so these skeletons line up with the real components.
 */

/** Mirrors components/ui/PageHeader.tsx */
export function SkeletonPageHeader({
  withAction = false,
}: {
  withAction?: boolean;
}) {
  return (
    <div className="flex flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <SkeletonLoader className="h-6 w-48 rounded-md" />
        <SkeletonLoader className="h-3 w-64 max-w-full rounded" />
      </div>
      {withAction && <SkeletonLoader className="h-10 w-32 rounded-full" />}
    </div>
  );
}

/** Mirrors a row of components/ui/KPICard.tsx */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} noPadding>
          <div
            className="flex flex-col gap-3"
            style={{ padding: 16, paddingBottom: 12 }}
          >
            <SkeletonLoader className="w-10 h-10 rounded-lg" />
            <SkeletonLoader className="w-24 h-8 rounded-md" />
            <SkeletonLoader className="w-16 h-3 rounded" />
          </div>
          <div className="border-t border-slate-100" style={{ padding: 12 }}>
            <SkeletonLoader className="w-20 h-3 rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} noPadding>
          <div className="flex flex-col gap-3" style={{ padding: 16 }}>
            <div className="flex items-center gap-3">
              <SkeletonLoader className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <SkeletonLoader className="h-4 w-3/4 rounded" />
                <SkeletonLoader className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <SkeletonLoader className="h-3 w-full rounded" />
            <SkeletonLoader className="h-3 w-5/6 rounded" />
            <SkeletonLoader className="h-9 w-full rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card noPadding>
      {/* header row */}
      <div
        className="flex items-center gap-4 border-b border-slate-200 bg-slate-50"
        style={{ padding: 16 }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader
            key={i}
            className={`h-3 rounded ${i === 0 ? "w-40" : "flex-1"}`}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-slate-100 last:border-b-0"
          style={{ padding: 16 }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className={`flex items-center gap-3 ${c === 0 ? "w-40" : "flex-1"}`}
            >
              {c === 0 && (
                <SkeletonLoader className="w-8 h-8 rounded-full shrink-0" />
              )}
              <SkeletonLoader className="h-3 flex-1 rounded" />
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

export function SkeletonDetail({ withTabs = true }: { withTabs?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card noPadding>
        <div className="flex items-center gap-4" style={{ padding: 20 }}>
          <SkeletonLoader className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <SkeletonLoader className="h-5 w-56 max-w-full rounded-md" />
            <SkeletonLoader className="h-3 w-40 rounded" />
            <SkeletonLoader className="h-3 w-32 rounded" />
          </div>
          <SkeletonLoader className="h-10 w-28 rounded-full shrink-0 hidden sm:block" />
        </div>
      </Card>

      {withTabs && (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card noPadding className="lg:col-span-2">
          <div className="flex flex-col gap-3" style={{ padding: 20 }}>
            <SkeletonLoader className="h-4 w-40 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-4">
                <SkeletonLoader className="h-3 w-full rounded" />
                <SkeletonLoader className="h-3 w-full rounded" />
              </div>
            ))}
          </div>
        </Card>
        <Card noPadding>
          <div className="flex flex-col gap-3" style={{ padding: 20 }}>
            <SkeletonLoader className="h-4 w-32 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-3 w-full rounded" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Two-pane messages view: conversation list + thread */
export function SkeletonChatPane() {
  // Arbitrary-value classes, not inline style: SkeletonLoader only forwards
  // className. These aren't touched by the `!important` spacing block.
  const bubbles = [
    "w-[60%]",
    "w-[45%]",
    "w-[72%]",
    "w-[38%]",
    "w-[66%]",
    "w-[50%]",
  ];

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex" style={{ height: "calc(100vh - 180px)" }}>
        {/* conversation list */}
        <div className="hidden md:flex flex-col w-[300px] shrink-0 border-r border-slate-200">
          <div className="border-b border-slate-100" style={{ padding: 16 }}>
            <SkeletonLoader className="h-9 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: 12 }}>
                <SkeletonLoader className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <SkeletonLoader className="h-3 w-3/4 rounded" />
                  <SkeletonLoader className="h-2.5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* thread */}
        <div className="flex flex-col flex-1 min-w-0">
          <div
            className="flex items-center gap-3 border-b border-slate-100 shrink-0"
            style={{ padding: 16 }}
          >
            <SkeletonLoader className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex flex-col gap-2">
              <SkeletonLoader className="h-3 w-40 rounded" />
              <SkeletonLoader className="h-2.5 w-24 rounded" />
            </div>
          </div>
          <div
            className="flex flex-col gap-4 flex-1 overflow-hidden"
            style={{ padding: 16 }}
          >
            {bubbles.map((w, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 1 ? "justify-end" : "justify-start"}`}
              >
                <SkeletonLoader className={`h-12 rounded-2xl ${w}`} />
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 shrink-0" style={{ padding: 16 }}>
            <SkeletonLoader className="h-11 w-full rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SkeletonChart({ bars = 9 }: { bars?: number }) {
  // Fixed heights, not Math.random(): the server and client render must match
  // or React will report a hydration mismatch.
  const heights = [
    "h-[55%]",
    "h-[80%]",
    "h-[40%]",
    "h-[95%]",
    "h-[65%]",
    "h-[75%]",
    "h-[35%]",
    "h-[88%]",
    "h-[50%]",
    "h-[70%]",
    "h-[45%]",
    "h-[82%]",
  ];

  return (
    <Card noPadding>
      <div className="flex flex-col gap-4" style={{ padding: 20 }}>
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-4 w-40 rounded" />
          <SkeletonLoader className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex items-end gap-3 h-48">
          {Array.from({ length: bars }).map((_, i) => (
            <div key={i} className="flex-1 flex items-end h-full">
              <SkeletonLoader
                className={`w-full rounded-t-md ${heights[i % heights.length]}`}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex gap-3 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-3 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}
