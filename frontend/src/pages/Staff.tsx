import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, Clock, Clipboard, Trash, Check, X, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../lib/axios';

interface StaffUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'BILLING' | 'INTERN';
  full_name: string;
  specialization?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

interface DoctorAvailability {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// Mock shifts, attendance and leaves data for rich functionality
interface Shift {
  id: string;
  staff_name: string;
  date: string;
  time: string;
  notes: string;
}

interface Attendance {
  id: string;
  staff_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
}

interface LeaveRequest {
  id: string;
  staff_name: string;
  leave_type: 'SICK' | 'ANNUAL' | 'EMERGENCY';
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const MOCK_SHIFTS: Shift[] = [];

const MOCK_ATTENDANCE: Attendance[] = [];

const MOCK_LEAVES: LeaveRequest[] = [];

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Staff = () => {
  const queryClient = useQueryClient();
  const { role: currentUserRole } = useAuthStore();
  const isAdmin = currentUserRole === 'SUPER_ADMIN';

  // Tabs state
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'SHIFTS' | 'ATTENDANCE' | 'LEAVES'>('DIRECTORY');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<StaffUser | null>(null);

  // Availability inputs
  const [availDay, setAvailDay] = useState(0);
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('17:00');

  // Query: Fetch all users/staff
  const { data: staffList = [], isLoading: isStaffLoading } = useQuery<StaffUser[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Query: Fetch selected doctor's availability
  const { data: availabilities = [], refetch: refetchAvail } = useQuery<DoctorAvailability[]>({
    queryKey: ['availability', selectedDoctor?.id],
    queryFn: async () => {
      if (!selectedDoctor) return [];
      const res = await axiosInstance.get(`/availability/doctor/${selectedDoctor.id}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedDoctor
  });

  // Mutations
  const createStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.post('/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsAddModalOpen(false);
    }
  });

  const deactivateStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/users/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const addAvailMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.post('/availability', data);
      return res.data;
    },
    onSuccess: () => {
      refetchAvail();
    }
  });

  const deleteAvailMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/availability/${id}`);
    },
    onSuccess: () => {
      refetchAvail();
    }
  });

  // Local states for mock modules
  const [shifts] = useState<Shift[]>(MOCK_SHIFTS);
  const [attendance] = useState<Attendance[]>(MOCK_ATTENDANCE);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(MOCK_LEAVES);

  // Handlers
  const handleAddStaffSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createStaffMutation.mutate({
      email: fd.get('email'),
      password: fd.get('password'),
      role: fd.get('role'),
      full_name: fd.get('full_name'),
      specialization: fd.get('specialization') || undefined,
      phone: fd.get('phone') || undefined
    });
  };

  const handleAddAvailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    addAvailMutation.mutate({
      doctor_id: selectedDoctor.id,
      day_of_week: availDay,
      start_time: availStart + ':00',
      end_time: availEnd + ':00'
    });
  };

  const handleLeaveDecision = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setLeaves(leaves.map(req => req.id === id ? { ...req, status } : req));
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      {/* Header */}
      <div className="flex justify-between items-end py-10 border-b border-teal-500/10 mb-8">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Clinic <em className="italic text-teal-400">Staff</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            Configure clinic roles, shifts, leave requests, and clinical doctor working schedules
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-md font-ui text-[.78rem] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.3)] shrink-0"
          >
            + Register New Staff
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-teal-500/10 mb-8">
        {[
          { key: 'DIRECTORY', label: 'Staff Directory & Availability', icon: Users },
          { key: 'SHIFTS', label: 'Shift Scheduler', icon: Calendar },
          { key: 'ATTENDANCE', label: 'Attendance logs', icon: Clock },
          { key: 'LEAVES', label: 'Leave Board', icon: Clipboard }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3.5 text-[.78rem] font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.key
                ? 'border-teal-500 text-teal-400 bg-teal-500/5'
                : 'border-transparent text-bone-600 hover:text-bone-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}

      {activeTab === 'DIRECTORY' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
          {/* Staff List Table */}
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Role / Title</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isStaffLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-bone-600 text-[.82rem]">Loading...</td></tr>
                ) : (
                  Array.isArray(staffList) && staffList.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-b border-teal-500/10 hover:bg-teal-500/5 transition-colors group text-[.8rem]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-display text-[.8rem] font-semibold text-teal-400 shrink-0">
                            {staff.full_name ? staff.full_name.split(' ').filter(Boolean).map((n) => n[0] || '').join('').slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <span className="text-bone-100 font-semibold">{staff.full_name || 'Unnamed Staff'}</span>
                            {staff.specialization && (
                              <div className="text-[.65rem] text-bone-600 mt-0.5">{staff.specialization}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full px-2.5 py-0.5 text-[.62rem] font-bold uppercase font-mono">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[.75rem] text-bone-300">
                        <div>{staff.email}</div>
                        <div className="text-bone-600 mt-0.5">{staff.phone || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        {staff.is_active ? (
                          <span className="bg-green-500/10 border border-green-500/20 text-green-400 rounded px-1.5 py-0.2 text-[.62rem] font-bold uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 rounded px-1.5 py-0.2 text-[.62rem] font-bold uppercase">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {staff.role === 'DOCTOR' && (
                            <button
                              onClick={() => {
                                setSelectedDoctor(staff);
                              }}
                              className="bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/20 text-teal-400 px-2.5 py-1.5 rounded text-[.68rem] font-semibold transition-all"
                            >
                              Schedules
                            </button>
                          )}
                          {isAdmin && staff.is_active && (
                            <button
                              onClick={() => deactivateStaffMutation.mutate(staff.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded text-[.68rem] font-semibold transition-all"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Doctor Working Hours Side Panel */}
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" /> Active Schedule
              </h2>
              <p className="text-[.68rem] text-bone-600 mt-1">Configure appointment slots for the selected doctor</p>
            </div>

            {selectedDoctor ? (
              <div className="flex flex-col gap-4">
                <div className="bg-teal-500/5 border border-teal-500/10 rounded-xl p-4">
                  <div className="text-[.78rem] font-semibold text-bone-100">{selectedDoctor.full_name}</div>
                  <div className="text-[.65rem] text-teal-400 uppercase tracking-wider font-mono mt-0.5">{selectedDoctor.specialization}</div>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {!Array.isArray(availabilities) || availabilities.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-teal-500/10 rounded-xl">
                      <p className="text-[.78rem] text-bone-600">No schedules configured. Dr. is available 24/7 by default.</p>
                    </div>
                  ) : (
                    availabilities.map((avail) => (
                      <div key={avail.id} className="bg-physio-navy/60 border border-teal-500/5 rounded-xl p-3 flex justify-between items-center text-[.78rem]">
                        <div>
                          <span className="font-semibold text-bone-100">{dayNames[avail.day_of_week] || 'Unknown Day'}</span>
                          <div className="text-[.68rem] text-bone-600 mt-0.5 font-mono">
                            {avail.start_time ? avail.start_time.slice(0, 5) : ''} - {avail.end_time ? avail.end_time.slice(0, 5) : ''}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => deleteAvailMutation.mutate(avail.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isAdmin && (
                  <form onSubmit={handleAddAvailSubmit} className="border-t border-teal-500/10 pt-4 flex flex-col gap-3.5">
                    <div className="text-[.7rem] font-bold text-bone-600 uppercase tracking-widest">Add Schedule Window</div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold">Weekday</label>
                      <select
                        value={availDay}
                        onChange={(e) => setAvailDay(Number(e.target.value))}
                        className="bg-physio-navy border border-teal-500/10 rounded px-3 py-2 text-[.78rem] text-bone-300 outline-none focus:border-teal-500"
                      >
                        {dayNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold">Start Time</label>
                        <input
                          type="time"
                          value={availStart}
                          onChange={(e) => setAvailStart(e.target.value)}
                          className="bg-physio-navy border border-teal-500/10 rounded px-3 py-2 text-[.78rem] text-bone-300 outline-none focus:border-teal-500 font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[.62rem] text-bone-600 uppercase tracking-widest font-semibold">End Time</label>
                        <input
                          type="time"
                          value={availEnd}
                          onChange={(e) => setAvailEnd(e.target.value)}
                          className="bg-physio-navy border border-teal-500/10 rounded px-3 py-2 text-[.78rem] text-bone-300 outline-none focus:border-teal-500 font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addAvailMutation.isPending}
                      className="bg-teal-500 hover:bg-teal-400 text-physio-deep py-2 rounded font-semibold text-[.72rem] transition-all uppercase tracking-wider"
                    >
                      {addAvailMutation.isPending ? 'Saving…' : 'Add Time Slot'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="text-center p-10 border border-dashed border-teal-500/10 rounded-2xl">
                <Users className="w-8 h-8 text-teal-500/20 mx-auto mb-2" />
                <p className="text-[.78rem] text-bone-600">Select a doctor to view and configure their working schedule availability.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'SHIFTS' && (
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest">Shift Scheduler</h2>
              <p className="text-[.68rem] text-bone-600 mt-1">Configure duty shifts and rosters for nursing and rehab staff</p>
            </div>
            <button className="bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 text-teal-400 px-3 py-2 rounded text-[.68rem] font-semibold transition-all">
              + Plan New Shift
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3">Shift Date</th>
                <th className="px-5 py-3">Roster Hours</th>
                <th className="px-5 py-3">Supervisor Notes</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift.id} className="border-b border-teal-500/10 hover:bg-teal-500/2 text-[.78rem]">
                  <td className="px-5 py-4 font-semibold text-bone-100">{shift.staff_name}</td>
                  <td className="px-5 py-4 font-mono text-bone-300">{shift.date}</td>
                  <td className="px-5 py-4 font-mono text-teal-400 font-semibold">{shift.time}</td>
                  <td className="px-5 py-4 text-bone-600">{shift.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ATTENDANCE' && (
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest">Attendance Registry</h2>
            <p className="text-[.68rem] text-bone-600 mt-1">Audit log of check-in and check-out timestamps</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3">Date Logged</th>
                <th className="px-5 py-3">Check In</th>
                <th className="px-5 py-3">Check Out</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(record => (
                <tr key={record.id} className="border-b border-teal-500/10 hover:bg-teal-500/2 text-[.78rem]">
                  <td className="px-5 py-4 font-semibold text-bone-100">{record.staff_name}</td>
                  <td className="px-5 py-4 font-mono text-bone-300">{record.date}</td>
                  <td className="px-5 py-4 font-mono text-bone-300">{record.check_in || '—'}</td>
                  <td className="px-5 py-4 font-mono text-bone-300">{record.check_out || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-[.58rem] font-bold uppercase border ${
                      record.status === 'PRESENT' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'LEAVES' && (
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest">Leave Requests</h2>
            <p className="text-[.68rem] text-bone-600 mt-1">Approve or reject clinical leave submissions</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3">Leave Type</th>
                <th className="px-5 py-3">Duration (Dates)</th>
                <th className="px-5 py-3">Reason / Details</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-bone-600 text-[.82rem]">No leave requests.</td></tr>
              ) : (
                leaves.map(req => (
                  <tr key={req.id} className="border-b border-teal-500/10 hover:bg-teal-500/2 text-[.78rem]">
                    <td className="px-5 py-4 font-semibold text-bone-100">{req.staff_name}</td>
                    <td className="px-5 py-4">
                      <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.2 text-[.62rem] font-mono font-bold uppercase">
                        {req.leave_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-bone-300 text-[.72rem]">
                      {req.from_date} to {req.to_date}
                    </td>
                    <td className="px-5 py-4 text-bone-300">{req.reason}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[.58rem] font-bold uppercase border ${
                        req.status === 'APPROVED' 
                          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                          : req.status === 'REJECTED'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {req.status === 'PENDING' && isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'APPROVED')}
                            className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 p-1.5 rounded transition-all"
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 p-1.5 rounded transition-all"
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add New Staff Member */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">Register Clinic Staff</h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Create a secure login credentials profile for staff members.</p>
            <form onSubmit={handleAddStaffSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Full Name *</label>
                <input name="full_name" required placeholder="Dr. Abdul Haseeb" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Email Address *</label>
                  <input name="email" type="email" required placeholder="doctor@rehabswat.pk" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Password *</label>
                  <input name="password" type="password" required placeholder="••••••••" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Staff Role *</label>
                  <select name="role" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]">
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="BILLING">Billing Officer</option>
                    <option value="INTERN">Clinical Intern</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Mobile Phone</label>
                  <input name="phone" placeholder="+92 345 9876543" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Specialization / Clinical Focus</label>
                <input name="specialization" placeholder="e.g. Neurological Rehabilitation, Musculoskeletal" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>
              
              {createStaffMutation.isError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[.75rem] text-red-400">
                  Failed to create staff. Email might be in use or password too weak.
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" disabled={createStaffMutation.isPending} className="bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
                  {createStaffMutation.isPending ? 'Registering…' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
