-- ============================================================
-- Agenda USS — Esquema Supabase
-- Ejecutar en el SQL Editor del proyecto Supabase
-- ============================================================

-- Tabla de eventos
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text,
  description   text,
  date          date not null,
  time          time not null,
  sede          text not null,
  location      text,
  faculty       text,
  capacity      int,
  requires_rsvp boolean default true,
  external_url  text,
  tags          text[] default '{}',
  image_url     text,
  status        text default 'draft' check (status in ('draft','published','archived')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists events_date_idx on public.events(date);
create index if not exists events_sede_idx on public.events(sede);
create index if not exists events_status_idx on public.events(status);

-- Tabla de inscripciones
create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  rut         text,
  user_type   text check (user_type in ('estudiante','funcionario','externo','académico')),
  career      text,
  campus      text,
  comment     text,
  created_at  timestamptz default now()
);

create index if not exists registrations_event_idx on public.registrations(event_id);
create index if not exists registrations_created_idx on public.registrations(created_at desc);

-- RLS (Row Level Security)
alter table public.events enable row level security;
alter table public.registrations enable row level security;

-- Lectura pública: cualquiera ve eventos publicados
create policy "events_public_read" on public.events
  for select using (status = 'published');

-- Admin (usuarios autenticados) ven todo
create policy "events_auth_full" on public.events
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Cualquiera puede crear inscripciones
create policy "regs_public_insert" on public.registrations
  for insert with check (true);

-- Admin ve todas las inscripciones
create policy "regs_auth_read" on public.registrations
  for select using (auth.uid() is not null);

-- Realtime
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.registrations;

-- (Opcional) Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
