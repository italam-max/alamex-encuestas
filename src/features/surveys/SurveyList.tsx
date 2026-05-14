import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, ChevronRight, Clock, Filter, Trash2 } from 'lucide-react';
import { useSurveys } from '../../hooks/useSurveys';
import { SurveysService, type SurveyWithCount } from '../../services/surveysService';
import type { SurveyStatus } from '../../types';

const F = "'Special Gothic', sans-serif";

const STATUS_CSS: Record<SurveyStatus, string> = {
  'Activa':   'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Cerrada':  'bg-gray-100 text-gray-500 border-gray-200',
  'Borrador': 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function SurveyList() {
  const navigate = useNavigate();
  const { surveys, loading, reload } = useSurveys();
  const [tab,       setTab]       = useState<'Todos' | SurveyStatus>('Todos');
  const [search,    setSearch]    = useState('');
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = surveys.filter(s => {
    const matchTab = tab === 'Todos' || s.status === tab;
    const matchQ   = s.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchQ;
  });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await SurveysService.delete(id);
      reload();
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  };

  const tabs: (typeof tab)[] = ['Todos', 'Activa', 'Cerrada', 'Borrador'];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="px-6 py-5 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 border-b shadow-sm shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.84),rgba(255,249,232,0.70))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <div>
          <h1 className="text-xl font-bold text-[#0A2463] tracking-tight flex items-center gap-2" style={{ fontFamily: F }}>
            <ClipboardList className="text-[#D4AF37]" size={18} />
            Mis Encuestas
          </h1>
          <p className="text-xs text-[#0A2463]/50 mt-0.5">{surveys.length} encuesta{surveys.length !== 1 ? 's' : ''} en total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/surveys/new')}>
          <Plus size={14} strokeWidth={2.5} />
          Nueva Encuesta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-5xl mx-auto animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex bg-white/70 border border-[#D4AF37]/20 rounded-xl p-1 gap-1 shrink-0">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-[#0A2463] text-white shadow' : 'text-[#0A2463]/55 hover:text-[#0A2463]'}`}
                >
                  {t === 'Activa' ? 'Activas' : t === 'Cerrada' ? 'Cerradas' : t === 'Borrador' ? 'Borradores' : t}
                </button>
              ))}
            </div>
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A2463]/40 group-focus-within:text-[#D4AF37] transition-colors" size={14} />
              <input type="text" placeholder="Buscar por nombre..." className="input-base pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-ghost shrink-0"><Filter size={14} />Filtrar</button>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <Empty onNew={() => navigate('/surveys/new')} />
          ) : (
            <div className="space-y-3">
              {filtered.map(s => (
                <SurveyCard
                  key={s.id} survey={s}
                  confirmDelete={confirmId === s.id}
                  deleting={deleting === s.id}
                  onOpen={() => navigate(`/surveys/${s.id}`)}
                  onEdit={() => navigate(`/surveys/${s.id}/editar`)}
                  onAskDelete={() => setConfirmId(s.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onConfirmDelete={() => handleDelete(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SurveyCard({
  survey, confirmDelete, deleting, onOpen, onEdit, onAskDelete, onCancelDelete, onConfirmDelete,
}: {
  survey: SurveyWithCount; confirmDelete: boolean; deleting: boolean;
  onOpen: () => void; onEdit: () => void;
  onAskDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void;
}) {
  return (
    <div className="luxury-glass rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all group" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
      <div className="flex items-center p-4 gap-4 cursor-pointer" onClick={onOpen}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#0A2463]/6 group-hover:bg-[#D4AF37]/15 transition-colors">
          <ClipboardList size={20} className="text-[#0A2463]/70 group-hover:text-[#D4AF37] transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-[#0A2463] group-hover:text-[#D4AF37] transition-colors truncate" style={{ fontFamily: F }}>{survey.title}</span>
            <span className={`text-[10px] font-black uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${STATUS_CSS[survey.status]}`}>{survey.status}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock size={10} />{new Date(survey.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {survey.description && <span className="truncate max-w-[200px] hidden sm:inline">{survey.description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Respuestas</p>
            <p className="text-lg font-black text-[#0A2463]" style={{ fontFamily: F }}>{survey.responseCount}</p>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
        </div>
      </div>
      <div className="border-t flex items-center justify-between px-4 py-2" style={{ borderColor: 'rgba(184,149,30,0.12)', background: 'rgba(10,36,99,0.02)' }}>
        <button className="text-xs font-semibold text-[#0A2463]/50 hover:text-[#0A2463] transition-colors px-2 py-1 rounded" onClick={e => { e.stopPropagation(); onEdit(); }}>Editar</button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">¿Eliminar?</span>
            <button className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-all" onClick={e => { e.stopPropagation(); onConfirmDelete(); }} disabled={deleting}>{deleting ? '...' : 'Sí, eliminar'}</button>
            <button className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-1" onClick={e => { e.stopPropagation(); onCancelDelete(); }}>Cancelar</button>
          </div>
        ) : (
          <button className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded flex items-center gap-1" onClick={e => { e.stopPropagation(); onAskDelete(); }}>
            <Trash2 size={12} />Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ClipboardList size={48} className="text-[#0A2463]/15 mb-4" />
      <p className="text-lg font-bold text-[#0A2463]/40" style={{ fontFamily: F }}>Sin encuestas aún</p>
      <p className="text-sm text-gray-400 mt-1 mb-6">Crea tu primera encuesta de satisfacción</p>
      <button className="btn-primary" onClick={onNew}><Plus size={14} />Crear encuesta</button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="luxury-glass rounded-xl border p-4 flex items-center gap-4 animate-pulse" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
      <div className="w-11 h-11 rounded-xl bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded-full w-56" />
        <div className="h-3 bg-gray-100 rounded-full w-32" />
      </div>
      <div className="w-12 h-6 bg-gray-100 rounded-full" />
    </div>
  );
}
