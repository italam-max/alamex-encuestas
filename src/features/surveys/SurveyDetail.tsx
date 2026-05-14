import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Send, MailOpen, MessageSquare,
  ChevronDown, ChevronUp, Loader2, Plus, X,
  CheckCircle, AlertCircle, Play, Archive, Star, BarChart2,
  List, CheckSquare, Type, ToggleLeft, Link2, Check,
} from 'lucide-react';
import { SurveysService } from '../../services/surveysService';
import { DistributionsService, type DistributionStats } from '../../services/distributionsService';
import { supabase } from '../../lib/supabase';
import type { SurveyStatus, QuestionType } from '../../types';

const F = "'Special Gothic', sans-serif";

const STATUS_COLORS: Record<SurveyStatus, { bg: string; text: string; border: string }> = {
  'Activa':   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Cerrada':  { bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200' },
  'Borrador': { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
};

const TYPE_ICON: Record<QuestionType, React.ComponentType<{ size?: number; className?: string }>> = {
  rating:   Star, nps: BarChart2, multiple: List, checkbox: CheckSquare, text: Type, yesno: ToggleLeft,
};

interface SurveyFull {
  id: string; title: string; description: string | null; status: SurveyStatus;
  created_at: string; updated_at: string; template_id: string | null;
  questions: { id: string; type: QuestionType; title: string; required: boolean; order_index: number; options: { label: string }[] }[];
}

export default function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [survey,        setSurvey]        = useState<SurveyFull | null>(null);
  const [distributions, setDistributions] = useState<DistributionStats[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [expandQ,       setExpandQ]       = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [s, d] = await Promise.all([
      SurveysService.getById(id),
      DistributionsService.getBySurvey(id),
    ]);
    setSurvey(s as unknown as SurveyFull);
    setDistributions(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status: SurveyStatus) => {
    if (!id) return;
    setStatusLoading(true);
    await SurveysService.update(id, { status });
    await load();
    setStatusLoading(false);
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );
  if (!survey) return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <AlertCircle className="text-red-400" size={32} />
      <p className="text-[#0A2463]/60">Encuesta no encontrada</p>
      <button className="btn-ghost" onClick={() => navigate('/surveys')}><ArrowLeft size={14} />Volver</button>
    </div>
  );

  const sc = STATUS_COLORS[survey.status];
  const totalResp = distributions.reduce((n, d) => n + d.responded, 0);
  const totalSent = distributions.reduce((n, d) => n + d.total, 0);
  const totalOpen = distributions.reduce((n, d) => n + d.opened, 0);
  const baseUrl   = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between backdrop-blur-md border-b shadow-sm shrink-0 gap-4"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.84),rgba(255,249,232,0.70))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <button className="btn-ghost shrink-0" onClick={() => navigate(-1)}><ArrowLeft size={14} />Volver</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-[#0A2463] truncate" style={{ fontFamily: F }}>{survey.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-black uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>{survey.status}</span>
            <span className="text-xs text-[#0A2463]/40">{survey.questions?.length ?? 0} preguntas</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-ghost" onClick={() => navigate(`/surveys/${id}/editar`)}><Edit2 size={14} />Editar</button>
          {survey.status === 'Activa' && (
            <>
              <CopyLinkButton surveyId={id!} baseUrl={baseUrl} />
              <button className="btn-primary" onClick={() => setShowModal(true)}><Send size={14} />Enviar por email</button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">

          {/* Status actions */}
          <div className="luxury-glass rounded-xl border p-4 flex items-center justify-between gap-4" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <div>
              <p className="text-xs font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">Estado de la encuesta</p>
              <p className="text-sm text-[#0A2463]/70 mt-0.5">
                {survey.status === 'Borrador' && 'Actívala para poder enviarla a destinatarios.'}
                {survey.status === 'Activa'   && 'En curso — puedes enviar a más destinatarios.'}
                {survey.status === 'Cerrada'  && 'Cerrada — no acepta más respuestas.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusLoading ? <Loader2 className="animate-spin text-[#D4AF37]" size={18} /> : (
                <>
                  {survey.status !== 'Activa' && (
                    <button className="btn-primary" onClick={() => changeStatus('Activa')}><Play size={13} />Activar</button>
                  )}
                  {survey.status === 'Activa' && (
                    <button className="btn-ghost" onClick={() => changeStatus('Cerrada')}><Archive size={13} />Cerrar</button>
                  )}
                  {survey.status === 'Cerrada' && (
                    <button className="btn-ghost" onClick={() => changeStatus('Borrador')}><Edit2 size={13} />Reabrir</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Enviados',   value: totalSent,  icon: Send,        color: 'text-blue-600',    bg: 'bg-blue-50' },
              { label: 'Abiertos',   value: totalOpen,  icon: MailOpen,    color: 'text-amber-600',   bg: 'bg-amber-50' },
              { label: 'Respondidos',value: totalResp,  icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="luxury-glass rounded-xl border p-4 text-center" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-2xl font-black text-[#0A2463]" style={{ fontFamily: F }}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                {totalSent > 0 && label !== 'Enviados' && (
                  <p className="text-[10px] text-[#D4AF37] font-bold mt-0.5">{Math.round((value / totalSent) * 100)}%</p>
                )}
              </div>
            ))}
          </div>

          {/* Questions preview */}
          <div className="luxury-glass rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <button
              className="w-full px-5 py-4 flex items-center justify-between text-left"
              onClick={() => setExpandQ(v => !v)}
            >
              <div>
                <p className="font-bold text-[#0A2463] text-sm" style={{ fontFamily: F }}>Preguntas ({survey.questions?.length ?? 0})</p>
                <p className="text-xs text-[#0A2463]/50">Vista previa del formulario</p>
              </div>
              {expandQ ? <ChevronUp size={16} className="text-[#0A2463]/40" /> : <ChevronDown size={16} className="text-[#0A2463]/40" />}
            </button>
            {expandQ && (
              <div className="border-t divide-y" style={{ borderColor: 'rgba(184,149,30,0.12)' }}>
                {(survey.questions ?? []).map((q, i) => {
                  const Icon = TYPE_ICON[q.type] ?? Type;
                  return (
                    <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                      <span className="text-xs font-black text-[#0A2463]/30 w-5 shrink-0 mt-0.5">{i + 1}.</span>
                      <Icon size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A2463]">{q.title}</p>
                        {q.options?.length > 0 && (
                          <p className="text-xs text-[#0A2463]/50 mt-0.5">{q.options.map(o => o.label).join(' · ')}</p>
                        )}
                      </div>
                      {q.required && <span className="text-[10px] font-bold text-red-400 shrink-0">*</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distributions */}
          <div className="luxury-glass rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
              <div>
                <p className="font-bold text-[#0A2463] text-sm" style={{ fontFamily: F }}>Historial de envíos</p>
                <p className="text-xs text-[#0A2463]/50">{distributions.length} distribución{distributions.length !== 1 ? 'es' : ''}</p>
              </div>
              {survey.status === 'Activa' && (
                <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} />Nuevo envío</button>
              )}
            </div>
            {distributions.length === 0 ? (
              <div className="py-12 text-center">
                <Send size={32} className="text-[#0A2463]/15 mx-auto mb-3" />
                <p className="text-sm text-[#0A2463]/40">Aún no se ha enviado esta encuesta</p>
                {survey.status === 'Activa' && (
                  <button className="btn-primary mt-4" onClick={() => setShowModal(true)}><Send size={14} />Enviar ahora</button>
                )}
                {survey.status !== 'Activa' && (
                  <p className="text-xs text-[#0A2463]/30 mt-1">Activa la encuesta para enviarla</p>
                )}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(184,149,30,0.10)' }}>
                {distributions.map(d => (
                  <DistRow key={d.id} dist={d} baseUrl={baseUrl} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <SendModal
          surveyId={id!}
          surveyTitle={survey.title}
          onClose={() => setShowModal(false)}
          onSent={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function DistRow({ dist, baseUrl }: { dist: DistributionStats; baseUrl: string }) {
  const [open, setOpen] = useState(false);
  const rate = dist.total > 0 ? Math.round((dist.responded / dist.total) * 100) : 0;
  return (
    <div>
      <button className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-[#0A2463]/2 transition-colors text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0A2463] truncate">{dist.subject}</p>
          <p className="text-xs text-[#0A2463]/50">{new Date(dist.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-center">
          <div>
            <p className="text-xs font-black text-[#0A2463]" style={{ fontFamily: F }}>{dist.total}</p>
            <p className="text-[10px] text-gray-400">enviados</p>
          </div>
          <div>
            <p className="text-xs font-black text-amber-600" style={{ fontFamily: F }}>{dist.opened}</p>
            <p className="text-[10px] text-gray-400">abiertos</p>
          </div>
          <div>
            <p className="text-xs font-black text-emerald-600" style={{ fontFamily: F }}>{dist.responded}</p>
            <p className="text-[10px] text-gray-400">resp.</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-black text-[#D4AF37]" style={{ fontFamily: F }}>{rate}%</p>
            <p className="text-[10px] text-gray-400">tasa</p>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-[#0A2463]/40 shrink-0" /> : <ChevronDown size={14} className="text-[#0A2463]/40 shrink-0" />}
      </button>
      {open && (
        <div className="border-t px-5 py-3 bg-[#0A2463]/2" style={{ borderColor: 'rgba(184,149,30,0.10)' }}>
          <p className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-[0.08em] mb-2">Destinatarios</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {dist.recipients.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-1 text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'respondido' ? 'bg-emerald-500' : r.status === 'abierto' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                <span className="flex-1 font-medium text-[#0A2463]/70">{r.name ? `${r.name} (${r.email})` : r.email}</span>
                <span className="text-[#0A2463]/40 capitalize">{r.status}</span>
                <a
                  href={`${baseUrl}/s/${r.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4AF37] hover:underline text-[10px] shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  Link
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Botón copiar link compartible ── */
function CopyLinkButton({ surveyId, baseUrl }: { surveyId: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${baseUrl}/s/pub/${surveyId}`;
  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="btn-ghost flex items-center gap-1.5"
      title="Copiar link para WhatsApp / compartir"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  );
}

function SendModal({ surveyId, surveyTitle, onClose, onSent }: {
  surveyId: string; surveyTitle: string; onClose: () => void; onSent: () => void;
}) {
  const defaultSubject = `Tu opinión nos importa — ${surveyTitle}`;
  const [subject,   setSubject]   = useState(defaultSubject);
  const [rawEmails, setRawEmails] = useState('');
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<{ sent: number; failed: number } | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const emails = rawEmails
    .split(/[\n,;]+/)
    .map(e => e.trim())
    .filter(e => e.includes('@'));

  const send = async () => {
    if (!subject.trim()) { setError('El asunto es requerido'); return; }
    if (emails.length === 0) { setError('Ingresa al menos un email'); return; }
    setSending(true); setError(null);
    try {
      const { distributionId } = await DistributionsService.create(surveyId, {
        subject,
        recipients: emails.map(e => ({ email: e })),
      });
      const { data, error: fnErr } = await supabase.functions.invoke('send-survey', {
        body: { distributionId },
      });
      if (fnErr) throw fnErr;
      setResult(data as { sent: number; failed: number });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="luxury-glass rounded-2xl border shadow-2xl w-full max-w-lg animate-slide-up" style={{ borderColor: 'rgba(184,149,30,0.30)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(184,149,30,0.18)' }}>
          <h2 className="font-bold text-[#0A2463] text-lg flex items-center gap-2" style={{ fontFamily: F }}>
            <Send size={18} className="text-[#D4AF37]" />
            Enviar por correo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#0A2463]/5 rounded-lg transition-colors">
            <X size={18} className="text-[#0A2463]/40" />
          </button>
        </div>

        {result ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-[#0A2463]" style={{ fontFamily: F }}>¡Enviado!</p>
            <p className="text-sm text-[#0A2463]/60 mt-1">
              {result.sent} correo{result.sent !== 1 ? 's' : ''} enviado{result.sent !== 1 ? 's' : ''}
              {result.failed > 0 ? ` · ${result.failed} fallido${result.failed !== 1 ? 's' : ''}` : ''}
            </p>
            <button className="btn-primary mt-6" onClick={onSent}><CheckCircle size={14} />Listo</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Asunto */}
            <div>
              <label className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">
                Asunto del correo *
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="input-base mt-1"
              />
              <p className="text-[10px] text-[#0A2463]/35 mt-1">
                Se genera automáticamente desde el título de la encuesta. Puedes editarlo.
              </p>
            </div>

            {/* Info del cuerpo del correo */}
            <div className="rounded-xl p-3 text-xs text-[#0A2463]/60" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="font-bold text-[#0A2463]/80 mb-1">El correo incluye automáticamente:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Saludo personalizado con el nombre del destinatario</li>
                <li>Invitación a responder la encuesta</li>
                <li>Botón con el enlace único por persona</li>
                <li>Identidad visual de Alamex Elevadores</li>
              </ul>
              <p className="mt-2 text-[10px] text-[#0A2463]/40">
                El cuerpo es fijo para mantener consistencia de marca en todas las comunicaciones.
              </p>
            </div>

            {/* Destinatarios */}
            <div>
              <label className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">
                Destinatarios * <span className="normal-case font-normal">(uno por línea, o separados por coma)</span>
              </label>
              <textarea
                value={rawEmails}
                onChange={e => setRawEmails(e.target.value)}
                rows={5}
                placeholder={'juan@empresa.com\nmaria@empresa.com\ncarlos@empresa.com'}
                className="input-base mt-1 resize-none font-mono text-xs"
              />
              {emails.length > 0 && (
                <p className="text-xs text-[#D4AF37] font-semibold mt-1">
                  {emails.length} email{emails.length !== 1 ? 's' : ''} válido{emails.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} className="shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button className="btn-ghost flex-1" onClick={onClose}><X size={14} />Cancelar</button>
              <button className="btn-primary flex-1" onClick={send} disabled={sending}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Enviando...' : `Enviar a ${emails.length || '?'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
