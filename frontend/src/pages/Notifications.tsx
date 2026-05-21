import { useState, useEffect } from 'react';
import { 
  Bell, Check, Trash2, Calendar, 
  CreditCard, Package, Settings, Filter 
} from 'lucide-react';

interface ClinicNotification {
  id: string;
  title: string;
  message: string;
  type: 'APPOINTMENT' | 'BILLING' | 'INVENTORY' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_read: boolean;
  created_at: string;
}



const Notifications = () => {
  const [notifications, setNotifications] = useState<ClinicNotification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Load from local storage
  useEffect(() => {
    const stored = localStorage.getItem('rehab-swat-notifications');
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      setNotifications([]);
    }
  }, []);

  const saveNotifications = (newNotifs: ClinicNotification[]) => {
    setNotifications(newNotifs);
    localStorage.setItem('rehab-swat-notifications', JSON.stringify(newNotifs));
    // Trigger storage event to update the sidebar unread count
    window.dispatchEvent(new Event('storage'));
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    saveNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, is_read: true }));
    saveNotifications(updated);
  };

  const handleDelete = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      saveNotifications([]);
    }
  };

  // Filters
  const filtered = notifications.filter(n => {
    const readMatch = 
      filter === 'ALL' || 
      (filter === 'UNREAD' && !n.is_read) || 
      (filter === 'READ' && n.is_read);
    const typeMatch = typeFilter === 'ALL' || n.type === typeFilter;
    return readMatch && typeMatch;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT': return Calendar;
      case 'BILLING': return CreditCard;
      case 'INVENTORY': return Package;
      default: return Settings;
    }
  };

  const getSeverityStyle = (severity: string, isRead: boolean) => {
    if (isRead) return 'border-transparent text-bone-600 bg-teal-500/5';
    switch (severity) {
      case 'CRITICAL': return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'WARNING': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      default: return 'border-teal-500/20 bg-teal-500/10 text-teal-400';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards] pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end py-10 border-b border-teal-500/10 mb-8 gap-4">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Clinical <em className="italic text-teal-400">Alerts</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            Stay updated with clinical schedule changes, medical resource thresholds, and invoicing audits.
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-5 py-2.5 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-5 py-2.5 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats row & Filters */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Filters Sidebar */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-5 flex flex-col gap-6">
          <div>
            <h3 className="text-[.75rem] font-semibold text-bone-600 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-teal-500" /> Read Filters
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'All Notifications', value: 'ALL', count: notifications.length },
                { label: 'Unread Alerts', value: 'UNREAD', count: unreadCount },
                { label: 'Archived / Read', value: 'READ', count: notifications.filter(n => n.is_read).length }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value as any)}
                  className={`w-full flex justify-between items-center px-4 py-2.5 rounded-lg text-[.8rem] transition-all ${
                    filter === opt.value 
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold' 
                      : 'text-bone-600 hover:bg-teal-500/5 hover:text-bone-300 border border-transparent'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="font-mono text-[.72rem] bg-physio-navy/55 px-2 py-0.5 rounded-full border border-teal-500/5">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-teal-500/10 pt-5">
            <h3 className="text-[.75rem] font-semibold text-bone-600 uppercase tracking-widest flex items-center gap-2 mb-4">
              Category
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'All Categories', value: 'ALL' },
                { label: 'Appointments', value: 'APPOINTMENT' },
                { label: 'Billing & Invoices', value: 'BILLING' },
                { label: 'Inventory & Stock', value: 'INVENTORY' },
                { label: 'System Audits', value: 'SYSTEM' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-[.8rem] transition-all ${
                    typeFilter === opt.value 
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold' 
                      : 'text-bone-600 hover:bg-teal-500/5 hover:text-bone-300 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-16 text-center">
              <Bell className="w-10 h-10 text-teal-500/20 mx-auto mb-4 animate-bounce" />
              <h3 className="font-display text-[1.2rem] text-bone-100">No alerts found</h3>
              <p className="text-bone-600 text-[.78rem] mt-2 max-w-sm mx-auto">
                {filter === 'UNREAD' 
                  ? 'All notifications have been cleared and marked as read!'
                  : 'There are no active notifications matching the selected filters.'}
              </p>
            </div>
          ) : (
            filtered.map((n) => {
              const Icon = getIcon(n.type);
              return (
                <div 
                  key={n.id}
                  className={`bg-physio-card border transition-all duration-300 rounded-2xl p-5 flex gap-4 items-start relative ${
                    n.is_read 
                      ? 'border-teal-500/5 opacity-65 hover:opacity-90' 
                      : 'border-teal-500/15 shadow-[0_8px_20px_rgba(20,184,166,0.03)] hover:border-teal-500/30'
                  }`}
                >
                  {/* Category icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-teal-500/10 ${getSeverityStyle(n.severity, n.is_read)}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Message body */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-[.85rem] font-semibold transition-colors ${n.is_read ? 'text-bone-300' : 'text-bone-100'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping inline-block" />
                      )}
                      <span className="bg-physio-navy border border-teal-500/10 rounded px-1.5 py-0.2 text-[.58rem] font-mono font-bold text-bone-600 uppercase tracking-widest ml-auto lg:ml-0">
                        {n.type}
                      </span>
                    </div>
                    <p className="text-[.78rem] text-bone-300 mt-1.5 leading-relaxed">{n.message}</p>
                    <div className="text-[.65rem] text-bone-600 font-mono mt-3">
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at{' '}
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Individual actions */}
                  <div className="flex flex-col gap-2 shrink-0 self-stretch justify-between">
                    {!n.is_read ? (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        title="Mark as Read"
                        className="w-8 h-8 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/15 flex items-center justify-center text-teal-400 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8 h-8" /> // placeholder spacer
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Delete alert"
                      className="w-8 h-8 rounded-lg bg-red-500/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 flex items-center justify-center text-bone-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
