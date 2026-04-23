"use client";

import React from "react";
import Badge from "./Badge";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeStatus?:
    | "default"
    | "active"
    | "warning"
    | "error"
    | "premium"
    | "neutral";
  icon?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  inner?: boolean; // If true, uses smaller padding/typography for inside cards
}

/**
 * Standardized Section Header for Dashboard Components
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeStatus = "premium",
  icon,
  right,
  className = "",
  inner = false,
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex gap-4">
        {icon && (
          <div
            className={`${inner ? "w-10 h-10" : "w-14 h-14"} bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0`}
          >
            {React.cloneElement(icon as React.ReactElement, {
              size: inner ? 20 : 28,
            })}
          </div>
        )}
        <div className="flex flex-col">
          {badge && (
            <Badge
              label={badge}
              status={badgeStatus}
              variant="soft"
              dot
              className="mb-1.5 w-fit"
            />
          )}
          <h3
            className={`${inner ? "text-xl" : "text-2xl"} font-bold text-slate-800 tracking-tight leading-none`}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-normal mt-1.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
};

export default SectionHeader;
