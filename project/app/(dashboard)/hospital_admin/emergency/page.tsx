'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { BiLoaderAlt, BiRefresh, BiBell, BiCheck } from 'react-icons/bi';

const triageColors: Record<string, { bg: string; dot: string; label: string }> = {
  red: { bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500', label: 'Critical' },
  yellow: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400', label: 'Moderate' },
  green: { bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Minor' }
};

export default function EmergencyDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState<string[]>([]);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hospital/emergency');
      const json = await res.json();
      if (json.success) setIncidents(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    // Live polling every 30 seconds
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/hospital/emergency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const json = await res.json();
      if (json.success) {
        setIncidents(prev => prev.map(i => i._id === id ? json.data : i));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const enRoute = incidents.filter(i => i.status === 'en_route');
  const arrived = incidents.filter(i => i.status === 'arrived');
  const inTreatment = incidents.filter(i => i.status === 'in_treatment');

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            Emergency Dashboard
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg animate-pulse">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Live
            </span>
          </h1>
          <p className="text-sm text-slate-500">Ambulance tracking · Auto-refreshes every 30 seconds</p>
        </div>
        <button onClick={fetchIncidents} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          <BiRefresh size={18} /> Refresh
        </button>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En Route', count: enRoute.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Arrived', count: arrived.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'In Treatment', count: inTreatment.length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs font-bold text-slate-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ambulance List */}
      <Card className="flex flex-col min-h-[400px] p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Incoming Ambulances</h3>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <BiLoaderAlt className="animate-spin text-primary text-3xl" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incidents.length === 0 ? (
              <p className="py-10 text-center text-slate-400">No active incidents.</p>
            ) : (
              incidents.map(incident => {
                const triage = triageColors[incident.triageLevel] || triageColors.green;
                return (
                  <div key={incident._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${triage.bg}`}>
                        <span className={`w-3 h-3 rounded-full ${triage.dot}`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{incident.ambulanceId}</p>
                        <p className="text-xs text-slate-500">{incident.patientName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-600 capitalize">{incident.status.replace('_', ' ')}</p>
                        {incident.status === 'en_route' && (
                          <p className="text-xs text-amber-600 font-bold">ETA: {incident.etaMinutes} min</p>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${triage.bg} ${triage.dot.replace('bg-', 'text-')}`}>
                          {triage.label}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {incident.status === 'en_route' && (
                          <button
                            onClick={() => updateStatus(incident._id, 'arrived')}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Mark Arrived
                          </button>
                        )}
                        {incident.status === 'arrived' && (
                          <button
                            onClick={() => updateStatus(incident._id, 'in_treatment')}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                          >
                            <BiCheck size={14} /> In Treatment
                          </button>
                        )}
                        <button
                          onClick={() => setNotified(n => [...n, incident._id])}
                          disabled={notified.includes(incident._id)}
                          className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors flex items-center gap-1 ${notified.includes(incident._id) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <BiBell size={14} /> {notified.includes(incident._id) ? 'Notified' : 'Notify Staff'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {/* Mock Map */}
      <Card className="flex flex-col">
        <h3 className="font-bold text-slate-800 mb-3">Ambulance Proximity Map (Mock)</h3>
        <div className="w-full h-64 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%3E%3Cpath%20d=%22M0%2020h40M20%200v40%22%20stroke=%22%230052CC%22%20stroke-width=%220.5%22%20fill=%22none%22/%3E%3C/svg%3E')]"></div>
          <div className="relative z-10 flex flex-col items-center text-slate-400">
            <span className="text-5xl">🗺️</span>
            <p className="text-sm font-bold mt-2">Real-time GPS integration coming soon</p>
            <p className="text-xs mt-1">{enRoute.length} ambulances en route to this facility</p>
          </div>
          {enRoute.map((inc, i) => (
            <div
              key={inc._id}
              className="absolute w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white animate-bounce"
              style={{ left: `${20 + i * 15}%`, top: `${30 + (i % 3) * 15}%` }}
              title={`${inc.ambulanceId} - ETA ${inc.etaMinutes}min`}
            >
              🚑
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
