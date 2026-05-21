import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPatients, createPatient } from '../api';
import { Users, Search } from 'lucide-react';

const Patients = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsModalOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      full_name: fd.get('full_name'),
      dob: fd.get('dob'),
      gender: fd.get('gender'),
      phone: fd.get('phone'),
      cnic: fd.get('cnic') || undefined,
      address: fd.get('address') || undefined,
      blood_group: fd.get('blood_group') || undefined,
    });
  };

  const filtered = patients?.filter((p: any) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      {/* Header */}
      <div className="flex justify-between items-end py-10 border-b border-teal-500/10 mb-8">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Patient <em className="italic text-teal-400">Directory</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            {patients?.length ?? 0} registered patients
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-md font-ui text-[.78rem] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.3)] shrink-0"
        >
          + New Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-900" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN or phone…"
          className="w-full bg-physio-card border border-teal-500/10 rounded-xl text-bone-300 pl-11 pr-4 py-3 text-[.82rem] outline-none focus:border-teal-500 transition-all placeholder:text-bone-900/50"
        />
      </div>

      {/* Table */}
      <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
              <th className="px-5 py-3.5">MRN</th>
              <th className="px-5 py-3.5">Patient Name</th>
              <th className="px-5 py-3.5">Gender</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Blood Group</th>
              <th className="px-5 py-3.5">Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-bone-600">Loading...</td></tr>
            ) : !filtered?.length ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Users className="w-10 h-10 text-teal-500/20 mx-auto mb-3" />
                  <p className="text-bone-600 text-[.85rem]">No patients found.</p>
                </td>
              </tr>
            ) : (
              filtered.map((p: any) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="border-b border-teal-500/10 hover:bg-teal-500/5 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5 font-mono text-teal-400 text-[.72rem]">{p.mrn}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-display text-[.8rem] font-semibold text-teal-400 shrink-0">
                        {p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-bone-100 font-semibold text-[.82rem] group-hover:text-teal-400 transition-colors">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-bone-300 text-[.78rem] capitalize">{p.gender.toLowerCase()}</td>
                  <td className="px-5 py-3.5 font-mono text-bone-300 text-[.75rem]">{p.phone}</td>
                  <td className="px-5 py-3.5">
                    {p.blood_group ? (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2.5 py-0.5 text-[.62rem] font-bold uppercase">{p.blood_group}</span>
                    ) : <span className="text-bone-900 text-[.72rem]">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-bone-600 text-[.72rem]">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">Register Patient</h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Enter details for the new patient.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Full Name *</label>
                <input name="full_name" required className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Date of Birth *</label>
                  <input name="dob" type="date" required className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Gender *</label>
                  <select name="gender" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Phone *</label>
                  <input name="phone" required className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Blood Group</label>
                  <select name="blood_group" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all">
                    <option value="">— Select —</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">CNIC</label>
                <input name="cnic" placeholder="35202-1234567-1" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Address</label>
                <textarea name="address" rows={2} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
                  {mutation.isPending ? 'Saving…' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
