'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BiVideo,
  BiChat,
  BiLoader,
  BiRefresh,
  BiError,
  BiNote,
  BiUser,
  BiTime,
  BiCalendar,
  BiClinic,
  BiCheckCircle,
} from 'react-icons/bi';
import RiskScoreCard from './RiskScoreCard';
import SoapNoteModal from './SoapNoteModal';

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

interface VideoModalState {
  isOpen: boolean;
  consultation: QueueItem | null;
}

interface SoapModalState {
  isOpen: boolean;
  consultationId: string;
  patientName: string;
}

const typeIcon = (type: string) => {
  if (type === 'video') return <BiVideo className="text-[#0052CC]" size={14} />;
  if (type === 'chat') return <BiChat className="text-[#00A3BF]" size={14} />;
  return <BiClinic className="text-slate-400" size={14} />;
};

const typeLabel = (type: string) => {
  if (type === 'video') return 'Video';
  if (type === 'chat') return 'Chat';
  return 'In-Person';
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Scheduled' },
  ongoing: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '● Live' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelled' },
};

const MOCK_QUEUE: QueueItem[] = [
  { consultationId: '1', patientId: 'p1', patientName: 'Thandiwe Mokoena', scheduledStart: new Date(Date.now() + 18 * 60000).toISOString(), scheduledEnd: new Date(Date.now() + 48 * 60000).toISOString(), reason: 'Persistent headache and dizziness', riskScore: 82, riskColor: 'red', riskFactors: ['Hypertension', 'Diabetic'], aiRecommendations: ['Monitor BP daily', 'Review Metformin dosage'], status: 'scheduled', type: 'video', initials: 'TM' },
  { consultationId: '2', patientId: 'p2', patientName: 'John Dlamini', scheduledStart: new Date(Date.now() + 60 * 60000).toISOString(), scheduledEnd: new Date(Date.now() + 90 * 60000).toISOString(), reason: 'Chest pain with shortness of breath', riskScore: 92, riskColor: 'red', riskFactors: ['CAD', 'Age >60', 'Hypertension'], aiRecommendations: ['Urgent ECG', 'Troponin levels'], status: 'ongoing', type: 'video', initials: 'JD' },
  { consultationId: '3', patientId: 'p3', patientName: 'Amira Khan', scheduledStart: new Date(Date.now() + 105 * 60000).toISOString(), scheduledEnd: new Date(Date.now() + 135 * 60000).toISOString(), reason: 'Asthma follow-up', riskScore: 45, riskColor: 'amber', riskFactors: ['Chronic asthma', 'Allergen exposure'], aiRecommendations: ['Check peak flow rate'], status: 'scheduled', type: 'chat', initials: 'AK' },
  { consultationId: '4', patientId: 'p4', patientName: 'Grace Molefe', scheduledStart: new Date(Date.now() + 150 * 60000).toISOString(), scheduledEnd: new Date(Date.now() + 180 * 60000).toISOString(), reason: 'Kidney function monitoring', riskScore: 88, riskColor: 'red', riskFactors: ['CKD Stage 3', 'Age >70', 'Diabetic'], aiRecommendations: ['eGFR monitoring', 'Nephrology consult'], status: 'scheduled', type: 'video', initials: 'GM' },
];

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function minutesUntil(dt: string) {
  return Math.round((new Date(dt).getTime() - Date.now()) / 60000);
}

export default function PatientQueueTable() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<VideoModalState>({ isOpen: false, consultation: null });
  const [soapModal, setSoapModal] = useState<SoapModalState>({ isOpen: false, consultationId: '', patientName: '' });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/practitioner/queue?status=scheduled,ongoing&limit=10');
      const data = await res.json();
      if (data.success) {
        setQueue(data.data.queue);
        setError(null);
      } else {
        setQueue(MOCK_QUEUE);
        setError('Working offline (Mock Data)');
      }
    } catch {
      setQueue(MOCK_QUEUE);
      setError('Working offline (Mock Data)');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <BiLoader className="text-[#0052CC] text-3xl animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading patient queue…</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="font-black text-slate-800 text-sm leading-tight">Patient Queue</h3>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            Refreshed {lastRefresh.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchQueue(); }}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#0052CC]/10 text-slate-400 hover:text-[#0052CC] flex items-center justify-center transition-all active:scale-95"
          title="Refresh queue"
        >
          <BiRefresh size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-3 text-xs text-amber-700">
          <BiError size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
          <BiCheckCircle size={32} className="text-emerald-300" />
          <p className="text-sm font-semibold">Queue is clear</p>
          <p className="text-xs">No upcoming consultations in the next 24 hours.</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {queue.map((item, idx) => {
            const mins = minutesUntil(item.scheduledStart);
            const isUrgent = mins <= 5 && mins >= -30 && item.status === 'scheduled';
            const isOngoing = item.status === 'ongoing';
            const sc = statusConfig[item.status] || statusConfig.scheduled;

            return (
              <div
                key={item.consultationId}
                className={`
                  group rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg cursor-default
                  ${isOngoing
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md shadow-emerald-100'
                    : isUrgent
                      ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-[#0052CC]/20 hover:bg-blue-50/30'
                  }
                `}
              >
                {/* Row 1: Avatar + Name + Badge */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0052CC] to-[#00A3BF] flex items-center justify-center text-white text-xs font-black shadow-md">
                      {item.initials}
                    </div>
                    {isOngoing && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.patientName}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0 ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        {typeIcon(item.type)} {typeLabel(item.type)}
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <BiTime size={10} />
                        {formatTime(item.scheduledStart)}
                        {mins > 0 && mins < 120 && (
                          <span className={`ml-1 font-bold ${mins <= 15 ? 'text-amber-500' : 'text-slate-400'}`}>
                            (in {mins}m)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <RiskScoreCard
                    score={item.riskScore}
                    color={item.riskColor}
                    factors={item.riskFactors}
                    size="sm"
                    showRing={false}
                  />
                </div>

                {/* Reason */}
                <p className="text-[11px] text-slate-500 mb-3 line-clamp-1 pl-12">
                  <span className="font-semibold text-slate-600">Reason: </span>{item.reason}
                </p>

                {/* AI Recommendations (if high risk) */}
                {item.riskScore > 70 && item.aiRecommendations.length > 0 && (
                  <div className="ml-12 mb-3 p-2 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-wide mb-1">⚠️ AI Alert</p>
                    <p className="text-[10px] text-red-600">{item.aiRecommendations[0]}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 ml-12">
                  <button
                    onClick={() => setVideoModal({ isOpen: true, consultation: item })}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95
                      ${item.type === 'chat'
                        ? 'bg-[#00A3BF] hover:bg-[#008FA8] text-white shadow-sm shadow-teal-300'
                        : 'bg-[#0052CC] hover:bg-[#0047B3] text-white shadow-sm shadow-blue-300'
                      }
                    `}
                  >
                    {item.type === 'chat' ? <BiChat size={13} /> : <BiVideo size={13} />}
                    {item.type === 'chat' ? 'Join Chat' : 'Join Video'}
                  </button>
                  <button
                    onClick={() => setSoapModal({ isOpen: true, consultationId: item.consultationId, patientName: item.patientName })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-purple-600 border border-transparent hover:border-purple-100 transition-all active:scale-95"
                  >
                    <BiNote size={13} />
                    SOAP
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
                    <BiUser size={13} />
                    Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video/Chat Join Mock Modal */}
      {videoModal.isOpen && videoModal.consultation && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            onClick={() => setVideoModal({ isOpen: false, consultation: null })}
          />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Mock video preview */}
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0052CC] to-[#00A3BF] flex items-center justify-center text-2xl font-black text-white shadow-2xl">
                {videoModal.consultation.initials}
              </div>
              <p className="text-white font-bold">{videoModal.consultation.patientName}</p>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Connecting…
              </div>
              <div className="absolute bottom-3 right-3 w-16 h-12 bg-slate-700 rounded-xl border-2 border-slate-600 flex items-center justify-center text-slate-400">
                <BiVideo size={20} />
              </div>
            </div>
            <div className="p-4">
              <p className="text-white font-bold text-sm mb-1">{videoModal.consultation.patientName}</p>
              <p className="text-slate-400 text-xs mb-4">{videoModal.consultation.reason}</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all">
                  🎙 Join Now
                </button>
                <button
                  onClick={() => setVideoModal({ isOpen: false, consultation: null })}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOAP Note Modal */}
      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() => setSoapModal({ isOpen: false, consultationId: '', patientName: '' })}
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </>
  );
}
