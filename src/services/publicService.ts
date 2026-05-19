import { createClient } from '@supabase/supabase-js';

// Cliente anónimo sin sesión — funciona en cualquier navegador sin login
const anonSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

export interface PublicSurveyData {
  surveyId:         string;
  title:            string;
  description:      string | null;
  recipientId:      string;
  recipientName:    string | null;
  alreadyResponded: boolean;
  surveyClosed:     boolean;
  questions:        PublicQuestion[];
}

export interface PublicQuestion {
  id:          string;
  type:        string;
  title:       string;
  description: string | null;
  required:    boolean;
  order_index: number;
  settings:    Record<string, unknown>;
  options:     { id: string; label: string; value: string; order_index: number; is_correct: boolean }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = anonSupabase as any;

export const PublicService = {
  async getSurveyByToken(token: string): Promise<PublicSurveyData | null> {
    const { data: recipient, error: rErr } = await db
      .from('recipients')
      .select('id, name, status, distribution_id')
      .eq('token', token)
      .single();
    if (rErr || !recipient) return null;

    const { data: distribution, error: dErr } = await db
      .from('distributions')
      .select('survey_id')
      .eq('id', recipient.distribution_id)
      .single();
    if (dErr || !distribution) return null;

    const { data: survey, error: sErr } = await db
      .from('surveys')
      .select(`*, questions(*, question_options(*))`)
      .eq('id', distribution.survey_id)
      .single();
    if (sErr || !survey) return null;

    const surveyClosed = survey.status !== 'Activa';

    const questions: PublicQuestion[] = surveyClosed ? [] : (survey.questions ?? [])
      .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
      .map((q: {
        id: string; type: string; title: string; description: string | null;
        required: boolean; order_index: number; settings: Record<string, unknown>;
        question_options: { id: string; label: string; value: string; order_index: number; is_correct: boolean }[];
      }) => ({
        id:          q.id,
        type:        q.type,
        title:       q.title,
        description: q.description,
        required:    q.required,
        order_index: q.order_index,
        settings:    q.settings ?? {},
        options:     (q.question_options ?? []).sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index),
      }));

    return {
      surveyId:         survey.id,
      title:            survey.title,
      description:      survey.description,
      recipientId:      recipient.id,
      recipientName:    recipient.name,
      alreadyResponded: recipient.status === 'respondido',
      surveyClosed,
      questions,
    };
  },

  async submitResponse(
    surveyId: string,
    recipientId: string,
    answers: { questionId: string; value?: string; values?: string[] }[]
  ) {
    // Idempotency check: if a response already exists for this recipient,
    // just ensure the status is marked and return — avoids duplicate rows on retry.
    const { data: existing } = await db
      .from('responses')
      .select('id')
      .eq('recipient_id', recipientId)
      .maybeSingle();

    if (existing?.id) {
      await db.from('recipients').update({ status: 'respondido' }).eq('id', recipientId);
      return;
    }

    const { data: response, error: respErr } = await db
      .from('responses')
      .insert({ survey_id: surveyId, recipient_id: recipientId })
      .select()
      .single();
    if (respErr) throw respErr;

    const { error: ansErr } = await db
      .from('answers')
      .insert(
        answers.map(a => ({
          response_id: response.id,
          question_id: a.questionId,
          value:       a.value ?? null,
          values:      a.values ?? null,
        }))
      );
    if (ansErr) throw ansErr;

    const { error: statusErr } = await db
      .from('recipients')
      .update({ status: 'respondido' })
      .eq('id', recipientId);
    if (statusErr) throw statusErr;
  },
};
