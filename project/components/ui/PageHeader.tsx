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
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right, className = "" }) => (
  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
    <div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-slate-500 font-medium tracking-tight mt-0.5 text-sm">{subtitle}</p>
      )}
    </div>
    {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
  </div>
);

export default PageHeader;
