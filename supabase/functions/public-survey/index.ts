import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url      = new URL(req.url);
  const surveyId = url.searchParams.get('surveyId');

  if (!surveyId) {
    return new Response(JSON.stringify({ error: 'surveyId requerido' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verificar que la encuesta existe y está activa
  const { data: survey, error: sErr } = await supabase
    .from('surveys')
    .select('id, title, status')
    .eq('id', surveyId)
    .eq('status', 'Activa')
    .single();

  if (sErr || !survey) {
    return new Response(JSON.stringify({ error: 'Encuesta no encontrada o no activa' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Buscar o crear la distribución "pública" de esta encuesta
  let distId: string;
  const { data: existing } = await supabase
    .from('distributions')
    .select('id')
    .eq('survey_id', surveyId)
    .eq('subject', '__public_link__')
    .maybeSingle();

  if (existing) {
    distId = existing.id;
  } else {
    const { data: newDist, error: dErr } = await supabase
      .from('distributions')
      .insert({ survey_id: surveyId, subject: '__public_link__', message: null })
      .select('id')
      .single();
    if (dErr || !newDist) {
      return new Response(JSON.stringify({ error: 'Error creando distribución' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    distId = newDist.id;
  }

  // Crear destinatario anónimo con email placeholder único
  const anonId = crypto.randomUUID();
  const { data: recipient, error: rErr } = await supabase
    .from('recipients')
    .insert({
      distribution_id: distId,
      email:           `anon-${anonId}@enlace.alamex`,
      name:            null,
    })
    .select('token')
    .single();

  if (rErr || !recipient) {
    return new Response(JSON.stringify({ error: 'Error creando destinatario' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ token: recipient.token }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
