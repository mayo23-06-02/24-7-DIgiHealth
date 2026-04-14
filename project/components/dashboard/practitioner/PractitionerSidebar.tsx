'use client';

import React, { useState } from 'react';
import {
  BiHomeAlt,
  BiCalendar,
  BiGroup,
  BiPulse,
  BiNote,
  BiCog,
  BiLogOut,
  BiChevronLeft,
  BiChevronRight,
  BiMenuAltLeft,
  BiShieldPlus,
} from 'react-icons/bi';

interface PractitionerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  practitionerName?: string;
  specialisation?: string;
}

const mainNav = [
  { name: 'Dashboard', icon: <BiHomeAlt size={20} /> },
  { name: 'Queue', icon: <BiGroup size={20} /> },
  { name: 'Calendar', icon: <BiCalendar size={20} /> },
  { name: 'Patients', icon: <BiPulse size={20} /> },
  { name: 'Notes', icon: <BiNote size={20} /> },
];

const secondaryNav = [
  { name: 'Settings', icon: <BiCog size={20} /> },
];

export default function PractitionerSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  practitionerName = 'Dr. Sipho Nkosi',
  specialisation = 'General Practitioner',
}: PractitionerSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const initials = practitionerName
    .split(' ')
    .filter((w) => w.startsWith('Dr.') === false)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-4 left-4 lg:sticky lg:top-0 lg:left-0 lg:h-screen
          bg-[#020c20] shadow-2xl border-r border-white/5
          transition-all duration-500 ease-out flex flex-col z-[100]
          rounded-[28px] lg:rounded-none
          ${isCollapsed ? 'w-[72px]' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
        `}
      >
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="absolute -right-12 top-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 shadow-xl lg:hidden"
        >
          ×
        </button>

        {/* Brand */}
        <div className={`flex items-center gap-3 p-5 border-b border-white/5 shrink-0 ${isCollapsed ? 'justify-center px-3' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-supportive-teal flex items-center justify-center shadow-lg shrink-0">
            <BiShieldPlus className="text-white text-lg" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="font-black text-white text-sm tracking-tight leading-tight">24/7 TeleHealth</p>
              <p className="text-[10px] text-blue-400 font-medium">Practitioner Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {mainNav.map((item) => {
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { onTabChange(item.name); onClose?.(); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm
                  transition-all duration-200 group
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }
                `}
                title={isCollapsed ? item.name : ''}
              >
                <span className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="animate-in fade-in duration-200 text-xs font-bold">{item.name}</span>
                )}
                {!isCollapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </button>
            );
          })}

          <div className="h-px bg-white/5 my-2" />

          {secondaryNav.map((item) => {
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { onTabChange(item.name); onClose?.(); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm
                  transition-all duration-200 group
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                  }
                `}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="text-xs font-bold">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Profile + Collapse */}
        <div className="p-3 border-t border-white/5 space-y-2 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-supportive-teal flex items-center justify-center text-white text-xs font-black shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 animate-in fade-in duration-200">
                <p className="text-xs font-bold text-white truncate">{practitionerName}</p>
                <p className="text-[10px] text-blue-400 truncate">{specialisation || 'General Practitioner'}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold hidden lg:flex"
            >
              {isCollapsed ? <BiChevronRight size={16} /> : <><BiChevronLeft size={16} /><span>Collapse</span></>}
            </button>
            <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-red-900/30 hover:text-red-400 text-slate-400 transition-all">
              <BiLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
