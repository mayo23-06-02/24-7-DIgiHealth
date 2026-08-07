"use client";

import React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

interface UserProfileProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

export default function UserProfile({ isCollapsed, onClose }: UserProfileProps) {
  const { user, logout } = useAuthContext();
  if (!user) return null;

  return (
    <div className="p-3 border-t border-border mt-auto space-y-3">
      {!isCollapsed && (
        <Link
          href={`/${user.role}/profile`}
          className="flex items-center gap-3 p-2.5 rounded-md bg-surface-soft border border-border hover:border-primary hover:bg-primary/5 transition-all group"
          onClick={() => {
            if (window.innerWidth < 1024 && onClose) onClose();
          }}
        >
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="sm"
            className="group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-ink-900 truncate group-hover:text-primary transition-colors">
              {user.name}
            </span>
          </div>
        </Link>
      )}

      {isCollapsed && (
        <Link
          href={`/${user.role}/profile`}
          className="flex justify-center p-2 rounded-md hover:bg-surface-soft transition-all group"
          title="View Profile"
          onClick={() => {
            if (window.innerWidth < 1024 && onClose) onClose();
          }}
        >
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="sm"
            className="group-hover:scale-110 transition-transform"
          />
        </Link>
      )}

      <Button
        onClick={logout}
        variant="white"
        icon={<LogOut size={16} />}
        iconPosition="left"
        className={`
          w-full flex items-center transition-all bg-surface border border-border text-ink-600 hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200 rounded-md py-2 text-sm
          ${isCollapsed ? "justify-center" : "px-3 gap-2"}
        `}
      >
        {!isCollapsed && <span className="font-medium">Sign Out</span>}
      </Button>
    </div>
  );
}