-- Estudio Digital Pro · esquema inicial
-- Idempotente: se puede ejecutar varias veces sin romper nada.

-- ── Reservas de llamadas ─────────────────────
create table if not exists public.bookings (
  id          uuid primary key,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  name        text not null,
  company     text not null,
  email       text not null,
  phone       text not null,
  sector      text not null,
  ad_spend    text not null default '',
  website     text not null default '',
  notes       text not null default '',
  status      text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  source      text not null default 'web',
  created_at  timestamptz not null default now()
);

-- Un solo lead por hueco: si dos personas reservan a la vez, la segunda recibe 409.
create unique index if not exists bookings_one_per_slot on public.bookings (starts_at) where status = 'confirmed';
create index if not exists bookings_email_idx on public.bookings (email);
create index if not exists bookings_starts_idx on public.bookings (starts_at);

-- ── Solicitudes del formulario de auditoría ──
create table if not exists public.contact_requests (
  id          uuid primary key,
  name        text not null,
  company     text not null,
  email       text not null,
  phone       text not null default '',
  sector      text not null,
  message     text not null default '',
  source      text not null default 'web',
  created_at  timestamptz not null default now()
);

create index if not exists contact_requests_created_idx on public.contact_requests (created_at desc);

-- ── Días sin llamadas (festivos, vacaciones) ─
create table if not exists public.blocked_dates (
  date    date primary key,
  reason  text not null default ''
);

-- Festivos nacionales. Añade aquí (o desde el panel de Supabase) los autonómicos y locales.
insert into public.blocked_dates (date, reason) values
  ('2026-10-12', 'Fiesta Nacional'),
  ('2026-11-01', 'Todos los Santos'),
  ('2026-12-06', 'Día de la Constitución'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-01-06', 'Reyes'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-08-15', 'Asunción'),
  ('2027-10-12', 'Fiesta Nacional'),
  ('2027-11-01', 'Todos los Santos'),
  ('2027-12-06', 'Día de la Constitución'),
  ('2027-12-08', 'Inmaculada Concepción'),
  ('2027-12-25', 'Navidad')
on conflict (date) do nothing;

-- ── Seguridad: solo el servidor (service role) lee y escribe ──
alter table public.bookings enable row level security;
alter table public.contact_requests enable row level security;
alter table public.blocked_dates enable row level security;

-- ── Almacenamiento público para el vídeo y su portada ──
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;
