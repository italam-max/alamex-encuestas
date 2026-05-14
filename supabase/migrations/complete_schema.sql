-- ══════════════════════════════════════════════════════════════════
-- ALAMEX ENCUESTAS — Schema completo (idempotente)
-- Puedes correr este archivo completo en Supabase SQL Editor
-- si el schema anterior falló o necesitas un reset limpio.
-- ══════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Perfiles de usuario ──────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  display_name   text not null,
  display_title  text,
  role           text not null default 'editor'
                   check (role in ('admin', 'editor', 'viewer')),
  avatar_url     text,
  created_at     timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, display_title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'display_title'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Templates ────────────────────────────────────────────────────
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Encuestas ────────────────────────────────────────────────────
create table if not exists public.surveys (
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
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid references public.surveys(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  type        text not null
                check (type in ('rating','nps','multiple','checkbox','text','yesno','section')),
  title       text not null,
  description text,
  required    boolean not null default true,
  order_index integer not null,
  settings    jsonb not null default '{}'::jsonb,
  constraint question_owner check (
    (survey_id is not null and template_id is null) or
    (survey_id is null and template_id is not null)
  )
);

-- ── Opciones de preguntas ─────────────────────────────────────────
create table if not exists public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  value       text not null,
  order_index integer not null
);

-- ── Distribuciones ────────────────────────────────────────────────
create table if not exists public.distributions (
  id         uuid primary key default gen_random_uuid(),
  survey_id  uuid not null references public.surveys(id) on delete cascade,
  subject    text not null,
  message    text,
  sent_by    uuid references public.profiles(id),
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ── Destinatarios ────────────────────────────────────────────────
create table if not exists public.recipients (
  id              uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  email           text not null,
  name            text,
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  status          text not null default 'enviado'
                    check (status in ('enviado','abierto','respondido')),
  opened_at       timestamptz,
  clicked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Respuestas ────────────────────────────────────────────────────
create table if not exists public.responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references public.surveys(id),
  recipient_id uuid not null references public.recipients(id),
  submitted_at timestamptz not null default now(),
  unique (recipient_id)
);

-- ── Respuestas por pregunta ───────────────────────────────────────
create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  value       text,
  values      text[]
);

-- ══════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════════
create index if not exists idx_questions_survey_id      on public.questions      (survey_id);
create index if not exists idx_questions_template_id    on public.questions      (template_id);
create index if not exists idx_question_options_q_id    on public.question_options (question_id);
create index if not exists idx_distributions_survey_id  on public.distributions  (survey_id);
create index if not exists idx_recipients_dist_id       on public.recipients     (distribution_id);
create index if not exists idx_recipients_token         on public.recipients     (token);
create index if not exists idx_responses_survey_id      on public.responses      (survey_id);
create index if not exists idx_responses_recipient_id   on public.responses      (recipient_id);
create index if not exists idx_answers_response_id      on public.answers        (response_id);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════
alter table public.profiles         enable row level security;
alter table public.templates        enable row level security;
alter table public.surveys          enable row level security;
alter table public.questions        enable row level security;
alter table public.question_options enable row level security;
alter table public.distributions    enable row level security;
alter table public.recipients       enable row level security;
alter table public.responses        enable row level security;
alter table public.answers          enable row level security;

create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Profiles ─────────────────────────────────────────────────────
drop policy if exists "Usuarios ven su propio perfil"       on public.profiles;
drop policy if exists "Admin ve todos los perfiles"          on public.profiles;
drop policy if exists "Usuario actualiza su propio perfil"  on public.profiles;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select using (id = auth.uid());
create policy "Admin ve todos los perfiles"
  on public.profiles for select using (public.get_my_role() = 'admin');
create policy "Usuario actualiza su propio perfil"
  on public.profiles for update using (id = auth.uid());

-- ── Templates ────────────────────────────────────────────────────
drop policy if exists "Todos los usuarios autenticados ven templates" on public.templates;
drop policy if exists "Solo admin edita templates del sistema"         on public.templates;

create policy "Todos los usuarios autenticados ven templates"
  on public.templates for select using (auth.role() = 'authenticated');
create policy "Solo admin edita templates del sistema"
  on public.templates for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── Surveys ──────────────────────────────────────────────────────
drop policy if exists "Usuarios autenticados ven todas las encuestas" on public.surveys;
drop policy if exists "Anónimos ven encuestas activas via token"       on public.surveys;
drop policy if exists "Editor y admin crean encuestas"                 on public.surveys;
drop policy if exists "Creador o admin editan encuesta"                on public.surveys;
drop policy if exists "Solo admin elimina encuestas"                   on public.surveys;

create policy "Usuarios autenticados o público activas"
  on public.surveys for select
  using (status = 'Activa' or auth.role() = 'authenticated');
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
drop policy if exists "Autenticados ven preguntas"           on public.questions;
drop policy if exists "Anónimos ven preguntas de encuestas activas" on public.questions;
drop policy if exists "Editor y admin crean preguntas"       on public.questions;

create policy "Todos ven preguntas"
  on public.questions for select using (true);
create policy "Editor y admin crean preguntas"
  on public.questions for all
  using (auth.role() = 'authenticated')
  with check (public.get_my_role() in ('admin','editor'));

-- ── Question Options ─────────────────────────────────────────────
drop policy if exists "Autenticados ven opciones"         on public.question_options;
drop policy if exists "Anónimos ven opciones"              on public.question_options;
drop policy if exists "Editor y admin gestionan opciones"  on public.question_options;

create policy "Todos ven opciones"
  on public.question_options for select using (true);
create policy "Editor y admin gestionan opciones"
  on public.question_options for all
  using (auth.role() = 'authenticated')
  with check (public.get_my_role() in ('admin','editor'));

-- ── Distributions ────────────────────────────────────────────────
drop policy if exists "Autenticados ven distribuciones"  on public.distributions;
drop policy if exists "Público lee distribuciones"        on public.distributions;
drop policy if exists "Editor y admin crean distribuciones" on public.distributions;

create policy "Todos ven distribuciones"
  on public.distributions for select using (true);
create policy "Editor y admin crean distribuciones"
  on public.distributions for insert
  with check (public.get_my_role() in ('admin','editor'));

-- ── Recipients ───────────────────────────────────────────────────
drop policy if exists "Autenticados ven recipients"          on public.recipients;
drop policy if exists "Público lee recipient por token"      on public.recipients;
drop policy if exists "Editor y admin crean recipients"      on public.recipients;
drop policy if exists "Sistema actualiza tracking"           on public.recipients;
drop policy if exists "Público actualiza su propio recipient" on public.recipients;

create policy "Todos ven recipients"
  on public.recipients for select using (true);
create policy "Editor y admin crean recipients"
  on public.recipients for insert
  with check (public.get_my_role() in ('admin','editor'));
create policy "Sistema y público actualizan recipients"
  on public.recipients for update using (true);

-- ── Responses ────────────────────────────────────────────────────
drop policy if exists "Recipient lee su propia response via token" on public.responses;
drop policy if exists "Cualquiera puede insertar response (página pública)" on public.responses;

create policy "Autenticados ven responses"
  on public.responses for select using (auth.role() = 'authenticated');
create policy "Cualquiera inserta response"
  on public.responses for insert with check (true);

-- ── Answers ──────────────────────────────────────────────────────
drop policy if exists "Autenticados ven respuestas"                    on public.answers;
drop policy if exists "Cualquiera puede insertar answers (página pública)" on public.answers;

create policy "Autenticados ven answers"
  on public.answers for select using (auth.role() = 'authenticated');
create policy "Cualquiera inserta answers"
  on public.answers for insert with check (true);

-- ══════════════════════════════════════════════════════════════════
-- TEMPLATES DEL SISTEMA (no duplica si ya existen)
-- ══════════════════════════════════════════════════════════════════
insert into public.templates (name, description, is_system) values
  ('NPS — Net Promoter Score',    'Mide la probabilidad de recomendación en escala 0-10', true),
  ('CSAT — Satisfacción General', 'Calificación 1-5 stars + comentario abierto',          true),
  ('Clima Laboral',               'Encuesta de ambiente organizacional interna',           true),
  ('Post-Servicio',               'Calidad de atención post-instalación o mantenimiento',  true)
on conflict do nothing;
