// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase } from '../lib/supabase';
import type { Survey } from '../types';

export interface SurveyWithCount extends Survey {
  responseCount: number;
}

// Alias to bypass generic resolution issues with the typed Supabase client
const db = supabase as unknown as {
  from: (table: string) => {
    select:  (cols?: string, opts?: object) => {
      order: (col: string, opts?: object) => Promise<{ data: unknown[] | null; error: unknown; count?: number | null }>;
      eq:    (col: string, val: string) => { single: () => Promise<{ data: unknown; error: unknown }> };
    };
    insert:  (data: object | object[]) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    update:  (data: object) => { eq: (col: string, val: string) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } } };
    delete:  () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    eq:      (col: string, val: string) => {
      select: (cols?: string, opts?: object) => {
        order?: (col: string, opts?: object) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

export const SurveysService = {
  async getAll(): Promise<SurveyWithCount[]> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, responses(count)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as (Survey & { responses?: { count: number }[] })[]).map(s => ({
      ...s,
      responseCount: s.responses?.[0]?.count ?? 0,
    }));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('surveys')
      .select(`*, questions(*, question_options(*))`)
      .eq('id', id)
      .single();
    if (error) throw error;
    const raw = data as Survey & {
      questions: ({ order_index: number; question_options: { order_index: number }[] })[];
    };
    const questions = (raw.questions ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(q => ({
        ...q,
        options: (q.question_options ?? []).sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index),
      }));
    return { ...(data as object), questions } as Survey & { questions: typeof questions };
  },

  async create(payload: { title: string; description?: string; template_id?: string }): Promise<Survey> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await db.from('surveys')
      .insert({ ...payload, created_by: user?.id })
      .select().single();
    if (error) throw error;
    return data as Survey;
  },

  async update(id: string, updates: { title?: string; description?: string | null; status?: Survey['status']; template_id?: string | null }): Promise<Survey> {
    const { data, error } = await db.from('surveys')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data as Survey;
  },

  async delete(id: string) {
    const { error } = await db.from('surveys').delete().eq('id', id);
    if (error) throw error;
  },

  async getStats() {
    const [surveysRes, responsesRes] = await Promise.all([
      supabase.from('surveys').select('id, status'),
      supabase.from('responses').select('*', { count: 'exact', head: true }),
    ]);
    const surveys = (surveysRes.data ?? []) as { status: string }[];
    return {
      total:          surveys.length,
      active:         surveys.filter(s => s.status === 'Activa').length,
      closed:         surveys.filter(s => s.status === 'Cerrada').length,
      draft:          surveys.filter(s => s.status === 'Borrador').length,
      totalResponses: responsesRes.count ?? 0,
    };
  },
};
