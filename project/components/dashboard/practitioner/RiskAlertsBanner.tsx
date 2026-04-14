'use client';

import React from 'react';
import { BiError, BiChevronRight } from 'react-icons/bi';
import RiskScoreCard from './RiskScoreCard';

interface RiskAlert {
  consultationId: string;
  patientName: string;
  score: number;
  color: 'green' | 'amber' | 'red';
  condition: string;
  factors: string[];
}

interface RiskAlertsBannerProps {
  alerts: RiskAlert[];
  onViewQueue?: () => void;
}

export default function RiskAlertsBanner({ alerts, onViewQueue }: RiskAlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border border-red-200 rounded-2xl p-4 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center">
            <BiError className="text-red-600" size={15} />
          </div>
          <div>
            <p className="text-sm font-black text-red-700">
              {alerts.length} High-Risk {alerts.length === 1 ? 'Patient' : 'Patients'} in Queue
            </p>
            <p className="text-[10px] text-red-500 font-medium">Immediate clinical attention may be required</p>
          </div>
        </div>
        {onViewQueue && (
          <button
            onClick={onViewQueue}
            className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline shrink-0"
          >
            View All <BiChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {alerts.map((alert) => (
          <div
            key={alert.consultationId}
            className="bg-white rounded-xl border border-red-100 p-3 shrink-0 min-w-[180px] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{alert.patientName}</p>
              <RiskScoreCard score={alert.score} color={alert.color} size="sm" showRing={false} />
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{alert.condition}</p>
            {alert.factors.length > 0 && (
              <p className="text-[9px] text-red-500 mt-1.5 font-semibold truncate">
                ⚑ {alert.factors[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
