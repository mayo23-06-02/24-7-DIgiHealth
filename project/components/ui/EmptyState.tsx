import React from "react";
import { BiArchive } from "react-icons/bi";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
        {icon || <BiArchive size={32} />}
      </div>
      <h4 className="text-lg font-semibold text-slate-700 mb-2 tracking-tight">
        {title}
      </h4>
      <p className="text-sm text-slate-400  max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="white"
          size="sm"
          className="px-8 py-3"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
