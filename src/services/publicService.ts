import { supabase } from '../lib/supabase';

export interface PublicSurveyData {
  surveyId:         string;
  title:            string;
  description:      string | null;
  recipientId:      string;
  recipientName:    string | null;
  alreadyResponded: boolean;
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
  options:     { id: string; label: string; value: string; order_index: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

    const questions: PublicQuestion[] = (survey.questions ?? [])
      .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
      .map((q: {
        id: string; type: string; title: string; description: string | null;
        required: boolean; order_index: number; settings: Record<string, unknown>;
        question_options: { id: string; label: string; value: string; order_index: number }[];
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
      questions,
    };
  },

  async submitResponse(
    surveyId: string,
    recipientId: string,
    answers: { questionId: string; value?: string; values?: string[] }[]
  ) {
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

    await db
      .from('recipients')
      .update({ status: 'respondido' })
      .eq('id', recipientId);
  },
};
