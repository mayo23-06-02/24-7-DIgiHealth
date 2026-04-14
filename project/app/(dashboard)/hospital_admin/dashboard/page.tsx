'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import KPICard from '@/components/ui/KPICard';
import { BiBed, BiTime, BiDollarCircle, BiUserCheck, BiLoaderAlt } from 'react-icons/bi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function HospitalDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/hospital/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load dashboard data.</div>;

  const { kpi, bedOccupancyStats, recentEmergencies, upcomingAppointments } = data;

  const chartData = [
    { name: 'General', Occupied: bedOccupancyStats.occupiedBeds - bedOccupancyStats.icuOccupied - bedOccupancyStats.emergencyOccupied, Total: bedOccupancyStats.totalBeds - bedOccupancyStats.icuTotal - bedOccupancyStats.emergencyTotal },
    { name: 'ICU', Occupied: bedOccupancyStats.icuOccupied, Total: bedOccupancyStats.icuTotal },
    { name: 'Emergency', Occupied: bedOccupancyStats.emergencyOccupied, Total: bedOccupancyStats.emergencyTotal },
  ];

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Bed Occupancy"
          value={`${kpi.bedOccupancyPercent}%`}
          icon={<BiBed size={24} />}
          color="primary"
          trend={2.5}
          description="vs last week"
        />
        <KPICard
          label="Current Wait Time"
          value={`${kpi.currentWaitTime} min`}
          icon={<BiTime size={24} />}
          color="emerald"
          trend={-2}
          description="vs average"
        />
        <KPICard
          label="Today's Revenue"
          value={`R ${kpi.revenueToday.toLocaleString()}`}
          icon={<BiDollarCircle size={24} />}
          color="slate"
        />
        <KPICard
          label="Staff on Duty"
          value={kpi.staffOnDuty.toString()}
          icon={<BiUserCheck size={24} />}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-start">
        {/* Bed Occupancy Chart */}
        <Card className="lg:col-span-4 min-h-[350px] flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800">Bed Occupancy by Type</h3>
            <p className="text-xs text-slate-500">Real-time facility capacity</p>
          </div>
          <div className="flex-1 w-full relative min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Occupied" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right Column: Emergencies & Appointments */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Recent Emergencies</h3>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg uppercase tracking-wider">Live</span>
            </div>
            {recentEmergencies.length > 0 ? (
              <div className="space-y-3">
                {recentEmergencies.map((em: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{em.ambulanceId}</p>
                      <p className="text-[10px] text-slate-500">ETA: {em.etaMinutes} mins</p>
                    </div>
                    <span className={`w-3 h-3 rounded-full ${em.triageLevel === 'red' ? 'bg-rose-500' : em.triageLevel === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No active incoming emergencies.</p>
            )}
          </Card>

          <Card className="flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                 {upcomingAppointments.map((app: any, i: number) => (
                   <div key={i} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-white shadow-sm gap-1">
                     <p className="text-xs font-bold text-slate-700">Client: {(app.patientId as any)?.firstName} {(app.patientId as any)?.lastName}</p>
                     <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                       <span>{new Date(app.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <span className="capitalize">{app.type}</span>
                     </div>
                   </div>
                 ))}
              </div>
            ) : (
               <p className="text-xs text-slate-500">No upcoming appointments.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
