import React from "react";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

const Breadcrumbs: React.FC<{ items: Crumb[]; className?: string }> = ({
  items,
  className = "",
}) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li key={i} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <a href={item.href} className="text-slate-500 hover:text-primary transition-colors">
                {item.label}
              </a>
            ) : (
              <span className={last ? "text-ink-900 font-semibold" : "text-slate-500"}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight size={14} className="text-slate-300" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
