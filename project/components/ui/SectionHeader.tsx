"use client";

import React from "react";
import Badge, { BadgeStatus } from "./Badge";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeStatus?: BadgeStatus;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  inner?: boolean; // If true, uses smaller padding/typography for inside cards
  compact?: boolean; // Alias for inner
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
  compact = false,
}) => {
  const isCompact = inner || compact;
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex gap-4">
        {icon && (
          <div
            className={`${isCompact ? "w-10 h-10" : "w-14 h-14"} bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-inner shrink-0`}
          >
            {React.cloneElement(icon as any, {
              size: isCompact ? 20 : 28,
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
            className={`${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-800 tracking-tight leading-none`}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs font-bold text-slate-500  tracking-normal mt-1.5">
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
