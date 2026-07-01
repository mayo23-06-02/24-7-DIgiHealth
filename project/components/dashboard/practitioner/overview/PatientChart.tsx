
"use client";
import React from 'react';
import Card from '@/components/ui/Card';
import { BiChevronDown } from 'react-icons/bi';
import { ChartDataPoint } from './types';

interface PatientChartProps {
  data: ChartDataPoint[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export default function PatientChart({ data, selectedPeriod = 'current', onPeriodChange }: PatientChartProps) {
  
  const maxVal = Math.max(...data.map(d => d.value), 1);
  
  // Generate dynamic Y-axis labels based on max value
  const yAxisLabels = React.useMemo(() => {
    if (maxVal <= 5) return [5, 4, 3, 2, 1, 0];
    if (maxVal <= 10) return [10, 8, 6, 4, 2, 0];
    if (maxVal <= 20) return [20, 16, 12, 8, 4, 0];
    if (maxVal <= 50) return [50, 40, 30, 20, 10, 0];
    const step = Math.ceil(maxVal / 5);
    return Array.from({ length: 6 }, (_, i) => (maxVal - (i * step)));
  }, [maxVal]);

  const monthOptions = [
    { value: 'current', label: 'This Month' },
    { value: 'last', label: 'Last Month' },
    { value: '2months', label: 'Last 2 Months' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          Patient Growth
        </h3>
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange?.(e.target.value)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors appearance-none pr-8 cursor-pointer"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <BiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
        </div>
      </div>

      <div className="flex-1 flex w-full relative min-h-[200px] pb-8">
        {/* Y Axis */}
        <div className="flex flex-col justify-between items-end pr-4 text-xs h-full pb-8">
          {yAxisLabels.map((label, i) => (
            <span key={i} className="text-xs text-slate-500">{label}</span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 flex justify-between items-end h-full relative border-b border-slate-100 pb-8">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-t border-slate-50 border-dashed" />
            ))}
          </div>

          {data.map((item, i) => {
            const isActive = item.value === maxVal && item.value > 0;
            const barHeight = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
            
            return (
              <div key={i} className="flex flex-col items-center justify-end gap-2 group w-full h-full relative z-10 px-1 xl:px-2 pb-8">
                <span className="text-xs font-bold text-slate-500 border border-slate-200 bg-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 shadow-sm whitespace-nowrap z-20">
                  {item.value} new patients
                </span>
                <div className="w-full h-full max-w-[40px] bg-slate-100 rounded-t flex flex-col justify-end group-hover:bg-slate-200 transition-colors">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      isActive
                        ? 'bg-primary shadow-[0_4px_15px_rgba(46,49,146,0.4)]'
                        : 'bg-primary/20'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 text-center mt-2 truncate w-full">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}