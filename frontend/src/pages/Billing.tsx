import { useQuery } from '@tanstack/react-query';
import { CreditCard, ArrowUpRight, ArrowDownRight, Clock, Search, FileText } from 'lucide-react';
import { fetchInvoices } from '../api';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PAID: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  OVERDUE: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const Billing = () => {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  });

  const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + inv.amount_paid, 0) || 0;
  const pendingRevenue = invoices?.filter((i: any) => i.status !== 'CANCELLED').reduce((sum: number, inv: any) => sum + (inv.total_amount - inv.amount_paid), 0) || 0;

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-display text-[2.5rem] font-light text-bone-100 tracking-tight leading-tight">Billing &amp; <span className="font-serif italic text-teal-500">Invoices</span></h1>
          <p className="text-[.82rem] text-bone-600 mt-2">Manage clinic finances and patient payments.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-24 h-24 text-teal-500 -mt-6 -mr-6" />
          </div>
          <div className="text-[.62rem] uppercase tracking-widest text-teal-500 font-bold mb-2">Total Revenue</div>
          <div className="font-display text-[2rem] text-bone-100 font-light">₨ {totalRevenue.toLocaleString()}</div>
          <div className="text-[.7rem] text-teal-400 flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> All time collected
          </div>
        </div>

        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-24 h-24 text-amber-500 -mt-6 -mr-6" />
          </div>
          <div className="text-[.62rem] uppercase tracking-widest text-amber-500 font-bold mb-2">Pending / Due</div>
          <div className="font-display text-[2rem] text-bone-100 font-light">₨ {pendingRevenue.toLocaleString()}</div>
          <div className="text-[.7rem] text-amber-400 flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3 h-3" /> Uncollected balance
          </div>
        </div>

        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileText className="w-24 h-24 text-blue-500 -mt-6 -mr-6" />
          </div>
          <div className="text-[.62rem] uppercase tracking-widest text-blue-500 font-bold mb-2">Total Invoices</div>
          <div className="font-display text-[2rem] text-bone-100 font-light">{invoices?.length || 0}</div>
          <div className="text-[.7rem] text-bone-600 mt-1">Issued by clinic</div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-teal-500/10 flex justify-between items-center bg-physio-navy/30">
          <h2 className="text-[.9rem] font-semibold text-bone-100">Recent Invoices</h2>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-bone-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search invoice number..." 
              className="w-full bg-physio-deep border border-teal-500/20 rounded-full py-1.5 pl-9 pr-4 text-[.75rem] text-bone-300 outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-bone-600">Loading invoices...</div>
        ) : !invoices?.length ? (
          <div className="p-12 text-center text-bone-600 flex flex-col items-center">
            <FileText className="w-10 h-10 text-teal-500/20 mb-3" />
            No invoices have been generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-teal-500/10 bg-physio-navy/20">
                  <th className="p-4 text-[.62rem] font-bold text-bone-600 uppercase tracking-wider">Invoice No.</th>
                  <th className="p-4 text-[.62rem] font-bold text-bone-600 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-[.62rem] font-bold text-bone-600 uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-[.62rem] font-bold text-bone-600 uppercase tracking-wider">Balance Due</th>
                  <th className="p-4 text-[.62rem] font-bold text-bone-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-500/5">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-physio-navy/30 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-teal-400 text-[.78rem]">{inv.invoice_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[.78rem] text-bone-300">{new Date(inv.issued_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[.82rem] font-medium text-bone-100">₨ {inv.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[.82rem] font-medium text-bone-300">
                        ₨ {(inv.total_amount - inv.amount_paid).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[.62rem] font-bold uppercase tracking-[.06em] px-2.5 py-1 rounded border ${statusColors[inv.status] || ''}`}>
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

export default Billing;
