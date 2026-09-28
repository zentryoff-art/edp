-- Estudio Digital Pro · área de clientes
-- Idempotente. Requiere 001_init.sql.
--
-- Modelo:
--   clients          → empresas cliente
--   client_members   → qué usuarios (auth.users) pertenecen a qué cliente
--   daily_metrics    → métricas diarias por canal (las subís vosotros)
--   monthly_summary  → vista: agregados mensuales calculados de daily_metrics
--   reports          → texto del informe mensual (resumen, próximos pasos) y si está publicado
--   incidents        → incidencias abiertas por el cliente
--   incident_messages→ conversación de cada incidencia
--   bookings         → (de 001) + client_id/user_id para las llamadas pedidas desde el área
--
-- Seguridad: RLS en todo. Un usuario solo ve filas de los clientes a los que pertenece.


-- ── Clientes y miembros ──────────────────────
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  sector         text not null default '',
  created_at     timestamptz not null default now()
);

create table if not exists public.client_members (
  user_id    uuid not null references auth.users (id) on delete cascade,
  client_id  uuid not null references public.clients (id) on delete cascade,
  full_name  text not null default '',
  role       text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

create index if not exists client_members_client_idx on public.client_members (client_id);

-- ¿El usuario actual pertenece a este cliente? (security definer evita recursión en las políticas)
create or replace function public.is_client_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.client_members m where m.client_id = cid and m.user_id = auth.uid()
  );
$$;

-- ── Métricas ─────────────────────────────────
create table if not exists public.daily_metrics (
  client_id  uuid not null references public.clients (id) on delete cascade,
  date       date not null,
  channel    text not null default 'google',
  spend      numeric(12, 2) not null default 0 check (spend >= 0),
  leads_1    integer not null default 0 check (leads_1 >= 0),
  leads_2    integer not null default 0 check (leads_2 >= 0),
  leads_3    integer not null default 0 check (leads_3 >= 0),
  leads_4    integer not null default 0 check (leads_4 >= 0),
  leads_5    integer not null default 0 check (leads_5 >= 0),
  closed     integer not null default 0 check (closed >= 0),
  revenue    numeric(12, 2) not null default 0 check (revenue >= 0),
  primary key (client_id, date, channel)
);

create or replace view public.monthly_summary
with (security_invoker = true) as
select
  client_id,
  date_trunc('month', date)::date as period,
  sum(spend)::numeric(12, 2) as spend,
  sum(leads_1)::int as leads_1,
  sum(leads_2)::int as leads_2,
  sum(leads_3)::int as leads_3,
  sum(leads_4)::int as leads_4,
  sum(leads_5)::int as leads_5,
  sum(leads_1 + leads_2 + leads_3 + leads_4 + leads_5)::int as leads,
  sum(leads_4 + leads_5)::int as leads_hot,
  sum(closed)::int as closed,
  sum(revenue)::numeric(12, 2) as revenue
from public.daily_metrics
group by client_id, date_trunc('month', date);

-- ── Informes mensuales (texto) ───────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  period      date not null check (extract(day from period) = 1),
  title       text not null default '',
  summary     text not null default '',
  highlights  text not null default '',
  next_steps  text not null default '',
  pdf_url     text not null default '',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (client_id, period)
);

-- ── Llamadas pedidas desde el área ───────────
alter table public.bookings add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.bookings add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists bookings_client_idx on public.bookings (client_id, starts_at);

-- ── Incidencias ──────────────────────────────
create table if not exists public.incidents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  created_by   uuid references auth.users (id) on delete set null,
  title        text not null check (char_length(title) between 3 and 160),
  description  text not null default '' check (char_length(description) <= 5000),
  category     text not null default 'otra' check (category in ('campañas', 'leads', 'informes', 'facturación', 'web', 'otra')),
  priority     text not null default 'normal' check (priority in ('baja', 'normal', 'alta', 'urgente')),
  status       text not null default 'abierta' check (status in ('abierta', 'en_curso', 'resuelta')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists incidents_client_idx on public.incidents (client_id, updated_at desc);

create table if not exists public.incident_messages (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references public.incidents (id) on delete cascade,
  author_id    uuid references auth.users (id) on delete set null,
  author_name  text not null default '',
  is_team      boolean not null default false,
  body         text not null check (char_length(body) between 1 and 5000),
  created_at   timestamptz not null default now()
);

create index if not exists incident_messages_incident_idx on public.incident_messages (incident_id, created_at);

-- Cada mensaje nuevo actualiza la fecha de la incidencia.
create or replace function public.touch_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.incidents set updated_at = now() where id = new.incident_id;
  return new;
end;
$$;

-- El nombre del autor de un mensaje de cliente lo pone la base de datos (no se puede suplantar).
create or replace function public.set_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_team then
    select coalesce(nullif(m.full_name, ''), u.email, 'Cliente')
      into new.author_name
      from public.incidents i
      left join public.client_members m on m.client_id = i.client_id and m.user_id = new.author_id
      left join auth.users u on u.id = new.author_id
      where i.id = new.incident_id;
  end if;
  return new;
end;
$$;

drop trigger if exists incident_messages_author on public.incident_messages;
create trigger incident_messages_author
before insert on public.incident_messages
for each row execute function public.set_message_author();

drop trigger if exists incident_messages_touch on public.incident_messages;
create trigger incident_messages_touch
after insert on public.incident_messages
for each row execute function public.touch_incident();

-- ── RLS ──────────────────────────────────────
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.reports enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_messages enable row level security;

drop policy if exists "miembros ven su cliente" on public.clients;
create policy "miembros ven su cliente" on public.clients
  for select to authenticated using (public.is_client_member(id));

drop policy if exists "cada usuario ve su membresía" on public.client_members;
create policy "cada usuario ve su membresía" on public.client_members
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "miembros ven sus métricas" on public.daily_metrics;
create policy "miembros ven sus métricas" on public.daily_metrics
  for select to authenticated using (public.is_client_member(client_id));

drop policy if exists "miembros ven informes publicados" on public.reports;
create policy "miembros ven informes publicados" on public.reports
  for select to authenticated using (published and public.is_client_member(client_id));

drop policy if exists "miembros ven sus llamadas" on public.bookings;
create policy "miembros ven sus llamadas" on public.bookings
  for select to authenticated using (client_id is not null and public.is_client_member(client_id));

drop policy if exists "miembros ven sus incidencias" on public.incidents;
create policy "miembros ven sus incidencias" on public.incidents
  for select to authenticated using (public.is_client_member(client_id));

drop policy if exists "miembros abren incidencias" on public.incidents;
create policy "miembros abren incidencias" on public.incidents
  for insert to authenticated
  with check (public.is_client_member(client_id) and created_by = auth.uid() and status = 'abierta');

drop policy if exists "miembros ven mensajes" on public.incident_messages;
create policy "miembros ven mensajes" on public.incident_messages
  for select to authenticated
  using (exists (select 1 from public.incidents i where i.id = incident_id and public.is_client_member(i.client_id)));

drop policy if exists "miembros escriben mensajes" on public.incident_messages;
create policy "miembros escriben mensajes" on public.incident_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not is_team
    and exists (select 1 from public.incidents i where i.id = incident_id and public.is_client_member(i.client_id))
  );

-- ── Permisos explícitos ──────────────────────
revoke all on public.clients, public.client_members, public.daily_metrics, public.reports,
  public.incidents, public.incident_messages, public.monthly_summary from anon;

-- Supabase concede por defecto escritura a `authenticated`; RLS ya la bloquea, pero la quitamos también.
revoke insert, update, delete, truncate on public.clients, public.client_members, public.daily_metrics,
  public.reports, public.bookings from authenticated;
revoke update, delete, truncate on public.incidents, public.incident_messages from authenticated;

grant select on public.clients, public.client_members, public.daily_metrics, public.reports,
  public.incidents, public.incident_messages, public.monthly_summary, public.bookings to authenticated;
grant insert on public.incidents, public.incident_messages to authenticated;
grant execute on function public.is_client_member(uuid) to authenticated;
