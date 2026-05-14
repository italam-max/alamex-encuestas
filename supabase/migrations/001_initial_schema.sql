-- ══════════════════════════════════════════════════════════════════
-- ALAMEX ENCUESTAS — Schema inicial
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Perfiles de usuario ──────────────────────────────────────────
create table public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  display_name   text not null,
  display_title  text,
  role           text not null default 'editor'
                   check (role in ('admin', 'editor', 'viewer')),
  avatar_url     text,
  created_at     timestamptz not null default now()
);

-- Se crea automáticamente al registrar un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, display_title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'display_title'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Templates ────────────────────────────────────────────────────
create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_system   boolean not null default false,  -- solo admin puede editar
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Encuestas ────────────────────────────────────────────────────
create table public.surveys (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'Borrador'
                check (status in ('Borrador', 'Activa', 'Cerrada')),
  template_id uuid references public.templates(id) on delete set null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Preguntas ────────────────────────────────────────────────────
-- Sirven tanto para templates como para surveys directamente
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid references public.surveys(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  type        text not null
                check (type in ('rating','nps','multiple','checkbox','text','yesno')),
  title       text not null,
  description text,
  required    boolean not null default true,
  order_index integer not null,
  settings    jsonb not null default '{}'::jsonb,
  -- solo uno de survey_id o template_id debe tener valor
  constraint question_owner check (
    (survey_id is not null and template_id is null) or
    (survey_id is null and template_id is not null)
  )
);

-- ── Opciones de preguntas (multiple / checkbox) ───────────────────
create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  value       text not null,
  order_index integer not null
);

-- ── Distribuciones (cada envío de una encuesta) ───────────────────
create table public.distributions (
  id        uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  subject   text not null,
  message   text,
  sent_by   uuid references public.profiles(id),
  sent_at   timestamptz,
  created_at timestamptz not null default now()
);

-- ── Destinatarios ────────────────────────────────────────────────
create table public.recipients (
  id              uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  email           text not null,
  name            text,
  -- token único para el link de la encuesta y el tracking
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  status          text not null default 'enviado'
                    check (status in ('enviado','abierto','respondido')),
  opened_at       timestamptz,
  clicked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Respuestas (una por recipient) ───────────────────────────────
create table public.responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references public.surveys(id),
  recipient_id uuid not null references public.recipients(id),
  submitted_at timestamptz not null default now(),
  unique (recipient_id)  -- cada recipient responde solo una vez
);

-- ── Respuestas individuales por pregunta ─────────────────────────
create table public.answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  value       text,          -- rating, nps, text, yesno, multiple
  values      text[]         -- checkbox (múltiples valores)
);

-- ══════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════════
create index on public.questions      (survey_id);
create index on public.questions      (template_id);
create index on public.question_options (question_id);
create index on public.distributions  (survey_id);
create index on public.recipients     (distribution_id);
create index on public.recipients     (token);
create index on public.responses      (survey_id);
create index on public.responses      (recipient_id);
create index on public.answers        (response_id);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.templates      enable row level security;
alter table public.surveys        enable row level security;
alter table public.questions      enable row level security;
alter table public.question_options enable row level security;
alter table public.distributions  enable row level security;
alter table public.recipients     enable row level security;
alter table public.responses      enable row level security;
alter table public.answers        enable row level security;

-- Helpers
create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Profiles ─────────────────────────────────────────────────────
create policy "Usuarios ven su propio perfil"
  on public.profiles for select using (id = auth.uid());

create policy "Admin ve todos los perfiles"
  on public.profiles for select using (public.get_my_role() = 'admin');

create policy "Usuario actualiza su propio perfil"
  on public.profiles for update using (id = auth.uid());

-- ── Templates ────────────────────────────────────────────────────
create policy "Todos los usuarios autenticados ven templates"
  on public.templates for select using (auth.role() = 'authenticated');

create policy "Solo admin edita templates del sistema"
  on public.templates for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── Surveys ──────────────────────────────────────────────────────
create policy "Usuarios autenticados ven todas las encuestas"
  on public.surveys for select using (auth.role() = 'authenticated');

create policy "Editor y admin crean encuestas"
  on public.surveys for insert
  with check (public.get_my_role() in ('admin','editor'));

create policy "Creador o admin editan encuesta"
  on public.surveys for update
  using (created_by = auth.uid() or public.get_my_role() = 'admin');

create policy "Solo admin elimina encuestas"
  on public.surveys for delete
  using (public.get_my_role() = 'admin');

-- ── Questions ────────────────────────────────────────────────────
create policy "Autenticados ven preguntas"
  on public.questions for select using (auth.role() = 'authenticated');

create policy "Editor y admin crean preguntas"
  on public.questions for all
  using (auth.role() = 'authenticated')
  with check (public.get_my_role() in ('admin','editor'));

-- ── Question Options ─────────────────────────────────────────────
create policy "Autenticados ven opciones"
  on public.question_options for select using (auth.role() = 'authenticated');

create policy "Editor y admin gestionan opciones"
  on public.question_options for all
  using (auth.role() = 'authenticated')
  with check (public.get_my_role() in ('admin','editor'));

-- ── Distributions ────────────────────────────────────────────────
create policy "Autenticados ven distribuciones"
  on public.distributions for select using (auth.role() = 'authenticated');

create policy "Editor y admin crean distribuciones"
  on public.distributions for insert
  with check (public.get_my_role() in ('admin','editor'));

-- ── Recipients ───────────────────────────────────────────────────
create policy "Autenticados ven recipients"
  on public.recipients for select using (auth.role() = 'authenticated');

create policy "Editor y admin crean recipients"
  on public.recipients for insert
  with check (public.get_my_role() in ('admin','editor'));

-- El sistema actualiza el tracking (opened_at, clicked_at) vía service_role
create policy "Sistema actualiza tracking"
  on public.recipients for update using (true);

-- ── Responses — acceso público para que recipients puedan responder ──
create policy "Recipient lee su propia response via token"
  on public.responses for select
  using (
    exists (
      select 1 from public.recipients r
      where r.id = recipient_id
    )
  );

create policy "Cualquiera puede insertar response (página pública)"
  on public.responses for insert with check (true);

-- ── Answers ──────────────────────────────────────────────────────
create policy "Autenticados ven respuestas"
  on public.answers for select using (auth.role() = 'authenticated');

create policy "Cualquiera puede insertar answers (página pública)"
  on public.answers for insert with check (true);

-- ── Acceso público anónimo para la página de encuesta (/s/:token) ──
-- Los recipients necesitan ver la encuesta sin estar logueados
create policy "Anónimos ven encuestas activas via token"
  on public.surveys for select
  using (
    status = 'Activa' or auth.role() = 'authenticated'
  );

create policy "Anónimos ven preguntas de encuestas activas"
  on public.questions for select
  using (true);  -- filtrado en la query por survey_id

create policy "Anónimos ven opciones"
  on public.question_options for select using (true);

-- ══════════════════════════════════════════════════════════════════
-- TEMPLATES DEL SISTEMA (datos iniciales)
-- ══════════════════════════════════════════════════════════════════
insert into public.templates (name, description, is_system) values
  ('NPS — Net Promoter Score',    'Mide la probabilidad de recomendación en escala 0-10', true),
  ('CSAT — Satisfacción General', 'Calificación 1-5 stars + comentario abierto',          true),
  ('Clima Laboral',               'Encuesta de ambiente organizacional interna',           true),
  ('Post-Servicio',               'Calidad de atención post-instalación o mantenimiento',  true);
