"use client";

import React, { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Card from "./Card";
import EmptyState from "./EmptyState";
import { SkeletonTable } from "./skeletons";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  /** Shown as the card title on mobile instead of in the label/value list */
  isTitle?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Responsive DataTable: a real <table> at md+, stacked cards below it
 * (see design.md §3.5) — no horizontal-scroll-as-only-fallback.
 */
function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  loading = false,
  emptyTitle = "No records",
  emptyDescription = "There's nothing to show here yet.",
  className = "",
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const getVal = (row: T) => (col.sortValue ? col.sortValue(row) : row[col.key]);
    return [...data].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  if (loading) return <SkeletonTable columns={columns.length} />;

  if (!data.length) {
    return (
      <Card noPadding>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </Card>
    );
  }

  const titleCol = columns.find((c) => c.isTitle) || columns[0];

  return (
    <div className={className}>
      {/* Desktop / tablet: real table */}
      <Card noPadding className="hidden md:inline overflow-x-auto">
        <table className="w-full text-sm rounded-xl border">
          <thead>
            <tr className="border-b bg-slate-50 border-slate-200 rounded-xl ">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-label text-slate-500 uppercase tracking-wide whitespace-nowrap ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink-900 transition-colors"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} className="text-slate-300" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-200 last:border-b-0 ${
                  onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-ink-900 ${
                      col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile: horizontal scroll cards */}
      <div className="flex gap-3 md:hidden overflow-x-auto pb-2 snap-x snap-mandatory">
        {sorted.map((row) => (
          <Card
            key={String(row[keyField])}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className="!p-4 min-w-[calc((100vw-3rem)/3.5)] snap-start shrink-0"
          >
            <div className="mb-2 font-semibold text-ink-900">
              {titleCol.render ? titleCol.render(row) : row[titleCol.key]}
            </div>
            <div className="flex flex-col gap-1.5">
              {columns
                .filter((c) => c.key !== titleCol.key)
                .map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-400">{col.header}</span>
                    <span className="text-ink-900 font-medium text-right">
                      {col.render ? col.render(row) : row[col.key]}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Table;
