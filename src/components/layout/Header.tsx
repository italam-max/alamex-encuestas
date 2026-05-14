import { LogOut, Menu, X } from 'lucide-react';

interface Props {
  displayName:         string;
  displayTitle:        string;
  mobileOpen:          boolean;
  onMobileMenuToggle:  () => void;
  onNavigateDashboard: () => void;
  onSignOut:           () => void;
}

export default function Header({
  displayName,
  displayTitle,
  mobileOpen,
  onMobileMenuToggle,
  onNavigateDashboard,
  onSignOut,
}: Props) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="h-16 md:h-20 shrink-0 flex items-center px-4 md:px-8 relative z-40 overflow-hidden"
      style={{
        background: 'linear-gradient(to right, #051338, #0A2463, #051338)',
        borderBottom: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}
    >
      <div className="absolute inset-0 arabesque-pattern pointer-events-none opacity-20" />

      {/* Logo */}
      <div
        className="flex items-center gap-3 md:gap-5 cursor-pointer group z-10"
        onClick={onNavigateDashboard}
      >
        <div className="relative">
          <div className="absolute -inset-2 bg-[#D4AF37] rounded-full blur-md opacity-20 group-hover:opacity-40 transition duration-500" />
          <div className="bg-black/20 backdrop-blur-md p-2 md:p-2.5 rounded-xl shadow-inner border border-white/10 relative transform group-hover:scale-105 transition-transform duration-300">
            <div
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-lg"
              style={{ fontFamily: "'Syne', sans-serif", color: '#D4AF37' }}
            >
              A
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <span
            className="text-xl md:text-2xl font-black text-white tracking-tight leading-none drop-shadow-md"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            ALAMEX
          </span>
          <span
            className="hidden md:block text-xs text-[#D4AF37] font-bold tracking-[0.3em] uppercase mt-1"
            style={{ textShadow: '0 0 10px rgba(212,175,55,0.5)' }}
          >
            Ascending Together
          </span>
        </div>
      </div>

      {/* Título central */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center z-10">
        <h2
          className="text-xl font-black text-white tracking-[0.15em] uppercase flex items-center gap-4"
          style={{ fontFamily: "'Syne', sans-serif", textShadow: '0 0 20px rgba(255,255,255,0.1)' }}
        >
          <span className="text-[#D4AF37] opacity-80">✦</span>
          Encuestas de Satisfacción
          <span className="text-[#D4AF37] opacity-80">✦</span>
        </h2>
        <div className="w-52 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-1.5" />
      </div>

      {/* Perfil + acciones */}
      <div className="ml-auto flex items-center gap-2 md:gap-5 z-10">
        <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-5 border-l border-white/10">
          <div className="text-right hidden md:block">
            <p className="text-white font-bold text-sm leading-tight">{displayName}</p>
            <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-[0.08em] opacity-90">
              {displayTitle}
            </p>
          </div>

          <div className="relative w-9 h-9 rounded-full bg-black/30 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] overflow-hidden backdrop-blur-sm cursor-pointer header-avatar">
            <span className="text-sm font-black">{initial}</span>
          </div>

          <button onClick={onSignOut} className="header-logout-btn p-1.5 rounded-full" title="Cerrar sesión">
            <LogOut size={17} />
          </button>

          {/* Hamburguesa mobile */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-xl header-hamburger-btn transition-all"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
