import { Inbox } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Show a pending spinner on the action button (e.g. it navigates) */
  actionLoading?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = "",
  actionLoading = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
        {icon || <Inbox size={28} />}
      </div>
      <h4 className="text-lg font-semibold text-ink-900 mb-2 tracking-tight font-grotesk">
        {title}
      </h4>
      <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="white"
          size="sm"
          loading={actionLoading}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
