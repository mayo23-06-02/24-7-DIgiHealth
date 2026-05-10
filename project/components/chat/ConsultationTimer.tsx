import React from "react";

export default function ConsultationTimer({
  consultationId,
  allocated,
  used,
  approved,
}: {
  consultationId: string;
  allocated: number;
  used: number;
  approved: number;
}) {
  const totalAllocated = (allocated || 0) + (approved || 0);
  const totalUsed = used || 0;
  const remaining = Math.max(0, totalAllocated - totalUsed);
  const percentage =
    totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

  let colorClass = "text-slate-500";
  if (percentage > 90) colorClass = "text-red-500";
  else if (percentage > 75) colorClass = "text-gray-500";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${percentage > 90 ? "bg-red-500" : percentage > 75 ? "bg-gray-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className={`text-xs ${colorClass}`}>{remaining}m remaining</span>
    </div>
  );
}
