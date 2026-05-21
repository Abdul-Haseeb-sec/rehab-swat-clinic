import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const gridClass = isCollapsed
    ? "grid grid-cols-1 md:grid-cols-[72px_1fr] min-h-screen gap-0 transition-all duration-300 ease-in-out"
    : "grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-screen gap-0 transition-all duration-300 ease-in-out";

  return (
    <div className={gridClass}>
      <div className="hidden md:block overflow-hidden transition-all duration-300 ease-in-out">
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      </div>
      <main className="overflow-y-auto px-8 py-10 h-screen bg-physio-deep text-bone-100 transition-all duration-300 ease-in-out">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
