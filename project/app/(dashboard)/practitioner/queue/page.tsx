'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PractitionerSidebar from '@/components/dashboard/practitioner/PractitionerSidebar';
import PractitionerHeader from '@/components/dashboard/practitioner/PractitionerHeader';
import RiskScoreCard from '@/components/dashboard/practitioner/RiskScoreCard';
import SoapNoteModal from '@/components/dashboard/practitioner/SoapNoteModal';
import {
  BiVideo,
  BiChat,
  BiClinic,
  BiNote,
  BiUser,
  BiSearch,
  BiFilter,
  BiRefresh,
  BiLoader,
  BiChevronLeft,
  BiChevronRight,
  BiCheckCircle,
  BiError,
  BiTime,
} from 'react-icons/bi';

interface QueueItem {
  consultationId: string;
  patientId: string;
  patientName: string;
  initials: string;
  avatarUrl?: string;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string;
  riskScore: number;
  riskColor: 'green' | 'amber' | 'red';
  riskFactors: string[];
  aiRecommendations: string[];
  status: string;
  type: string;
  medicalHistory?: string[];
  allergies?: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeIcon = (type: string) => {
  if (type === 'video') return <BiVideo className="text-[#0052CC]" size={14} />;
  if (type === 'chat') return <BiChat className="text-[#00A3BF]" size={14} />;
  return <BiClinic className="text-slate-400" size={14} />;
};

function formatDatetime(dt: string) {
  return new Date(dt).toLocaleString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function minutesUntil(dt: string) {
  return Math.round((new Date(dt).getTime() - Date.now()) / 60000);
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  ongoing: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function FullQueuePage() {
  const [activeTab, setActiveTab] = useState('Queue');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('scheduled,ongoing');
  const [soapModal, setSoapModal] = useState({ isOpen: false, consultationId: '', patientName: '' });

  const fetchQueue = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/practitioner/queue?status=${statusFilter}&page=${page}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setQueue(data.data.queue);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Queue fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchQueue(1); }, [fetchQueue]);

  const filtered = queue.filter((q) =>
    search === '' ||
    q.patientName.toLowerCase().includes(search.toLowerCase()) ||
    q.reason.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      <PractitionerSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <PractitionerHeader
          name="Dr. Sipho Nkosi"
          specialisation="General Practitioner"
          upcomingCount={pagination.total}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-black text-slate-800">Patient Queue</h1>
              <p className="text-sm text-slate-400 mt-0.5">{pagination.total} consultations · Page {pagination.page} of {pagination.totalPages}</p>
            </div>
            <button
              onClick={() => fetchQueue(pagination.page)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <BiRefresh size={16} /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-2.5 focus-within:bg-white focus-within:border focus-within:border-[#0052CC]/30 border border-transparent transition-all">
              <BiSearch className="text-slate-400 shrink-0" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients or reasons…"
                className="bg-transparent outline-none border-none w-full text-sm text-slate-700 placeholder:text-slate-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <BiFilter className="text-slate-400 shrink-0" size={16} />
              {['scheduled,ongoing', 'completed', 'cancelled'].map((f) => {
                const labels: Record<string, string> = { 'scheduled,ongoing': 'Active', completed: 'Completed', cancelled: 'Cancelled' };
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === f ? 'bg-[#0052CC] text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="col-span-3">Patient</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-3">Reason</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Risk</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <BiLoader className="animate-spin text-[#0052CC]" size={24} />
                <span className="text-sm font-medium">Loading queue…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                <BiCheckCircle size={36} className="text-emerald-300" />
                <p className="text-sm font-semibold">No consultations found</p>
                <p className="text-xs">Try changing filters or refreshing.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((item) => {
                  const mins = minutesUntil(item.scheduledStart);
                  const isUrgent = item.riskScore > 70;
                  const isOngoing = item.status === 'ongoing';

                  return (
                    <div
                      key={item.consultationId}
                      className={`grid grid-cols-12 gap-2 items-center px-5 py-3.5 transition-all hover:bg-slate-50 group
                        ${isOngoing ? 'border-l-2 border-emerald-400' : isUrgent ? 'border-l-2 border-red-400' : 'border-l-2 border-transparent'}
                      `}
                    >
                      {/* Patient */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0052CC] to-[#00A3BF] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                          {item.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.patientName}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[item.status] || 'bg-slate-100 text-slate-600'}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-slate-700">{new Date(item.scheduledStart).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-slate-400">{new Date(item.scheduledStart).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                        {mins > 0 && mins < 60 && (
                          <p className={`text-[10px] font-bold flex items-center gap-0.5 ${mins <= 10 ? 'text-red-500' : 'text-amber-500'}`}>
                            <BiTime size={10} />in {mins}m
                          </p>
                        )}
                      </div>

                      {/* Reason */}
                      <div className="col-span-3">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.reason}</p>
                        {isUrgent && item.aiRecommendations[0] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                            <BiError size={10} />{item.aiRecommendations[0]}
                          </p>
                        )}
                      </div>

                      {/* Type */}
                      <div className="col-span-1 flex items-center gap-1">
                        {typeIcon(item.type)}
                        <span className="text-[10px] text-slate-500 capitalize hidden xl:block">{item.type}</span>
                      </div>

                      {/* Risk */}
                      <div className="col-span-1">
                        <RiskScoreCard score={item.riskScore} color={item.riskColor} factors={item.riskFactors} size="sm" showRing={false} />
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          className={`p-2 rounded-xl text-white text-xs transition-all active:scale-95 shadow-sm
                            ${item.type === 'chat' ? 'bg-[#00A3BF] hover:bg-[#008FA8]' : 'bg-[#0052CC] hover:bg-[#0047B3]'}
                          `}
                          title={item.type === 'chat' ? 'Join Chat' : 'Join Video'}
                        >
                          {item.type === 'chat' ? <BiChat size={14} /> : <BiVideo size={14} />}
                        </button>
                        <button
                          onClick={() => setSoapModal({ isOpen: true, consultationId: item.consultationId, patientName: item.patientName })}
                          className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs transition-all active:scale-95 border border-purple-100"
                          title="SOAP Note"
                        >
                          <BiNote size={14} />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs transition-all active:scale-95"
                          title="Patient Profile">
                          <BiUser size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={pagination.page === 1}
                onClick={() => fetchQueue(pagination.page - 1)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0052CC] hover:border-[#0052CC]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <BiChevronLeft size={18} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => fetchQueue(pg)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all
                    ${pg === pagination.page ? 'bg-[#0052CC] text-white shadow-md shadow-blue-300' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#0052CC]/30 hover:text-[#0052CC]'}
                  `}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchQueue(pagination.page + 1)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0052CC] hover:border-[#0052CC]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <BiChevronRight size={18} />
              </button>
            </div>
          )}

          <div className="h-10" />
        </main>
      </div>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() => setSoapModal({ isOpen: false, consultationId: '', patientName: '' })}
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </div>
  );
}
