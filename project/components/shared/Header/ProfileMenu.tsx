"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BiChevronDown, BiUser, BiCog, BiLogOut } from "react-icons/bi";
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
        className={`group flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-full transition-all ml-2 ${
          isOpen ? "bg-slate-50 ring-primary/10" : ""
        }`}
      >
        <Avatar
          name={user?.name || "User"}
          src={user?.avatarUrl}
          size="xs"
          className="group-hover:scale-105"
        />
        <div className="hidden lg:flex flex-col items-start mr-2">
          <span className="font-bold text-sm text-slate-800 truncate leading-none mb-1">
            {user?.name || "User"}
          </span>
          <span className="text-[9px] tracking-wider text-primary leading-none uppercase">
            {user?.role?.replace("_", " ") || "Member"}
          </span>
        </div>
        <BiChevronDown
          size={18}
          className={`text-slate-500 transition-transform duration-300 hidden sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-lg border border-slate-200 shadow-xl shadow-slate-200/60 py-3 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="px-5 py-3 border-b border-slate-100 mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Actions
            </p>
          </div>

          <Link
            href={`/${user?.role}/profile`}
            className="flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-primary/5 hover:text-primary transition-all group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10">
              <BiUser size={18} />
            </div>
            <span className="text-sm font-bold">My Profile</span>
          </Link>

        

          <div className="h-px bg-slate-100 my-2" />

          <button
            className="w-full flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-slate-50 transition-all group"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200">
              <BiLogOut size={18} />
            </div>
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}