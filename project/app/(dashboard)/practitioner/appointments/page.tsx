'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import RiskScoreCard from '@/components/dashboard/practitioner/RiskScoreCard';
import SoapNoteModal from '@/components/dashboard/practitioner/SoapNoteModal';
import {
  BiSearch, BiPlus, BiLoaderAlt, BiVideo, BiChat,
  BiClinic, BiX, BiNote, BiCalendarCheck,
  BiDownload, BiCalendar,
} from 'react-icons/bi';

const TABS = ['upcoming', 'past', 'cancelled', 'requests'];

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <BiVideo className="text-emerald-500" size={16} />,
  chat: <BiChat className="text-blue-500" size={16} />,
  'in-person': <BiClinic className="text-slate-400" size={16} />,
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  ongoing: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
};

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  date: '',
  time: '',
  type: 'video',
  reason: '',
  durationMinutes: 30,
};

export default function PractitionerAppointmentsPage() {
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [soapModal, setSoapModal] = useState({ isOpen: false, consultationId: '', patientName: '' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Form state
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced patient search
  useEffect(() => {
    if (!patientSearch.trim() || form.patientId) { setPatientResults([]); return; }
    const timer = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const res = await fetch(`/api/practitioner/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
        const json = await res.json();
        if (json.success) setPatientResults(json.data || []);
      } catch { /* silent */ } finally {
        setPatientLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, form.patientId]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/practitioner/appointments?tab=${tab}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo) url += `&to=${dateTo}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setAppointments(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, search, dateFrom, dateTo]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const cancelAppt = async (id: string) => {
    try {
      await fetch(`/api/practitioner/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch (e) { console.error(e); }
  };

  const exportCSV = () => {
    const headers = ['Patient', 'Date', 'Time', 'Type', 'Status', 'Reason'];
    const rows = appointments.map(a => [
      a.patientName,
      new Date(a.scheduledStart).toLocaleDateString('en-ZA'),
      new Date(a.scheduledStart).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      a.type, a.status, a.reason || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `appointments_${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePatientSelect = (patient: any) => {
    const name = `${patient.firstName} ${patient.lastName}`;
    setForm(f => ({ ...f, patientId: patient._id || patient.id, patientName: name }));
    setPatientSearch(name);
    setShowDropdown(false);
    setPatientResults([]);
  };

  const handleBooking = async () => {
    if (!form.patientId || !form.date || !form.time) {
      setBookingError('Please select a patient, date, and time.');
      return;
    }
    setSubmitting(true);
    setBookingError('');
    try {
      const scheduledStart = new Date(`${form.date}T${form.time}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + form.durationMinutes * 60000);
      const res = await fetch('/api/practitioner/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: form.patientId,
          scheduledStartTime: scheduledStart.toISOString(),
          scheduledEndTime: scheduledEnd.toISOString(),
          type: form.type,
          chiefComplaint: form.reason,
          status: 'scheduled',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewModal(false);
        setForm({ ...EMPTY_FORM });
        setPatientSearch('');
        fetchAppointments();
      } else {
        setBookingError(json.error || 'Booking failed. Please try again.');
      }
    } catch {
      setBookingError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const paginated = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(appointments.length / PAGE_SIZE);

  const Skeleton = () => (
    <div className="animate-pulse space-y-3 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500">Manage your consultation schedule</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <BiDownload size={18} /> Export
          </button>
          <Button
            onClick={() => { setNewModal(true); setForm({ ...EMPTY_FORM }); setPatientSearch(''); setBookingError(''); }}
            icon={<BiPlus size={18} />}
          >
            New Appointment
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search patient name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <BiCalendar className="text-slate-400" size={15} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm outline-none" />
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <BiCalendar className="text-slate-400" size={15} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm outline-none" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
            <BiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.patientName} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{a.patientName}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{a.reason}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <p className="text-xs font-bold text-slate-700">{new Date(a.scheduledStart).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px] text-slate-400">{new Date(a.scheduledStart).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        {TYPE_ICON[a.type] || TYPE_ICON['in-person']}
                        <span className="text-xs capitalize text-slate-600">{a.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <RiskScoreCard score={a.riskScore || 0} color={a.riskColor || 'green'} size="sm" showRing={false} />
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${STATUS_BADGE[a.status] || STATUS_BADGE.scheduled}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        {a.status === 'scheduled' && (
                          <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                            <BiVideo size={12} /> Join
                          </button>
                        )}
                        <button
                          onClick={() => setSoapModal({ isOpen: true, consultationId: a.consultationId, patientName: a.patientName })}
                          className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors"
                          title="SOAP Notes"
                        >
                          <BiNote size={14} />
                        </button>
                        {(a.status === 'scheduled' || a.status === 'ongoing') && (
                          <button onClick={() => cancelAppt(a.id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors" title="Cancel">
                            <BiX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">No {tab} appointments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">{appointments.length} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors">←</button>
              <span className="px-3 py-1 text-sm text-slate-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors">→</button>
            </div>
          </div>
        )}
      </Card>

      {/* SOAP Note Modal */}
      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() => setSoapModal({ isOpen: false, consultationId: '', patientName: '' })}
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      {/* New Appointment Modal */}
      {newModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">New Appointment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Schedule a consultation with an existing patient</p>
              </div>
              <button onClick={() => setNewModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <BiX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Search */}
              <div ref={dropdownRef}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Patient</label>
                <div className="relative">
                  <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={15} />
                  <input
                    type="text"
                    placeholder="Type to search your patients…"
                    value={patientSearch}
                    onFocus={() => { if (!form.patientId && patientSearch) setShowDropdown(true); }}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setForm(f => ({ ...f, patientId: '', patientName: '' }));
                      setShowDropdown(true);
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                      form.patientId ? 'border-primary bg-primary/5 font-medium' : 'border-slate-200 focus:border-primary'
                    }`}
                  />
                  {form.patientId && (
                    <button
                      onClick={() => { setForm(f => ({ ...f, patientId: '', patientName: '' })); setPatientSearch(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <BiX size={14} />
                    </button>
                  )}

                  {/* Dropdown */}
                  {showDropdown && !form.patientId && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {patientLoading ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                          <BiLoaderAlt className="animate-spin" size={14} /> Searching patients…
                        </div>
                      ) : patientResults.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          {patientSearch.length < 1 ? 'Start typing to find a patient' : 'No matching patients found'}
                        </div>
                      ) : (
                        patientResults.map((p: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => handlePatientSelect(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{p.firstName} {p.lastName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{p.email || p.phone || 'Patient'}</p>
                            </div>
                            {p.riskColor && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                p.riskColor === 'red' ? 'bg-red-400' : p.riskColor === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
                              }`} />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Duration & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Duration</label>
                  <select
                    value={form.durationMinutes}
                    onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Method</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="video">📹 Video Call</option>
                    <option value="chat">💬 Chat</option>
                    <option value="in-person">🏥 In-Person</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Reason / Notes</label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary"
                  placeholder="Chief complaint or reason for visit…"
                />
              </div>

              {/* Error */}
              {bookingError && (
                <p className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  {bookingError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setNewModal(false)}>Cancel</Button>
              <Button
                onClick={handleBooking}
                disabled={submitting || !form.patientId}
                icon={submitting ? <BiLoaderAlt className="animate-spin" size={16} /> : <BiCalendarCheck size={16} />}
              >
                {submitting ? 'Booking…' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
