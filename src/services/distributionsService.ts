import { supabase } from '../lib/supabase';
import type { Distribution, Recipient } from '../types';

export interface DistributionStats extends Distribution {
  recipients: Recipient[];
  total:      number;
  opened:     number;
  responded:  number;
}

export interface RecipientInput {
  email: string;
  name?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const DistributionsService = {
  async getBySurvey(surveyId: string): Promise<DistributionStats[]> {
    const { data, error } = await supabase
      .from('distributions')
      .select('*, recipients(*)')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return ((data ?? []) as (Distribution & { recipients?: Recipient[] })[]).map(d => {
      const recs = d.recipients ?? [];
      return {
        ...d,
        recipients: recs,
        total:     recs.length,
        opened:    recs.filter(r => r.status === 'abierto' || r.status === 'respondido').length,
        responded: recs.filter(r => r.status === 'respondido').length,
      };
    });
  },

  async create(
    surveyId: string,
    payload: { subject: string; message?: string; recipients: RecipientInput[] }
  ): Promise<{ distributionId: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: dist, error: dErr } = await db
      .from('distributions')
      .insert({
        survey_id: surveyId,
        subject:   payload.subject,
        message:   payload.message ?? null,
        sent_by:   user?.id ?? null,
        sent_at:   new Date().toISOString(),
      })
      .select()
      .single();
    if (dErr) throw dErr;

    const { error: rErr } = await db
      .from('recipients')
      .insert(
        payload.recipients.map(r => ({
          distribution_id: dist.id,
          email:  r.email,
          name:   r.name ?? null,
          status: 'enviado',
        }))
      );
    if (rErr) throw rErr;

    return { distributionId: dist.id };
  },
};
