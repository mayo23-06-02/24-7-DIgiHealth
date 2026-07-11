"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
  BiBrain, 
  BiPulse, 
  BiHistory, 
  BiSave, 
  BiSearch, 
  BiInfoCircle,
  BiLoaderAlt,
  BiUser,
  BiTrendingUp,
  BiListUl,
  BiChevronRight
} from "react-icons/bi";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import SectionHeader from "@/components/ui/SectionHeader";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { riskBandStyle } from "@/lib/riskScore";

// --- Types ---

interface DiagnosisResult {
  condition: string;
  confidence: number;
  description: string;
}

interface DiagnosisData {
  differentialDiagnosis: DiagnosisResult[];
  riskScore: number;
  riskAssessment: string;
  recommendedActions: string[];
  clinicalGuidelines: string;
}

interface PatientSuggestion {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
}

interface PastDiagnosis {
  id: string;
  date: string;
  patientName?: string;
  topCondition: string;
  riskScore: number;
}

// --- Main Component ---

export default function AIDiagnizerPage() {
  // Form State
  const [formData, setFormData] = useState({
    symptoms: "",
    age: "",
    gender: "Male",
    medicalHistory: "",
    medications: "",
    allergies: "",
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosisData | null>(null);
  const [history, setHistory] = useState<PastDiagnosis[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Patient Selection State
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<PatientSuggestion[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSuggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch History on Load
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/practitioner/ai-diagnoses");
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symptoms) {
      toast.error("Please enter symptoms");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        toast.success("Analysis complete");
        fetchHistory(); // Refresh history
      } else {
        toast.error(data.error || "Diagnosis failed");
      }
    } catch (err) {
      toast.error("Failed to connect to AI engine");
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (query.length < 2) {
      setPatients([]);
      return;
    }

    setSearchingPatients(true);
    try {
      const res = await fetch(`/api/practitioner/patients?search=${query}`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error("Patient search failed:", err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSaveToRecord = async () => {
    if (!selectedPatient || !results) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${selectedPatient.id}/ai-diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: results,
          formInput: formData
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Saved to ${selectedPatient.fullName}'s record`);
        setIsModalOpen(false);
        setSelectedPatient(null);
        setPatientSearch("");
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch (err) {
      toast.error("Network error while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskColor = (score: number) => riskBandStyle(score).bgClass;
  const getRiskText = (score: number) => riskBandStyle(score).label;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SectionHeader 
        title="AI Clinical Diagnizer" 
        subtitle="Powered by Medius AI / Medical Knowledge Graph"
        icon={<BiBrain className="text-primary" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="glass" className="border-primary/10">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BiPulse className="text-primary" /> Patient Assessment
            </h3>
            
            <form onSubmit={handleDiagnose} className="space-y-6">
              <Input 
                label="Primary Symptoms"
                name="symptoms"
                placeholder="e.g. Sharp chest pain, shortness of breath, radiating to left arm..."
                textarea
                rows={4}
                required
                value={formData.symptoms}
                onChange={handleInputChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Patient Age"
                  name="age"
                  type="number"
                  placeholder="e.g. 45"
                  value={formData.age}
                  onChange={handleInputChange}
                />
                <Select 
                  label="Gender"
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" },
                  ]}
                  value={formData.gender}
                  onChange={(val) => setFormData(p => ({ ...p, gender: val }))}
                />
              </div>

              <Input 
                label="Relevant Medical History"
                name="medicalHistory"
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                textarea
                rows={2}
                value={formData.medicalHistory}
                onChange={handleInputChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Current Medications"
                  name="medications"
                  placeholder="e.g. Metformin, Lisinopril"
                  value={formData.medications}
                  onChange={handleInputChange}
                />
                <Input 
                  label="Allergies"
                  name="allergies"
                  placeholder="e.g. Penicillin"
                  value={formData.allergies}
                  onChange={handleInputChange}
                />
              </div>

              <Button 
                type="submit" 
                fullWidth 
                loading={loading}
                icon={<BiTrendingUp />}
              >
                Analyze Symptoms
              </Button>
            </form>
          </Card>

          {/* History Section */}
          <Card variant="outline" className="border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BiHistory /> Recent Analyses
            </h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.topCondition}</p>
                    <p className="text-xs text-slate-400">{item.patientName || "Anonymous Patient"} • {new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getRiskColor(item.riskScore)}`} />
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">No recent analyses found.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
            <Card className="min-h-[600px] flex flex-col justify-center items-center space-y-6 bg-slate-50/50 border-dashed border-2 border-slate-200">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <BiBrain className="absolute inset-0 m-auto text-primary text-2xl animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-lg font-bold text-slate-700">Analyzing Clinical Data...</h4>
                <p className="text-sm text-slate-400 max-w-[300px]">
                  Cross-referencing symptoms with medical knowledge graph and guideline databases.
                </p>
              </div>
              <div className="w-full max-w-md px-10 space-y-3">
                <SkeletonLoader className="h-3 w-full" />
                <SkeletonLoader className="h-3 w-[80%]" />
                <SkeletonLoader className="h-3 w-[90%]" />
              </div>
            </Card>
          ) : results ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              {/* Risk Score Header */}
              <Card className="bg-slate-900 text-white border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <BiBrain size={120} />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Composite Clinical Risk</p>
                    <h2 className="text-5xl font-bold font-grotesk">{results.riskScore}%</h2>
                    <p className="text-lg text-slate-300 font-medium">{getRiskText(results.riskScore)}</p>
                  </div>
                  <div className="flex-1 w-full max-w-[300px] space-y-3">
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${getRiskColor(results.riskScore)}`} 
                        style={{ width: `${results.riskScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/60 italic text-center">
                      Based on symptom severity, age profile, and known comorbidities.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Differential Diagnosis */}
              <Card variant="glass">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BiListUl className="text-primary" /> Differential Diagnosis
                </h3>
                <div className="space-y-4">
                  {results.differentialDiagnosis.map((diag, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white border border-slate-100 hover:shadow-lg hover:shadow-primary/5 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800">{diag.condition}</h4>
                        <Badge 
                          status={i === 0 ? "success" : "neutral"} 
                          label={`${diag.confidence}% Confidence`}
                        />
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {diag.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recommended Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-amber-100 bg-amber-50/30">
                  <h3 className="text-base font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <BiInfoCircle /> Recommended Tests
                  </h3>
                  <ul className="space-y-2">
                    {results.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900/70">
                        <span className="text-amber-500 mt-1">•</span> {action}
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="border-blue-100 bg-blue-50/30">
                  <h3 className="text-base font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <BiBrain /> Clinical Guidelines
                  </h3>
                  <p className="text-sm text-blue-900/70 leading-relaxed">
                    {results.clinicalGuidelines}
                  </p>
                </Card>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between py-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                  <BiInfoCircle size={20} />
                  <p className="text-[10px] max-w-[300px] leading-tight">
                    DISCLAIMER: AI-generated suggestions are for clinical decision support only and do not constitute a diagnosis.
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  icon={<BiSave />} 
                  onClick={() => setIsModalOpen(true)}
                >
                  Save to Patient Record
                </Button>
              </div>
            </div>
          ) : (
            <Card className="min-h-[600px] flex flex-col justify-center items-center text-center p-12 bg-slate-50/50 border-dashed border-2 border-slate-200">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 mb-8">
                <BiBrain className="text-slate-200 text-5xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-4 font-grotesk">Ready for Clinical Analysis</h3>
              <p className="text-slate-400 max-w-sm">
                Enter the patient's symptoms and history on the left to generate an AI-powered differential diagnosis and risk assessment.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Save to Record Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Save Diagnosis to Record"
        width="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Select a patient to attach this analysis as a clinical note.
            </p>
            <div className="relative">
              <Input 
                placeholder="Search patient by name or ID..."
                value={patientSearch}
                onChange={(e) => searchPatients(e.target.value)}
                icon={searchingPatients ? <BiLoaderAlt className="animate-spin" /> : <BiSearch />}
              />
              
              {patients.length > 0 && !selectedPatient && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatients([]);
                      }}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {p.fullName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">{p.fullName}</p>
                          <p className="text-xs text-slate-400">{p.email}</p>
                        </div>
                      </div>
                      <BiChevronRight className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPatient && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <BiUser className="text-primary text-xl" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Selected: {selectedPatient.fullName}</p>
                  <p className="text-xs text-slate-500">ID: {selectedPatient.id}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)}>Change</Button>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Content Preview</h4>
            <p className="text-xs text-slate-600 line-clamp-3 italic">
              AI Diagnosis Summary: {results?.differentialDiagnosis[0].condition} ({results?.differentialDiagnosis[0].confidence}%). 
              Risk Score: {results?.riskScore}%. Symptoms: {formData.symptoms}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              fullWidth 
              disabled={!selectedPatient} 
              loading={isSaving}
              onClick={handleSaveToRecord}
            >
              Confirm & Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
