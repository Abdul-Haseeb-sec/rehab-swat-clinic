import { useEffect } from 'react';
import { Phone, MapPin, Printer, X } from 'lucide-react';

interface PrescriptionPadProps {
  prescription: any;
  patient: any;
  onClose: () => void;
}

const PrescriptionPad = ({ prescription, patient, onClose }: PrescriptionPadProps) => {
  const handlePrint = () => window.print();

  // Lock scroll on body while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* ── Dedicated @media print stylesheet ─────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #rx-printable-root { display: block !important; }
          #rx-printable-root .rx-no-print { display: none !important; }
          #rx-printable-root .rx-page {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            padding: 2cm !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Screen overlay ─────────────────────────────────────────────── */}
      <div
        id="rx-printable-root"
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        {/* Floating action bar — hidden on print */}
        <div className="rx-no-print sticky top-0 z-10 flex justify-end gap-3 px-8 py-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-physio-deep font-semibold text-[.82rem] px-5 py-2 rounded-lg shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-physio-navy text-bone-300 hover:text-bone-100 border border-white/10 font-semibold text-[.82rem] px-4 py-2 rounded-lg transition-all"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>

        {/* ── A4 Paper ──────────────────────────────────────────────────── */}
        <div className="rx-page bg-white text-gray-900 w-full max-w-[21cm] mx-auto shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-xl p-[2cm] relative min-h-[29.7cm] mb-12 mt-2">

          {/* Clinic Header */}
          <div className="flex justify-between items-start border-b-[3px] border-teal-700 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-lg">R</div>
                <h1 className="font-serif text-[2.2rem] font-bold text-teal-900 leading-none tracking-tight">Rehab Swat</h1>
              </div>
              <p className="text-[.78rem] text-gray-500 uppercase tracking-[.15em] font-semibold pl-[52px]">
                Rehabilitation & Physiotherapy Center
              </p>
            </div>
            <div className="text-right text-[.78rem] text-gray-500 space-y-1.5 mt-1">
              <div className="flex items-center justify-end gap-2">
                <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                <span>0333-9876543</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                <span>Mingora, Swat, KPK, Pakistan</span>
              </div>
            </div>
          </div>

          {/* Patient Info Strip */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 mb-10 flex justify-between items-center">
            <div>
              <div className="font-bold text-gray-900 text-[1.15rem] mb-0.5">{patient.full_name}</div>
              <div className="text-[.78rem] text-gray-500">
                MRN: <span className="font-mono font-semibold text-gray-700">{patient.mrn}</span>
                {' • '}{patient.gender}
                {patient.dob && ` • ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`}
              </div>
            </div>
            <div className="text-right text-[.78rem]">
              <div className="text-gray-500 mb-1">
                Date: <span className="font-semibold text-gray-800">{new Date(prescription.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="text-gray-500">
                Rx No: <span className="font-mono font-semibold text-teal-700">{prescription.id.split('-')[0].toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Rx Symbol */}
          <div className="font-serif italic text-[3.5rem] text-teal-800 leading-none mb-8 select-none">℞</div>

          {/* Medications Table */}
          <div className="mb-10">
            <table className="w-full text-[.88rem]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left pb-2 text-[.68rem] uppercase tracking-widest text-gray-400 font-semibold w-8">#</th>
                  <th className="text-left pb-2 text-[.68rem] uppercase tracking-widest text-gray-400 font-semibold">Medication</th>
                  <th className="text-left pb-2 text-[.68rem] uppercase tracking-widest text-gray-400 font-semibold">Dosage</th>
                  <th className="text-left pb-2 text-[.68rem] uppercase tracking-widest text-gray-400 font-semibold">Frequency</th>
                  <th className="text-left pb-2 text-[.68rem] uppercase tracking-widest text-gray-400 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medications.map((med: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 text-gray-400 text-[.78rem]">{idx + 1}.</td>
                    <td className="py-3">
                      <div className="font-bold text-gray-900">{med.name}</div>
                      {med.instructions && (
                        <div className="text-[.72rem] text-teal-700 italic mt-0.5">{med.instructions}</div>
                      )}
                    </td>
                    <td className="py-3 text-gray-700 font-mono">{med.dosage}</td>
                    <td className="py-3 text-gray-700">{med.frequency}</td>
                    <td className="py-3 text-gray-700 whitespace-nowrap">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Doctor's Notes */}
          {prescription.notes && (
            <div className="mb-10 bg-teal-50 border border-teal-200 rounded-lg px-5 py-4">
              <h3 className="text-[.68rem] font-bold text-teal-800 uppercase tracking-widest mb-2">Doctor's Notes</h3>
              <p className="text-[.88rem] text-gray-700 leading-relaxed">{prescription.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="absolute bottom-[2cm] left-[2cm] right-[2cm]">
            <div className="flex justify-between items-end border-t border-gray-200 pt-6">
              <div className="text-[.68rem] text-gray-400 leading-relaxed max-w-[60%]">
                This document is computer-generated by Rehab Swat CMS.<br />
                Valid for 30 days from the date of issue. Not valid without clinic stamp for controlled substances.
              </div>
              <div className="text-center w-44">
                <div className="h-10 border-b border-dotted border-gray-400 mb-2"></div>
                <div className="text-[.75rem] font-semibold text-gray-600">Prescribing Physician</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default PrescriptionPad;
