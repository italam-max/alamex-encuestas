import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { distributionId } = await req.json() as { distributionId: string };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get distribution + survey info
    const { data: dist, error: dErr } = await supabase
      .from('distributions')
      .select('*, surveys(title, description), recipients(id, email, name, token)')
      .eq('id', distributionId)
      .single();

    if (dErr || !dist) throw new Error('Distribution not found');

    const survey    = dist.surveys as { title: string; description: string };
    const recipients = dist.recipients as { id: string; email: string; name: string | null; token: string }[];
    const publicUrl  = Deno.env.get('PUBLIC_URL') ?? 'https://encuestas.alam.mx';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const zeptoKey   = Deno.env.get('ZEPTO_API_KEY')!;
    const fromEmail  = Deno.env.get('FROM_EMAIL') ?? 'no-reply@alam.mx';
    const fromName   = Deno.env.get('FROM_NAME')  ?? 'Alamex Encuestas';

    let sent = 0, failed = 0;

    for (const recipient of recipients) {
      const surveyLink    = `${publicUrl}/s/${recipient.token}`;
      const trackOpenUrl  = `${supabaseUrl}/functions/v1/track-open?t=${recipient.token}`;
      const trackClickUrl = `${supabaseUrl}/functions/v1/track-click?t=${recipient.token}`;

      const html = buildEmailHtml({
        recipientName: recipient.name,
        surveyTitle:   survey.title,
        surveyLink:    trackClickUrl,
        trackOpenUrl,
      });

      const payload = {
        from:     { address: fromEmail, name: fromName },
        to:       [{ email_address: { address: recipient.email, name: recipient.name ?? recipient.email } }],
        subject:  dist.subject,
        htmlbody: html,
      };

      const res = await fetch('https://api.zeptomail.com/v1.1/email', {
        method:  'POST',
        headers: {
          'Accept':        'application/json',
          'Content-Type':  'application/json',
          'Authorization': `Zoho-enczapikey ${zeptoKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.text();
        console.error(`Failed to send to ${recipient.email}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status:  500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmailHtml({
  recipientName, surveyTitle, surveyLink, trackOpenUrl,
}: {
  recipientName: string | null;
  surveyTitle: string;
  surveyLink: string;
  trackOpenUrl: string;
}): string {
  const greeting = recipientName
    ? `<p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 20px">Hola ${recipientName},</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#040D1A,#0A1628);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
    <p style="color:#D4AF37;font-size:28px;font-weight:900;letter-spacing:4px;margin:0 0 6px">ALAMEX</p>
    <p style="color:rgba(212,175,55,0.7);font-size:11px;letter-spacing:3px;margin:0;text-transform:uppercase">Encuestas de Satisfacción</p>
  </td></tr>

  <!-- Gold line -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#8A6518,#D4AF37,#F0D070,#D4AF37,#8A6518)"></td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;border:1px solid rgba(212,175,55,0.2)">
    ${greeting}
    <p style="color:#4B5563;font-size:15px;line-height:1.6;margin:0 0 28px">
      Te invitamos a compartir tu experiencia con nosotros respondiendo la encuesta
      <strong style="color:#0A2463">"${surveyTitle}"</strong>.
      Tu opinión es muy valiosa y nos ayuda a mejorar continuamente.
    </p>

    <!-- Button -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px">
      <a href="${surveyLink}"
         style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B5942E);color:#051338;
                font-size:15px;font-weight:800;letter-spacing:2px;text-transform:uppercase;
                padding:16px 40px;border-radius:12px;text-decoration:none">
        Responder encuesta →
      </a>
    </td></tr></table>

    <p style="color:#9CA3AF;font-size:13px;margin:0 0 4px">
      Si el botón no funciona, copia este enlace en tu navegador:
    </p>
    <p style="color:#D4AF37;font-size:12px;word-break:break-all;margin:0 0 28px">
      ${surveyLink}
    </p>

    <hr style="border:none;border-top:1px solid rgba(212,175,55,0.2);margin:0 0 24px">
    <p style="color:#9CA3AF;font-size:12px;margin:0;text-align:center">
      © ${new Date().getFullYear()} Alamex Elevadores · Este correo fue enviado porque eres parte de nuestro proceso de mejora continua.
    </p>
  </td></tr>

</table>
</td></tr></table>
<!-- Tracking pixel -->
<img src="${trackOpenUrl}" width="1" height="1" style="display:none" />
</body></html>`;
}
