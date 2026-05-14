import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, Activity, TrendingUp, TrendingDown,
  Users, Plus, Filter, ClipboardList, ChevronRight, Clock, Award,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSurveys }       from '../../hooks/useSurveys';
import type { SurveyWithCount } from '../../services/surveysService';
import type { SurveyStatus } from '../../types';

const F = "'Special Gothic', sans-serif";

const STATUS_CSS: Record<SurveyStatus, string> = {
  'Activa':   'bg-emerald-50 text-emerald-700',
  'Cerrada':  'bg-gray-100 text-gray-500',
  'Borrador': 'bg-amber-50 text-amber-700',
};

export default function Dashboard() {
  const { surveys, loading } = useSurveys();
  const navigate = useNavigate();

  const active   = surveys.filter(s => s.status === 'Activa').length;
  const total    = surveys.reduce((n, s) => n + s.responseCount, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* Sub-header */}
      <div
        className="px-6 py-5 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 border-b shadow-sm shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.84),rgba(255,249,232,0.70))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <h1 className="text-xl font-bold text-[#0A2463] tracking-tight flex items-center gap-2" style={{ fontFamily: F }}>
          <Sparkles className="text-[#D4AF37]" size={18} />
          Panel de Control
        </h1>
        <button className="btn-primary" onClick={() => navigate('/surveys/new')}>
          <Plus size={14} strokeWidth={2.5} />
          Nueva Encuesta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-[1800px] mx-auto space-y-6 animate-slide-up">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Encuestas Activas"
              value={loading ? '—' : String(active)}
              sub="Formularios en curso"
              icon={Activity}
              color="text-blue-600" bgIcon="bg-blue-50"
              accent="linear-gradient(90deg,#3B82F6,#93C5FD)"
              sparkColor="#3B82F6"
              trend={null}
            />
            <MetricCard
              label="Total Respuestas"
              value={loading ? '—' : total.toLocaleString('es-MX')}
              sub="Participantes acumulados"
              icon={Users}
              color="text-[#D4AF37]" bgIcon="bg-yellow-50"
              accent="linear-gradient(90deg,#D4AF37,#FDE68A)"
              sparkColor="#D4AF37"
              trend={null}
            />
            <MetricCard
              label="Total Encuestas"
              value={loading ? '—' : String(surveys.length)}
              sub="Creadas en el sistema"
              icon={TrendingUp}
              color="text-emerald-600" bgIcon="bg-emerald-50"
              accent="linear-gradient(90deg,#10B981,#6EE7B7)"
              sparkColor="#10B981"
              trend={null}
            />
            <TopStatusCard surveys={surveys} />
          </div>

          <SurveyTable surveys={surveys} loading={loading} onOpen={id => navigate(`/surveys/${id}`)} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color, bgIcon, accent, trend }: {
  label: string; value: string; sub: string;
  icon: LucideIcon; color: string; bgIcon: string;
  accent: string; sparkColor: string;
  trend?: { pct: number } | null;
}) {
  const isUp = (trend?.pct ?? 0) >= 0;
  return (
    <div
      className="luxury-glass rounded-xl overflow-hidden shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
      style={{ borderColor: 'rgba(184,149,30,0.20)', background: 'linear-gradient(180deg,rgba(255,255,255,0.95) 0%,rgba(248,251,255,0.92) 100%)' }}
    >
      <div className="h-0.5 w-full" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-[#0A2463]/60 uppercase tracking-[0.08em]">{label}</p>
          <div className={`${bgIcon} p-2.5 rounded-xl shrink-0`}>
            <Icon className={color} size={16} />
          </div>
        </div>
        <p className="font-black text-[28px] text-[#0A2463] leading-none tracking-tight" style={{ fontFamily: F }}>{value}</p>
        <div className="flex items-end justify-between mt-3 gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate mb-1">{sub}</p>
            {trend != null && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(trend.pct)}% vs mes ant.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopStatusCard({ surveys }: { surveys: SurveyWithCount[] }) {
  const a = surveys.filter(s => s.status === 'Activa').length;
  const c = surveys.filter(s => s.status === 'Cerrada').length;
  const d = surveys.filter(s => s.status === 'Borrador').length;
  const rows: [string, number, string][] = [
    ['Activas',   a, '#10B981'],
    ['Cerradas',  c, '#64748B'],
    ['Borradores', d, '#D4AF37'],
  ];
  const max = Math.max(a, c, d, 1);
  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm border hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-default"
      style={{ borderColor: 'rgba(212,175,55,0.35)', background: 'linear-gradient(145deg,#071a4a 0%,#0A2463 55%,#0d2b6e 100%)' }}
    >
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#8A6518,#D4AF37,#F0D070,#D4AF37,#8A6518)' }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-white/45 uppercase tracking-[0.08em]">Por Estado</p>
          <div className="bg-[#D4AF37]/15 p-2.5 rounded-xl shrink-0">
            <Award className="text-[#D4AF37]" size={16} />
          </div>
        </div>
        <p className="font-black text-[28px] leading-none tracking-tight" style={{ fontFamily: F, color: '#D4AF37' }}>
          {surveys.length}
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(245,236,215,0.50)' }}>encuestas totales</p>
        <div className="mt-3.5 space-y-2">
          {rows.map(([label, count, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] font-bold shrink-0 w-[58px]" style={{ color: 'rgba(245,236,215,0.6)' }}>{label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
              </div>
              <span className="text-[10px] font-bold shrink-0 w-4 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SurveyTable({
  surveys, loading, onOpen,
}: {
  surveys: SurveyWithCount[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  const [tab,    setTab]    = useState<'Todos' | SurveyStatus>('Todos');
  const [search, setSearch] = useState('');

  const filtered = surveys.filter(s => {
    const matchTab = tab === 'Todos' || s.status === tab;
    const matchQ   = s.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchQ;
  });

  const tabs: (typeof tab)[] = ['Todos', 'Activa', 'Cerrada', 'Borrador'];

  return (
    <div
      className="luxury-glass rounded-xl overflow-hidden flex flex-col shadow-sm border min-h-[380px]"
      style={{ borderColor: 'rgba(184,149,30,0.24)', background: 'linear-gradient(180deg,rgba(255,255,255,0.94) 0%,rgba(248,251,255,0.92) 72%,rgba(255,251,235,0.90) 100%)' }}
    >
      <div
        className="px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-center gap-3"
        style={{ borderBottomColor: 'rgba(184,149,30,0.20)', background: 'linear-gradient(90deg,rgba(10,36,99,0.04),rgba(212,175,55,0.10),rgba(30,56,31,0.08))' }}
      >
        <div className="flex bg-[#0A2463]/5 rounded-lg p-1 self-start sm:self-auto gap-1">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t ? 'bg-white shadow text-[#0A2463]' : 'text-[#0A2463]/55 hover:text-[#0A2463]'}`}
            >
              {t === 'Activa' ? 'Activas' : t === 'Cerrada' ? 'Cerradas' : t === 'Borrador' ? 'Borradores' : t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A2463]/40 group-focus-within:text-[#D4AF37] transition-colors" size={14} />
            <input
              type="text"
              placeholder="Buscar encuesta..."
              className="input-base pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-ghost shrink-0" style={{ padding: '8px 10px' }}>
            <Filter size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto bg-white/30 flex-1 divide-y divide-[#D4AF37]/5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : filtered.length === 0
            ? <EmptyState />
            : filtered.map(s => <SurveyRow key={s.id} survey={s} onOpen={onOpen} />)
        }
      </div>
    </div>
  );
}

function SurveyRow({ survey, onOpen }: { survey: SurveyWithCount; onOpen: (id: string) => void }) {
  return (
    <div
      className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-white transition-all cursor-pointer border-l-[3px] border-transparent hover:border-[#D4AF37] hover:shadow-md"
      onClick={() => onOpen(survey.id)}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(10,36,99,0.07)', color: '#0A2463' }}>
          <ClipboardList size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-black text-[#0A2463] group-hover:text-[#D4AF37] transition-colors truncate" style={{ fontFamily: F }}>
              {survey.title}
            </span>
            <span className={`text-xs font-black uppercase tracking-[0.08em] px-2 py-0.5 rounded-full ${STATUS_CSS[survey.status]}`}>
              {survey.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={10} className="text-gray-400" />
            <span className="text-xs text-gray-400">
              {new Date(survey.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {survey.description && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-[#0A2463]/50 truncate max-w-[180px]">{survey.description}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6 shrink-0 mt-3 sm:mt-0 pl-14 sm:pl-0">
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.08em]">Respuestas</p>
          <p className="text-base font-black text-[#0A2463] group-hover:text-[#D4AF37] transition-colors leading-tight" style={{ fontFamily: F }}>
            {survey.responseCount}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-[#0A2463] group-hover:text-[#D4AF37] transition-all transform group-hover:translate-x-1">
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <ClipboardList size={40} className="text-[#0A2463]/20 mb-4" />
      <p className="text-base font-bold text-[#0A2463]/50">No hay encuestas aquí</p>
      <p className="text-xs text-gray-400 mt-1 mb-4">Crea tu primera encuesta para empezar</p>
      <button className="btn-primary" onClick={() => navigate('/surveys/new')}>
        <Plus size={14} />
        Nueva Encuesta
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 p-4 border-l-[3px] border-transparent">
      <div className="w-10 h-10 rounded-full bg-gray-200/80 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 bg-gray-200/80 rounded-full w-48 animate-pulse" />
          <div className="h-5 bg-gray-100 rounded-full w-16 animate-pulse" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full w-32 animate-pulse" />
      </div>
      <div className="shrink-0 space-y-1.5">
        <div className="h-2.5 bg-gray-100 rounded-full w-16 animate-pulse ml-auto" />
        <div className="h-4 bg-gray-200/80 rounded-full w-10 animate-pulse" />
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

