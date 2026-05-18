import { supabase } from '../lib/supabase';
import type { QuestionType } from '../types';

export interface OptionDraft {
  _key: string;
  label: string;
  value: string;
}

export interface QuestionDraft {
  _key: string;
  id?: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  settings: Record<string, unknown>;
  options: OptionDraft[];
}

export interface SectionDraft {
  _key: string;
  id?: string;
  type: 'section';
  title: string;
  description: string;
}

export type BuilderBlock = QuestionDraft | SectionDraft;

export function isSection(b: BuilderBlock): b is SectionDraft {
  return b.type === 'section';
}

/** BD o API: fila guardada como `section` (migración 003) o `text` + settings.isSection (compatible con cualquier constraint). */
export function isStoredSectionQuestion(row: {
  type: string;
  settings?: Record<string, unknown> | null;
}): boolean {
  const s = row.settings as Record<string, unknown> | undefined;
  return row.type === 'section' || (row.type === 'text' && Boolean(s?.isSection));
}

function persistedSectionPayload(block: SectionDraft): {
  type: 'text';
  title: string;
  description: string | null;
  required: boolean;
  settings: Record<string, unknown>;
} {
  return {
    type: 'text',
    title: block.title.trim() ? block.title : 'Nueva sección',
    description: block.description?.trim() ? block.description : null,
    required: false,
    settings: { placeholder: '', multiline: false, isSection: true },
  };
}

export function emptySection(): SectionDraft {
  return { _key: makeKey(), type: 'section', title: '', description: '' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const QuestionsService = {
  async upsertForSurvey(surveyId: string, blocks: BuilderBlock[]) {
    // Fetch the question IDs that currently exist in the DB for this survey
    const { data: existing, error: fetchErr } = await db
      .from('questions').select('id').eq('survey_id', surveyId);
    if (fetchErr) throw fetchErr;

    const existingIds = new Set<string>(
      (existing ?? []).map((q: { id: string }) => q.id)
    );
    const keptIds = new Set<string>(
      blocks.filter(b => b.id && existingIds.has(b.id as string)).map(b => b.id as string)
    );

    // Delete questions that were removed from the builder.
    // answers.question_id has no ON DELETE CASCADE, so we delete answers first.
    for (const qId of existingIds) {
      if (keptIds.has(qId)) continue;
      await db.from('answers').delete().eq('question_id', qId);
      const { error } = await db.from('questions').delete().eq('id', qId);
      if (error) throw error;
    }

    // Update existing questions and insert new ones, in order
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isExisting = block.id && existingIds.has(block.id as string);

      if (isSection(block)) {
        const persisted = persistedSectionPayload(block);
        if (isExisting) {
          const { error } = await db.from('questions').update({
            ...persisted,
            order_index: i,
          }).eq('id', block.id);
          if (error) throw error;
        } else {
          const { error } = await db.from('questions').insert({
            ...persisted,
            survey_id:   surveyId,
            order_index: i,
          });
          if (error) throw error;
        }
        continue;
      }

      const { _key: _k, options, id: blockId, ...qData } = block;
      void _k;

      if (isExisting) {
        // Update the question in place — this preserves answers FK references
        const { error: qErr } = await db.from('questions').update({
          ...qData,
          order_index: i,
        }).eq('id', blockId);
        if (qErr) throw qErr;

        // Replace options (answers reference question_id, not option_id — safe to delete+reinsert)
        await db.from('question_options').delete().eq('question_id', blockId);
        if (options.length > 0) {
          const { error: oErr } = await db.from('question_options').insert(
            options.map((o: OptionDraft, oi: number) => ({
              question_id: blockId,
              label:       o.label,
              value:       o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
              order_index: oi,
            }))
          );
          if (oErr) throw oErr;
        }
      } else {
        // Insert brand-new question
        const { data: newQ, error: qErr } = await db
          .from('questions')
          .insert({ ...qData, survey_id: surveyId, order_index: i })
          .select()
          .single();
        if (qErr) throw qErr;

        if (options.length > 0) {
          const { error: oErr } = await db.from('question_options').insert(
            options.map((o: OptionDraft, oi: number) => ({
              question_id: newQ.id,
              label:       o.label,
              value:       o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
              order_index: oi,
            }))
          );
          if (oErr) throw oErr;
        }
      }
    }
  },
};

export function makeKey() {
  return Math.random().toString(36).slice(2);
}

export function emptyQuestion(type: QuestionType = 'rating'): QuestionDraft {
  return {
    _key: makeKey(),
    type,
    title: '',
    description: '',
    required: true,
    settings: defaultSettings(type),
    options: type === 'multiple' || type === 'checkbox'
      ? [{ _key: makeKey(), label: 'Opción 1', value: 'opcion_1' }]
      : [],
  };
}

export function defaultSettings(type: QuestionType): Record<string, unknown> {
  if (type === 'rating')   return { max: 5, labels: { min: 'Muy malo', max: 'Excelente' } };
  if (type === 'nps')      return {};
  if (type === 'multiple') return { allowOther: false };
  if (type === 'checkbox') return { allowOther: false };
  if (type === 'text')     return { placeholder: '', multiline: false };
  if (type === 'yesno')    return {};
  return {};
}
