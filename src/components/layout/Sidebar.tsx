import { Plus, X } from 'lucide-react';
import { NAV_SECTIONS } from '../../config/navigation';
import NavItem from './NavItem';
import type { NavId } from '../../types';

interface Props {
  expanded:    boolean;
  currentView: NavId;
  onNavigate:  (id: NavId) => void;
  onClose?:    () => void; // solo en mobile
  mobile?:     boolean;
}

export default function Sidebar({ expanded, currentView, onNavigate, onClose, mobile }: Props) {
  return (
    <>
      {/* Arabesco de fondo */}
      <div className="absolute inset-0 arabesque-pattern opacity-10 pointer-events-none" />

      {/* Cerrar — solo mobile */}
      {mobile && (
        <div className="flex justify-end px-3 pt-3 relative z-10">
          <button onClick={onClose} className="sidebar-close-btn p-1.5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Botón Nueva Encuesta */}
      <div className="p-2 pt-3 shrink-0 relative z-10">
        <button
          onClick={() => onNavigate('surveys.new')}
          className="w-full flex items-center justify-center py-3 rounded-2xl font-black transition-all active:scale-95 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
            color: '#051338',
            boxShadow: '0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            fontFamily: "'Syne', sans-serif",
            gap: expanded ? '8px' : '0px',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus size={17} strokeWidth={3} className="shrink-0 relative z-10" />
          <span
            className="relative z-10 text-sm uppercase tracking-widest overflow-hidden whitespace-nowrap transition-all duration-200"
            style={{ maxWidth: expanded ? '120px' : '0px', opacity: expanded ? 1 : 0 }}
          >
            Nueva
          </span>
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-3 relative z-10">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div
              className="overflow-hidden whitespace-nowrap transition-all duration-200 px-2 mb-1"
              style={{ maxHeight: expanded ? '20px' : '0px', opacity: expanded ? 1 : 0 }}
            >
              <p className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: 'rgba(212,175,55,0.65)' }}>
                {section.label}
              </p>
            </div>

            {section.items.map(item => (
              <NavItem
                key={item.id}
                {...item}
                active={currentView === item.id}
                expanded={expanded}
                onClick={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Versión */}
      <div
        className="px-3 py-3 shrink-0 relative z-10 overflow-hidden"
        style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}
      >
        <p
          className="text-xs font-mono whitespace-nowrap overflow-hidden transition-all duration-200"
          style={{ color: 'rgba(255,255,255,0.35)', opacity: expanded ? 1 : 0 }}
        >
          1.0.1 | ALAMEX
        </p>
        {!expanded && (
          <div className="w-4 h-0.5 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.1)' }} />
        )}
      </div>
    </>
  );
}
