import { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, Award, DollarSign, Activity, 
  ArrowUpRight, ArrowDownRight, Download 
} from 'lucide-react';

// Color Palette
const COLORS = {
  primary: '#14B8A6', // Teal 500
  secondary: '#2DD4BF', // Teal 400
  accent: '#E8E0D0', // Bone
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  blue: '#3B82F6',
  purple: '#8B5CF6',
  muted: 'rgba(255,255,255,0.08)',
  textMuted: '#8A9BB0'
};

const PIE_COLORS = [COLORS.primary, COLORS.blue, COLORS.purple, COLORS.warning];

const REVENUE_DATA: any[] = [];

const APPOINTMENTS_DATA: any[] = [];

const GENDER_DATA: any[] = [];

const AGE_DATA: any[] = [];

const PAIN_VAS_DATA: any[] = [];

const DOCTOR_PERFORMANCE: any[] = [];

const Reports = () => {
  const [timeframe, setTimeframe] = useState<'30days' | '6months' | '1year'>('6months');

  // Custom tooltips
  const formatCurrency = (val: number) => `₨ ${val.toLocaleString()}`;

  const CustomTooltipRevenue = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-physio-navy border border-teal-500/20 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[.72rem] text-teal-400 font-bold uppercase tracking-wider mb-2">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 items-center text-[.8rem] mt-1">
              <span className="text-bone-600 capitalize">{entry.name}:</span>
              <span className="font-mono font-bold text-bone-100">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipAppointments = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-physio-navy border border-teal-500/20 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[.72rem] text-teal-400 font-bold uppercase tracking-wider mb-2">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 items-center text-[.8rem] mt-1">
              <span className="text-bone-600 capitalize">{entry.name}:</span>
              <span className="font-mono font-bold text-bone-100">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipVAS = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-physio-navy border border-teal-500/20 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[.72rem] text-teal-400 font-bold uppercase tracking-wider mb-1">{payload[0].payload.session}</p>
          <div className="flex justify-between gap-4 items-center text-[.8rem]">
            <span className="text-bone-600">Avg Pain Score:</span>
            <span className="font-mono font-bold text-red-400">{payload[0].value} / 10</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards] pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end py-10 border-b border-teal-500/10 mb-8 gap-4">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Reports & <em className="italic text-teal-400">Analytics</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            Real-time visual insights, clinical outcomes, financial metrics, and therapist performance.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex border border-teal-500/10 rounded-lg overflow-hidden bg-physio-navy">
            {[
              { label: '30 Days', value: '30days' },
              { label: '6 Months', value: '6months' },
              { label: '1 Year', value: '1year' }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeframe(opt.value as any)}
                className={`px-4 py-2 text-[.72rem] font-semibold transition-all ${
                  timeframe === opt.value 
                    ? 'bg-teal-500 text-physio-deep' 
                    : 'text-bone-600 hover:text-bone-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <button className="bg-physio-card border border-teal-500/20 text-teal-400 hover:bg-teal-500/10 px-4 py-2 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { 
            title: 'Total Revenue', 
            val: '₨ 890,000', 
            change: '+18.4%', 
            isUp: true, 
            desc: 'VS last month', 
            icon: DollarSign, 
            color: 'text-teal-400' 
          },
          { 
            title: 'Patient Encounters', 
            val: '1,568', 
            change: '+12.1%', 
            isUp: true, 
            desc: 'VS last month', 
            icon: Users, 
            color: 'text-blue-400' 
          },
          { 
            title: 'Session Completion Rate', 
            val: '94.2%', 
            change: '+1.5%', 
            isUp: true, 
            desc: 'VS last month', 
            icon: Calendar, 
            color: 'text-green-400' 
          },
          { 
            title: 'Avg Pain Red. (VAS)', 
            val: '-6.0 points', 
            change: '-8.2%', 
            isUp: true, 
            desc: 'Improved progression', 
            icon: Activity, 
            color: 'text-red-400' 
          }
        ].map((kpi, i) => (
          <div key={i} className="bg-physio-card border border-teal-500/10 rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/25 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[.68rem] font-semibold text-bone-600 uppercase tracking-widest">{kpi.title}</span>
                <h3 className="font-display text-[1.8rem] font-semibold text-bone-100 mt-2 leading-none">{kpi.val}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/5 border border-teal-500/10 flex items-center justify-center shrink-0">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-teal-500/5 text-[.72rem]">
              <span className={`font-mono font-bold flex items-center gap-0.5 ${kpi.isUp ? 'text-green-400' : 'text-red-400'}`}>
                {kpi.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {kpi.change}
              </span>
              <span className="text-bone-600">{kpi.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Performance (Area Chart) */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" /> Revenue & Expenses
              </h2>
              <p className="text-[.68rem] text-bone-600 mt-1">Monthly earnings and operations overheads in PKR</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                <XAxis dataKey="month" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={COLORS.textMuted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip content={<CustomTooltipRevenue />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.danger} strokeWidth={1.5} fill="none" strokeDasharray="5 5" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointment Statuses (Bar Chart) */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Appointment Metrics
              </h2>
              <p className="text-[.68rem] text-bone-600 mt-1">Completed vs Cancelled session frequencies</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={APPOINTMENTS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                <XAxis dataKey="month" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={COLORS.textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltipAppointments />} />
                <Bar dataKey="completed" name="Completed Sessions" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancellations" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Demographics & Clinical Efficacy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Pain VAS Progression (Line Chart) */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" /> EMR Pain Index (VAS)
              </h2>
              <p className="text-[.68rem] text-bone-600 mt-1">Average patient VAS pain score progression across sequential visits</p>
            </div>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PAIN_VAS_DATA} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                <XAxis dataKey="session" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
                <YAxis domain={[0, 10]} stroke={COLORS.textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltipVAS />} />
                <Line type="monotone" dataKey="avgPain" name="Average VAS Score" stroke={COLORS.danger} strokeWidth={3} dot={{ r: 5, stroke: '#0F1E35', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Demographics (Donut Pie Charts) */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" /> Patient Profiles
            </h2>
            <p className="text-[.68rem] text-bone-600 mt-1">Distribution by age ranges and genders</p>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center mt-4">
            <div className="h-[140px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={GENDER_DATA} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value">
                    {GENDER_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Patients`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute font-display text-[0.8rem] font-semibold text-bone-300">Genders</div>
            </div>

            <div className="h-[140px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={AGE_DATA} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value">
                    {AGE_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 1) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Patients`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute font-display text-[0.8rem] font-semibold text-bone-300">Ages</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.65rem] text-bone-600 mt-4 border-t border-teal-500/5 pt-4">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Female
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Male
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> 18-35
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 36-60
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Performance Sheet */}
      <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-teal-500/10 bg-teal-500/2 flex justify-between items-center">
          <div>
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-400 animate-pulse" /> Therapist KPIs & Performance
            </h2>
            <p className="text-[.68rem] text-bone-600 mt-1">Audit clinical load, treatment completion rate, and revenue contributions</p>
          </div>
          <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-md px-3 py-1 text-[.68rem] font-mono font-semibold">
            Active Clinicians (4)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[0.8rem]">
            <thead>
              <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[0.65rem] uppercase tracking-wider text-teal-500 font-bold">
                <th className="px-6 py-4">Therapist Name</th>
                <th className="px-6 py-4">Clinical Specialty</th>
                <th className="px-6 py-4 text-center">Completed Appointments</th>
                <th className="px-6 py-4 text-center">Total Therapy Sessions</th>
                <th className="px-6 py-4 text-right">Invoiced Revenue (₨)</th>
                <th className="px-6 py-4 text-right">Patient Satisfaction</th>
              </tr>
            </thead>
            <tbody>
              {DOCTOR_PERFORMANCE.map((doc) => (
                <tr key={doc.id} className="border-b border-teal-500/10 hover:bg-teal-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-bone-100 group-hover:text-teal-400 transition-colors">
                      {doc.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-physio-navy border border-teal-500/10 text-bone-300 rounded px-2 py-0.5 text-[0.68rem]">
                      {doc.specialty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-bone-300">
                    {doc.completed}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-bone-300">
                    {doc.sessions}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-bone-200">
                    ₨ {doc.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-teal-400 font-semibold">
                    {doc.satisfaction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
