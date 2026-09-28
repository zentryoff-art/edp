-- ═══════════════════════════════════════════════════════════════════
--  ESTUDIO DIGITAL PRO · INSTALACIÓN COMPLETA DE LA BASE DE DATOS
-- ═══════════════════════════════════════════════════════════════════
--
--  ⚠  ESTE SCRIPT BORRA TODAS LAS TABLAS, VISTAS Y FUNCIONES DEL ESQUEMA
--     «public» DE ESTE PROYECTO DE SUPABASE, CON SUS DATOS. NO SE PUEDE DESHACER.
--     Úsalo solo en el proyecto de Estudio Digital Pro (no en el de otra web).
--
--  Cómo usarlo:
--   1. Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--      (Si Supabase avisa de «operaciones destructivas», confirma.)
--   2. Authentication → Sign In / Providers → desactiva «Allow new users to sign up».
--   3. Pon las variables de entorno en tu hosting (ver .env.example) y despliega.
--
--  Qué NO borra:
--   - Los usuarios de Authentication (descomenta la línea de abajo si quieres borrarlos).
--   - Los archivos ya subidos a Storage.
--
--  Generado desde supabase/migrations con «npm run db:bundle». No lo edites a mano.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0 · Borrar lo que hay ──────────────────────────────────────────
drop schema if exists public cascade;
create schema public;

-- Permisos por defecto de Supabase para el esquema public.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Borrar también TODAS las cuentas de usuario (descomenta si lo quieres):
-- delete from auth.users;

-- ═══ 001_init.sql ═══════════════════════════════════════════════

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

-- ═══ 002_portal.sql ═══════════════════════════════════════════════

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

-- ═══ 003_admin.sql ═══════════════════════════════════════════════

-- Estudio Digital Pro · herramientas de administración desde Supabase
-- Idempotente. Requiere 001 y 002.
--
-- Todo esto se usa desde el SQL Editor o el Table Editor de Supabase.
-- Ningún cliente (anon/authenticated) puede ejecutar estas funciones ni ver estas tablas.

-- ── Crear un cliente ─────────────────────────
-- select edp_nuevo_cliente('Clínica Sol', 'Clínica o centro');
create or replace function public.edp_nuevo_cliente(p_nombre text, p_sector text default '', p_slug text default null)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_slug text := coalesce(nullif(trim(p_slug), ''),
    trim(both '-' from regexp_replace(lower(translate(p_nombre, 'ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÇç', 'AEIOUUNaeiouunAEIOUaeiouCc')), '[^a-z0-9]+', '-', 'g')));
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre del cliente.';
  end if;
  insert into clients (name, slug, sector) values (trim(p_nombre), v_slug, coalesce(p_sector, ''))
  on conflict (slug) do update set name = excluded.name, sector = excluded.sector;
  return 'Cliente listo: ' || v_slug;
end;
$$;

-- ── Dar acceso a una persona ─────────────────
-- Antes: Authentication → Users → «Add user» (o «Invite user») con su email.
-- select edp_dar_acceso('ana@clinicasol.es', 'clinica-sol', 'Ana Ruiz');
create or replace function public.edp_dar_acceso(p_email text, p_cliente text, p_nombre text default '', p_rol text default 'owner')
returns text
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
  v_client uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No existe el usuario %. Créalo primero en Authentication → Users → Add user.', p_email;
  end if;
  select id into v_client from clients where slug = p_cliente;
  if v_client is null then
    raise exception 'No existe el cliente «%». Créalo con: select edp_nuevo_cliente(''Nombre'');', p_cliente;
  end if;
  insert into client_members (user_id, client_id, full_name, role)
  values (v_user, v_client, coalesce(p_nombre, ''), case when p_rol = 'member' then 'member' else 'owner' end)
  on conflict (user_id, client_id) do update set full_name = excluded.full_name, role = excluded.role;
  return 'Acceso concedido: ' || p_email || ' → ' || p_cliente;
end;
$$;

-- select edp_quitar_acceso('ana@clinicasol.es', 'clinica-sol');
create or replace function public.edp_quitar_acceso(p_email text, p_cliente text)
returns text
language plpgsql
set search_path = public
as $$
begin
  delete from client_members m
  using auth.users u, clients c
  where m.user_id = u.id and m.client_id = c.id and lower(u.email) = lower(trim(p_email)) and c.slug = p_cliente;
  return 'Acceso retirado (si existía): ' || p_email || ' → ' || p_cliente;
end;
$$;

-- ── Responder una incidencia ─────────────────
-- select edp_responder('id-de-la-incidencia', 'Ya está arreglado, gracias.', 'resuelta');
create or replace function public.edp_responder(p_incidencia uuid, p_texto text, p_estado text default 'en_curso')
returns text
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from incidents where id = p_incidencia) then
    raise exception 'No existe la incidencia %.', p_incidencia;
  end if;
  if coalesce(trim(p_texto), '') <> '' then
    insert into incident_messages (incident_id, author_name, is_team, body)
    values (p_incidencia, 'Equipo EDP', true, trim(p_texto));
  end if;
  if p_estado is not null then
    update incidents set status = p_estado, updated_at = now() where id = p_incidencia;
  end if;
  return 'Incidencia actualizada.';
end;
$$;

-- ── Importar métricas con el botón «Import data from CSV» ──
-- Table Editor → importar_metricas → Insert → Import data from CSV.
-- Columnas: cliente (slug), fecha, canal, gasto, nota1…nota5, cerrados, facturacion.
-- Cada fila se pasa a daily_metrics (sobrescribe la misma fecha + canal) y esta tabla se queda vacía.
create table if not exists public.importar_metricas (
  cliente      text not null,
  fecha        date not null,
  canal        text not null default 'google',
  gasto        numeric(12, 2) not null default 0,
  nota1        integer not null default 0,
  nota2        integer not null default 0,
  nota3        integer not null default 0,
  nota4        integer not null default 0,
  nota5        integer not null default 0,
  cerrados     integer not null default 0,
  facturacion  numeric(12, 2) not null default 0
);

create or replace function public.importar_metricas_fila()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_client uuid;
begin
  select id into v_client from clients where slug = trim(new.cliente);
  if v_client is null then
    raise exception 'Cliente «%» no existe (columna cliente = slug).', new.cliente;
  end if;
  insert into daily_metrics (client_id, date, channel, spend, leads_1, leads_2, leads_3, leads_4, leads_5, closed, revenue)
  values (v_client, new.fecha, lower(trim(coalesce(nullif(new.canal, ''), 'otros'))), new.gasto,
          new.nota1, new.nota2, new.nota3, new.nota4, new.nota5, new.cerrados, new.facturacion)
  on conflict (client_id, date, channel) do update set
    spend = excluded.spend, leads_1 = excluded.leads_1, leads_2 = excluded.leads_2, leads_3 = excluded.leads_3,
    leads_4 = excluded.leads_4, leads_5 = excluded.leads_5, closed = excluded.closed, revenue = excluded.revenue;
  return null; -- no se guarda en importar_metricas
end;
$$;

drop trigger if exists importar_metricas_trg on public.importar_metricas;
create trigger importar_metricas_trg
before insert on public.importar_metricas
for each row execute function public.importar_metricas_fila();

-- ── Vista de trabajo para el equipo ──────────
create or replace view public.edp_incidencias_abiertas as
select i.id, c.name as cliente, i.title as titulo, i.priority as prioridad, i.status as estado,
       i.created_at as abierta, i.updated_at as ultima_actividad,
       (select body from incident_messages m where m.incident_id = i.id order by created_at desc limit 1) as ultimo_mensaje
from incidents i
join clients c on c.id = i.client_id
where i.status <> 'resuelta'
order by case i.priority when 'urgente' then 0 when 'alta' then 1 when 'normal' then 2 else 3 end, i.updated_at desc;

-- ── Nada de esto es accesible para clientes ──
alter table public.importar_metricas enable row level security;
revoke all on public.importar_metricas, public.edp_incidencias_abiertas from anon, authenticated;
revoke execute on function public.edp_nuevo_cliente(text, text, text), public.edp_dar_acceso(text, text, text, text),
  public.edp_quitar_acceso(text, text), public.edp_responder(uuid, text, text), public.importar_metricas_fila()
  from public, anon, authenticated;

-- ═══ Listo ═══════════════════════════════════════════════════════
-- Siguientes pasos (aquí mismo, en el SQL Editor):
--   select edp_nuevo_cliente('Clínica Sol', 'Clínica o centro');          -- crea el cliente (slug: clinica-sol)
--   -- Authentication → Users → Add user (email + contraseña) o Invite user
--   select edp_dar_acceso('ana@clinicasol.es', 'clinica-sol', 'Ana Ruiz'); -- le da acceso a su área
--   select * from edp_incidencias_abiertas;                                -- incidencias pendientes
--   select edp_responder('<id>', 'Respuesta al cliente', 'resuelta');      -- contestar y cerrar
-- Métricas: Table Editor → importar_metricas → Insert → Import data from CSV.

select 'Estudio Digital Pro: base de datos instalada' as resultado;
