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
