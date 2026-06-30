"use client";

import React from "react";
import { BiChevronRight, BiChevronLeft } from "react-icons/bi";

interface CollapseToggleProps {
  isCollapsed: boolean;
  onClick: () => void;
}

export default function CollapseToggle({ isCollapsed, onClick }: CollapseToggleProps) {
  return (
    <button
      onClick={onClick}
      className="absolute -right-3 top-10 hidden lg:flex w-6 h-6 rounded-lg bg-white border border-slate-200 items-center justify-center text-slate-500 hover:text-primary transition-all z-50"
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? <BiChevronRight size={14} /> : <BiChevronLeft size={14} />}
    </button>
  );
}