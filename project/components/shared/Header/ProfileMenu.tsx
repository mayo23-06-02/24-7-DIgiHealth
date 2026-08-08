"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, User, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface User {
  name?: string;
  avatarUrl?: string;
  role?: string;
}

export default function ProfileMenu({ user }: { user: User | null }) {
  const { logout } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 cursor-pointer transition-all rounded-md p-1 ${
          isOpen ? "bg-surface-soft" : "hover:bg-surface-soft"
        }`}
        aria-label="Profile menu"
      >
        <Avatar
          name={user?.name || "User"}
          src={user?.avatarUrl}
          size="xs"
          className="group-hover:scale-105"
        />
        <div className="hidden lg:flex flex-col items-start">
          <span className="font-semibold text-xs text-ink-900 truncate leading-tight">
            {user?.name || "User"}
          </span>
          <span className="text-[10px] tracking-wider text-ink-400 leading-tight uppercase font-medium">
            {user?.role?.replace("_", " ") || "Member"}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-ink-400 transition-transform duration-200 hidden sm:block group-hover:text-ink-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-lg border border-border  py-2 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar
                name={user?.name || "User"}
                src={user?.avatarUrl}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-ink-400 truncate">
                  {user?.role?.replace("_", " ") || "Member"}
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/${user?.role}/profile`}
            className="flex items-center gap-3 px-4 py-2.5 text-ink-700 hover:bg-surface-soft transition-colors group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
              <User size={16} />
            </div>
            <span className="text-sm font-medium">My Profile</span>
          </Link>

          <div className="h-px bg-border my-1" />

          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-700 hover:bg-surface-soft transition-colors group"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center group-hover:bg-danger-50 group-hover:text-danger-600 transition-all">
              <LogOut size={16} />
            </div>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}