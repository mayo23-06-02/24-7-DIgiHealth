"use client";

import React, { useRef, useEffect } from "react";
import { LucideIcon } from "lucide-react";
import Tabs from "@/components/ui/Tabs";

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
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

  useEffect(() => {
    scrollerRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <section className=" px-1">
      <div
        ref={scrollerRef}
        className=""
      >
        <Tabs
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: <tab.icon size={16} />,
          }))}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>
    </section>
  );
}
