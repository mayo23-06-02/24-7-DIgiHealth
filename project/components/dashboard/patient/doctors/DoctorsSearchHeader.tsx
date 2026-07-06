import React from "react";
import Input from "@/components/ui/Input";
import { BiSearch, BiFilterAlt, BiSortAlt2 } from "react-icons/bi";

interface DoctorsSearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  hasActiveFilters: boolean;
}

export default function DoctorsSearchHeader({
  searchQuery,
  setSearchQuery,
  onOpenFilter,
  onOpenSort,
  hasActiveFilters,
}: DoctorsSearchHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="flex-1 w-full">
        <Input
          type="text"
          placeholder="Search doctors, specializations, or conditions..."
          icon={<BiSearch size={24} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenFilter}
          className={`p-3 rounded-full transition-colors relative ${hasActiveFilters ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          title="Filter"
        >
          <BiFilterAlt size={24} />
          {hasActiveFilters && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
        <button
          onClick={onOpenSort}
          className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Sort"
        >
          <BiSortAlt2 size={24} />
        </button>
      </div>
    </div>
  );
}
