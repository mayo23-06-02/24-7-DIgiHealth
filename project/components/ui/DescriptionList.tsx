import React from "react";

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
}

/** Label/value grid — patient clinical facts, field details, settings summaries. */
const DescriptionList: React.FC<{
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}> = ({ items, columns = 2, className = "" }) => {
  const colClass = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <dl className={`grid grid-cols-1 ${colClass} gap-x-6 gap-y-4 ${className}`}>
      {items.map((item, i) => (
        <div key={i}>
          <dt className="text-label text-slate-400 uppercase tracking-wide">{item.label}</dt>
          <dd className="text-sm font-semibold text-ink-900 mt-1">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default DescriptionList;
