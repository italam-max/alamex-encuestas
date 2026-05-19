import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, AlertCircle, Star, XCircle, Trophy } from 'lucide-react';
import { PublicService, type PublicSurveyData, type PublicQuestion } from '../../services/publicService';

interface ResultItem {
  title:    string;
  qNum:     number;
  correct:  boolean | null;
  given:    string | string[];
  expected: string | undefined;
}

const F = "'Special Gothic', sans-serif";

/* ── Paginación: secciones separan páginas; sin secciones, máx 6 preguntas ── */
function buildPages(questions: PublicQuestion[]): PublicQuestion[][] {
  if (questions.length === 0) return [];
  const pages: PublicQuestion[][] = [[]];

  for (const q of questions) {
    const cur = pages[pages.length - 1];
    if (q.type === 'section') {
      if (cur.length === 0) { cur.push(q); }
      else { pages.push([q]); }
    } else {
      const count = cur.filter(x => x.type !== 'section').length;
      if (count >= 6) { pages.push([q]); }
      else { cur.push(q); }
    }
  }

  return pages.filter(p => p.some(q => q.type !== 'section'));
}

function hasAnswer(val: string | string[] | undefined): boolean {
  if (val === undefined || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [survey,    setSurvey]    = useState<PublicSurveyData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(0);
  const [answers,   setAnswers]   = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [results,   setResults]   = useState<ResultItem[] | null>(null);

  useEffect(() => {
    if (!token) return;
    PublicService.getSurveyByToken(token)
      .then(data => {
        if (!data) { setError('Enlace inválido o expirado.'); return; }
        if (data.surveyClosed) { setError('__closed__'); return; }
        if (data.alreadyResponded) { navigate(`/s/${token}/gracias`, { replace: true }); return; }
        setSurvey(data);
      })
      .catch(() => setError('No se pudo cargar la encuesta. Intenta más tarde.'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const pages      = useMemo(() => survey ? buildPages(survey.questions) : [], [survey]);
  const pageItems  = pages[page] ?? [];
  const isLastPage = page === pages.length - 1;
  const totalPages = pages.length;
  const pct        = totalPages > 0 ? Math.round(((page + 1) / totalPages) * 100) : 0;

  /* Numeración global continua (secciones no cuentan) */
  const questionNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    let n = 0;
    for (const q of survey?.questions ?? []) {
      if (q.type !== 'section') { n++; map[q.id] = n; }
    }
    return map;
  }, [survey]);

  const setAns = (id: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [id]: val }));

  const goNext = () => {
    const required = pageItems.filter(q => q.type !== 'section' && q.required);
    const missing  = required.find(q => !hasAnswer(answers[q.id]));
    if (missing) { setError('Hay preguntas obligatorias sin responder.'); return; }
    setError(null);
    if (!isLastPage) {
      setPage(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    submit();
  };

  const submit = async () => {
    if (!survey || !token) return;
    setSubmitting(true);
    try {
      const allQ   = survey.questions.filter(q => q.type !== 'section');
      const payload = allQ.map(q => {
        const val = answers[q.id];
        if (Array.isArray(val)) return { questionId: q.id, values: val };
        return { questionId: q.id, value: val ?? '' };
      });
      await PublicService.submitResponse(survey.surveyId, survey.recipientId, payload);

      // Construir resultados solo si hay al menos una pregunta con respuesta correcta (modo evaluación)
      const evalQ = allQ.filter(q =>
        (q.type === 'multiple' || q.type === 'checkbox') &&
        q.options.some((o: { is_correct?: boolean }) => o.is_correct)
      );

      if (evalQ.length > 0) {
        let n = 0;
        const qNums: Record<string, number> = {};
        for (const q of survey.questions) {
          if (q.type !== 'section') { n++; qNums[q.id] = n; }
        }
        const items: ResultItem[] = evalQ.map(q => {
          const given    = answers[q.id] ?? '';
          const corrOpts = q.options.filter((o: { is_correct?: boolean; value: string }) => o.is_correct).map((o: { value: string }) => o.value);
          const givenArr = Array.isArray(given) ? given : [given];
          const correct  = corrOpts.length > 0
            ? corrOpts.every((v: string) => givenArr.includes(v)) && givenArr.every((v: string) => corrOpts.includes(v))
            : null;
          const expectedLabel = corrOpts
            .map((v: string) => q.options.find((o: { value: string; label: string }) => o.value === v)?.label)
            .filter(Boolean)
            .join(', ');
          return {
            title:    q.title,
            qNum:     qNums[q.id],
            correct,
            given,
            expected: expectedLabel || undefined,
          };
        });
        setResults(items);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate(`/s/${token}/gracias`, { replace: true });
      }
    } catch {
      setError('No se pudo guardar tu respuesta. Intenta de nuevo.');
    } finally { setSubmitting(false); }
  };

  /* ── Estados de carga / error ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  if (error === '__closed__') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F7F2] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(212,175,55,0.1)' }}>
        <AlertCircle size={28} className="text-[#D4AF37]" />
      </div>
      <h2 className="text-xl font-bold text-[#0A2463]" style={{ fontFamily: F }}>Encuesta cerrada</h2>
      <p className="text-sm text-[#0A2463]/60 mt-2 max-w-sm">
        Esta encuesta ya no está recibiendo respuestas. Gracias por tu interés.
      </p>
    </div>
  );

  if (error && !survey) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F7F2] p-6 text-center">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <h2 className="text-xl font-bold text-[#0A2463]" style={{ fontFamily: F }}>Oops</h2>
      <p className="text-sm text-[#0A2463]/60 mt-2 max-w-sm">{error}</p>
    </div>
  );

  if (!survey) return null;

  /* ── Pantalla de resultados (modo evaluación) ── */
  if (results) {
    const total   = results.length;
    const correct = results.filter(r => r.correct === true).length;
    const pctScore = Math.round((correct / total) * 100);
    const passed  = pctScore >= 70;
    return (
      <div className="min-h-screen flex flex-col bg-[#F9F7F2] relative overflow-hidden">
        <div className="absolute inset-0 arabesque-pattern opacity-20 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 shrink-0"
          style={{ background: 'linear-gradient(to right,#051338,#0A2463,#051338)', borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#D4AF37] font-black text-base shrink-0"
                style={{ background: 'rgba(212,175,55,0.15)', fontFamily: F }}>A</div>
              <span className="text-white font-bold text-sm" style={{ fontFamily: F }}>ALAMEX</span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-[#D4AF37] to-[#F0D070]" />
        </div>

        <div className="relative z-10 flex-1 py-8 px-4">
          <div className="max-w-xl mx-auto space-y-6">

            {/* Tarjeta de puntaje */}
            <div className="luxury-glass rounded-2xl border p-8 text-center shadow-sm"
              style={{ borderColor: 'rgba(184,149,30,0.25)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: passed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)' }}>
                <Trophy size={28} style={{ color: passed ? '#10b981' : '#ef4444' }} />
              </div>
              <h1 className="text-2xl font-black text-[#0A2463] mb-1" style={{ fontFamily: F }}>
                {passed ? '¡Felicidades!' : 'Encuesta completada'}
              </h1>
              <p className="text-sm text-[#0A2463]/55 mb-6">
                {survey.title}
              </p>
              {/* Círculo de puntaje */}
              <div className="relative w-28 h-28 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(10,36,99,0.08)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={passed ? '#10b981' : '#ef4444'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - pctScore / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black" style={{ color: passed ? '#10b981' : '#ef4444', fontFamily: F }}>{pctScore}%</span>
                  <span className="text-[10px] text-[#0A2463]/40 font-semibold">{correct}/{total} correctas</span>
                </div>
              </div>
              <p className="text-xs text-[#0A2463]/50 font-medium">
                {passed ? 'Superaste el 70% mínimo requerido.' : 'No alcanzaste el 70% mínimo. ¡Sigue practicando!'}
              </p>
            </div>

            {/* Detalle por pregunta */}
            <div className="space-y-3">
              <h2 className="text-xs font-black text-[#0A2463]/40 uppercase tracking-[0.1em] px-1">
                Detalle de respuestas
              </h2>
              {results.map((r, i) => (
                <div key={i} className="luxury-glass rounded-xl border p-4 shadow-sm"
                  style={{
                    borderColor: r.correct === true
                      ? 'rgba(16,185,129,0.25)'
                      : r.correct === false
                        ? 'rgba(239,68,68,0.2)'
                        : 'rgba(184,149,30,0.2)',
                    background: r.correct === true
                      ? 'rgba(16,185,129,0.04)'
                      : r.correct === false
                        ? 'rgba(239,68,68,0.04)'
                        : 'white',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: r.correct === true ? 'rgba(16,185,129,0.12)' : r.correct === false ? 'rgba(239,68,68,0.1)' : 'rgba(212,175,55,0.1)',
                      }}>
                      {r.correct === true
                        ? <CheckCircle size={13} style={{ color: '#10b981' }} />
                        : r.correct === false
                          ? <XCircle size={13} style={{ color: '#ef4444' }} />
                          : <Star size={13} style={{ color: '#D4AF37' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0A2463] leading-snug">
                        <span style={{ color: '#D4AF37' }}>{r.qNum}.</span> {r.title}
                      </p>
                      <p className="text-[11px] text-[#0A2463]/50 mt-1">
                        Tu respuesta:{' '}
                        <span className="font-semibold text-[#0A2463]/70">
                          {Array.isArray(r.given) ? r.given.join(', ') : r.given || '—'}
                        </span>
                      </p>
                      {r.correct === false && r.expected && (
                        <p className="text-[11px] mt-0.5" style={{ color: '#10b981' }}>
                          Respuesta correcta: <span className="font-semibold">{r.expected}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje cierre */}
            <div className="text-center py-4">
              <p className="text-sm text-[#0A2463]/50 font-medium">
                Gracias por completar la evaluación. Puedes cerrar esta ventana.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 shrink-0"
          style={{ background: 'linear-gradient(to right,#051338,#0A2463,#051338)', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="max-w-xl mx-auto px-6 py-5 text-center">
            <p className="text-[11px] font-semibold tracking-[0.05em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Desarrollado y publicado por{' '}
              <span style={{ color: 'rgba(212,175,55,0.75)', fontWeight: 700 }}>Alamex Elevadores</span>
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              © {new Date().getFullYear()} Alamex Elevadores · Todos los derechos reservados
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2] relative overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 arabesque-pattern opacity-20 pointer-events-none" />

      {/* Barra superior fija */}
      <div className="relative z-10 shrink-0 sticky top-0">
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ background: 'linear-gradient(to right,#051338,#0A2463,#051338)', borderBottom: '1px solid rgba(212,175,55,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#D4AF37] font-black text-base shrink-0"
              style={{ background: 'rgba(212,175,55,0.15)', fontFamily: F }}
            >A</div>
            <span className="text-white font-bold text-sm" style={{ fontFamily: F }}>ALAMEX</span>
          </div>
          {totalPages > 1 && (
            <span className="text-white/40 text-xs">Página {page + 1} de {totalPages}</span>
          )}
        </div>
        {/* Barra de progreso */}
        <div className="h-1 bg-[#0A2463]/10">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F0D070] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 py-8 px-4">
        <div className="max-w-xl mx-auto">

          {/* Encabezado de encuesta (primera página) */}
          {page === 0 && (
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black text-[#0A2463]" style={{ fontFamily: F }}>{survey.title}</h1>
              {survey.description && <p className="text-sm text-[#0A2463]/60 mt-2">{survey.description}</p>}
              {survey.recipientName && (
                <p className="text-xs text-[#D4AF37] font-semibold mt-3">Hola, {survey.recipientName} 👋</p>
              )}
            </div>
          )}

          {/* Preguntas de la página actual */}
          <div className="space-y-5">
            {pageItems.map(q => {
              /* Sección = separador visual / encabezado de página */
              if (q.type === 'section') {
                return (
                  <div key={q.id} className="pt-2 pb-1">
                    <h2 className="text-lg font-black text-[#0A2463]" style={{ fontFamily: F }}>{q.title}</h2>
                    {q.description && <p className="text-sm text-[#0A2463]/55 mt-1">{q.description}</p>}
                    <div className="h-0.5 mt-3 rounded-full bg-gradient-to-r from-[#D4AF37] to-transparent" />
                  </div>
                );
              }

              const qNum = questionNumbers[q.id];
              return (
                <div
                  key={q.id}
                  className="luxury-glass rounded-2xl border shadow-sm p-6"
                  style={{ borderColor: 'rgba(184,149,30,0.2)' }}
                >
                  <h3 className="text-base font-bold text-[#0A2463] mb-1 leading-snug">
                    <span className="text-[#D4AF37] font-black">{qNum}.</span>{' '}{q.title}
                    {q.required && <span className="text-[#D4AF37] ml-1 font-black">*</span>}
                  </h3>
                  {q.description && (
                    <p className="text-sm text-[#0A2463]/55 mb-4">{q.description}</p>
                  )}
                  <div className="mt-4">
                    <QuestionInput
                      q={q}
                      value={answers[q.id]}
                      onChange={val => setAns(q.id, val)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle size={12} />{error}
            </p>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between mt-8">
            <button
              className="btn-ghost"
              onClick={() => {
                setPage(p => p - 1);
                setError(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ opacity: page === 0 ? 0 : 1, pointerEvents: page === 0 ? 'none' : 'auto' }}
            >
              <ArrowLeft size={14} />Anterior
            </button>
            <button className="btn-primary" onClick={goNext} disabled={submitting}>
              {submitting
                ? <Loader2 size={14} className="animate-spin" />
                : isLastPage ? <CheckCircle size={14} /> : <ArrowRight size={14} />
              }
              {submitting ? 'Enviando...' : isLastPage ? 'Enviar respuesta' : 'Siguiente página'}
            </button>
          </div>

          {/* Dots de página */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1.5 mt-6">
              {pages.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === page ? 18 : 6,
                    height: 6,
                    background: i === page ? '#D4AF37' : 'rgba(10,36,99,0.15)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 shrink-0"
        style={{ background: 'linear-gradient(to right,#051338,#0A2463,#051338)', borderTop: '1px solid rgba(212,175,55,0.2)' }}
      >
        <div className="max-w-xl mx-auto px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: 'rgba(212,175,55,0.25)' }} />
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#D4AF37] font-black text-sm shrink-0"
              style={{ background: 'rgba(212,175,55,0.15)', fontFamily: "'Special Gothic', sans-serif" }}
            >A</div>
            <div className="h-px flex-1 max-w-[40px]" style={{ background: 'rgba(212,175,55,0.25)' }} />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.05em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Desarrollado y publicado por{' '}
            <span style={{ color: 'rgba(212,175,55,0.75)', fontWeight: 700 }}>Alamex Elevadores</span>
          </p>
          <p className="text-[10px] mt-0.5 tracking-[0.03em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © {new Date().getFullYear()} Alamex Elevadores · Todos los derechos reservados
          </p>
          <p className="text-[9px] mt-0.5 uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.12)' }}>
            Alamex IT · Sistema de Encuestas de Satisfacción
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   INPUTS POR TIPO DE PREGUNTA
═══════════════════════════════════════════════════════════════ */

function QuestionInput({ q, value, onChange }: {
  q: PublicQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const v = value ?? '';

  if (q.type === 'rating') {
    const max    = (q.settings.max as number) ?? 5;
    const labels = q.settings.labels as { min?: string; max?: string } | undefined;
    const sel    = Number(v);
    return (
      <div>
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => onChange(String(n))}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl font-bold text-base border-2 transition-all ${
                sel === n
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-md scale-110'
                  : 'bg-white border-gray-200 text-[#0A2463]/60 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
              }`}
            >
              {n}
              {n === 1 && max >= 5 && <Star size={8} className="mt-0.5 opacity-60" />}
            </button>
          ))}
        </div>
        {labels && (
          <div className="flex justify-between mt-2 text-[10px] text-[#0A2463]/40 font-medium px-1">
            <span>{labels.min}</span>
            <span>{labels.max}</span>
          </div>
        )}
      </div>
    );
  }

  if (q.type === 'nps') {
    const sel = Number(v);
    return (
      <div>
        <div className="flex gap-1 flex-wrap justify-center">
          {Array.from({ length: 11 }, (_, i) => i).map(n => {
            const color = n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#10b981';
            return (
              <button
                key={n}
                onClick={() => onChange(String(n))}
                className="w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all hover:scale-110"
                style={{
                  background:  sel === n ? color : 'white',
                  borderColor: sel === n ? color : '#e5e7eb',
                  color:       sel === n ? 'white' : '#374151',
                }}
              >{n}</button>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[#0A2463]/40 font-medium px-1">
          <span>Nada probable</span><span>Muy probable</span>
        </div>
      </div>
    );
  }

  if (q.type === 'multiple') {
    return (
      <div className="space-y-2">
        {q.options.map(o => (
          <button
            key={o.id}
            onClick={() => onChange(o.value)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
              v === o.value
                ? 'bg-[#0A2463] border-[#0A2463] text-white'
                : 'bg-white border-gray-200 text-[#0A2463] hover:border-[#D4AF37]/50'
            }`}
          >{o.label}</button>
        ))}
      </div>
    );
  }

  if (q.type === 'checkbox') {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (val: string) => {
      const next = selected.includes(val)
        ? selected.filter(s => s !== val)
        : [...selected, val];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        {q.options.map(o => {
          const checked = selected.includes(o.value);
          return (
            <button
              key={o.id}
              onClick={() => toggle(o.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all flex items-center gap-3 ${
                checked
                  ? 'bg-[#0A2463]/8 border-[#0A2463] text-[#0A2463]'
                  : 'bg-white border-gray-200 text-[#0A2463] hover:border-[#D4AF37]/50'
              }`}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-300'}`}>
                {checked && <span className="text-white text-[10px] font-black">✓</span>}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'yesno') {
    return (
      <div className="flex gap-3">
        {[{ label: 'Sí', val: 'si' }, { label: 'No', val: 'no' }].map(({ label, val }) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`flex-1 py-4 rounded-xl font-bold text-base border-2 transition-all ${
              v === val
                ? val === 'si'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                  : 'bg-red-500 border-red-500 text-white shadow-md'
                : 'bg-white border-gray-200 text-[#0A2463] hover:border-[#D4AF37]/50'
            }`}
          >{label}</button>
        ))}
      </div>
    );
  }

  if (q.type === 'text') {
    const multi = q.settings.multiline as boolean;
    if (multi) {
      return (
        <textarea
          value={v as string}
          onChange={e => onChange(e.target.value)}
          rows={4}
          placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta aquí...'}
          className="input-base resize-none"
        />
      );
    }
    return (
      <input
        type="text"
        value={v as string}
        onChange={e => onChange(e.target.value)}
        placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta aquí...'}
        className="input-base"
      />
    );
  }

  return null;
}
