"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import {
  BiArrowBack,
  BiLoader,
  BiPulse,
  BiCalendar,
  BiPhone,
  BiUser,
  BiDroplet,
  BiCapsule,
  BiError,
  BiNote,
  BiVideo,
  BiChat,
  BiClinic,
  BiCheckShield,
  BiTime,
  BiPlus,
  BiDotsVerticalRounded,
  BiDownload,
  BiEditAlt,
  BiCloudUpload
} from "react-icons/bi";
import Link from "next/link";
import MedicalManikin from "@/components/ui/MedicalManikin";
import { toast } from 'react-hot-toast';

interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  bloodType: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  emergencyContact: { name: string; phone: string; relationship: string };
  pastConsultations: {
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
    type: string;
    reason: string;
    riskScore: number;
    riskColor: "green" | "amber" | "red";
    soapNotes?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
  }[];
}

const MOCK_PATIENT: PatientProfile = {
  id: "mock",
  fullName: "Thandiwe Mokoena",
  email: "thandiwe.mokoena@patient.co.za",
  avatarUrl: "",
  dateOfBirth: "1990-03-12",
  gender: "female",
  mobileNumber: "+27 61 234 5678",
  bloodType: "A+",
  medicalHistory: ["Hypertension", "Type 2 Diabetes (since 2018)", "BMI 29.2"],
  allergies: ["Penicillin"],
  currentMedications: ["Metformin 500mg BD", "Amlodipine 5mg OD"],
  emergencyContact: {
    name: "Sipho Mokoena",
    phone: "+27 72 456 7890",
    relationship: "Spouse",
  },
  pastConsultations: [],
};

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });
  const [expandedConsult, setExpandedConsult] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    medicalHistory: '',
    allergies: '',
    currentMedications: ''
  });

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id || id === "mock") {
        setPatient(MOCK_PATIENT);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/practitioner/patients/${id}`);
        const data = await res.json();
        if (data.success) setPatient(data.data);
        else setPatient(MOCK_PATIENT);
      } catch {
        setPatient(MOCK_PATIENT);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  useEffect(() => {
    if (patient) {
      setUpdateFormData({
        medicalHistory: patient.medicalHistory.join(', '),
        allergies: patient.allergies.join(', '),
        currentMedications: patient.currentMedications.join(', ')
      });
    }
  }, [patient]);

  const handleDownloadReport = async () => {
    if (!patient) return;
    toast.loading('Generating Clinical PDF Report...', { id: 'pdf-gen' });
    
    // Simulate generation
    setTimeout(() => {
      toast.success('Clinical Report Generated: ' + patient.fullName + '.pdf', { id: 'pdf-gen' });
      // In a real app, we'd trigger a window.open or fetch to a PDF-server
    }, 2000);
  };

  const handleUpdateClinicalData = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicalHistory: updateFormData.medicalHistory.split(',').map(s => s.trim()).filter(Boolean),
          allergies: updateFormData.allergies.split(',').map(s => s.trim()).filter(Boolean),
          currentMedications: updateFormData.currentMedications.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      
      if (res.ok) {
        toast.success('Clinical records updated successfully');
        setIsUpdateModalOpen(false);
        // Refresh data
        const data = await res.json();
        setPatient(prev => prev ? { ...prev, ...data.data } : null);
      } else {
        toast.error('Failed to update records');
      }
    } catch {
      toast.error('Network error while updating');
    }
    setActionLoading(false);
  };

  const handleStartChat = async () => {
    if (!patient) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id })
      });
      if (res.ok) {
        router.push('/practitioner/messages');
      }
    } catch { /* error handling */ }
    setActionLoading(false);
  };

  const age = patient
    ? Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) /
          (365.25 * 86400000),
      )
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <BiLoader className="animate-spin text-primary" size={40} />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Retrieving Health Record...</p>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Link
            href="/practitioner"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all group"
          >
            <BiArrowBack className="group-hover:-translate-x-1 transition-transform" size={14} />
            Back to Patients
          </Link>
          <div className="flex items-center gap-5">
            <Avatar name={patient.fullName} size="xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{patient.fullName}</h1>
                <Badge variant={patient.bloodType === 'O+' ? 'error' : 'primary'} className="rounded-lg px-2 text-[10px]">
                  {patient.bloodType}
                </Badge>
              </div>
              <p className="text-slate-500 font-medium mt-1">
                {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} · {age} Years Old · Ref: #{patient.id.slice(-6)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
              onClick={handleStartChat}
              disabled={actionLoading}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
           >
              <BiChat className="text-primary" size={20} />
              {actionLoading ? 'Loading...' : 'Messenger'}
           </button>
           <button className="px-5 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
              <BiVideo size={18} />
              Telehealth Session
           </button>
           <button 
              onClick={handleDownloadReport}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-primary hover:border-primary/20 transition-all shadow-sm"
              title="Download PDF Report"
           >
              <BiDownload size={22} />
           </button>
           <button className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all shadow-sm">
              <BiDotsVerticalRounded size={24} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 3D Body Mapping - Primary focus */}
          <Card className="p-0 overflow-hidden h-[600px] relative">
            <div className="absolute top-8 left-8 z-10">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <BiPulse size={18} />
                 </div>
                 Anatomical Inspection
               </h3>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-2 ml-10">Patient Symptom Annotations</p>
            </div>
            <MedicalManikin 
              gender={patient.gender as any || 'female'} 
              heightCm={170} 
              weightKg={70} 
              readOnly={true} 
              patientId={patient.id} 
            />
          </Card>

          {/* Consultation Records */}
          <Card noPadding>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
               <div>
                  <h3 className="text-base font-black text-slate-800">Clinical Timeline</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Historical Consultations & Outcomes</p>
               </div>
               <button className="text-primary hover:bg-primary/5 p-2 rounded-xl transition-all">
                  <BiPlus size={24} />
               </button>
            </div>

            <div className="divide-y divide-slate-50">
              {patient.pastConsultations.length === 0 ? (
                <div className="py-20 text-center">
                  <BiClinic className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-sm font-bold text-slate-400">No consultation history available.</p>
                </div>
              ) : (
                patient.pastConsultations.map((c) => (
                  <div key={c.id} className="group">
                    <div className="px-6 py-5 flex items-center gap-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandedConsult(expandedConsult === c.id ? null : c.id)}>
                      <div className="w-16 shrink-0 text-center">
                         <p className="text-xs font-black text-slate-800">{new Date(c.scheduledStart).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(c.scheduledStart).getFullYear()}</p>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{c.reason}</h4>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${c.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                               {c.status}
                            </span>
                         </div>
                         <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                               <BiVideo className="text-primary" />
                               {c.type} Session
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                               <BiTime />
                               30 Minutes
                            </div>
                         </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-4">
                         <RiskScoreCard score={c.riskScore} color={c.riskColor} size="sm" showRing={false} />
                         <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               setSoapModal({ isOpen: true, consultationId: c.id, patientName: patient.fullName });
                            }}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 hover:shadow-sm transition-all flex items-center justify-center"
                         >
                            <BiNote size={18} />
                         </button>
                      </div>
                    </div>

                    {expandedConsult === c.id && c.soapNotes && (
                      <div className="px-6 pb-6 bg-slate-50/50 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">Subjective</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{c.soapNotes.subjective || "No notes."}</p>
                         </div>
                         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-cyan-600 tracking-widest mb-2">Objective</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{c.soapNotes.objective || "No notes."}</p>
                         </div>
                         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest mb-2">Assessment</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{c.soapNotes.assessment || "No notes."}</p>
                         </div>
                         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Plan</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{c.soapNotes.plan || "No notes."}</p>
                         </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar info Area */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* Summary Stats */}
           <Card className="bg-slate-900 border-none">
              <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Vitals Summary</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                          <BiDroplet size={16} />
                       </div>
                       <p className="text-xs font-bold text-white/70">Blood Glucose</p>
                    </div>
                    <p className="text-base font-black text-white">5.8 <span className="text-[10px] font-bold text-white/50">mmol/L</span></p>
                 </div>
                 <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                          <BiPulse size={16} />
                       </div>
                       <p className="text-xs font-bold text-white/70">Heart Rate</p>
                    </div>
                    <p className="text-base font-black text-rose-400">82 <span className="text-[10px] font-bold text-white/50">BPM</span></p>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                          <BiCheckShield size={16} />
                       </div>
                       <p className="text-xs font-bold text-white/70">Risk Status</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">Normal</span>
                 </div>
              </div>
           </Card>

           {/* Medical History */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Clinical Background</h3>
                 <button 
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                 >
                    <BiEditAlt size={12} /> Update
                 </button>
              </div>
              
              <Card className="space-y-6">
                 <div>
                    <div className="flex items-center gap-2 mb-3">
                       <BiPulse className="text-primary" size={18} />
                       <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Chronic Conditions</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {patient.medicalHistory.map(h => (
                          <span key={h} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-[11px] font-bold">{h}</span>
                       ))}
                       {patient.medicalHistory.length === 0 && <p className="text-xs text-slate-400 italic">No chronic history.</p>}
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                       <BiError className="text-rose-500" size={18} />
                       <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Allergies</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {patient.allergies.map(a => (
                          <span key={a} className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-100">{a}</span>
                       ))}
                       {patient.allergies.length === 0 && (
                          <div className="flex items-center gap-2 text-emerald-600 text-[11px] font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                             <BiCheckShield size={14} /> NO KNOWN ALLERGIES
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                       <BiCapsule className="text-purple-500" size={18} />
                       <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Medications</h4>
                    </div>
                    <div className="space-y-2">
                       {patient.currentMedications.map(m => (
                          <div key={m} className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                             <p className="text-[11px] font-bold text-slate-600">{m}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </Card>
           </div>

           {/* Emergency Contact */}
           <Card className="bg-rose-50/30 border-rose-100">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                    <BiPhone size={18} />
                 </div>
                 <h4 className="text-xs font-black text-rose-900 uppercase tracking-widest">Emergency Line</h4>
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-black text-slate-800">{patient.emergencyContact.name}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{patient.emergencyContact.relationship}</p>
                 <p className="text-base font-black text-primary mt-2">{patient.emergencyContact.phone}</p>
              </div>
           </Card>

        </div>
      </div>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      {/* Update Clinical Records Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUpdateModalOpen(false)} />
           <Card className="relative w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-none">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <BiCloudUpload size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Update Clinical Records</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{patient.fullName}</p>
                 </div>
              </div>

              <div className="space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chronic Conditions (comma separated)</label>
                    <textarea 
                       value={updateFormData.medicalHistory}
                       onChange={e => setUpdateFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                       className="w-full h-20 rounded-xl border border-slate-200 p-3 text-sm focus:border-primary outline-none transition-all resize-none font-medium"
                       placeholder="e.g. Hypertension, Type 2 Diabetes"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Allergies (comma separated)</label>
                    <input 
                       type="text"
                       value={updateFormData.allergies}
                       onChange={e => setUpdateFormData(prev => ({ ...prev, allergies: e.target.value }))}
                       className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-primary outline-none transition-all font-medium"
                       placeholder="e.g. Penicillin"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Active Medications (comma separated)</label>
                    <textarea 
                       value={updateFormData.currentMedications}
                       onChange={e => setUpdateFormData(prev => ({ ...prev, currentMedications: e.target.value }))}
                       className="w-full h-20 rounded-xl border border-slate-200 p-3 text-sm focus:border-primary outline-none transition-all resize-none font-medium"
                       placeholder="e.g. Metformin 500mg"
                    />
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button 
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleUpdateClinicalData}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                 >
                    {actionLoading ? 'Saving...' : 'Securely Update'}
                 </button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
