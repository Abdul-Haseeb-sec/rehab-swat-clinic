import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMedicalRecord } from '../../api';

interface SOAPNoteModalProps {
  patientId: string;
  onClose: () => void;
}

const SOAPNoteModal = ({ patientId, onClose }: SOAPNoteModalProps) => {
  const queryClient = useQueryClient();
  
  const [vitals, setVitals] = useState({
    bp: '', pulse: '', temp: '', weight: '', spo2: ''
  });
  const [soap, setSoap] = useState({
    chief_complaint: '', subjective: '', objective: '', assessment: '', plan: ''
  });
  const [diagnosisCodes, setDiagnosisCodes] = useState('');

  const mutation = useMutation({
    mutationFn: createMedicalRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', patientId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codes = diagnosisCodes.split(',').map(c => c.trim()).filter(c => c);
    
    mutation.mutate({
      patient_id: patientId,
      vitals: vitals,
      chief_complaint: soap.chief_complaint,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
      diagnosis_codes: codes.length > 0 ? codes : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-physio-card border border-teal-500/25 rounded-3xl w-full max-w-4xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-teal-500/10 bg-physio-navy/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-0.5">New Clinical Note (EMR)</h2>
            <p className="text-[.78rem] text-bone-600">Enter SOAP notes, vitals, and treatment plan.</p>
          </div>
          <button onClick={onClose} className="text-bone-600 hover:text-teal-400 transition-colors">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="soap-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            {/* Vitals Section */}
            <section>
              <h3 className="text-[.75rem] font-bold text-teal-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-teal-500"></span> Vitals
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { key: 'bp', label: 'BP (mmHg)', placeholder: '120/80' },
                  { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
                  { key: 'temp', label: 'Temp (°F)', placeholder: '98.6' },
                  { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
                  { key: 'spo2', label: 'SpO2 (%)', placeholder: '98' },
                ].map(vital => (
                  <div key={vital.key} className="flex flex-col gap-1.5">
                    <label className="text-[.68rem] font-semibold text-bone-600 uppercase">{vital.label}</label>
                    <input 
                      value={vitals[vital.key as keyof typeof vitals]}
                      onChange={e => setVitals({...vitals, [vital.key]: e.target.value})}
                      placeholder={vital.placeholder}
                      className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.8rem] outline-none focus:border-teal-500 transition-all placeholder:text-bone-900/50" 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* SOAP Section */}
            <section>
              <h3 className="text-[.75rem] font-bold text-teal-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-teal-500"></span> Clinical Notes (SOAP)
              </h3>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[.68rem] font-semibold text-bone-600 uppercase">Chief Complaint</label>
                  <input 
                    required
                    value={soap.chief_complaint}
                    onChange={e => setSoap({...soap, chief_complaint: e.target.value})}
                    placeholder="E.g., Lower back pain radiating to left leg"
                    className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all placeholder:text-bone-900/50" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[.68rem] font-semibold text-bone-600 uppercase">Subjective (S)</label>
                    <textarea 
                      rows={3}
                      value={soap.subjective}
                      onChange={e => setSoap({...soap, subjective: e.target.value})}
                      placeholder="Patient's report of symptoms, pain level..."
                      className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[.68rem] font-semibold text-bone-600 uppercase">Objective (O)</label>
                    <textarea 
                      rows={3}
                      value={soap.objective}
                      onChange={e => setSoap({...soap, objective: e.target.value})}
                      placeholder="Clinical observations, ROM, strength tests..."
                      className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[.68rem] font-semibold text-bone-600 uppercase">Assessment (A)</label>
                  <textarea 
                    rows={2}
                    value={soap.assessment}
                    onChange={e => setSoap({...soap, assessment: e.target.value})}
                    placeholder="Clinical diagnosis, prognosis..."
                    className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[.68rem] font-semibold text-bone-600 uppercase">Treatment Plan (P)</label>
                  <textarea 
                    rows={3}
                    value={soap.plan}
                    onChange={e => setSoap({...soap, plan: e.target.value})}
                    placeholder="Interventions performed, home exercise program, next session goals..."
                    className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
                  />
                </div>
              </div>
            </section>

            {/* Diagnosis Codes */}
            <section>
              <h3 className="text-[.75rem] font-bold text-teal-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-teal-500"></span> Diagnosis Codes
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[.68rem] font-semibold text-bone-600 uppercase">ICD-10 or Custom Codes (Comma Separated)</label>
                <input 
                  value={diagnosisCodes}
                  onChange={e => setDiagnosisCodes(e.target.value)}
                  placeholder="M54.5, M51.2"
                  className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all placeholder:text-bone-900/50" 
                />
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-teal-500/10 bg-physio-navy/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
            Cancel
          </button>
          <button 
            type="submit" 
            form="soap-form"
            disabled={mutation.isPending} 
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-6 py-2.5 rounded-md font-semibold text-[.78rem] transition-all"
          >
            {mutation.isPending ? 'Saving Note…' : 'Save Clinical Note'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SOAPNoteModal;
