import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, MessageSquare, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const F = "'Special Gothic', sans-serif";

interface SurveyStat {
  id: string; title: string; status: string;
  totalSent: number; opened: number; responded: number;
  responseRate: number; openRate: number;
}

interface DistRow {
  survey_id: string;
  surveys: { title: string; status: string } | null;
  recipients: { status: string; opened_at: string | null }[];
}

export default function Analytics() {
  const [stats,   setStats]   = useState<SurveyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandId, setExpandId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('distributions')
      .select('survey_id, surveys(title, status), recipients(status, opened_at)');
    if (error) { setLoading(false); return; }

    const byId: Record<string, SurveyStat> = {};
    for (const row of (data ?? []) as unknown as DistRow[]) {
      if (!row.survey_id) continue;
      if (!byId[row.survey_id]) {
        byId[row.survey_id] = {
          id: row.survey_id,
          title: row.surveys?.title ?? 'Sin título',
          status: row.surveys?.status ?? '',
          totalSent: 0, opened: 0, responded: 0, responseRate: 0, openRate: 0,
        };
      }
      const s = byId[row.survey_id];
      for (const r of row.recipients) {
        s.totalSent++;
        if (r.status === 'abierto' || r.status === 'respondido') s.opened++;
        if (r.status === 'respondido') s.responded++;
      }
    }

    const result = Object.values(byId).map(s => ({
      ...s,
      openRate:     s.totalSent > 0 ? Math.round((s.opened / s.totalSent) * 100) : 0,
      responseRate: s.totalSent > 0 ? Math.round((s.responded / s.totalSent) * 100) : 0,
    })).sort((a, b) => b.totalSent - a.totalSent);

    setStats(result);
    setLoading(false);
  };

  const totalSent     = stats.reduce((n, s) => n + s.totalSent, 0);
  const totalResp     = stats.reduce((n, s) => n + s.responded, 0);
  const avgRate       = stats.length > 0 ? Math.round(stats.reduce((n, s) => n + s.responseRate, 0) / stats.length) : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="px-6 py-5 flex items-center justify-between backdrop-blur-md border-b shadow-sm shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.84),rgba(255,249,232,0.70))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <h1 className="text-xl font-bold text-[#0A2463] flex items-center gap-2" style={{ fontFamily: F }}>
          <BarChart2 className="text-[#D4AF37]" size={18} />
          Análisis de Respuestas
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">

          {/* KPIs globales */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total enviados',  value: totalSent, icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50' },
              { label: 'Total respuestas',value: totalResp, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Tasa promedio',   value: `${avgRate}%`,   icon: TrendingUp,   color: 'text-[#D4AF37]',   bg: 'bg-yellow-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="luxury-glass rounded-xl border p-5 text-center shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} className={color} />
                </div>
                <p className="text-2xl font-black text-[#0A2463]" style={{ fontFamily: F }}>{loading ? '—' : value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabla por encuesta */}
          <div className="luxury-glass rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
              <p className="font-bold text-[#0A2463] text-sm" style={{ fontFamily: F }}>Por encuesta</p>
              <p className="text-xs text-[#0A2463]/50 mt-0.5">Rendimiento de cada encuesta distribuida</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#D4AF37]" size={24} /></div>
            ) : stats.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart2 size={40} className="text-[#0A2463]/15 mx-auto mb-3" />
                <p className="text-sm text-[#0A2463]/40">Sin datos aún. Envía encuestas para ver el análisis.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(184,149,30,0.08)' }}>
                {stats.map(s => (
                  <div key={s.id}>
                    <button
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#0A2463]/2 transition-colors text-left"
                      onClick={() => setExpandId(expandId === s.id ? null : s.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0A2463] text-sm truncate">{s.title}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {/* Bar apertura */}
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${s.openRate}%` }} />
                          </div>
                          <span className="text-[10px] text-amber-600 font-bold">{s.openRate}% apert.</span>
                          {/* Bar respuesta */}
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${s.responseRate}%` }} />
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold">{s.responseRate}% resp.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0 text-center">
                        <div>
                          <p className="text-sm font-black text-[#0A2463]" style={{ fontFamily: F }}>{s.totalSent}</p>
                          <p className="text-[10px] text-gray-400">enviados</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-600" style={{ fontFamily: F }}>{s.responded}</p>
                          <p className="text-[10px] text-gray-400">respuestas</p>
                        </div>
                      </div>
                      {expandId === s.id ? <ChevronUp size={14} className="text-[#0A2463]/30 shrink-0" /> : <ChevronDown size={14} className="text-[#0A2463]/30 shrink-0" />}
                    </button>

                    {expandId === s.id && (
                      <SurveyAnswerBreakdown surveyId={s.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveyAnswerBreakdown({ surveyId }: { surveyId: string }) {
  const [data, setData]     = useState<{ question: string; answers: Record<string, number> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: responses } = await supabase
        .from('responses')
        .select('id, answers(question_id, value, values)')
        .eq('survey_id', surveyId);

      const { data: questions } = await supabase
        .from('questions')
        .select('id, title, type')
        .eq('survey_id', surveyId)
        .order('order_index');

      type QRow = { id: string; title: string; type: string };
      const qs = (questions ?? []) as QRow[];

      const breakdown: Record<string, Record<string, number>> = {};
      for (const resp of (responses ?? []) as unknown as { answers: { question_id: string; value: string | null; values: string[] | null }[] }[]) {
        for (const ans of resp.answers) {
          const qid = ans.question_id;
          if (!breakdown[qid]) breakdown[qid] = {};
          const vals = ans.values ?? (ans.value ? [ans.value] : []);
          for (const v of vals) {
            breakdown[qid][v] = (breakdown[qid][v] ?? 0) + 1;
          }
        }
      }

      const result = qs.map(q => ({
        question: q.title,
        answers: breakdown[q.id] ?? {},
      }));

      setData(result);
      setLoading(false);
    })();
  }, [surveyId]);

  if (loading) return (
    <div className="px-8 py-6 border-t flex items-center gap-2 text-xs text-[#0A2463]/40" style={{ borderColor: 'rgba(184,149,30,0.08)' }}>
      <Loader2 size={12} className="animate-spin" /> Cargando respuestas...
    </div>
  );

  return (
    <div className="px-8 py-5 border-t space-y-5 bg-[#0A2463]/1.5" style={{ borderColor: 'rgba(184,149,30,0.10)' }}>
      {data.map((q, i) => {
        const entries = Object.entries(q.answers).sort((a, b) => b[1] - a[1]);
        const total   = entries.reduce((n, [, c]) => n + c, 0);
        return (
          <div key={i}>
            <p className="text-xs font-bold text-[#0A2463]/70 mb-2">{q.question}</p>
            {entries.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin respuestas</p>
            ) : (
              <div className="space-y-1.5">
                {entries.map(([val, count]) => (
                  <div key={val} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-right text-[#0A2463]/60 shrink-0 truncate font-medium">{val}</span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F0D070] transition-all"
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-black text-[#0A2463] w-5 text-right">{count}</span>
                    <span className="shrink-0 text-[#0A2463]/40 w-8">({Math.round((count / total) * 100)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
