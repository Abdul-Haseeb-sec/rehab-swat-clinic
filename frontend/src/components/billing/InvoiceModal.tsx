import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvoice } from '../../api';
import { FileText, Calculator } from 'lucide-react';

interface InvoiceModalProps {
  patientId: string;
  onClose: () => void;
}

const InvoiceModal = ({ patientId, onClose }: InvoiceModalProps) => {
  const queryClient = useQueryClient();
  
  const [subtotal, setSubtotal] = useState(2500); // Default Consultation fee
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const totalAmount = Math.max(0, subtotal - discount);

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['patient-invoices', patientId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      patient_id: patientId,
      subtotal,
      discount,
      total_amount: totalAmount,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-physio-card border border-teal-500/25 rounded-3xl w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-teal-500/10 bg-physio-navy/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400 border border-teal-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-[1.2rem] text-bone-100 mb-0.5">Generate Invoice</h2>
              <p className="text-[.78rem] text-bone-600">Bill patient for services rendered.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-bone-600 hover:text-teal-400 transition-colors">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="invoice-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Base Amount (₨)</label>
              <input 
                type="number"
                required
                min="0"
                value={subtotal}
                onChange={e => setSubtotal(parseInt(e.target.value) || 0)}
                className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all font-mono" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Discount Amount (₨)</label>
              <input 
                type="number"
                min="0"
                value={discount}
                onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all font-mono" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">Notes / Description</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="E.g., Consultation & Modalities..."
                className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none placeholder:text-bone-900/50" 
              />
            </div>

            {/* Total Display */}
            <div className="mt-2 bg-gradient-to-br from-teal-500/10 to-physio-navy border border-teal-500/20 rounded-xl p-5 relative overflow-hidden">
              <Calculator className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-teal-500/5" />
              <div className="relative">
                <div className="flex justify-between items-center text-[.82rem] text-bone-300 mb-1">
                  <span>Subtotal</span>
                  <span>₨ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[.82rem] text-teal-400 mb-3 pb-3 border-b border-teal-500/10">
                  <span>Discount</span>
                  <span>- ₨ {discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[.68rem] font-bold text-bone-600 uppercase tracking-widest">Net Total</span>
                  <span className="font-display text-[2rem] font-semibold text-bone-100 leading-none">
                    ₨ {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
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
            form="invoice-form"
            disabled={mutation.isPending} 
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-6 py-2.5 rounded-md font-semibold text-[.78rem] transition-all flex items-center gap-2"
          >
            {mutation.isPending ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
