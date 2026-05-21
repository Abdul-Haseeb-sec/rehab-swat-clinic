import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, MapPin, Droplet, Calendar, Clock, 
  Activity, FileText, Pill, Printer, Share2, Plus, 
  Sparkles, Trash2, Folder, Eye, FileUp 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { fetchMedicalRecords, fetchPatientInvoices, fetchPatientPrescriptions } from '../api';
import { useAuthStore } from '../store/authStore';
import SOAPNoteModal from '../components/emr/SOAPNoteModal';
import InvoiceModal from '../components/billing/InvoiceModal';
import PrescriptionModal from '../components/emr/PrescriptionModal';
import PrescriptionPad from '../components/emr/PrescriptionPad';

import axiosInstance from '../lib/axios';

const fetchPatient = async (id: string) => {
  const res = await axiosInstance.get(`/patients/${id}`);
  return res.data;
};

const fetchPatientAppointments = async (id: string) => {
  try {
    const res = await axiosInstance.get(`/appointments/patient/${id}`);
    return res.data;
  } catch {
    return [];
  }
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  NO_SHOW: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

const typeLabels: Record<string, string> = {
  INITIAL_ASSESSMENT: 'Initial Assessment',
  FOLLOW_UP: 'Follow-Up',
  REHAB_SESSION: 'Rehab Session',
};

// Interfaces for new tabs
interface ExercisePrescription {
  name: string;
  sets: number;
  reps: number;
  resistance: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  goals: { text: string; completed: boolean }[];
  durationWeeks: number;
  frequency: string;
  exercises: ExercisePrescription[];
  sessions: { sessionNo: number; date: string; painBefore: number; painAfter: number; notes: string }[];
  created_at: string;
}

interface DiagnosticDoc {
  id: string;
  name: string;
  category: 'XRAY' | 'MRI' | 'LAB' | 'CONSENT';
  url: string;
  uploaded_at: string;
}



const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'appointments' | 'emr' | 'billing' | 'prescriptions' | 'treatment_plans' | 'documents'>('emr');
  const [isSoapModalOpen, setIsSoapModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<any>(null);

  // New EMR Tabs State (Persistent per patient)
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [docs, setDocs] = useState<DiagnosticDoc[]>([]);
  const [docCategory, setDocCategory] = useState<string>('ALL');

  // Modals inside tabs
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [lightboxDoc, setLightboxDoc] = useState<DiagnosticDoc | null>(null);
  const [shareLink, setShareLink] = useState<string>('');

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
  });

  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => fetchPatientAppointments(id!),
    enabled: !!id,
  });

  const { data: medicalRecords } = useQuery({
    queryKey: ['medical-records', id],
    queryFn: () => fetchMedicalRecords(id!),
    enabled: !!id,
  });

  const { data: invoices } = useQuery({
    queryKey: ['patient-invoices', id],
    queryFn: () => fetchPatientInvoices(id!),
    enabled: !!id,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['patient-prescriptions', id],
    queryFn: () => fetchPatientPrescriptions(id!),
    enabled: !!id,
  });

  // Load custom patient data
  useEffect(() => {
    if (!id) return;
    const cachedPlans = localStorage.getItem(`rehab-swat-plans-${id}`);
    const cachedDocs = localStorage.getItem(`rehab-swat-docs-${id}`);
    setPlans(cachedPlans ? JSON.parse(cachedPlans) : []);
    setDocs(cachedDocs ? JSON.parse(cachedDocs) : []);
  }, [id]);

  const savePlans = (newPlans: TreatmentPlan[]) => {
    setPlans(newPlans);
    localStorage.setItem(`rehab-swat-plans-${id}`, JSON.stringify(newPlans));
  };

  const saveDocs = (newDocs: DiagnosticDoc[]) => {
    setDocs(newDocs);
    localStorage.setItem(`rehab-swat-docs-${id}`, JSON.stringify(newDocs));
  };

  // Treatment Plan handlers
  const handleToggleMilestone = (planId: string, goalIndex: number) => {
    const updated = plans.map(p => {
      if (p.id === planId) {
        const nextGoals = p.goals.map((g, idx) => 
          idx === goalIndex ? { ...g, completed: !g.completed } : g
        );
        return { ...p, goals: nextGoals };
      }
      return p;
    });
    savePlans(updated);
  };

  const handleAddPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const goalsString = fd.get('goals') as string;
    const goalsList = goalsString.split('\n').filter(g => g.trim() !== '').map(g => ({
      text: g.trim(),
      completed: false
    }));

    // Parse exercises
    const exNames = fd.getAll('ex_name') as string[];
    const exSets = fd.getAll('ex_sets') as string[];
    const exReps = fd.getAll('ex_reps') as string[];
    const exRes = fd.getAll('ex_resistance') as string[];

    const exercises: ExercisePrescription[] = exNames.map((name, i) => ({
      name,
      sets: Number(exSets[i] || 3),
      reps: Number(exReps[i] || 10),
      resistance: exRes[i] || 'None'
    })).filter(ex => ex.name.trim() !== '');

    const newPlan: TreatmentPlan = {
      id: `plan-${Date.now()}`,
      title: fd.get('title') as string,
      goals: goalsList,
      durationWeeks: Number(fd.get('durationWeeks')),
      frequency: fd.get('frequency') as string,
      exercises,
      sessions: [],
      created_at: new Date().toISOString()
    };

    savePlans([...plans, newPlan]);
    setIsNewPlanModalOpen(false);
  };

  const handleAddSessionLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const fd = new FormData(e.currentTarget);
    
    const newSession = {
      sessionNo: selectedPlan.sessions.length + 1,
      date: new Date().toISOString().slice(0, 10),
      painBefore: Number(fd.get('painBefore')),
      painAfter: Number(fd.get('painAfter')),
      notes: fd.get('notes') as string
    };

    const updatedPlans = plans.map(p => {
      if (p.id === selectedPlan.id) {
        return {
          ...p,
          sessions: [...p.sessions, newSession]
        };
      }
      return p;
    });

    savePlans(updatedPlans);
    setSelectedPlan(updatedPlans.find(p => p.id === selectedPlan.id) || null);
    setIsNewSessionModalOpen(false);
  };

  // Documents handlers
  const handleUploadDoc = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = fd.get('category') as any;
    const nameInput = fd.get('name') as string;

    const newDoc: DiagnosticDoc = {
      id: `doc-${Date.now()}`,
      name: nameInput.endsWith('.jpg') || nameInput.endsWith('.png') || nameInput.endsWith('.pdf') ? nameInput : `${nameInput}.jpg`,
      category,
      url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=500&auto=format&fit=crop&q=60',
      uploaded_at: new Date().toISOString()
    };

    saveDocs([...docs, newDoc]);
    e.currentTarget.reset();
  };

  const handleDeleteDoc = (docId: string) => {
    if (window.confirm('Are you sure you want to delete this clinical document?')) {
      saveDocs(docs.filter(d => d.id !== docId));
    }
  };

  const handleShareDoc = (doc: DiagnosticDoc) => {
    const dummyLink = `https://rehabswat.pk/secure/share/patient-${id}/${doc.id}?expiry=24h&token=${Math.random().toString(36).substr(2, 9)}`;
    setShareLink(dummyLink);
  };

  const filteredDocs = docCategory === 'ALL' ? docs : docs.filter(d => d.category === docCategory);

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-bone-600">Loading patient profile…</div>;
  if (isError) return <div className="flex items-center justify-center h-64 text-red-400">Patient not found.</div>;

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards] pb-12">
      {/* Back */}
      <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-bone-600 hover:text-teal-400 transition-colors text-[.78rem] mb-8 mt-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Patient Directory
      </button>

      {/* Profile Header */}
      <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-teal-500/10 to-transparent border-b border-teal-500/10 p-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-teal-500/15 border-2 border-teal-500/40 flex items-center justify-center font-display text-[1.6rem] font-semibold text-teal-400 shrink-0">
            {patient.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-[2rem] font-light text-bone-100">{patient.full_name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="font-mono text-teal-400 text-[.72rem]">{patient.mrn}</span>
              <span className="text-bone-900 text-[.65rem]">·</span>
              <span className="text-bone-600 text-[.75rem] capitalize">{patient.gender.toLowerCase()}</span>
              {age && <><span className="text-bone-900 text-[.65rem]">·</span><span className="text-bone-600 text-[.75rem]">{age} years old</span></>}
              {patient.blood_group && (
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2.5 py-0.5 text-[.62rem] font-bold">{patient.blood_group}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[.62rem] text-bone-600 uppercase tracking-widest mb-1">Registered</div>
            <div className="text-bone-300 text-[.78rem] font-mono">{new Date(patient.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-teal-500/10">
          {[
            { icon: Phone, label: 'Phone', value: patient.phone },
            { icon: Calendar, label: 'Date of Birth', value: new Date(patient.dob).toLocaleDateString() },
            { icon: MapPin, label: 'Address', value: patient.address || '—' },
            { icon: Droplet, label: 'CNIC', value: patient.cnic || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-5 flex items-start gap-3">
              <Icon className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-[.62rem] text-bone-600 uppercase tracking-widest mb-0.5">{label}</div>
                <div className="text-bone-200 text-[.78rem] font-medium">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-teal-500/10 mb-6 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('emr')}
          className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
            activeTab === 'emr' ? 'text-teal-400 font-bold' : 'text-bone-600 hover:text-bone-300'
          }`}
        >
          Clinical Notes (SOAP)
          {activeTab === 'emr' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
        </button>
        <button
          onClick={() => setActiveTab('treatment_plans')}
          className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
            activeTab === 'treatment_plans' ? 'text-teal-400 font-bold' : 'text-bone-600 hover:text-bone-300'
          }`}
        >
          Treatment Plans
          {activeTab === 'treatment_plans' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
            activeTab === 'documents' ? 'text-teal-400 font-bold' : 'text-bone-600 hover:text-bone-300'
          }`}
        >
          Documents & Diagnostics
          {activeTab === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
            activeTab === 'appointments' ? 'text-teal-400' : 'text-bone-600 hover:text-bone-300'
          }`}
        >
          Appointments
          {activeTab === 'appointments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
        </button>
        {role !== 'DOCTOR' && (
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
              activeTab === 'billing' ? 'text-teal-400' : 'text-bone-600 hover:text-bone-300'
            }`}
          >
            Billing & Invoices
            {activeTab === 'billing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
          </button>
        )}
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 text-[.82rem] font-semibold transition-all relative ${
            activeTab === 'prescriptions' ? 'text-teal-400' : 'text-bone-600 hover:text-bone-300'
          }`}
        >
          Prescriptions
          {activeTab === 'prescriptions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
        </button>
      </div>

      {/* Tab Content: Appointments */}
      {activeTab === 'appointments' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards]">
          {!appointments?.length ? (
            <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-12 text-center">
              <Clock className="w-8 h-8 text-teal-500/20 mx-auto mb-3" />
              <p className="text-bone-600 text-[.82rem]">No appointments yet for this patient.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {appointments.map((appt: any) => {
                const dt = new Date(appt.scheduled_at);
                return (
                  <div key={appt.id} className="bg-physio-card border border-teal-500/10 rounded-xl px-5 py-4 flex items-center gap-5 hover:border-teal-500/25 transition-all">
                    <div className="text-center min-w-[60px]">
                      <div className="font-display text-[1.1rem] font-semibold text-teal-400 leading-none">
                        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[.6rem] text-bone-900 uppercase mt-0.5">
                        {dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-teal-500/10" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[.82rem] font-semibold text-bone-100">{typeLabels[appt.type] || appt.type}</div>
                      <div className="text-[.7rem] text-bone-600 mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />{appt.duration_min} min
                        {appt.notes && <span className="text-bone-900">· {appt.notes}</span>}
                      </div>
                    </div>
                    <span className={`text-[.62rem] font-bold uppercase tracking-[.06em] px-3 py-1 rounded-full border shrink-0 ${statusColors[appt.status] || ''}`}>
                      {appt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: EMR (Clinical Notes) */}
      {activeTab === 'emr' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards]">
          <div className="flex justify-between items-center mb-5">
            <p className="text-[.7rem] text-bone-600">{medicalRecords?.length || 0} Clinical SOAP notes found</p>
            <button
              onClick={() => setIsSoapModalOpen(true)}
              className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-md font-semibold text-[.75rem] transition-all flex items-center gap-2"
            >
              <Activity className="w-3.5 h-3.5" />
              New SOAP Note
            </button>
          </div>

          {!medicalRecords?.length ? (
            <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-12 text-center">
              <FileText className="w-8 h-8 text-teal-500/20 mx-auto mb-3" />
              <p className="text-bone-600 text-[.82rem]">No SOAP notes recorded for this patient.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 relative before:absolute before:shadow-2xl before:inset-0 before:ml-[1.4rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-teal-500/50 before:to-transparent">
              {medicalRecords.map((record: any) => {
                const dt = new Date(record.created_at);
                return (
                  <div key={record.id} className="relative flex items-start gap-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full border-4 border-physio-deep bg-teal-400 text-physio-deep shadow shrink-0 z-10">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 bg-physio-card border border-teal-500/15 rounded-2xl p-6 hover:border-teal-500/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[.65rem] text-teal-500 font-bold uppercase tracking-widest mb-1">
                            {dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <h3 className="text-bone-100 font-semibold text-[.95rem]">{record.chief_complaint}</h3>
                        </div>
                        <div className="text-right text-[.65rem] text-bone-600 font-mono">
                          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {record.vitals && Object.values(record.vitals).some(v => v) && (
                        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-teal-500/10">
                          {record.vitals.bp && <span className="bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded text-[.65rem] font-mono border border-teal-500/5">BP: {record.vitals.bp}</span>}
                          {record.vitals.pulse && <span className="bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded text-[.65rem] font-mono border border-teal-500/5">HR: {record.vitals.pulse} bpm</span>}
                          {record.vitals.temp && <span className="bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded text-[.65rem] font-mono border border-teal-500/5">Temp: {record.vitals.temp} °F</span>}
                          {record.vitals.weight && <span className="bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded text-[.65rem] font-mono border border-teal-500/5">Wt: {record.vitals.weight} kg</span>}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {record.subjective && (
                          <div className="bg-physio-navy/30 border border-teal-500/5 rounded-xl p-3.5">
                            <div className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold mb-1">Subjective</div>
                            <p className="text-[.78rem] text-bone-300 leading-relaxed">{record.subjective}</p>
                          </div>
                        )}
                        {record.objective && (
                          <div className="bg-physio-navy/30 border border-teal-500/5 rounded-xl p-3.5">
                            <div className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold mb-1">Objective</div>
                            <p className="text-[.78rem] text-bone-300 leading-relaxed">{record.objective}</p>
                          </div>
                        )}
                        {record.assessment && (
                          <div className="bg-physio-navy/30 border border-teal-500/5 rounded-xl p-3.5 md:col-span-2">
                            <div className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold mb-1">Assessment</div>
                            <p className="text-[.78rem] text-bone-300 leading-relaxed">{record.assessment}</p>
                          </div>
                        )}
                        {record.plan && (
                          <div className="bg-teal-500/5 p-4 rounded-xl border border-teal-500/10 md:col-span-2">
                            <div className="text-[.62rem] text-teal-400 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Plan
                            </div>
                            <p className="text-[.78rem] text-bone-200 leading-relaxed">{record.plan}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Treatment Plans */}
      {activeTab === 'treatment_plans' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards] grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8 items-start">
          {/* Active / Past Plans Side list */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[.82rem] font-semibold text-bone-100 uppercase tracking-widest">Active Protocols</h3>
              <button 
                onClick={() => setIsNewPlanModalOpen(true)}
                className="w-7 h-7 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/20 flex items-center justify-center text-teal-400 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="bg-physio-card border border-teal-500/10 rounded-xl p-8 text-center text-bone-600 text-[.78rem]">
                No active rehab protocols found.
              </div>
            ) : (
              plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={`w-full text-left p-5 border rounded-2xl transition-all flex flex-col gap-2 ${
                    selectedPlan?.id === p.id 
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-400' 
                      : 'bg-physio-card border-teal-500/10 text-bone-300 hover:border-teal-500/25'
                  }`}
                >
                  <span className="text-[0.62rem] text-teal-500 uppercase tracking-widest font-semibold">{p.frequency}</span>
                  <h4 className="text-[0.82rem] font-bold leading-snug">{p.title}</h4>
                  <div className="flex justify-between text-[0.65rem] text-bone-600 mt-2 border-t border-teal-500/5 pt-2">
                    <span>Duration: {p.durationWeeks} weeks</span>
                    <span>Sessions logged: {p.sessions.length}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Current Plan Focus Panel */}
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 xl:p-8 flex flex-col gap-6">
            {!selectedPlan && plans.length > 0 ? (
              <div className="text-center py-16 text-bone-600">
                <Folder className="w-10 h-10 text-teal-500/20 mx-auto mb-3" />
                <p className="text-[0.82rem]">Select a rehabilitation plan from the sidebar to view clinical timelines.</p>
              </div>
            ) : !selectedPlan ? (
              <div className="text-center py-16 text-bone-600">
                <Folder className="w-10 h-10 text-teal-500/20 mx-auto mb-3" />
                <p className="text-[0.82rem]">Click the plus button in the left panel to prescribe a new rehabilitation protocol.</p>
              </div>
            ) : (
              <>
                {/* Title block */}
                <div className="flex justify-between items-start gap-4 border-b border-teal-500/10 pb-5">
                  <div>
                    <span className="text-[0.62rem] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">
                      Active Rehab Protocol
                    </span>
                    <h2 className="font-display text-[1.6rem] font-semibold text-bone-100 mt-2">{selectedPlan.title}</h2>
                    <p className="text-[0.75rem] text-bone-600 mt-1 flex items-center gap-2">
                      <span>Prescribed Frequency: {selectedPlan.frequency}</span>
                      <span>·</span>
                      <span>Target Weeks: {selectedPlan.durationWeeks} weeks</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewSessionModalOpen(true)}
                    className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-4 py-2 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Record Rehab Session
                  </button>
                </div>

                {/* Goals Progress */}
                <div>
                  <h3 className="text-[0.75rem] font-semibold text-bone-600 uppercase tracking-widest mb-3">Milestones & Recovery Goals</h3>
                  <div className="flex flex-col gap-2">
                    {selectedPlan.goals.map((g, idx) => (
                      <div 
                        key={idx} 
                        className="bg-physio-navy/40 border border-teal-500/5 rounded-xl p-3.5 flex gap-3 items-center"
                      >
                        <input 
                          type="checkbox" 
                          checked={g.completed}
                          onChange={() => handleToggleMilestone(selectedPlan.id, idx)}
                          className="w-4 h-4 accent-teal-500 cursor-pointer shrink-0" 
                        />
                        <span className={`text-[0.8rem] transition-all ${g.completed ? 'line-through text-bone-600' : 'text-bone-300'}`}>
                          {g.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exercises Prescribed */}
                <div>
                  <h3 className="text-[0.75rem] font-semibold text-bone-600 uppercase tracking-widest mb-3">Prescribed Exercises Protocols</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedPlan.exercises.map((ex, i) => (
                      <div key={i} className="bg-physio-navy/60 border border-teal-500/10 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[0.8rem] font-bold text-bone-200">{ex.name}</h4>
                          <span className="text-[0.62rem] text-bone-600 mt-1 block">Resistance: {ex.resistance}</span>
                        </div>
                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-teal-500/5 text-[0.8rem] font-mono">
                          <div>
                            <span className="text-teal-400 font-bold">{ex.sets}</span>
                            <span className="text-bone-600 text-[0.7rem] ml-0.5">Sets</span>
                          </div>
                          <div>
                            <span className="text-teal-400 font-bold">{ex.reps}</span>
                            <span className="text-bone-600 text-[0.7rem] ml-0.5">Reps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pain Efficacy progression chart */}
                {selectedPlan.sessions.length > 0 && (
                  <div>
                    <h3 className="text-[0.75rem] font-semibold text-bone-600 uppercase tracking-widest mb-4">Patient Pain Index Progression (VAS)</h3>
                    <div className="h-[200px] w-full bg-physio-navy/20 border border-teal-500/5 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedPlan.sessions}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="sessionNo" stroke="#8A9BB0" fontSize={10} tickLine={false} label={{ value: 'Rehab Sessions', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8A9BB0' }} />
                          <YAxis domain={[0, 10]} stroke="#8A9BB0" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'VAS Pain Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8A9BB0' }} />
                          <Tooltip content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const s = payload[0].payload;
                              return (
                                <div className="bg-physio-navy border border-teal-500/20 p-3 rounded-xl text-[0.75rem] text-bone-300">
                                  <p className="font-bold text-teal-400">Session #{s.sessionNo} ({s.date})</p>
                                  <p className="mt-1">Pain Before: <span className="text-red-400 font-bold font-mono">{s.painBefore}/10</span></p>
                                  <p>Pain After: <span className="text-green-400 font-bold font-mono">{s.painAfter}/10</span></p>
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Line type="monotone" dataKey="painBefore" name="Pain Before Treatment" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="painAfter" name="Pain After Treatment" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Session logs trail */}
                <div>
                  <h3 className="text-[0.75rem] font-semibold text-bone-600 uppercase tracking-widest mb-3">Outpatient Session Logs</h3>
                  {selectedPlan.sessions.length === 0 ? (
                    <div className="bg-physio-navy/30 border border-teal-500/5 rounded-xl p-6 text-center text-bone-600 text-[0.78rem]">
                      No therapy sessions logged yet under this protocol.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {selectedPlan.sessions.map((s, idx) => (
                        <div key={idx} className="bg-physio-navy/40 border border-teal-500/5 rounded-xl p-4 flex gap-4 justify-between items-center text-[0.78rem]">
                          <div className="min-w-[50px] shrink-0">
                            <span className="font-bold text-teal-400 font-mono">Sess #{s.sessionNo}</span>
                            <div className="text-[0.62rem] text-bone-600 font-mono mt-0.5">{s.date}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-bone-300 italic">"{s.notes}"</p>
                          </div>
                          <div className="flex gap-4 shrink-0 text-right font-mono font-semibold">
                            <div>
                              <div className="text-red-400">{s.painBefore}/10</div>
                              <div className="text-[0.55rem] text-bone-600 font-ui uppercase">Pre</div>
                            </div>
                            <div className="w-px h-6 bg-teal-500/10" />
                            <div>
                              <div className="text-green-400">{s.painAfter}/10</div>
                              <div className="text-[0.55rem] text-bone-600 font-ui uppercase">Post</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Documents */}
      {activeTab === 'documents' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards] grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Upload Grid */}
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 whitespace-nowrap">
              {[
                { label: 'All Files', value: 'ALL' },
                { label: 'X-Rays', value: 'XRAY' },
                { label: 'MRI Scans', value: 'MRI' },
                { label: 'Lab Reports', value: 'LAB' },
                { label: 'Consent Forms', value: 'CONSENT' }
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setDocCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border transition-all ${
                    docCategory === c.value
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 font-bold'
                      : 'bg-physio-navy/30 border-teal-500/10 text-bone-600 hover:border-teal-500/25 hover:text-bone-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Documents Catalog */}
            {filteredDocs.length === 0 ? (
              <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-16 text-center">
                <Folder className="w-10 h-10 text-teal-500/20 mx-auto mb-3" />
                <h4 className="font-display text-[1.1rem] text-bone-100">No documents found</h4>
                <p className="text-[0.75rem] text-bone-600 mt-1 max-w-xs mx-auto">No files uploaded under this category for this patient.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden group hover:border-teal-500/25 transition-all flex flex-col justify-between">
                    <div className="h-40 overflow-hidden relative bg-physio-navy flex items-center justify-center border-b border-teal-500/10">
                      {doc.category === 'CONSENT' || doc.category === 'LAB' ? (
                        <FileText className="w-12 h-12 text-teal-500/20 group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <img 
                          src={doc.url} 
                          alt={doc.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60 group-hover:opacity-80" 
                        />
                      )}
                      <span className="absolute top-3 left-3 bg-physio-card/80 backdrop-blur-md border border-teal-500/20 text-teal-400 font-mono font-bold text-[0.58rem] px-2 py-0.5 rounded uppercase">
                        {doc.category}
                      </span>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[0.78rem] font-bold text-bone-100 truncate group-hover:text-teal-400 transition-colors" title={doc.name}>
                          {doc.name}
                        </h4>
                        <span className="text-[0.62rem] text-bone-600 mt-1 block">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex justify-end gap-1.5 mt-2 border-t border-teal-500/5 pt-3">
                        <button
                          onClick={() => setLightboxDoc(doc)}
                          className="w-7 h-7 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/15 flex items-center justify-center text-teal-400 transition-all"
                          title="View image full screen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShareDoc(doc)}
                          className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/15 flex items-center justify-center text-blue-400 transition-all"
                          title="Generate patient sharing link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 flex items-center justify-center text-bone-600 hover:text-red-400 transition-all"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diagnostic file Dropzone sidebar */}
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-5 flex flex-col gap-6">
            <div>
              <h3 className="text-[0.82rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-teal-400" /> Upload File
              </h3>
              <p className="text-[0.68rem] text-bone-600 mt-1">Upload radiographs, ultrasound scans, or clinical lab results.</p>
            </div>

            <form onSubmit={handleUploadDoc} className="flex flex-col gap-4 border-t border-teal-500/5 pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-[0.62rem] font-semibold text-bone-600 uppercase tracking-widest">Document Name *</label>
                <input name="name" required placeholder="e.g. Spine MRI L4-L5" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-3.5 py-2 outline-none focus:border-teal-500 transition-all text-[0.8rem]" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[0.62rem] font-semibold text-bone-600 uppercase tracking-widest">File Category *</label>
                <select name="category" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 outline-none focus:border-teal-500 transition-all text-[0.8rem]">
                  <option value="XRAY">X-Ray Image</option>
                  <option value="MRI">MRI Scan</option>
                  <option value="LAB">Lab Blood/Urinalysis</option>
                  <option value="CONSENT">Signed Consent Form</option>
                </select>
              </div>

              {/* Drag n Drop visual container */}
              <div className="border border-dashed border-teal-500/20 bg-physio-navy/30 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-teal-500/45 transition-all">
                <FileUp className="w-8 h-8 text-teal-500/30 mb-2" />
                <span className="text-[0.7rem] font-semibold text-bone-300">Click to Select Radiography</span>
                <span className="text-[0.58rem] text-bone-600 mt-1">JPG, PNG, PDF up to 25MB</span>
              </div>

              <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep py-2.5 rounded-lg font-ui text-[.75rem] font-semibold transition-all">
                Add to Diagnostics Gallery
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Billing */}
      {activeTab === 'billing' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards]">
          <div className="flex justify-between items-center mb-5">
            <p className="text-[.7rem] text-bone-600">{invoices?.length || 0} Invoices found</p>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-md font-semibold text-[.75rem] transition-all flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Invoice
            </button>
          </div>

          {!invoices?.length ? (
            <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-12 text-center">
              <FileText className="w-8 h-8 text-teal-500/20 mx-auto mb-3" />
              <p className="text-bone-600 text-[.82rem]">No invoices yet for this patient.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="bg-physio-card border border-teal-500/10 rounded-xl px-5 py-4 flex items-center justify-between hover:border-teal-500/25 transition-all">
                  <div>
                    <div className="font-mono text-teal-400 text-[.78rem] mb-1">{inv.invoice_number}</div>
                    <div className="text-[.7rem] text-bone-600">{new Date(inv.issued_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[.82rem] font-bold text-bone-100">₨ {inv.total_amount.toLocaleString()}</div>
                    <div className={`text-[.62rem] font-bold uppercase tracking-[.06em] mt-1 ${
                      inv.status === 'PAID' ? 'text-teal-400' : inv.status === 'PENDING' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {inv.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="animate-[fadeIn_0.3s_ease_forwards]">
          <div className="flex justify-between items-center mb-5">
            <p className="text-[.7rem] text-bone-600">{prescriptions?.length || 0} Prescriptions found</p>
            <button
              onClick={() => setIsRxModalOpen(true)}
              className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-md font-semibold text-[.75rem] transition-all flex items-center gap-2"
            >
              <Pill className="w-3.5 h-3.5" />
              Write Prescription
            </button>
          </div>

          {!prescriptions?.length ? (
            <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-12 text-center">
              <Pill className="w-8 h-8 text-teal-500/20 mx-auto mb-3" />
              <p className="text-bone-600 text-[.82rem]">No prescriptions active for this patient.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {prescriptions.map((rx: any) => (
                <div key={rx.id} className="bg-physio-card border border-teal-500/10 rounded-xl px-5 py-4 flex items-center justify-between hover:border-teal-500/25 transition-all">
                  <div>
                    <div className="font-mono text-teal-400 text-[.78rem] mb-1">Rx #{rx.id.split('-')[0]}</div>
                    <div className="text-[.7rem] text-bone-600 mb-1.5">{new Date(rx.created_at).toLocaleDateString()}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {rx.medications.map((m: any, i: number) => (
                        <span key={i} className="bg-physio-navy border border-teal-500/10 text-bone-300 px-2 py-0.5 rounded text-[.65rem]">
                          {m.name} {m.dosage}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRx(rx)}
                    className="bg-physio-navy text-teal-400 hover:bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-md text-[.75rem] font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isSoapModalOpen && (
        <SOAPNoteModal patientId={id!} onClose={() => setIsSoapModalOpen(false)} />
      )}
      {isInvoiceModalOpen && (
        <InvoiceModal patientId={id!} onClose={() => setIsInvoiceModalOpen(false)} />
      )}
      {isRxModalOpen && (
        <PrescriptionModal patientId={id!} onClose={() => setIsRxModalOpen(false)} />
      )}
      {selectedRx && patient && (
        <PrescriptionPad prescription={selectedRx} patient={patient} onClose={() => setSelectedRx(null)} />
      )}

      {/* MODAL: Create Treatment Plan */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">Prescribe Rehab Protocol</h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Create a focused physical treatment plan with goals and target routines.</p>
            
            <form onSubmit={handleAddPlan} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Protocol Title *</label>
                <input name="title" required placeholder="e.g. Frozen Shoulder Mobilization Phase II" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Duration (Weeks) *</label>
                  <input name="durationWeeks" required type="number" defaultValue={8} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Weekly Frequency *</label>
                  <input name="frequency" required placeholder="e.g. 3 sessions per week" defaultValue="3 sessions per week" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Clinical Goals (one per line) *</label>
                <textarea name="goals" required rows={3} placeholder="e.g. Increase shoulder flexion to 160 degrees&#10;Reduce rest pain score under 2/10" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none text-[.82rem]" />
              </div>

              {/* Dynamic Exercise Prescriptions */}
              <div className="border-t border-teal-500/10 pt-4 mt-2">
                <h4 className="text-[0.72rem] font-semibold text-bone-600 uppercase tracking-widest mb-3">Exercises Routines Builder</h4>
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input name="ex_name" placeholder={`Exercise #${num}`} className="w-full bg-physio-navy border border-teal-500/10 rounded px-2.5 py-1.5 text-[0.75rem] outline-none focus:border-teal-500 transition-all" />
                      </div>
                      <div className="col-span-2">
                        <input name="ex_sets" type="number" placeholder="Sets" defaultValue={3} className="w-full bg-physio-navy border border-teal-500/10 rounded px-2 py-1.5 text-[0.75rem] text-center font-mono outline-none focus:border-teal-500 transition-all" />
                      </div>
                      <div className="col-span-2">
                        <input name="ex_reps" type="number" placeholder="Reps" defaultValue={10} className="w-full bg-physio-navy border border-teal-500/10 rounded px-2 py-1.5 text-[0.75rem] text-center font-mono outline-none focus:border-teal-500 transition-all" />
                      </div>
                      <div className="col-span-3">
                        <input name="ex_resistance" placeholder="e.g. Band" className="w-full bg-physio-navy border border-teal-500/10 rounded px-2 py-1.5 text-[0.75rem] outline-none focus:border-teal-500 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-teal-500/10 pt-4">
                <button type="button" onClick={() => setIsNewPlanModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Save Protocol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Treatment Session Log */}
      {isNewSessionModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.4rem] text-bone-100 mb-1">Record Outpatient Session</h2>
            <p className="text-[.78rem] text-bone-600 mb-5">Log current physical progress, compliance rates, and pain values.</p>

            <form onSubmit={handleAddSessionLog} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Pain Before (0-10) *</label>
                  <input name="painBefore" type="number" required min={0} max={10} placeholder="8" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all font-mono text-[.82rem]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Pain After (0-10) *</label>
                  <input name="painAfter" type="number" required min={0} max={10} placeholder="4" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all font-mono text-[.82rem]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Therapy Treatment Notes *</label>
                <textarea name="notes" required rows={3} placeholder="Describe patient tolerance, mobility ranges achieved, or home compliance reports..." className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none text-[.82rem]" />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsNewSessionModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Record Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: Document Preview */}
      {lightboxDoc && (
        <div 
          className="fixed inset-0 bg-physio-deep/95 backdrop-blur-md flex flex-col justify-center items-center z-50 p-4"
          onClick={() => setLightboxDoc(null)}
        >
          <div className="max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl border border-teal-500/20 bg-physio-card p-2 flex items-center justify-center shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {lightboxDoc.category === 'CONSENT' || lightboxDoc.category === 'LAB' ? (
              <div className="w-[600px] h-[400px] flex flex-col justify-center items-center gap-4 text-bone-300 bg-physio-navy">
                <FileText className="w-16 h-16 text-teal-400" />
                <span className="font-semibold">{lightboxDoc.name}</span>
                <span className="text-bone-600 text-[0.8rem]">Document file format (PDF/TXT) preview.</span>
              </div>
            ) : (
              <img src={lightboxDoc.url} alt={lightboxDoc.name} className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            )}
          </div>
          <div className="mt-4 text-center text-bone-100" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-[0.9rem] font-bold">{lightboxDoc.name}</h4>
            <p className="text-[0.72rem] text-bone-600 mt-1 uppercase font-mono tracking-widest">{lightboxDoc.category} · Click outside to close</p>
          </div>
        </div>
      )}

      {/* MODAL: Secure Share Link */}
      {shareLink && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.4rem] text-bone-100 mb-1 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-400" /> Share Securely
            </h2>
            <p className="text-[.78rem] text-bone-600 mb-5">Generated a secure diagnostic sharing link that will automatically expire in 24 hours.</p>
            
            <div className="flex flex-col gap-4">
              <div className="bg-physio-navy border border-teal-500/10 rounded-md p-3.5 break-all text-[0.75rem] font-mono text-teal-400 select-all border-dashed select-none">
                {shareLink}
              </div>
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('Link copied to clipboard!');
                  setShareLink('');
                }}
                className="bg-teal-500 hover:bg-teal-400 text-physio-deep py-2.5 rounded-lg font-ui text-[.78rem] font-semibold transition-all"
              >
                Copy to Clipboard
              </button>

              <button 
                onClick={() => setShareLink('')}
                className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 py-2.5 rounded-lg font-semibold text-[.78rem] transition-all"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;
