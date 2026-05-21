import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, Activity, LogOut, ChevronDown, 
  CreditCard, Package, UserCheck, BarChart3, Bell, Settings as SettingsIcon,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DOCTOR: 'Doctor',
  INTERN: 'Intern',
  RECEPTIONIST: 'Receptionist',
  BILLING: 'Billing Staff',
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const { name, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live Notification Check
  const updateUnreadCount = () => {
    const stored = localStorage.getItem('rehab-swat-notifications');
    if (stored) {
      try {
        const notifs = JSON.parse(stored);
        const count = notifs.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    updateUnreadCount();
    window.addEventListener('storage', updateUnreadCount);
    const interval = setInterval(updateUnreadCount, 3000);
    return () => {
      window.removeEventListener('storage', updateUnreadCount);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patient Directory', path: '/patients', icon: Users },
    { name: 'Appointments', path: '/appointments', icon: Calendar },
    { name: 'Billing & Invoices', path: '/billing', icon: CreditCard, roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'BILLING'] },
    { name: 'Clinical Inventory', path: '/inventory', icon: Package, roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { name: 'Staff & Schedules', path: '/staff', icon: UserCheck, roles: ['SUPER_ADMIN'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'DOCTOR'] },
    { name: 'Clinical Alerts', path: '/notifications', icon: Bell, badge: true },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['SUPER_ADMIN'] },
  ].filter(item => !item.roles || (role && item.roles.includes(role)));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = name 
    ? name.split(' ').filter(Boolean).map((n) => n[0] || '').join('').slice(0, 2).toUpperCase() 
    : 'U';

  const asideClass = `sticky top-0 h-screen overflow-y-auto border-r border-teal-500/10 bg-physio-navy/95 backdrop-blur-md px-3 py-8 flex flex-col gap-2 shrink-0 transition-all duration-300 ease-in-out ${
    isCollapsed ? 'w-[72px]' : 'w-[260px]'
  }`;

  return (
    <aside className={asideClass}>
      {/* Logo */}
      <div className={`flex items-center justify-between pb-6 border-b border-teal-500/10 mb-4 px-2`}>
        {!isCollapsed && (
          <div className="font-display text-[1.25rem] font-semibold text-bone-100 tracking-[.01em] flex items-center gap-2 transition-opacity duration-300">
            <Activity className="w-5 h-5 text-teal-500 shrink-0" />
            <div className="flex flex-col">
              <span>Rehab Swat</span>
              <span className="text-[.6rem] text-teal-500 uppercase tracking-[.12em] font-semibold mt-0.5">
                Clinic Management
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center py-1 transition-opacity duration-300">
            <Activity className="w-6 h-6 text-teal-500" />
          </div>
        )}

        {/* Toggle Button */}
        {!isCollapsed && (
          <button 
            onClick={onToggle}
            className="p-1 rounded-md border border-teal-500/15 bg-physio-card/80 hover:bg-teal-500/10 text-teal-400 transition-all duration-300 cursor-pointer ml-1"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={onToggle}
            className="p-1.5 rounded-md border border-teal-500/15 bg-physio-card/80 hover:bg-teal-500/10 text-teal-400 transition-all duration-300 cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      {/* Nav Section Label */}
      {!isCollapsed && (
        <div className="text-[.6rem] uppercase tracking-[.15em] text-bone-600/40 px-3 py-2 pt-2 transition-opacity duration-300">
          CMS Screens
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-md cursor-pointer transition-all duration-200 text-[.78rem] font-medium relative ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'
              } ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500 font-semibold'
                  : 'text-bone-600/60 hover:bg-teal-500/10 hover:text-bone-300 border-l-2 border-transparent'
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5 shrink-0" />
            {!isCollapsed && <span className="flex-1 truncate">{item.name}</span>}
            
            {item.badge && unreadCount > 0 && (
              isCollapsed ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
              ) : (
                <span className="bg-teal-500 text-physio-deep font-mono font-bold text-[0.62rem] px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                  {unreadCount}
                </span>
              )
            )}
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Block */}
      <div className="border-t border-teal-500/10 pt-4 mt-2">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`w-full flex items-center rounded-lg hover:bg-teal-500/8 transition-all group ${
            isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5 gap-3'
          }`}
          title={isCollapsed ? `${name} (${roleLabel[role || ''] || role})` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center font-display text-[.8rem] font-semibold text-teal-400 shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[.75rem] font-semibold text-bone-100 truncate">{name}</div>
                <div className="text-[.62rem] text-teal-500 uppercase tracking-wider">{roleLabel[role || ''] || role}</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-bone-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {showUserMenu && (
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 mt-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-all text-[.75rem] font-medium ${
              isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            }`}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        )}

        {!isCollapsed && (
          <div className="px-3 pt-3 text-[.62rem] text-bone-600/30 font-mono transition-opacity duration-300">
            v2.0.0 · Rehab Swat CMS
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
