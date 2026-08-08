"use client";

import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CollapseToggleProps {
  isCollapsed: boolean;
  onClick: () => void;
}

export default function CollapseToggle({ isCollapsed, onClick }: CollapseToggleProps) {
  return (
    <button
      onClick={onClick}
      className="absolute -right-3 top-8 hidden lg:flex w-6 h-6 rounded-md bg-surface border border-border items-center justify-center text-ink-500 hover:text-primary hover:bg-primary/5 transition-all z-50 "
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
    </button>
  );
}