"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { BiFilter, BiVideo, BiPhone, BiDotsVerticalRounded } from 'react-icons/bi';
import { ScheduleItem } from './types';

interface ScheduleListProps {
  items: ScheduleItem[];
  selectedDate: Date;
}

export default function ScheduleList({ items, selectedDate }: ScheduleListProps) {
  const [menuOpenRow, setMenuOpenRow] = useState<string | null>(null);

  const dateStr = selectedDate.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          Schedule List ({dateStr})
        </h3>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2 text-xs">
            <BiFilter size={16} /> Filter
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 tracking-normal first:rounded-tl-lg">
                Appoint for
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 tracking-normal">
                Name
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 tracking-normal">
                Time
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 tracking-normal text-center">
                Method
              </th>
              <th className="py-4 px-6 last:rounded-tr-lg" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 text-sm font-medium bg-slate-50/30 rounded-lg">
                  No appointments scheduled for this day
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.consultationId} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6 border-b border-transparent">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.type === 'video' ? 'bg-indigo-500' : 'bg-rose-400'}`} />
                      <span className="text-xs font-bold text-slate-700 capitalize">{item.type} Consultation</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 border-b border-transparent">
                    <div className="flex items-center gap-3">
                      <Avatar name={item.patientName} size="sm" />
                      <span className="text-xs font-bold text-slate-800">{item.patientName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 border-b border-transparent">
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(item.scheduledStart).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(item.scheduledEnd).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="py-4 px-6 border-b border-transparent">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 shadow-none border border-slate-100 flex items-center justify-center">
                        {item.type === 'video' ? (
                          <BiVideo className="text-emerald-500" size={16} />
                        ) : (
                          <BiPhone className="text-gray-500" size={16} />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 border-b border-transparent text-right relative">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setMenuOpenRow(menuOpenRow === item.consultationId ? null : item.consultationId)
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors ml-auto p-0"
                    >
                      <BiDotsVerticalRounded size={20} />
                    </Button>
                    {menuOpenRow === item.consultationId && (
                      <div className="absolute right-12 top-10 bg-white border border-slate-200 rounded-lg  flex flex-col py-2 w-40 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <Link
                          href={`/practitioner/messages?patient=${item.patientId}`}
                          className="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                        >
                          Message Patient
                        </Link>
                        <Link
                          href={`/practitioner/patients/${item.patientId}`}
                          className="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                        >
                          View Profile
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}