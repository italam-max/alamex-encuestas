import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import type { NavId } from '../../types';

const ROUTE_TO_NAV: Record<string, NavId> = {
  '/':          'dashboard',
  '/surveys':   'surveys',
  '/analytics': 'analytics',
  '/settings':  'settings',
};

export default function AppShell() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const { profile, signOut } = useAuth();
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const currentView: NavId = ROUTE_TO_NAV[pathname] ?? 'dashboard';

  const handleNavigate = (id: NavId) => {
    const routes: Record<NavId, string> = {
      'dashboard':   '/',
      'surveys':     '/surveys',
      'surveys.new': '/surveys/new',
      'analytics':   '/analytics',
      'settings':    '/settings',
    };
    navigate(routes[id]);
    setMobileOpen(false);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#F9F7F2' }}>

      <Header
        displayName={profile?.display_name  ?? ''}
        displayTitle={profile?.display_title ?? ''}
        mobileOpen={mobileOpen}
        onMobileMenuToggle={() => setMobileOpen(s => !s)}
        onNavigateDashboard={() => handleNavigate('dashboard')}
        onSignOut={signOut}
      />

      <div className="flex-1 flex overflow-hidden relative">

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar mobile */}
        <aside
          className={`
            fixed md:hidden top-0 left-0 h-full z-50 w-[220px]
            flex flex-col overflow-hidden
            transition-transform duration-300 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{
            background: 'linear-gradient(180deg, #0A1830 0%, #060E1C 100%)',
            borderRight: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <Sidebar
            expanded={true}
            currentView={currentView}
            onNavigate={handleNavigate}
            onClose={() => setMobileOpen(false)}
            mobile
          />
        </aside>

        {/* Sidebar desktop */}
        <aside
          className="hidden md:flex flex-col overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out relative"
          style={{
            width: desktopOpen ? '220px' : '56px',
            background: 'linear-gradient(180deg, #0A1830 0%, #060E1C 100%)',
            borderRight: desktopOpen
              ? '1px solid rgba(212,175,55,0.2)'
              : '1px solid rgba(212,175,55,0.08)',
            boxShadow: desktopOpen ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
          }}
          onMouseEnter={() => setDesktopOpen(true)}
          onMouseLeave={() => setDesktopOpen(false)}
        >
          {!desktopOpen && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 rounded-l-full opacity-30"
              style={{ background: 'rgba(212,175,55,0.6)' }}
            />
          )}
          <Sidebar
            expanded={desktopOpen}
            currentView={currentView}
            onNavigate={handleNavigate}
          />
        </aside>

        {/* Contenido — Outlet renderiza la ruta activa */}
        <main
          className="flex-1 overflow-hidden flex flex-col relative"
          style={{ background: '#F9F7F2' }}
        >
          <div className="absolute inset-0 arabesque-pattern pointer-events-none z-0 opacity-30" />
          <div className="ambient-light-bg opacity-40" />
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
