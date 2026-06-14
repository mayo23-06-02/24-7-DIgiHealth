"use client";

import React from "react";
import { IconType } from "react-icons";

interface TabItem {
  id: string;
  label: string;
  icon: IconType;
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
  return (
    <section className="flex flex-wrap items-center gap-2 px-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-primary text-white border-primary"
                : "text-slate-600 bg-slate-200 border-slate-100 hover:border-primary/40 hover:text-primary"
            }`}
          >
            <Icon size={18} />
            <h4>{tab.label}</h4>
          </button>
        );
      })}
    </section>
  );
}
