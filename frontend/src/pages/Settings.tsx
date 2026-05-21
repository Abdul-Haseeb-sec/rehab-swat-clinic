import { useState, useEffect } from 'react';
import { 
  Building2, Stethoscope, MessageSquare, 
  Database, Plus, Edit2, Trash2, Save, CloudLightning, Check, AlertCircle 
} from 'lucide-react';

interface ClinicProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  taxNumber: string;
  operatingHours: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price: number;
}

interface NotificationTemplate {
  id: string;
  name: string;
  trigger: string;
  template: string;
}

interface BackupLog {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  status: 'SUCCESS' | 'FAILED';
}

const DEFAULT_PROFILE: ClinicProfile = {
  name: 'Rehab Swat Physical Therapy Clinic',
  phone: '+92 346 9876543',
  email: 'info@rehabswat.com',
  address: 'Main Kanju Road, Near Swat Board, Swat, KPK',
  currency: 'PKR (₨)',
  taxNumber: 'NTN-8928394-1',
  operatingHours: '09:00 AM - 08:00 PM (Monday - Saturday)'
};



const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'templates' | 'backups'>('profile');

  // Stateful CRUD models
  const [profile, setProfile] = useState<ClinicProfile>(DEFAULT_PROFILE);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [backups, setBackups] = useState<BackupLog[]>([]);

  // Modals & forms
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const stProfile = localStorage.getItem('rehab-swat-settings-profile');
    const stServices = localStorage.getItem('rehab-swat-settings-services');
    const stTemplates = localStorage.getItem('rehab-swat-settings-templates');
    const stBackups = localStorage.getItem('rehab-swat-settings-backups');

    if (stProfile) setProfile(JSON.parse(stProfile));
    setServices(stServices ? JSON.parse(stServices) : []);
    setTemplates(stTemplates ? JSON.parse(stTemplates) : []);
    setBackups(stBackups ? JSON.parse(stBackups) : []);
  }, []);

  // Save changes triggers
  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updated: ClinicProfile = {
      name: fd.get('name') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string,
      address: fd.get('address') as string,
      currency: fd.get('currency') as string,
      taxNumber: fd.get('taxNumber') as string,
      operatingHours: fd.get('operatingHours') as string
    };
    setProfile(updated);
    localStorage.setItem('rehab-swat-settings-profile', JSON.stringify(updated));
    triggerSuccess();
  };

  const handleSaveTemplates = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updated = templates.map((t) => ({
      ...t,
      template: fd.get(`template-${t.id}`) as string
    }));
    setTemplates(updated);
    localStorage.setItem('rehab-swat-settings-templates', JSON.stringify(updated));
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      duration_min: Number(fd.get('duration_min')),
      price: Number(fd.get('price'))
    };

    let updated: ServiceItem[];
    if (selectedService) {
      updated = services.map((s) => s.id === selectedService.id ? { ...s, ...data } : s);
    } else {
      const newSrv: ServiceItem = {
        id: `srv-${Date.now()}`,
        ...data
      };
      updated = [...services, newSrv];
    }

    setServices(updated);
    localStorage.setItem('rehab-swat-settings-services', JSON.stringify(updated));
    setIsServiceModalOpen(false);
    setSelectedService(null);
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Delete this service from the catalog? This is irreversible.')) {
      const updated = services.filter((s) => s.id !== id);
      setServices(updated);
      localStorage.setItem('rehab-swat-settings-services', JSON.stringify(updated));
    }
  };

  const handleTriggerBackup = () => {
    setIsBackupRunning(true);
    setTimeout(() => {
      const newBak: BackupLog = {
        id: `bak-${Date.now()}`,
        filename: `rehab_swat_manual_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.sql`,
        size: '125.8 MB',
        created_at: new Date().toISOString(),
        status: 'SUCCESS'
      };
      const updated = [newBak, ...backups];
      setBackups(updated);
      localStorage.setItem('rehab-swat-settings-backups', JSON.stringify(updated));
      setIsBackupRunning(false);
    }, 2000);
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards] pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end py-10 border-b border-teal-500/10 mb-8 gap-4">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            System <em className="italic text-teal-400">Settings</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            Customize clinic profiles, manage service catalog offerings, edit templates, and review database system backups.
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-2.5 flex items-center gap-2 text-green-400 text-[.78rem] font-semibold animate-bounce shadow-[0_4px_12px_rgba(16,185,129,0.1)]">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Navigation Tabs Column */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-5 flex flex-col gap-2">
          {[
            { id: 'profile', label: 'Clinic Profile', icon: Building2 },
            { id: 'services', label: 'Service Catalog', icon: Stethoscope },
            { id: 'templates', label: 'WhatsApp Templates', icon: MessageSquare },
            { id: 'backups', label: 'Backups & System', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[.8rem] transition-all font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'text-bone-600 hover:bg-teal-500/5 hover:text-bone-300 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab contents Column */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl p-8">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              <div>
                <h3 className="font-display text-[1.4rem] text-bone-100 mb-1">Clinic Profile</h3>
                <p className="text-[.78rem] text-bone-600">Primary branch directories and default system localization values.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-teal-500/10 pt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Clinic Name *</label>
                  <input name="name" required defaultValue={profile.name} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Primary Contact *</label>
                  <input name="phone" required defaultValue={profile.phone} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Email Address *</label>
                  <input name="email" type="email" required defaultValue={profile.email} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Localization Currency *</label>
                  <input name="currency" required defaultValue={profile.currency} disabled className="bg-physio-navy/55 border border-teal-500/5 rounded-md text-bone-600 px-4 py-2.5 outline-none text-[.82rem] cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">National Tax Number (NTN)</label>
                  <input name="taxNumber" defaultValue={profile.taxNumber} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Clinical Operating Hours</label>
                  <input name="operatingHours" defaultValue={profile.operatingHours} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Physical Address *</label>
                <textarea name="address" required rows={2} defaultValue={profile.address} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none text-[.82rem]" />
              </div>

              <div className="flex justify-end border-t border-teal-500/10 pt-6">
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-lg font-ui text-[.78rem] font-semibold transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Profile Configuration
                </button>
              </div>
            </form>
          )}

          {/* SERVICE CATALOG TAB */}
          {activeTab === 'services' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display text-[1.4rem] text-bone-100 mb-1">Service Catalog</h3>
                  <p className="text-[.78rem] text-bone-600">Clinical services available for invoice billing & appointments scheduling.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedService(null);
                    setIsServiceModalOpen(true);
                  }}
                  className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-4 py-2 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Service Offering
                </button>
              </div>

              <div className="flex flex-col gap-4 border-t border-teal-500/10 pt-6">
                {services.map((srv) => (
                  <div 
                    key={srv.id}
                    className="bg-physio-navy/60 border border-teal-500/10 rounded-xl p-5 flex justify-between items-start gap-4 hover:border-teal-500/25 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="text-[.88rem] font-semibold text-bone-100 group-hover:text-teal-400 transition-colors">
                          {srv.name}
                        </h4>
                        <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full px-2 py-0.5 text-[.62rem] font-bold font-mono">
                          {srv.duration_min} min
                        </span>
                      </div>
                      <p className="text-[.75rem] text-bone-600 mt-2 leading-relaxed max-w-2xl">{srv.description}</p>
                    </div>

                    <div className="text-right flex items-center gap-6">
                      <div>
                        <div className="text-[1rem] font-bold text-bone-200 font-mono">₨ {srv.price.toLocaleString()}</div>
                        <div className="text-[.62rem] text-bone-600 uppercase tracking-widest mt-0.5">Catalog Fee</div>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedService(srv);
                            setIsServiceModalOpen(true);
                          }}
                          title="Edit Service"
                          className="w-8 h-8 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/15 flex items-center justify-center text-teal-400 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(srv.id)}
                          title="Delete Service"
                          className="w-8 h-8 rounded-lg bg-red-500/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 flex items-center justify-center text-bone-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHATSAPP TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <form onSubmit={handleSaveTemplates} className="flex flex-col gap-6">
              <div>
                <h3 className="font-display text-[1.4rem] text-bone-100 mb-1">WhatsApp Templates</h3>
                <p className="text-[.78rem] text-bone-600">Configure formatting layouts for automated Twilio messaging integrations.</p>
              </div>

              <div className="flex flex-col gap-6 border-t border-teal-500/10 pt-6">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 text-[.75rem] text-amber-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Template Dynamic Variable Placeholders:</h5>
                    <p className="mt-1 leading-relaxed">
                      Use placeholders like <code className="font-mono text-teal-400">{`{patient_name}`}</code>, <code className="font-mono text-teal-400">{`{doctor_name}`}</code>, <code className="font-mono text-teal-400">{`{appointment_time}`}</code>, <code className="font-mono text-teal-400">{`{invoice_amount}`}</code>, or <code className="font-mono text-teal-400">{`{receipt_link}`}</code> to inject dynamic database fields directly.
                    </p>
                  </div>
                </div>

                {templates.map((t) => (
                  <div key={t.id} className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[.8rem] font-semibold text-bone-200">{t.name}</span>
                      <span className="text-[.62rem] text-bone-600 uppercase tracking-widest">{t.trigger}</span>
                    </div>
                    <textarea 
                      name={`template-${t.id}`}
                      defaultValue={t.template}
                      rows={3}
                      className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.78rem] leading-relaxed font-mono" 
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-teal-500/10 pt-6">
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-lg font-ui text-[.78rem] font-semibold transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save WhatsApp Templates
                </button>
              </div>
            </form>
          )}

          {/* BACKUPS & SYSTEM TAB */}
          {activeTab === 'backups' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display text-[1.4rem] text-bone-100 mb-1">Backups & Disaster Recovery</h3>
                  <p className="text-[.78rem] text-bone-600">Export clinical records and system relational data dumps safely to local storage & cloud.</p>
                </div>
                <button
                  onClick={handleTriggerBackup}
                  disabled={isBackupRunning}
                  className="bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-physio-deep px-5 py-2.5 rounded-lg font-ui text-[.75rem] font-semibold transition-all flex items-center gap-2"
                >
                  <CloudLightning className={`w-4 h-4 ${isBackupRunning ? 'animate-spin' : ''}`} />
                  {isBackupRunning ? 'Compiling Backup...' : 'Trigger SQL Backup'}
                </button>
              </div>

              {/* Backups List Table */}
              <div className="border-t border-teal-500/10 pt-6">
                <h4 className="text-[.8rem] font-semibold text-bone-300 uppercase tracking-widest mb-4">Past Backup Dumps</h4>
                <div className="bg-physio-navy/30 border border-teal-500/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[0.75rem]">
                    <thead>
                      <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[0.6rem] uppercase tracking-wider text-teal-500 font-bold">
                        <th className="px-5 py-3">SQL Filename</th>
                        <th className="px-5 py-3">Archive Size</th>
                        <th className="px-5 py-3">Completed At</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((bak) => (
                        <tr key={bak.id} className="border-b border-teal-500/10 text-bone-300">
                          <td className="px-5 py-3.5 font-mono text-bone-100">{bak.filename}</td>
                          <td className="px-5 py-3.5 font-mono">{bak.size}</td>
                          <td className="px-5 py-3.5 font-mono">
                            {new Date(bak.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at{' '}
                            {new Date(bak.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded text-[0.58rem] font-bold font-mono">
                              {bak.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Service Form */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">
              {selectedService ? 'Edit Catalog Service' : 'Add Catalog Service'}
            </h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Configure billing rate and session timings for a therapy offering.</p>
            
            <form onSubmit={handleSaveService} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Service Name *</label>
                <input name="name" required defaultValue={selectedService?.name || ''} placeholder="e.g. Dry Needling Session" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Session Duration (min) *</label>
                  <input name="duration_min" required type="number" defaultValue={selectedService?.duration_min || 30} placeholder="e.g. 30" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Base Cost Rate (₨) *</label>
                  <input name="price" required type="number" defaultValue={selectedService?.price || 1500} placeholder="e.g. 2000" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Service Description</label>
                <textarea name="description" rows={3} defaultValue={selectedService?.description || ''} placeholder="Provide details on treatment approach, benefits, or devices involved..." className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none text-[.82rem]" />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsServiceModalOpen(false);
                    setSelectedService(null);
                  }} 
                  className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
