"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

/**
 * Shared page-section header.
 * Usage:
 *   <PageHeader
 *     title="Clinical Practitioners"
 *     subtitle="Find and book with verified specialists."
 *     right={<Button>Book</Button>}
 *   />
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  right,
  className = "",
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-center justify-between lg:gap-4 gap-2 ${className}`}
  >
    <div>
      <h2 className="lg:text-h2 text-h4 font-bold text-ink-900 tracking-tight font-grotesk">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
      )}
    </div>
    {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
  </div>
);

export default PageHeader;
