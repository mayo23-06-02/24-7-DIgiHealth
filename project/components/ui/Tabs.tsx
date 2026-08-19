"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  badgeColor?: "primary" | "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

const badgeColorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary-50", text: "text-primary" },
  success: { bg: "bg-success-50", text: "text-success-700" },
  warning: { bg: "bg-warning-50", text: "text-warning-700" },
  danger: { bg: "bg-danger-50", text: "text-danger-700" },
  info: { bg: "bg-info-50", text: "text-info-700" },
};

/** Design-system underline tab bar. Composition of tab panels is left to the caller. */
const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = "" }) => {
  return (
    <div
      role="tablist"
      className={`flex gap-1 border-b border-border overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const badgeColor = tab.badgeColor || "primary";
        const colors = badgeColorMap[badgeColor];

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 md:text-sm text-xs font-semibold whitespace-nowrap transition-colors ${
              active ? "text-primary" : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {tab.icon && <span className="w-4 h-4 lg:w-6 lg:h-6">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${colors.bg} ${colors.text}`}>
                {tab.badge}
              </span>
            )}
            {active && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
