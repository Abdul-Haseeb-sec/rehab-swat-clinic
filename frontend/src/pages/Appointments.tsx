import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchAppointments, createAppointment, fetchPatients } from '../api';
import { Clock, User, Calendar } from 'lucide-react';

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

const Appointments = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
  });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsModalOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      patient_id: fd.get('patient_id'),
      scheduled_at: fd.get('scheduled_at'),
      duration_min: Number(fd.get('duration_min')),
      type: fd.get('type'),
      notes: fd.get('notes') || undefined,
    });
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      {/* Header */}
      <div className="flex justify-between items-end py-10 border-b border-teal-500/10 mb-10">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Schedule &<br /><em className="italic text-teal-400">Appointments</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">Manage all clinic appointments and sessions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-md font-ui text-[.78rem] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.3)] shrink-0"
        >
          + Book Appointment
        </button>
      </div>

      {/* Appointments List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="text-center text-bone-600 py-16">Loading appointments...</div>
        ) : !appointments?.length ? (
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-16 text-center">
            <Calendar className="w-10 h-10 text-teal-500/30 mx-auto mb-4" />
            <p className="text-bone-600 text-[.85rem]">No appointments yet. Book the first one.</p>
          </div>
        ) : (
          appointments.map((appt: any) => {
            const dt = new Date(appt.scheduled_at);
            const patient = patients?.find((p: any) => p.id === appt.patient_id);
            return (
              <div key={appt.id} className="bg-physio-card border border-teal-500/10 rounded-xl px-5 py-4 flex items-center gap-5 hover:border-teal-500/30 transition-all cursor-pointer">
                {/* Time block */}
                <div className="text-center min-w-[52px]">
                  <div className="font-display text-[1.1rem] font-semibold text-teal-400 leading-none">
                    {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[.6rem] text-bone-900 uppercase mt-0.5">
                    {dt.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="w-px h-10 bg-teal-500/10"></div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[.85rem] font-semibold text-bone-100 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    {patient?.full_name || 'Unknown Patient'}
                  </div>
                  <div className="text-[.7rem] text-bone-600 mt-0.5 flex items-center gap-3">
                    <span>{typeLabels[appt.type] || appt.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{appt.duration_min} min
                    </span>
                  </div>
                  {appt.notes && (
                    <p className="text-[.68rem] text-bone-900 mt-1 truncate">{appt.notes}</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`text-[.62rem] font-bold uppercase tracking-[.06em] px-3 py-1 rounded-full border shrink-0 ${statusColors[appt.status] || 'bg-bone-900/10 text-bone-600'}`}>
                  {appt.status}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Book Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">Book Appointment</h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Schedule a new session for a patient.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Patient</label>
                <select name="patient_id" required className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all">
                  <option value="">— Select Patient —</option>
                  {patients?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Date & Time</label>
                <input name="scheduled_at" type="datetime-local" required
                  className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Type</label>
                  <select name="type" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all">
                    <option value="INITIAL_ASSESSMENT">Initial Assessment</option>
                    <option value="FOLLOW_UP">Follow-Up</option>
                    <option value="REHAB_SESSION">Rehab Session</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Duration (min)</label>
                  <input name="duration_min" type="number" defaultValue={30} min={10}
                    className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Notes (optional)</label>
                <textarea name="notes" rows={2}
                  className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none" />
              </div>

              {mutation.isError && (
                <p className="text-red-400 text-[.72rem]">Failed to book appointment. Try again.</p>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
                  {mutation.isPending ? 'Saving…' : 'Book Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
