import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPrescription } from '../../api';
import { Pill, Plus, Trash2 } from 'lucide-react';

interface PrescriptionModalProps {
  patientId: string;
  onClose: () => void;
}

const PrescriptionModal = ({ patientId, onClose }: PrescriptionModalProps) => {
  const queryClient = useQueryClient();
  
  const [medications, setMedications] = useState([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: createPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions', patientId] });
      onClose();
    },
  });

  const handleAddMed = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const handleRemoveMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedications(newMeds);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty rows
    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0) return alert("Add at least one medication.");
    
    mutation.mutate({
      patient_id: patientId,
      medications: validMeds,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-physio-card border border-teal-500/25 rounded-3xl w-full max-w-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-teal-500/10 bg-physio-navy/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400 border border-teal-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-[1.2rem] text-bone-100 mb-0.5">Write Prescription</h2>
              <p className="text-[.78rem] text-bone-600">Add medications and Rx instructions.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-bone-600 hover:text-teal-400 transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="rx-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-4">
              {medications.map((med, idx) => (
                <div key={idx} className="bg-physio-navy border border-teal-500/10 rounded-xl p-4 relative group">
                  <div className="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleRemoveMed(idx)} className="bg-red-500/10 text-red-400 p-1.5 rounded-full border border-red-500/20 hover:bg-red-500/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[.62rem] font-semibold text-bone-600 uppercase tracking-widest">Medication Name</label>
                      <input type="text" required value={med.name} onChange={e => handleChange(idx, 'name', e.target.value)} placeholder="e.g., Ibuprofen" className="bg-physio-deep border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.82rem] outline-none focus:border-teal-500 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[.62rem] font-semibold text-bone-600 uppercase tracking-widest">Dosage</label>
                      <input type="text" required value={med.dosage} onChange={e => handleChange(idx, 'dosage', e.target.value)} placeholder="e.g., 400mg" className="bg-physio-deep border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.82rem] outline-none focus:border-teal-500 transition-all" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[.62rem] font-semibold text-bone-600 uppercase tracking-widest">Frequency</label>
                      <input type="text" required value={med.frequency} onChange={e => handleChange(idx, 'frequency', e.target.value)} placeholder="e.g., 1 tablet twice a day (BID)" className="bg-physio-deep border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.82rem] outline-none focus:border-teal-500 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[.62rem] font-semibold text-bone-600 uppercase tracking-widest">Duration</label>
                      <input type="text" required value={med.duration} onChange={e => handleChange(idx, 'duration', e.target.value)} placeholder="e.g., 5 Days" className="bg-physio-deep border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.82rem] outline-none focus:border-teal-500 transition-all" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[.62rem] font-semibold text-bone-600 uppercase tracking-widest">Special Instructions</label>
                    <input type="text" value={med.instructions} onChange={e => handleChange(idx, 'instructions', e.target.value)} placeholder="e.g., Take after meals" className="bg-physio-deep border border-teal-500/10 rounded-md text-bone-300 px-3 py-2 text-[.82rem] outline-none focus:border-teal-500 transition-all" />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleAddMed} className="text-[.75rem] font-semibold text-teal-400 flex items-center justify-center gap-2 border border-dashed border-teal-500/30 rounded-xl py-3 hover:bg-teal-500/5 transition-colors">
              <Plus className="w-4 h-4" /> Add Another Medication
            </button>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Doctor's Notes (Optional)</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any general advice or follow-up instructions..."
                className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-teal-500/10 bg-physio-navy/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
            Cancel
          </button>
          <button 
            type="submit" 
            form="rx-form"
            disabled={mutation.isPending} 
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-6 py-2.5 rounded-md font-semibold text-[.78rem] transition-all flex items-center gap-2"
          >
            {mutation.isPending ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PrescriptionModal;
