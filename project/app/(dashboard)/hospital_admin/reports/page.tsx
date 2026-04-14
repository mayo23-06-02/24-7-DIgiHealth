'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BiDownload, BiPrinter, BiLoaderAlt, BiCalendar } from 'react-icons/bi';

const REPORT_TYPES = [
  { id: 'occupancy', label: 'Bed Occupancy', description: 'Daily/weekly bed usage report', icon: '🛏️' },
  { id: 'financial', label: 'Financial Report', description: 'Revenue, payments, and billing', icon: '💳' },
  { id: 'staff', label: 'Staff Attendance', description: 'Staff duty records and hours', icon: '👥' }
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('occupancy');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const downloadCSV = async () => {
    setLoading(true);
    try {
      let url = `/api/hospital/reports/${selectedType}?format=csv`;
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo) url += `&to=${dateTo}`;

      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}_report.csv`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const emailReport = () => {
    alert(`Report "${selectedType}" would be emailed to the hospital admin. (Mock action)`);
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500">Generate and export operational reports</p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.id}
            onClick={() => setSelectedType(rt.id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              selectedType === rt.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-3xl block mb-2">{rt.icon}</span>
            <p className={`text-sm font-bold ${selectedType === rt.id ? 'text-primary' : 'text-slate-800'}`}>{rt.label}</p>
            <p className="text-xs text-slate-500 mt-1">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* date Range & Actions */}
      <Card className="flex flex-col gap-6">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Report Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">From Date</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <BiCalendar className="text-slate-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm outline-none flex-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">To Date</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <BiCalendar className="text-slate-400" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm outline-none flex-1" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-sm font-bold text-slate-700 mb-1">
            {REPORT_TYPES.find(r => r.id === selectedType)?.icon}{' '}
            {REPORT_TYPES.find(r => r.id === selectedType)?.label}
          </p>
          <p className="text-xs text-slate-500">{REPORT_TYPES.find(r => r.id === selectedType)?.description}</p>
          {dateFrom && dateTo && (
            <p className="text-xs text-primary font-bold mt-2">Period: {dateFrom} → {dateTo}</p>
          )}
          {(!dateFrom || !dateTo) && (
            <p className="text-xs text-amber-600 mt-2">ℹ️ No date range set — full dataset will be exported.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={downloadCSV}
            disabled={loading}
            icon={loading ? <BiLoaderAlt className="animate-spin" /> : <BiDownload size={18} />}
            className="flex-1 min-w-[140px] justify-center"
          >
            Download CSV
          </Button>
          <button
            onClick={printReport}
            className="flex-1 min-w-[140px] justify-center flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BiPrinter size={18} /> Print Report
          </button>
          <button
            onClick={emailReport}
            className="flex-1 min-w-[140px] justify-center flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            📧 Email Admin
          </button>
        </div>
      </Card>

      {/* Recent Actions Log (Mock) */}
      <Card className="flex flex-col gap-4">
        <h3 className="font-bold text-slate-800">Recent Report Exports</h3>
        <div className="space-y-3">
          {[
            { type: 'Financial Report', date: '2026-04-10', by: 'system.admin@digihealth.co.za' },
            { type: 'Bed Occupancy', date: '2026-04-08', by: 'system.admin@digihealth.co.za' },
            { type: 'Staff Attendance', date: '2026-04-05', by: 'system.admin@digihealth.co.za' }
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-700">{log.type}</p>
                <p className="text-xs text-slate-400">{log.by} · {log.date}</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-lg border border-emerald-200">CSV</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
