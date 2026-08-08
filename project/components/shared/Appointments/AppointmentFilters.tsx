"use client";

import React, { useState } from "react";
import { Search, X, Calendar, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  onClearDates: () => void;
}

export default function AppointmentFilters({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  onClearDates,
}: Props & {
  typeFilter?: string;
  onTypeFilterChange?: (val: string) => void;
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const hasActiveFilters =
    dateFrom || dateTo || (typeFilter && typeFilter !== "all");

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search patient name or fields..."
            icon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            aria-label="Filters"
            className="relative flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() =>
              onSortChange(sortBy === "newest" ? "oldest" : "newest")
            }
            aria-label={sortBy === "newest" ? "Sorted newest first" : "Sorted oldest first"}
            className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
          >
            {sortBy === "newest" ? (
              <ArrowDownWideNarrow size={18} />
            ) : (
              <ArrowUpWideNarrow size={18} />
            )}
          </button>
        </div>
      </div>

      <Dialog
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filters"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {onTypeFilterChange && (
            <Select
              label="Appointment Type"
              value={typeFilter || "all"}
              onChange={(v) => onTypeFilterChange(v)}
              options={[
                { value: "all", label: "All Types" },
                { value: "video", label: "Video" },
                { value: "chat", label: "Chat" },
              ]}
            />
          )}

          <Input
            type="date"
            label="Start Date"
            icon={<Calendar size={16} />}
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />

          <Input
            type="date"
            label="End Date"
            icon={<Calendar size={16} />}
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />

          {hasActiveFilters && (
            <Button
              variant="white"
              icon={<X size={16} />}
              iconPosition="left"
              fullWidth
              className="!text-danger-500 !border-danger-500/20 hover:!bg-danger-50"
              onClick={() => {
                onClearDates();
                if (onTypeFilterChange) onTypeFilterChange("all");
                setShowFilterModal(false);
              }}
            >
              Clear Filters
            </Button>
          )}

          <Button fullWidth onClick={() => setShowFilterModal(false)}>
            Apply Filters
          </Button>
        </div>
      </Dialog>
    </>
  );
}
