import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1x1 transparent GIF
const PIXEL = new Uint8Array([
  71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59
]);

serve(async (req) => {
  const url   = new URL(req.url);
  const token = url.searchParams.get('t');

  if (token) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Only update if not already responded
    await supabase
      .from('recipients')
      .update({ status: 'abierto', opened_at: new Date().toISOString() })
      .eq('token', token)
      .eq('status', 'enviado'); // don't downgrade 'respondido'
  }

  return new Response(PIXEL, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  });
});
