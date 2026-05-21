import { useQuery } from '@tanstack/react-query';
import { Users, CalendarDays, ClipboardList, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../lib/axios';

const fetchStats = async () => {
  try {
    const res = await axiosInstance.get('/stats');
    return res.data;
  } catch {
    return {};
  }
};

const fetchRecentInvoices = async () => {
  try {
    const res = await axiosInstance.get('/invoices?limit=5');
    return res.data;
  } catch {
    return [];
  }
};

const StatCard = ({ label, value, icon: Icon, color, sub }: any) => (
  <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 hover:border-teal-500/30 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <span className="text-[.65rem] uppercase tracking-[.1em] text-bone-600 font-semibold">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="font-display text-[2.4rem] font-semibold text-bone-100 leading-none">{value ?? '—'}</div>
    {sub && <div className="text-[.68rem] text-bone-600 mt-2">{sub}</div>}
  </div>
);

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-500/10 text-green-400 border-green-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const Dashboard = () => {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: fetchStats, refetchInterval: 30000 });
  const { data: recentInvoices } = useQuery({ queryKey: ['recent-invoices'], queryFn: fetchRecentInvoices, refetchInterval: 30000 });

  const totalRevenue = recentInvoices?.reduce((sum: number, inv: any) => sum + (inv.amount_paid || 0), 0) ?? 0;

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      {/* Hero */}
      <div className="py-10 border-b border-teal-500/10 mb-10">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 rounded-full px-4 py-1.5 text-[.65rem] text-teal-400 uppercase tracking-[.12em] font-semibold mb-5">
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
          Live System
        </div>
        <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100 mb-2">
          Rehab Swat<br />
          <em className="italic text-teal-400">Command Centre</em>
        </h1>
        <p className="text-[.85rem] text-bone-600 leading-relaxed">
          Rehabilitation Center & Physiotherapy — Clinic Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Patients" value={stats?.total_patients} icon={Users} color="bg-teal-500/10 text-teal-400" sub="Registered patients" />
        <StatCard label="Total Appointments" value={stats?.total_appointments} icon={CalendarDays} color="bg-blue-500/10 text-blue-300" sub="All time" />
        <StatCard label="Today's Appointments" value={stats?.today_appointments} icon={ClipboardList} color="bg-amber-500/10 text-amber-300" sub={new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} />
        <StatCard
          label="Revenue Collected"
          value={`₨${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-green-500/10 text-green-400"
          sub="From recent invoices"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <p className="text-[.62rem] uppercase tracking-[.15em] text-teal-500 font-bold flex items-center gap-2 mb-4">
          <span className="w-5 h-px bg-teal-500 inline-block"></span>Quick Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Patient Directory', desc: 'View & register new patients', link: '/patients', color: 'border-teal-500/30 hover:border-teal-500/60' },
            { label: 'Appointments', desc: 'Schedule & manage sessions', link: '/appointments', color: 'border-blue-500/30 hover:border-blue-500/60' },
            { label: 'Billing & Invoices', desc: 'Revenue tracking & payments', link: '/billing', color: 'border-green-500/30 hover:border-green-500/60' },
          ].map(card => (
            <Link key={card.label} to={card.link}
               className={`block bg-physio-card border ${card.color} rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] cursor-pointer`}>
              <div className="text-[.85rem] font-semibold text-bone-100 mb-1">{card.label}</div>
              <div className="text-[.72rem] text-bone-600">{card.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Revenue Trend */}
        <div>
          <p className="text-[.62rem] uppercase tracking-[.15em] text-teal-500 font-bold flex items-center gap-2 mb-4">
            <span className="w-5 h-px bg-teal-500 inline-block"></span>Revenue (6 Months) ₨
          </p>
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl px-6 pt-6 pb-4 h-56 flex items-end justify-between gap-2">
            {stats?.chart_labels?.map((label: string, idx: number) => {
              const maxRev = Math.max(...(stats.chart_revenue?.length ? stats.chart_revenue : [1]));
              const rev = stats.chart_revenue?.[idx] || 0;
              const heightPct = maxRev > 0 ? Math.max((rev / maxRev) * 100, 8) : 8;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                  <div
                    className="w-full max-w-[32px] bg-teal-500/20 group-hover:bg-teal-500/50 border border-teal-500/30 rounded-t transition-all duration-300 relative flex justify-center"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute -top-7 text-[.58rem] text-teal-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₨{rev.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[.6rem] font-medium text-bone-600 mt-2 uppercase tracking-wider">{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointments Trend */}
        <div>
          <p className="text-[.62rem] uppercase tracking-[.15em] text-blue-400 font-bold flex items-center gap-2 mb-4">
            <span className="w-5 h-px bg-blue-400 inline-block"></span>Appointments (6 Months)
          </p>
          <div className="bg-physio-card border border-blue-500/10 rounded-2xl px-6 pt-6 pb-4 h-56 flex items-end justify-between gap-2">
            {stats?.chart_labels?.map((label: string, idx: number) => {
              const maxAppt = Math.max(...(stats.chart_appointments?.length ? stats.chart_appointments : [1]));
              const appt = stats.chart_appointments?.[idx] || 0;
              const heightPct = maxAppt > 0 ? Math.max((appt / maxAppt) * 100, 8) : 8;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                  <div
                    className="w-full max-w-[32px] bg-blue-500/20 group-hover:bg-blue-500/50 border border-blue-500/30 rounded-t transition-all duration-300 relative flex justify-center"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute -top-7 text-[.58rem] text-blue-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {appt} appts
                    </div>
                  </div>
                  <div className="text-[.6rem] font-medium text-bone-600 mt-2 uppercase tracking-wider">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <p className="text-[.62rem] uppercase tracking-[.15em] text-teal-500 font-bold flex items-center gap-2 mb-4">
          <span className="w-5 h-px bg-teal-500 inline-block"></span>Recent Invoices
        </p>
        {!recentInvoices?.length ? (
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-8 text-center text-bone-600 text-[.82rem]">
            No invoices yet.
          </div>
        ) : (
          <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
            <table className="w-full text-[.78rem]">
              <thead>
                <tr className="border-b border-teal-500/10">
                  <th className="text-left px-5 py-3 text-[.62rem] uppercase tracking-widest text-bone-600 font-semibold">Invoice #</th>
                  <th className="text-left px-5 py-3 text-[.62rem] uppercase tracking-widest text-bone-600 font-semibold">Date</th>
                  <th className="text-right px-5 py-3 text-[.62rem] uppercase tracking-widest text-bone-600 font-semibold">Amount</th>
                  <th className="text-right px-5 py-3 text-[.62rem] uppercase tracking-widest text-bone-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-teal-500/5 hover:bg-teal-500/5 transition-colors">
                    <td className="px-5 py-3 font-mono text-teal-400">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-bone-600">{new Date(inv.issued_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-bone-100 text-right font-semibold">₨{inv.total_amount?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block text-[.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[inv.status] || 'text-bone-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
