'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { BiLoaderAlt, BiDownload, BiCalendar } from 'react-icons/bi';

const COLORS = ['#0052CC', '#00A3BF', '#36B37E', '#FF5630', '#6554C0'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = '/api/hospital/analytics';
      if (dateFrom || dateTo) url += `?from=${dateFrom}&to=${dateTo}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const exportCSV = async (type: string) => {
    const url = `/api/hospital/reports/${type}?format=csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_report.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">Operational Analytics</h1>
          <p className="text-sm text-slate-500">Charts update based on selected date range</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm outline-none" />
          </div>
          <span className="text-slate-400 text-sm">to</span>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <BiCalendar className="text-slate-400" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm outline-none" />
          </div>
          <Button onClick={fetchAnalytics} variant="outline">Apply</Button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bed Occupancy Trend */}
          <Card className="flex flex-col min-h-[300px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-800 font-grotesk">Bed Occupancy Trend</h3>
                <p className="text-xs text-slate-500">Last 30 days (%)</p>
              </div>
              <button onClick={() => exportCSV('occupancy')} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                <BiDownload size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.occupancyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="percent" stroke="#0052CC" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue by Day */}
          <Card className="flex flex-col min-h-[300px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-800 font-grotesk">Revenue by Day</h3>
                <p className="text-xs text-slate-500">Paid transactions (ZAR)</p>
              </div>
              <button onClick={() => exportCSV('financial')} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                <BiDownload size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(v: any) => [`R ${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#0052CC" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Wait Time by Hour */}
          <Card className="flex flex-col min-h-[300px]">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 font-grotesk">Average Wait Time by Hour</h3>
              <p className="text-xs text-slate-500">Minutes per time slot</p>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.waitTimeByHour}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" min" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="avgWait" stroke="#36B37E" strokeWidth={3} dot={{ r: 4, fill: '#36B37E' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Appointment Types Pie */}
          <Card className="flex flex-col min-h-[300px]">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 font-grotesk">Appointment Types</h3>
              <p className="text-xs text-slate-500">Breakdown by category</p>
            </div>
            <div className="flex-1 min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.appointmentTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.appointmentTypes.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
