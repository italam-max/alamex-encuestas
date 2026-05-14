import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const url   = new URL(req.url);
  const token = url.searchParams.get('t');
  const publicUrl = Deno.env.get('PUBLIC_URL') ?? 'https://encuestas.alam.mx';

  if (token) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await supabase
      .from('recipients')
      .update({ clicked_at: new Date().toISOString() })
      .eq('token', token)
      .is('clicked_at', null); // only first click
  }

  const dest = token ? `${publicUrl}/s/${token}` : publicUrl;
  return new Response(null, {
    status:  302,
    headers: { Location: dest },
  });
});
