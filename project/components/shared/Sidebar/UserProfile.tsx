"use client";

import React from "react";
import Link from "next/link";
import { BiLogOut } from "react-icons/bi";
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
    <div className="p-4 border-t border-slate-100 mt-auto">
      {!isCollapsed && (
        <Link
          href={`/${user.role}/profile`}
          className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-primary/20 transition-all group"
          onClick={() => {
            if (window.innerWidth < 1024 && onClose) onClose();
          }}
        >
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="sm"
            className="group-hover:scale-105"
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-primary transition-colors">
              {user.name}
            </span>
          </div>
        </Link>
      )}

      {isCollapsed && (
        <Link
          href={`/${user.role}/profile`}
          className="flex justify-center mb-4 p-2 rounded-lg hover:bg-slate-50 transition-all group"
          title="View Profile"
          onClick={() => {
            if (window.innerWidth < 1024 && onClose) onClose();
          }}
        >
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="sm"
            className="group-hover:scale-110"
          />
        </Link>
      )}

      <Button
        onClick={logout}
        variant="white"
        icon={<BiLogOut size={20} />}
        iconPosition="left"
        className={`
          w-full flex items-center transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-500 rounded-lg py-3
          ${isCollapsed ? "justify-center" : "px-4 gap-3"}
        `}
      >
        {!isCollapsed && <span className="text-sm font-bold tracking-normal">Sign Out</span>}
      </Button>
    </div>
  );
}