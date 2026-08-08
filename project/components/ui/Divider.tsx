import React from "react";

const Divider: React.FC<{
  label?: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
}> = ({ label, orientation = "horizontal", className = "" }) => {
  if (orientation === "vertical") {
    return <span className={`w-px self-stretch bg-slate-200 ${className}`} />;
  }
  if (!label) {
    return <hr className={`border-t border-slate-200 ${className}`} />;
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
};

export default Divider;
