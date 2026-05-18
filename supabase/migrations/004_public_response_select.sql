-- Restaura lectura pública de responses para encuestados anónimos (/s/:token).
-- Sin esto, INSERT + .select() falla por RLS; el frontend evita .select() con ID
-- en cliente, pero la comprobación de idempotencia sigue necesitando SELECT.

drop policy if exists "Recipient lee su propia response via token" on public.responses;
drop policy if exists "Público lee responses para enviar encuesta" on public.responses;

create policy "Público lee responses para enviar encuesta"
  on public.responses for select
  using (
    exists (
      select 1 from public.recipients r
      where r.id = recipient_id
    )
  );
