import React from 'react';
import Card from '@/components/ui/Card';
import { BiChevronDown } from 'react-icons/bi';
import { ChartDataPoint } from './types';

interface PatientChartProps {
  data: ChartDataPoint[];
}

export default function PatientChart({ data }: PatientChartProps) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          Patients Overview
        </h3>
        <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          This Month <BiChevronDown />
        </button>
      </div>

      <div className="flex-1 flex w-full relative min-h-[180px]">
        {/* Y Axis */}
        <div className="flex flex-col justify-between items-end pr-4 text-xs h-full">
          {[10, 8, 6, 4, 2, 0].map((l, i) => (
            <span key={i} className="text-xs text-slate-500">{l}</span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 flex justify-between items-end h-full relative border-b border-slate-100">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-t border-slate-50 border-dashed" />
            ))}
          </div>

          {data.map((item, i) => {
            const isActive = item.value === maxVal && item.value > 0;
            return (
              <div key={i} className="flex flex-col items-center justify-end gap-2 group w-full h-full relative z-10 px-1 xl:px-2">
                <span className="text-xs font-bold text-slate-500 border border-slate-200 bg-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 shadow-none">
                  {item.value} patients
                </span>
                <div className="w-full h-full max-w-[40px] bg-slate-100 rounded-t flex flex-col justify-end group-hover:bg-slate-200 transition-colors">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      isActive
                        ? 'bg-primary shadow-[0_4px_15px_rgba(46,49,146,0.4)]'
                        : 'bg-primary/20'
                    }`}
                    style={{ height: `${(item.value / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X Labels */}
        <div className="absolute bottom-8 right-0 left-[35px] flex justify-between transform translate-y-full pt-3">
          {data.map((item, i) => (
            <div key={i} className="w-full text-center text-xs text-slate-500">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}