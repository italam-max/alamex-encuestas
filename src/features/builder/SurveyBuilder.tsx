import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Type, Star, BarChart2,
  CheckSquare, List, ToggleLeft, Loader2, Check, Eye,
  X, ArrowRight, RotateCcw, Smartphone, Monitor,
  ChevronDown, Copy, Minus, AlertCircle,
} from 'lucide-react';
import { SurveysService } from '../../services/surveysService';
import {
  QuestionsService, emptyQuestion, emptySection, makeKey, isSection, isStoredSectionQuestion,
  type QuestionDraft, type SectionDraft, type BuilderBlock, type OptionDraft,
} from '../../services/questionsService';
import { useTemplates } from '../../hooks/useTemplates';
import type { QuestionType } from '../../types';

const F = "'Special Gothic', sans-serif";

const TYPE_META: Record<QuestionType, {
  label: string; short: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  color: string; bg: string; description: string; example: string;
}> = {
  rating:   { label: 'Calificación',    short: 'Calificación', icon: Star,        color: '#F59E0B', bg: '#FEF3C7', description: 'Escala numérica del 1 al 5 o del 1 al 10',           example: '★★★★☆' },
  nps:      { label: 'NPS',             short: 'NPS',          icon: BarChart2,   color: '#3B82F6', bg: '#DBEAFE', description: 'Net Promoter Score — probabilidad de recomendación', example: '0 — 10' },
  multiple: { label: 'Opción múltiple', short: 'Múltiple',     icon: List,        color: '#8B5CF6', bg: '#EDE9FE', description: 'El encuestado elige una sola opción',                example: '○ A · ○ B' },
  checkbox: { label: 'Casillas',        short: 'Casillas',     icon: CheckSquare, color: '#10B981', bg: '#D1FAE5', description: 'Puede seleccionar varias opciones a la vez',         example: '☑ A · ☑ B' },
  text:     { label: 'Texto libre',     short: 'Texto',        icon: Type,        color: '#6366F1', bg: '#E0E7FF', description: 'Campo abierto — el encuestado escribe su respuesta', example: 'Escribe aquí…' },
  yesno:    { label: 'Sí / No',         short: 'Sí / No',      icon: ToggleLeft,  color: '#EF4444', bg: '#FEE2E2', description: 'Pregunta binaria con dos botones',                   example: '✔ Sí   ✘ No' },
};

const TYPE_ENTRIES = Object.entries(TYPE_META) as [QuestionType, typeof TYPE_META[QuestionType]][];

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */

export default function SurveyBuilder() {
  const navigate      = useNavigate();
  const { id }        = useParams<{ id: string }>();
  const { templates } = useTemplates();
  const isEdit        = Boolean(id);

  const [title,          setTitle]          = useState('');
  const [description,    setDescription]    = useState('');
  const [templateId,     setTemplateId]     = useState('');
  const [blocks,         setBlocks]         = useState<BuilderBlock[]>([]);
  const [activeKey,      setActiveKey]      = useState<string | null>(null);
  const [insertAfterKey, setInsertAfterKey] = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [loadingData,    setLoadingData]    = useState(isEdit);
  const [showPreview,    setShowPreview]    = useState(false);
  const [showTypePick,   setShowTypePick]   = useState(false);
  const titleCardRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    SurveysService.getById(id).then(survey => {
      setTitle(survey.title);
      setDescription(survey.description ?? '');
      setTemplateId(survey.template_id ?? '');
      type RawQ = QuestionDraft & { question_options?: OptionDraft[]; type: QuestionType | 'section' };
      const raw = ((survey as unknown as { questions: RawQ[] }).questions ?? []);
      const parsed: BuilderBlock[] = raw.map(q => {
        if (isStoredSectionQuestion(q)) {
          return { _key: makeKey(), id: q.id, type: 'section' as const, title: q.title, description: q.description ?? '' };
        }
        return {
          _key: makeKey(), id: q.id, type: q.type as QuestionType,
          title: q.title, description: q.description ?? '',
          required: q.required, settings: q.settings ?? {},
          options: (q.question_options ?? q.options ?? []).map((o: OptionDraft & { id?: string }) => {
            const { _key: _k, ...rest } = o as OptionDraft; void _k;
            return { _key: makeKey(), ...rest };
          }),
        } as QuestionDraft;
      });
      setBlocks(parsed);
      if (parsed.length > 0) setActiveKey(parsed[0]._key);
    }).finally(() => setLoadingData(false));
  }, [id]);

  const save = async () => {
    if (!title.trim()) { setError('El título es requerido'); return; }
    setSaving(true); setError(null);
    try {
      const surveyId = isEdit
        ? (await SurveysService.update(id!, { title, description: description || null, template_id: templateId || null })).id
        : (await SurveysService.create({ title, description: description || undefined, template_id: templateId || undefined })).id;
      await QuestionsService.upsertForSurvey(surveyId, blocks);
      setSaved(true);
      setTimeout(() => navigate(`/surveys/${surveyId}`), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  /* ── Gestión de bloques ── */
  const insertAt = (block: BuilderBlock, afterKey: string | null) => {
    setBlocks(prev => {
      const arr = [...prev];
      const idx = afterKey !== null ? arr.findIndex(b => b._key === afterKey) : arr.length - 1;
      arr.splice(idx === -1 ? arr.length : idx + 1, 0, block);
      return arr;
    });
    setActiveKey(block._key);
  };

  const addQuestion = (type: QuestionType) => {
    insertAt(emptyQuestion(type), insertAfterKey);
    setShowTypePick(false);
    setInsertAfterKey(null);
  };

  const addSection = (afterKey: string | null) => insertAt(emptySection(), afterKey);

  const removeBlock = (key: string) => {
    setBlocks(prev => {
      const arr = prev.filter(b => b._key !== key);
      if (activeKey === key) setActiveKey(arr.length > 0 ? arr[0]._key : null);
      return arr;
    });
  };

  const duplicateBlock = (key: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b._key === key);
      if (idx === -1) return prev;
      const dup = { ...prev[idx], _key: makeKey(), id: undefined };
      const arr = [...prev];
      arr.splice(idx + 1, 0, dup);
      setActiveKey(dup._key);
      return arr;
    });
  };

  const moveBlock = (key: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b._key === key);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const updateBlock = (key: string, patch: Partial<QuestionDraft> | Partial<SectionDraft>) =>
    setBlocks(prev => prev.map(b => b._key === key ? { ...b, ...patch } as BuilderBlock : b));

  const questionNumberOf = (key: string): number => {
    let n = 0;
    for (const b of blocks) {
      if (!isSection(b)) n++;
      if (b._key === key) return n;
    }
    return n;
  };

  const totalQuestions = blocks.filter(b => !isSection(b)).length;

  if (loadingData) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ══ HEADER ══ */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.9),rgba(255,249,232,0.75))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <button className="btn-ghost shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />Volver
        </button>
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => {
            titleCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            titleCardRef.current?.focus();
          }}
          title="Haz clic para editar el título"
        >
          <p
            className={`text-base font-bold truncate ${title ? 'text-[#0A2463]' : 'text-[#0A2463]/35 italic'}`}
            style={{ fontFamily: F }}
          >
            {title || 'Título de la encuesta…'}
          </p>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {error && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-red-500">
              <AlertCircle size={12} />{error}
            </span>
          )}
          <button
            className="btn-ghost"
            onClick={() => setShowPreview(true)}
            disabled={totalQuestions === 0}
            title="Vista previa"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Vista previa</span>
          </button>
          <button className="btn-primary" onClick={save} disabled={saving || saved}>
            {saved ? <Check size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Guardado' : saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex-1 overflow-y-auto bg-[#F8F9FC]">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-20 space-y-1">

          {/* Tarjeta encuesta */}
          <div
            className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-2"
            style={{ borderTop: '4px solid #D4AF37', borderLeft: '1px solid rgba(184,149,30,0.25)', borderRight: '1px solid rgba(184,149,30,0.25)', borderBottom: '1px solid rgba(184,149,30,0.25)' }}
          >
            <div className="p-6 space-y-3">
              <input
                ref={titleCardRef}
                value={title}
                onChange={e => { setTitle(e.target.value); setError(null); }}
                placeholder="Título de la encuesta…"
                className="w-full text-2xl font-black text-[#0A2463] bg-transparent outline-none border-b-2 border-transparent focus:border-[#D4AF37] pb-1 transition-colors placeholder-[#0A2463]/25"
                style={{ fontFamily: F }}
              />
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción o instrucciones para el encuestado (opcional)…"
                className="w-full text-sm text-[#0A2463]/70 bg-transparent outline-none border-b border-transparent focus:border-[#D4AF37]/40 pb-1 transition-colors placeholder-[#0A2463]/25"
              />
              <div className="pt-1">
                <label className="text-[10px] font-black text-[#0A2463]/35 uppercase tracking-[0.1em]">Template base</label>
                <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="input-base mt-1 text-xs">
                  <option value="">Sin template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Estado vacío */}
          {blocks.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-[#D4AF37]/30 p-10 text-center mt-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(212,175,55,0.1)' }}>
                <Plus size={22} className="text-[#D4AF37]" />
              </div>
              <p className="font-bold text-[#0A2463]/60 mb-1">Tu encuesta está vacía</p>
              <p className="text-sm text-[#0A2463]/40 mb-5">Agrega tu primera pregunta para comenzar.</p>
              <button className="btn-primary" onClick={() => { setInsertAfterKey(null); setShowTypePick(true); }}>
                <Plus size={14} />Agregar primera pregunta
              </button>
            </div>
          )}

          {/* Bloques con AddRow entre cada uno */}
          {blocks.map((block, i) => {
            const active   = block._key === activeKey;
            const canUp    = i > 0;
            const canDown  = i < blocks.length - 1;

            const card = isSection(block) ? (
              <SectionCard
                key={block._key}
                block={block}
                active={active}
                onActivate={() => setActiveKey(block._key)}
                onChange={patch => updateBlock(block._key, patch)}
                onRemove={() => removeBlock(block._key)}
                onMoveUp={canUp ? () => moveBlock(block._key, -1) : undefined}
                onMoveDown={canDown ? () => moveBlock(block._key, 1) : undefined}
              />
            ) : (
              <QuestionCard
                key={block._key}
                question={block as QuestionDraft}
                questionNumber={questionNumberOf(block._key)}
                totalQuestions={totalQuestions}
                active={active}
                onActivate={() => setActiveKey(block._key)}
                onChange={patch => updateBlock(block._key, patch)}
                onRemove={() => removeBlock(block._key)}
                onDuplicate={() => duplicateBlock(block._key)}
                onMoveUp={canUp ? () => moveBlock(block._key, -1) : undefined}
                onMoveDown={canDown ? () => moveBlock(block._key, 1) : undefined}
              />
            );

            return (
              <div key={block._key}>
                {card}
                <AddRow
                  onAddQuestion={() => { setInsertAfterKey(block._key); setShowTypePick(true); }}
                  onAddSection={() => addSection(block._key)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      {showTypePick && (
        <TypePickerModal onSelect={addQuestion} onClose={() => { setShowTypePick(false); setInsertAfterKey(null); }} />
      )}
      {showPreview && (
        <PreviewModal
          title={title || 'Sin título'}
          description={description}
          blocks={blocks}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ADD ROW — botón contextual entre tarjetas
═══════════════════════════════════════════════════════════════ */

function AddRow({ onAddQuestion, onAddSection }: {
  onAddQuestion: () => void;
  onAddSection: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-1.5">
      <div className="h-px flex-1" style={{ background: 'rgba(212,175,55,0.25)' }} />
      <button
        onClick={onAddQuestion}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
        style={{ background: 'rgba(212,175,55,0.12)', color: '#B8952A', border: '1px dashed rgba(212,175,55,0.5)' }}
      >
        <Plus size={11} />Pregunta
      </button>
      <button
        onClick={onAddSection}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ color: 'rgba(10,36,99,0.5)', border: '1px dashed rgba(10,36,99,0.22)', background: 'transparent' }}
      >
        <Minus size={11} />Sección
      </button>
      <div className="h-px flex-1" style={{ background: 'rgba(212,175,55,0.25)' }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION CARD
═══════════════════════════════════════════════════════════════ */

function SectionCard({ block, active, onActivate, onChange, onRemove, onMoveUp, onMoveDown }: {
  block: SectionDraft; active: boolean;
  onActivate: () => void; onChange: (p: Partial<SectionDraft>) => void;
  onRemove: () => void; onMoveUp?: () => void; onMoveDown?: () => void;
}) {
  if (!active) {
    return (
      <div onClick={onActivate} className="cursor-pointer px-4 py-3 rounded-xl border border-transparent hover:bg-white hover:border-[#D4AF37]/20 hover:shadow-sm transition-all">
        <div className="border-t-2 pt-2" style={{ borderColor: 'rgba(212,175,55,0.4)' }}>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(212,175,55,0.7)' }}>Sección</p>
          <p className={`text-sm font-bold ${block.title ? 'text-[#0A2463]' : 'text-[#0A2463]/35 italic'}`}>
            {block.title || 'Sin título de sección'}
          </p>
          {block.description && <p className="text-xs text-[#0A2463]/45 mt-0.5">{block.description}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden" style={{ borderColor: 'rgba(212,175,55,0.5)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#B8952A' }}>Sección divisora</span>
        <span className="text-[10px] text-[#0A2463]/35">Agrupa visualmente las preguntas</span>
      </div>
      <div className="p-5 space-y-3">
        <input
          autoFocus
          type="text" value={block.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Título de sección (ej: Datos generales, Experiencia de servicio…)"
          className="w-full text-lg font-bold text-[#0A2463] bg-transparent outline-none border-b-2 border-[#D4AF37]/30 focus:border-[#D4AF37] pb-1 transition-colors placeholder-[#0A2463]/25"
          style={{ fontFamily: F }}
        />
        <input
          type="text" value={block.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Descripción opcional de la sección…"
          className="input-base text-sm"
        />
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
          <div className="flex gap-1">
            <button onClick={onMoveUp} disabled={!onMoveUp} className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-25" title="Mover arriba">
              <ArrowLeft size={14} className="text-[#0A2463]/50 rotate-90" />
            </button>
            <button onClick={onMoveDown} disabled={!onMoveDown} className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-25" title="Mover abajo">
              <ArrowLeft size={14} className="text-[#0A2463]/50 -rotate-90" />
            </button>
          </div>
          <button onClick={onRemove} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
            <Trash2 size={13} />Eliminar sección
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUESTION CARD
═══════════════════════════════════════════════════════════════ */

function QuestionCard({ question, questionNumber, totalQuestions, active, onActivate, onChange, onRemove, onDuplicate, onMoveUp, onMoveDown }: {
  question: QuestionDraft; questionNumber: number; totalQuestions: number;
  active: boolean; onActivate: () => void;
  onChange: (p: Partial<QuestionDraft>) => void;
  onRemove: () => void; onDuplicate: () => void;
  onMoveUp?: () => void; onMoveDown?: () => void;
}) {
  const meta = TYPE_META[question.type];

  /* ── Colapsada ── */
  if (!active) {
    return (
      <div onClick={onActivate} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#D4AF37]/30 transition-all cursor-pointer overflow-hidden">
        <div className="flex">
          <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: meta.color }} />
          <div className="flex-1 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.bg }}>
                <meta.icon size={14} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-[#0A2463] leading-snug ${!question.title ? 'italic text-[#0A2463]/35' : ''}`}>
                  <span className="font-black text-[#0A2463]/40 mr-1">{questionNumber}.</span>
                  {question.title || 'Sin título'}
                  {question.required && <span className="text-[#D4AF37] ml-1 text-xs">*</span>}
                </p>
                {question.description && <p className="text-xs text-[#0A2463]/45 mt-0.5 truncate">{question.description}</p>}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: meta.bg, color: meta.color }}>
                {meta.short}
              </span>
            </div>
            <MiniAnswerPreview question={question} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Expandida ── */
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
      style={{ border: `2px solid ${meta.color}55`, outline: `3px solid ${meta.color}15` }}
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: meta.color }} />

        <div className="flex-1 p-5 space-y-4">

          {/* Selector de tipo */}
          <TypeSelectorInline
            questionNumber={questionNumber}
            currentType={question.type}
            onChange={type => {
              const keepOptions = (type === 'multiple' || type === 'checkbox') && (question.type === 'multiple' || question.type === 'checkbox');
              onChange({
                type, settings: {},
                options: keepOptions ? question.options
                  : (type === 'multiple' || type === 'checkbox')
                    ? [{ _key: makeKey(), label: 'Opción 1', value: 'opcion_1' }]
                    : [],
              });
            }}
          />

          {/* Texto de la pregunta */}
          <input
            autoFocus
            type="text"
            value={question.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="Escribe aquí el texto de tu pregunta…"
            className="w-full text-base font-semibold text-[#0A2463] bg-transparent outline-none border-b-2 border-gray-200 focus:border-[#D4AF37] pb-2 transition-colors placeholder-[#0A2463]/25"
          />

          {/* Descripción */}
          <input
            type="text"
            value={question.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Descripción o instrucción adicional (opcional)…"
            className="w-full text-sm text-[#0A2463]/65 bg-transparent outline-none border-b border-dashed border-gray-200 focus:border-[#D4AF37]/50 pb-1.5 transition-colors placeholder-[#0A2463]/20"
          />

          {/* Configuración del tipo */}
          <QuestionSettings q={question} onChange={onChange} />

          {/* ── Vista previa en vivo ── */}
          <LiveAnswerPreview q={question} />

          {/* Barra de acciones */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
            <button
              onClick={() => onChange({ required: !question.required })}
              className="flex items-center gap-2 text-xs font-semibold text-[#0A2463]/60 hover:text-[#0A2463] transition-colors"
            >
              <div className={`w-9 h-5 rounded-full relative transition-colors ${question.required ? 'bg-[#D4AF37]' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${question.required ? 'left-4' : 'left-0.5'}`} />
              </div>
              Obligatoria
            </button>
            <div className="flex items-center gap-0.5">
              <ActionBtn onClick={onMoveUp} disabled={!onMoveUp} title="Mover arriba" icon={<ArrowLeft size={14} className="rotate-90" />} />
              <ActionBtn onClick={onMoveDown} disabled={!onMoveDown} title="Mover abajo" icon={<ArrowLeft size={14} className="-rotate-90" />} />
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <ActionBtn onClick={onDuplicate} title="Duplicar" icon={<Copy size={14} />} />
              <ActionBtn onClick={onRemove} title="Eliminar" icon={<Trash2 size={14} />} danger />
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-end px-4 py-1.5 border-t text-[10px] font-medium"
        style={{ borderColor: `${meta.color}20`, background: `${meta.bg}40`, color: meta.color }}
      >
        Pregunta {questionNumber} de {totalQuestions}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, title, icon, danger }: {
  onClick?: () => void; disabled?: boolean; title: string; icon: React.ReactNode; danger?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`p-2 rounded-lg transition-colors disabled:opacity-25 ${danger ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-gray-50 text-[#0A2463]/45 hover:text-[#0A2463]'}`}
    >{icon}</button>
  );
}

/* ════════════════════════════════════════════════════════════
   LIVE ANSWER PREVIEW — dentro de la tarjeta activa
═══════════════════════════════════════════════════════════════ */

function LiveAnswerPreview({ q }: { q: QuestionDraft }) {
  const [val, setVal] = useState<string | string[]>('');
  const meta = TYPE_META[q.type];

  // Resetea al cambiar de pregunta o de tipo
  useEffect(() => { setVal(''); }, [q._key, q.type]);

  const hasOptions = (q.type === 'multiple' || q.type === 'checkbox') && q.options.length === 0;

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: `${meta.color}25`, background: `${meta.bg}30` }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: `${meta.color}20` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
        <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: meta.color }}>
          Así lo verá el encuestado
        </p>
        {val !== '' && !Array.isArray(val) || (Array.isArray(val) && val.length > 0) ? (
          <button
            onClick={() => setVal('')}
            className="ml-auto text-[10px] font-medium transition-colors"
            style={{ color: `${meta.color}80` }}
          >Limpiar</button>
        ) : null}
      </div>

      <div className="px-4 py-4">
        {hasOptions ? (
          <p className="text-xs italic text-center py-2" style={{ color: `${meta.color}80` }}>
            Agrega opciones arriba para ver la vista previa
          </p>
        ) : (
          <InlinePreviewInput q={q} value={val} onChange={setVal} />
        )}
      </div>
    </div>
  );
}

function InlinePreviewInput({ q, value, onChange }: {
  q: QuestionDraft; value: string | string[]; onChange: (v: string | string[]) => void;
}) {
  const v = value ?? '';
  const meta = TYPE_META[q.type];

  if (q.type === 'rating') {
    const max = (q.settings.max as number) ?? 5;
    const labels = q.settings.labels as { min?: string; max?: string } | undefined;
    const sel = Number(v);
    return (
      <div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => onChange(String(n))}
              className="w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all"
              style={{
                background: sel === n ? meta.color : 'white',
                borderColor: sel === n ? meta.color : 'rgba(0,0,0,0.1)',
                color: sel === n ? 'white' : 'rgba(10,36,99,0.5)',
                transform: sel === n ? 'scale(1.1)' : 'scale(1)',
              }}
            >{n}</button>
          ))}
        </div>
        {labels && (
          <div className="flex justify-between mt-2 text-[10px] font-medium" style={{ color: `${meta.color}80` }}>
            <span>{labels.min}</span><span>{labels.max}</span>
          </div>
        )}
      </div>
    );
  }

  if (q.type === 'nps') {
    const sel = Number(v);
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map(n => {
            const c = n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#10b981';
            return (
              <button key={n} onClick={() => onChange(String(n))}
                className="w-9 h-9 rounded-lg font-bold text-sm border-2 transition-all"
                style={{ background: sel === n ? c : 'white', borderColor: sel === n ? c : 'rgba(0,0,0,0.1)', color: sel === n ? 'white' : '#374151' }}
              >{n}</button>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-medium" style={{ color: `${meta.color}80` }}>
          <span>Nada probable</span><span>Muy probable</span>
        </div>
      </div>
    );
  }

  if (q.type === 'multiple') {
    return (
      <div className="space-y-2">
        {q.options.map(o => (
          <button key={o._key} onClick={() => onChange(o.value)}
            className="w-full text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-all"
            style={{
              background:  v === o.value ? meta.color + '15' : 'white',
              borderColor: v === o.value ? meta.color        : 'rgba(0,0,0,0.08)',
              color:       v === o.value ? meta.color        : 'rgba(10,36,99,0.7)',
            }}
          >{o.label}</button>
        ))}
      </div>
    );
  }

  if (q.type === 'checkbox') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (val: string) => onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
    return (
      <div className="space-y-2">
        {q.options.map(o => {
          const checked = selected.includes(o.value);
          return (
            <button key={o._key} onClick={() => toggle(o.value)}
              className="w-full text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-all flex items-center gap-2.5"
              style={{
                background:  checked ? meta.color + '12' : 'white',
                borderColor: checked ? meta.color        : 'rgba(0,0,0,0.08)',
                color:       checked ? meta.color        : 'rgba(10,36,99,0.7)',
              }}
            >
              <span className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                style={{ background: checked ? meta.color : 'transparent', borderColor: checked ? meta.color : 'rgba(0,0,0,0.2)' }}>
                {checked && <Check size={10} className="text-white" strokeWidth={3} />}
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
        {[{ label: 'Sí', val: 'si', c: '#10b981' }, { label: 'No', val: 'no', c: '#ef4444' }].map(({ label, val: bv, c }) => (
          <button key={bv} onClick={() => onChange(bv)}
            className="flex-1 py-3 rounded-xl font-bold text-base border-2 transition-all"
            style={{
              background:  v === bv ? c : 'white',
              borderColor: v === bv ? c : 'rgba(0,0,0,0.08)',
              color:       v === bv ? 'white' : 'rgba(10,36,99,0.6)',
            }}
          >{label}</button>
        ))}
      </div>
    );
  }

  if (q.type === 'text') {
    const multi = q.settings.multiline as boolean;
    if (multi) return (
      <textarea value={v as string} onChange={e => onChange(e.target.value)} rows={3}
        placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta aquí…'}
        className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm text-[#0A2463] outline-none focus:border-[#D4AF37]/50 resize-none transition-colors placeholder-[#0A2463]/25"
      />
    );
    return (
      <input type="text" value={v as string} onChange={e => onChange(e.target.value)}
        placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta aquí…'}
        className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2.5 text-sm text-[#0A2463] outline-none focus:border-[#D4AF37]/50 transition-colors placeholder-[#0A2463]/25"
      />
    );
  }

  return null;
}

/* ════════════════════════════════════════════════════════════
   MINI ANSWER PREVIEW (tarjeta inactiva)
═══════════════════════════════════════════════════════════════ */

function MiniAnswerPreview({ question }: { question: QuestionDraft }) {
  if (question.type === 'rating') {
    const max = (question.settings.max as number) ?? 5;
    return (
      <div className="mt-2.5 flex gap-1.5">
        {Array.from({ length: Math.min(max, 10) }, (_, i) => (
          <div key={i} className="w-8 h-8 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-xs font-bold text-[#0A2463]/25">{i + 1}</div>
        ))}
      </div>
    );
  }
  if (question.type === 'nps') {
    return (
      <div className="mt-2.5 flex gap-0.5">
        {Array.from({ length: 11 }, (_, i) => {
          const c = i <= 6 ? '#ef4444' : i <= 8 ? '#f59e0b' : '#10b981';
          return <div key={i} className="w-6 h-5 rounded text-[9px] font-bold flex items-center justify-center" style={{ background: c + '15', color: c + 'aa' }}>{i}</div>;
        })}
      </div>
    );
  }
  if (question.type === 'multiple' || question.type === 'checkbox') {
    const shown = question.options.slice(0, 3);
    const isCheck = question.type === 'checkbox';
    return (
      <div className="mt-2.5 space-y-1">
        {shown.map(o => (
          <div key={o._key} className="flex items-center gap-2 text-xs text-[#0A2463]/40">
            <div className={`w-3.5 h-3.5 border border-gray-200 shrink-0 ${isCheck ? 'rounded-sm' : 'rounded-full'} bg-gray-50`} />
            <span className="truncate">{o.label}</span>
          </div>
        ))}
        {question.options.length > 3 && <p className="text-[10px] text-[#0A2463]/25 pl-5">+{question.options.length - 3} más</p>}
      </div>
    );
  }
  if (question.type === 'yesno') {
    return (
      <div className="mt-2.5 flex gap-2">
        {['Sí', 'No'].map(l => <div key={l} className="px-5 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-xs font-semibold text-[#0A2463]/35">{l}</div>)}
      </div>
    );
  }
  if (question.type === 'text') {
    return (
      <div className="mt-2.5 h-9 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center px-3">
        <span className="text-[11px] text-[#0A2463]/25">{(question.settings.placeholder as string) || 'Texto libre…'}</span>
      </div>
    );
  }
  return null;
}

/* ════════════════════════════════════════════════════════════
   TYPE SELECTOR INLINE
═══════════════════════════════════════════════════════════════ */

function TypeSelectorInline({ questionNumber, currentType, onChange }: {
  questionNumber: number; currentType: QuestionType; onChange: (t: QuestionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = TYPE_META[currentType];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-[#0A2463]/35">{questionNumber}.</span>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all"
          style={{ background: meta.bg, borderColor: meta.color + '50', color: meta.color }}
        >
          <meta.icon size={13} />
          {meta.label}
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[11px] text-[#0A2463]/35 hidden sm:block">{meta.description}</span>
      </div>

      {open && (
        <div
          className="absolute top-10 left-6 z-30 bg-white rounded-2xl shadow-xl border p-2 grid grid-cols-2 gap-1 animate-fade-in"
          style={{ width: '340px', borderColor: 'rgba(184,149,30,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          {TYPE_ENTRIES.map(([type, m]) => (
            <button key={type} onClick={() => { onChange(type); setOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-gray-50"
              style={currentType === type ? { background: m.bg, outline: `2px solid ${m.color}55` } : {}}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                <m.icon size={15} style={{ color: m.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0A2463]">{m.label}</p>
                <p className="text-[10px] text-[#0A2463]/40 font-mono">{m.example}</p>
              </div>
              {currentType === type && <Check size={12} className="ml-auto shrink-0" style={{ color: m.color }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUESTION SETTINGS
═══════════════════════════════════════════════════════════════ */

function QuestionSettings({ q, onChange }: { q: QuestionDraft; onChange: (p: Partial<QuestionDraft>) => void }) {
  if (q.type === 'rating') {
    const max    = (q.settings.max as number) ?? 5;
    const labels = (q.settings.labels as { min: string; max: string }) ?? { min: '', max: '' };
    return (
      <div className="space-y-3 p-4 rounded-xl" style={{ background: TYPE_META.rating.bg + '50' }}>
        <div>
          <label className="text-[10px] font-black text-[#0A2463]/45 uppercase tracking-[0.08em] block mb-2">Escala</label>
          <div className="flex gap-2">
            {[5, 10].map(n => (
              <button key={n} onClick={() => onChange({ settings: { ...q.settings, max: n } })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${max === n ? 'text-white' : 'bg-white text-[#0A2463]/50 border-gray-200 hover:border-amber-200'}`}
                style={max === n ? { background: TYPE_META.rating.color, borderColor: TYPE_META.rating.color } : {}}
              >1 — {n}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-[#0A2463]/45 uppercase tracking-[0.08em]">Etiqueta mínima</label>
            <input type="text" value={labels.min} onChange={e => onChange({ settings: { ...q.settings, labels: { ...labels, min: e.target.value } } })} placeholder="Muy malo" className="input-base mt-1 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-black text-[#0A2463]/45 uppercase tracking-[0.08em]">Etiqueta máxima</label>
            <input type="text" value={labels.max} onChange={e => onChange({ settings: { ...q.settings, labels: { ...labels, max: e.target.value } } })} placeholder="Excelente" className="input-base mt-1 text-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (q.type === 'nps') return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: TYPE_META.nps.bg + '60' }}>
      <BarChart2 size={16} style={{ color: TYPE_META.nps.color }} className="shrink-0" />
      <p className="text-xs text-[#0A2463]/65">El NPS usa siempre escala <strong>0 – 10</strong>. Rojo = detractor, amarillo = neutro, verde = promotor.</p>
    </div>
  );

  if (q.type === 'yesno') return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: TYPE_META.yesno.bg + '60' }}>
      <ToggleLeft size={16} style={{ color: TYPE_META.yesno.color }} className="shrink-0" />
      <p className="text-xs text-[#0A2463]/65">Muestra dos botones: <strong className="text-emerald-600">Sí</strong> y <strong className="text-red-500">No</strong>.</p>
    </div>
  );

  if (q.type === 'multiple' || q.type === 'checkbox') {
    const c  = TYPE_META[q.type].color;
    const bg = TYPE_META[q.type].bg;
    const addOption    = () => onChange({ options: [...q.options, { _key: makeKey(), label: `Opción ${q.options.length + 1}`, value: `opcion_${q.options.length + 1}` }] });
    const removeOption = (key: string) => onChange({ options: q.options.filter(o => o._key !== key) });
    const updateOption = (key: string, label: string) =>
      onChange({ options: q.options.map(o => o._key === key ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, '_') } : o) });
    return (
      <div className="p-4 rounded-xl space-y-2.5" style={{ background: bg + '50' }}>
        <label className="text-[10px] font-black text-[#0A2463]/45 uppercase tracking-[0.08em]">Opciones de respuesta</label>
        {q.options.map((o, idx) => (
          <div key={o._key} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: c + '50' }} />
            <input
              type="text" value={o.label}
              onChange={e => updateOption(o._key, e.target.value)}
              placeholder={`Opción ${idx + 1}…`}
              className="flex-1 text-sm text-[#0A2463] bg-transparent outline-none border-b border-gray-200 focus:border-[#D4AF37]/50 pb-0.5 transition-colors placeholder-[#0A2463]/25"
            />
            <button onClick={() => removeOption(o._key)} disabled={q.options.length <= 1} className="p-1 hover:bg-red-50 rounded disabled:opacity-20">
              <X size={13} className="text-red-400" />
            </button>
          </div>
        ))}
        <button onClick={addOption} className="flex items-center gap-2 text-xs font-semibold mt-1 py-1" style={{ color: c }}>
          <Plus size={12} />Añadir opción
        </button>
      </div>
    );
  }

  if (q.type === 'text') {
    return (
      <div className="p-4 rounded-xl space-y-3" style={{ background: TYPE_META.text.bg + '50' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0A2463]">Texto largo (multilinea)</p>
            <p className="text-xs text-[#0A2463]/45">Muestra un área de texto amplia</p>
          </div>
          <button onClick={() => onChange({ settings: { ...q.settings, multiline: !q.settings.multiline } })}
            className={`w-10 h-5 rounded-full transition-all relative ${q.settings.multiline ? 'bg-[#6366F1]' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${q.settings.multiline ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div>
          <label className="text-[10px] font-black text-[#0A2463]/45 uppercase tracking-[0.08em]">Placeholder</label>
          <input type="text" value={(q.settings.placeholder as string) ?? ''}
            onChange={e => onChange({ settings: { ...q.settings, placeholder: e.target.value } })}
            placeholder="Escribe tu respuesta aquí…" className="input-base mt-1 text-sm" />
        </div>
      </div>
    );
  }
  return null;
}

/* ════════════════════════════════════════════════════════════
   TYPE PICKER MODAL
═══════════════════════════════════════════════════════════════ */

function TypePickerModal({ onSelect, onClose }: { onSelect: (t: QuestionType) => void; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
          <div>
            <h3 className="font-black text-[#0A2463]" style={{ fontFamily: F }}>Agregar pregunta</h3>
            <p className="text-xs text-[#0A2463]/45 mt-0.5">¿Qué tipo de respuesta necesitas?</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-[#0A2463]/50" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2.5">
          {TYPE_ENTRIES.map(([type, meta]) => (
            <button key={type} onClick={() => onSelect(type)}
              className="flex items-start gap-3 p-4 rounded-xl border-2 border-transparent text-left transition-all hover:shadow-md group"
              style={{ background: meta.bg + '55' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.color + '55'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: meta.bg }}>
                <meta.icon size={20} style={{ color: meta.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0A2463]">{meta.label}</p>
                <p className="text-[11px] text-[#0A2463]/50 mt-0.5 leading-relaxed">{meta.description}</p>
                <p className="text-[10px] font-mono mt-1.5" style={{ color: meta.color }}>{meta.example}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PREVIEW MODAL
═══════════════════════════════════════════════════════════════ */

function buildPreviewPages(blocks: BuilderBlock[]): BuilderBlock[][] {
  if (blocks.length === 0) return [];
  const pages: BuilderBlock[][] = [[]];
  for (const block of blocks) {
    const cur = pages[pages.length - 1];
    if (isSection(block)) {
      if (cur.length === 0) { cur.push(block); }
      else { pages.push([block]); }
    } else {
      const count = cur.filter(b => !isSection(b)).length;
      if (count >= 6) { pages.push([block]); }
      else { cur.push(block); }
    }
  }
  return pages.filter(p => p.some(b => !isSection(b)));
}

function PreviewModal({ title, description, blocks, onClose }: {
  title: string; description: string; blocks: BuilderBlock[]; onClose: () => void;
}) {
  const [page,     setPage]     = useState(0);
  const [answers,  setAnswers]  = useState<Record<string, string | string[]>>({});
  const [done,     setDone]     = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const scrollRef  = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const pages      = useMemo(() => buildPreviewPages(blocks), [blocks]);
  const pageItems  = pages[page] ?? [];
  const isLastPage = page === pages.length - 1;
  const totalPages = pages.length;
  const pct        = totalPages > 0 ? Math.round(((page + 1) / totalPages) * 100) : 0;

  const questionNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    let n = 0;
    for (const b of blocks) { if (!isSection(b)) { n++; map[b._key] = n; } }
    return map;
  }, [blocks]);

  const setAns  = (key: string, val: string | string[]) => setAnswers(prev => ({ ...prev, [key]: val }));
  const goNext  = () => {
    if (isLastPage) { setDone(true); return; }
    setPage(p => p + 1);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset   = () => { setPage(0); setAnswers({}); setDone(false); };
  const hasQuestions = blocks.some(b => !isSection(b));

  const innerContent = done ? (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'linear-gradient(160deg,#051338,#0A2463)' }}>
      <div className="relative mb-5">
        <div className="absolute -inset-4 rounded-full blur-xl" style={{ background: 'rgba(212,175,55,0.18)' }} />
        <div className="w-20 h-20 rounded-full flex items-center justify-center relative" style={{ border: '2px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.12)' }}>
          <Check size={36} className="text-[#D4AF37]" />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-8" style={{ background: 'rgba(212,175,55,0.4)' }} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]/70">Respuesta registrada</span>
        <div className="h-px w-8" style={{ background: 'rgba(212,175,55,0.4)' }} />
      </div>
      <h2 className="text-2xl font-black text-white mb-1.5" style={{ fontFamily: F }}>¡Gracias!</h2>
      <p className="text-sm text-white/55 mb-7">Tu opinión es muy valiosa para nosotros.</p>
      <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(212,175,55,0.9)' }}>
        <RotateCcw size={13} />Reiniciar preview
      </button>
    </div>
  ) : !hasQuestions ? (
    <div className="flex-1 flex items-center justify-center p-6 text-center bg-[#F9F7F2]">
      <p className="text-sm text-[#0A2463]/40">Agrega al menos una pregunta para ver la vista previa.</p>
    </div>
  ) : (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F9F7F2]">
      {/* Barra superior */}
      <div className="h-1 bg-[#0A2463]/8 shrink-0">
        <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F0D070] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'linear-gradient(to right,#051338,#0A2463)' }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[#D4AF37] font-black text-xs" style={{ background: 'rgba(212,175,55,0.2)', fontFamily: F }}>A</div>
          <span className="text-white text-xs font-bold" style={{ fontFamily: F }}>ALAMEX</span>
        </div>
        {totalPages > 1 && (
          <span className="text-white/40 text-[10px]">Pág. {page + 1} / {totalPages}</span>
        )}
      </div>

      {/* Scroll principal */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Título en primera página */}
        {page === 0 && (
          <div className="mb-4">
            <h1 className="text-base font-black text-[#0A2463] leading-snug" style={{ fontFamily: F }}>{title || 'Sin título'}</h1>
            {description && <p className="text-xs text-[#0A2463]/55 mt-1">{description}</p>}
            <div className="w-10 h-0.5 bg-gradient-to-r from-[#D4AF37] to-transparent mt-2 rounded-full" />
          </div>
        )}

        {/* Bloques de la página actual */}
        {pageItems.map(block => {
          if (isSection(block)) {
            return (
              <div key={block._key} className="pt-1 pb-0.5">
                <h2 className="text-sm font-black text-[#0A2463]" style={{ fontFamily: F }}>
                  {(block as import('../../services/questionsService').SectionDraft).title || 'Sección'}
                </h2>
                <div className="h-0.5 mt-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-transparent" />
              </div>
            );
          }
          const q   = block as QuestionDraft;
          const num = questionNumbers[q._key];
          return (
            <div key={q._key} className="bg-white rounded-xl border p-4 shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.18)' }}>
              <p className="text-sm font-bold text-[#0A2463] mb-1 leading-snug">
                <span className="text-[#D4AF37] font-black">{num}.</span>{' '}
                {q.title || <span className="italic text-[#0A2463]/30 font-normal">Sin título</span>}
                {q.required && <span className="text-[#D4AF37] ml-1 font-black">*</span>}
              </p>
              {q.description && <p className="text-xs text-[#0A2463]/50 mb-3">{q.description}</p>}
              <div className="mt-3">
                <PreviewQuestionInput q={q} value={answers[q._key]} onChange={val => setAns(q._key, val)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navegación */}
      <div className="px-4 py-2.5 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(184,149,30,0.15)', background: 'rgba(255,255,255,0.7)' }}>
        <button
          className="btn-ghost text-xs py-1.5 px-3"
          onClick={() => { setPage(p => p - 1); scrollRef.current?.scrollTo({ top: 0 }); }}
          style={{ opacity: page === 0 ? 0 : 1, pointerEvents: page === 0 ? 'none' : 'auto' }}
        >← Anterior</button>
        <button className="btn-primary text-xs py-1.5 px-4" onClick={goNext}>
          {isLastPage ? <><Check size={12} />Enviar</> : <>Siguiente<ArrowRight size={12} /></>}
        </button>
      </div>

      {/* Dots de página */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-[#F9F7F2] shrink-0">
          {pages.map((_, i) => (
            <div key={i} className="rounded-full transition-all" style={{ width: i === page ? 14 : 5, height: 5, background: i === page ? '#D4AF37' : 'rgba(10,36,99,0.15)' }} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative z-10 flex items-center gap-3 mb-4">
        <span className="bg-[#D4AF37]/90 text-[#051338] text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full">Vista previa</span>
        <div className="flex items-center gap-0.5 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <button onClick={() => setViewMode('mobile')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'mobile' ? 'bg-white text-[#051338]' : 'text-white/60 hover:text-white'}`}>
            <Smartphone size={13} /><span className="hidden sm:inline">Móvil</span>
          </button>
          <button onClick={() => setViewMode('desktop')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'desktop' ? 'bg-white text-[#051338]' : 'text-white/60 hover:text-white'}`}>
            <Monitor size={13} /><span className="hidden sm:inline">Escritorio</span>
          </button>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <X size={16} />
        </button>
      </div>
      {viewMode === 'mobile' && (
        <div className="relative w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col animate-slide-up" style={{ height: 'min(680px,calc(100vh - 100px))', border: '8px solid #1a1a2e' }}>
          <div className="absolute top-0 left-0 right-0 h-5 z-10 flex items-center justify-center" style={{ background: '#1a1a2e' }}>
            <div className="w-14 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden mt-5">{innerContent}</div>
          <div className="h-4 shrink-0 flex items-center justify-center" style={{ background: '#1a1a2e' }}>
            <div className="w-20 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
        </div>
      )}
      {viewMode === 'desktop' && (
        <div className="relative w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col animate-slide-up" style={{ height: 'min(680px,calc(100vh - 100px))', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ background: '#252525' }}>
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} /><div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} /><div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} /></div>
            <div className="flex-1 flex items-center gap-2 rounded-md px-3 py-1.5" style={{ background: '#1a1a1a' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#28C840' }} />
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>encuestas.alam.mx/s/vista-previa</span>
            </div>
          </div>
          <div className="flex items-center px-4 shrink-0" style={{ background: '#1e1e1e', height: '30px' }}>
            <div className="flex items-center gap-2 px-3 h-full rounded-t-md text-[11px] font-medium" style={{ background: '#F9F7F2', color: '#0A2463' }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg,#0A2463,#D4AF37)' }} />ALAMEX Encuesta
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">{innerContent}</div>
        </div>
      )}
    </div>
  );
}

function PreviewQuestionInput({ q, value, onChange }: { q: QuestionDraft; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const v = value ?? '';
  if (q.type === 'rating') {
    const max = (q.settings.max as number) ?? 5;
    const labels = q.settings.labels as { min?: string; max?: string } | undefined;
    const sel = Number(v);
    return (
      <div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => onChange(String(n))} className={`w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all ${sel === n ? 'bg-[#D4AF37] border-[#D4AF37] text-white scale-110 shadow' : 'bg-white border-gray-200 text-[#0A2463]/60 hover:border-[#D4AF37]/50'}`}>{n}</button>
          ))}
        </div>
        {labels && <div className="flex justify-between mt-2 text-[10px] text-[#0A2463]/40 font-medium"><span>{labels.min}</span><span>{labels.max}</span></div>}
      </div>
    );
  }
  if (q.type === 'nps') {
    const sel = Number(v);
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map(n => {
            const c = n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#10b981';
            return <button key={n} onClick={() => onChange(String(n))} className="w-9 h-9 rounded-lg font-bold text-sm border-2 transition-all hover:scale-110" style={{ background: sel === n ? c : 'white', borderColor: sel === n ? c : '#e5e7eb', color: sel === n ? 'white' : '#374151' }}>{n}</button>;
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-[#0A2463]/40 font-medium"><span>Nada probable</span><span>Muy probable</span></div>
      </div>
    );
  }
  if (q.type === 'multiple') return <div className="space-y-2">{q.options.map(o => <button key={o._key} onClick={() => onChange(o.value)} className={`w-full text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${v === o.value ? 'bg-[#0A2463] border-[#0A2463] text-white' : 'bg-white border-gray-200 text-[#0A2463] hover:border-[#D4AF37]/50'}`}>{o.label}</button>)}</div>;
  if (q.type === 'checkbox') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (val: string) => onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
    return <div className="space-y-2">{q.options.map(o => { const checked = selected.includes(o.value); return <button key={o._key} onClick={() => toggle(o.value)} className={`w-full text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-all flex items-center gap-2.5 ${checked ? 'bg-[#0A2463]/8 border-[#0A2463]' : 'bg-white border-gray-200 hover:border-[#D4AF37]/50'}`}><span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-300'}`}>{checked && <Check size={10} className="text-white" strokeWidth={3} />}</span>{o.label}</button>; })}</div>;
  }
  if (q.type === 'yesno') return <div className="flex gap-3">{[{ label: 'Sí', val: 'si' }, { label: 'No', val: 'no' }].map(({ label, val: bv }) => <button key={bv} onClick={() => onChange(bv)} className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-all ${v === bv ? bv === 'si' ? 'bg-emerald-500 border-emerald-500 text-white shadow' : 'bg-red-500 border-red-500 text-white shadow' : 'bg-white border-gray-200 text-[#0A2463] hover:border-[#D4AF37]/50'}`}>{label}</button>)}</div>;
  if (q.type === 'text') {
    const multi = q.settings.multiline as boolean;
    if (multi) return <textarea value={v as string} onChange={e => onChange(e.target.value)} rows={3} placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta…'} className="input-base resize-none text-sm" />;
    return <input type="text" value={v as string} onChange={e => onChange(e.target.value)} placeholder={(q.settings.placeholder as string) || 'Escribe tu respuesta…'} className="input-base text-sm" />;
  }
  return null;
}
