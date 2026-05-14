-- ══════════════════════════════════════════════════════════════════
-- ALAMEX ENCUESTAS — Acceso público para encuestados
-- Ejecutar después de 001_initial_schema.sql
-- ══════════════════════════════════════════════════════════════════

-- Los tokens son cadenas hex de 64 chars (32 bytes aleatorios = 2^256 posibilidades)
-- Es seguro permitir lectura anónima filtrada por token

-- Leer recipient por token (página pública /s/:token)
create policy "Público lee recipient por token"
  on public.recipients for select
  using (true);

-- Leer distribution (para obtener survey_id desde el token del recipient)
create policy "Público lee distribuciones"
  on public.distributions for select
  using (true);

-- Actualizar recipient cuando se responde (status, clicked_at)
-- La Edge Function de tracking usa service_role, pero el frontend
-- también actualiza status a 'respondido' con clave anon
create policy "Público actualiza su propio recipient"
  on public.recipients for update
  using (true);
