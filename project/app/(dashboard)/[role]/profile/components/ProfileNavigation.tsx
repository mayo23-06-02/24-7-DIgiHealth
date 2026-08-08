"use client";

import React, { useRef, useEffect } from "react";
import { IconType } from "react-icons";

interface TabItem {
  id: string;
  label: string;
  icon: IconType;
  description?: string;
}

interface ProfileNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function ProfileNavigation({
  tabs,
  activeTab,
  setActiveTab,
}: ProfileNavigationProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  return (
    <section className="sticky top-0 z-20 -mx-1 px-1">
      <div className="rounded-lg border border-slate-200/80 bg-white/90 backdrop-blur-xl  shadow-slate-200/40 p-1.5">
        <div
          ref={scrollerRef}
          className="flex gap-1 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={active ? activeRef : undefined}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative flex items-center gap-2.5 px-4 py-3 rounded-lg
                  text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0
                  ${
                    active
                      ? "bg-primary text-white  shadow-primary/25"
                      : "text-slate-500 hover:text-primary hover:bg-slate-50"
                  }
                `}
              >
                <Icon
                  size={18}
                  className={active ? "text-white" : "text-slate-400 group-hover:text-primary"}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
