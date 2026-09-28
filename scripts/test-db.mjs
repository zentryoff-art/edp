#!/usr/bin/env node
/**
 * Prueba la base de datos en un Postgres local (PGlite) que imita lo mínimo de Supabase:
 * roles anon/authenticated/service_role, auth.uid(), auth.users y storage.
 *
 *   npm run test:db
 *
 * Dos pasadas:
 *   A · migraciones sueltas (supabase/migrations/*.sql), ejecutadas dos veces
 *   B · supabase/instalar.sql sobre un proyecto con tablas «viejas», ejecutado dos veces
 * En ambas se comprueba la seguridad (RLS) y las herramientas de administración.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${name}${ok || !detail ? "" : ` — ${detail}`}`);
}

async function fakeSupabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  return db;
}

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const uA = "10000000-0000-0000-0000-00000000000a";
const uB = "10000000-0000-0000-0000-00000000000b";

async function securityChecks(db, tag) {
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  async function rejects(name, sql, params) {
    try {
      await db.query(sql, params);
      check(`${tag} ${name}`, false, "se permitió y no debería");
    } catch {
      check(`${tag} ${name}`, true);
    }
  }

  // Datos de prueba (como administrador)
  await db.exec(`
    insert into auth.users values ('${uA}', 'ana@a.com'), ('${uB}', 'bea@b.com') on conflict do nothing;
    insert into clients (id, name, slug) values ('${A}', 'Cliente A', 'a'), ('${B}', 'Cliente B', 'b');
    insert into client_members (user_id, client_id, full_name) values ('${uA}', '${A}', 'Ana A'), ('${uB}', '${B}', 'Bea B');
    insert into daily_metrics (client_id, date, channel, spend, leads_1, leads_4, leads_5, closed) values
      ('${A}', '2026-08-01', 'google', 100, 3, 2, 1, 1),
      ('${A}', '2026-08-02', 'meta', 50, 1, 1, 0, 0),
      ('${B}', '2026-08-01', 'google', 999, 9, 9, 9, 9);
    insert into reports (client_id, period, title, published) values
      ('${A}', '2026-08-01', 'Agosto A', true),
      ('${A}', '2026-09-01', 'Septiembre A (borrador)', false),
      ('${B}', '2026-08-01', 'Agosto B', true);
    insert into incidents (id, client_id, created_by, title) values
      ('20000000-0000-0000-0000-00000000000a', '${A}', '${uA}', 'Incidencia de A'),
      ('20000000-0000-0000-0000-00000000000b', '${B}', '${uB}', 'Incidencia de B');
    insert into bookings (id, starts_at, ends_at, name, company, email, phone, sector, client_id) values
      (gen_random_uuid(), now() + interval '1 day', now() + interval '1 day 20 min', 'Ana', 'A', 'ana@a.com', '600', 'x', '${A}'),
      (gen_random_uuid(), now() + interval '2 day', now() + interval '2 day 20 min', 'Bea', 'B', 'bea@b.com', '600', 'x', '${B}');
  `);

  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uA}', false);`);
  check(`${tag} Ana solo ve su cliente`, (await rows("select slug from clients")).map((r) => r.slug).join() === "a");
  check(`${tag} Ana solo ve sus métricas`, (await rows("select * from daily_metrics")).every((r) => r.client_id === A));
  const sum = await rows("select * from monthly_summary");
  check(`${tag} Vista mensual: solo A y bien sumada`, sum.length === 1 && sum[0].leads === 8 && sum[0].leads_hot === 4 && Number(sum[0].spend) === 150, JSON.stringify(sum));
  check(`${tag} Ana solo ve informes publicados de A`, (await rows("select title from reports")).map((r) => r.title).join() === "Agosto A");
  check(`${tag} Ana solo ve sus incidencias`, (await rows("select title from incidents")).map((r) => r.title).join() === "Incidencia de A");
  check(`${tag} Ana solo ve sus llamadas`, (await rows("select company from bookings")).map((r) => r.company).join() === "A");
  await db.query("insert into incidents (client_id, created_by, title) values ($1, $2, 'Nueva de A')", [A, uA]);
  check(`${tag} Ana puede abrir una incidencia en A`, (await rows("select * from incidents")).length === 2);
  await rejects("Ana NO abre incidencias en B", "insert into incidents (client_id, created_by, title) values ($1, $2, 'Intrusa')", [B, uA]);
  await rejects("Ana NO suplanta a otro usuario", "insert into incidents (client_id, created_by, title) values ($1, $2, 'x')", [A, uB]);
  await rejects("Ana NO crea incidencias resueltas", "insert into incidents (client_id, created_by, title, status) values ($1, $2, 'x', 'resuelta')", [A, uA]);
  await rejects("Ana NO cambia el estado", "update incidents set status = 'resuelta' where client_id = $1", [A]);
  await db.query("insert into incident_messages (incident_id, author_id, author_name, body) values ('20000000-0000-0000-0000-00000000000a', $1, 'Equipo EDP', 'Hola')", [uA]);
  const msg = await rows("select author_name, is_team from incident_messages");
  check(`${tag} El nombre del autor lo fija la BD`, msg.length === 1 && msg[0].author_name === "Ana A" && !msg[0].is_team, JSON.stringify(msg));
  await rejects("Ana NO escribe como equipo", "insert into incident_messages (incident_id, author_id, is_team, body) values ('20000000-0000-0000-0000-00000000000a', $1, true, 'x')", [uA]);
  await rejects("Ana NO escribe en incidencias de B", "insert into incident_messages (incident_id, author_id, body) values ('20000000-0000-0000-0000-00000000000b', $1, 'x')", [uA]);
  await rejects("Ana NO inserta métricas", "insert into daily_metrics (client_id, date) values ($1, '2026-08-03')", [A]);
  await rejects("Ana NO publica informes", "insert into reports (client_id, period, published) values ($1, '2026-10-01', true)", [A]);
  await rejects("Ana NO se añade a otro cliente", "insert into client_members (user_id, client_id) values ($1, $2)", [uA, B]);
  await rejects("Ana NO usa herramientas de admin", "select edp_dar_acceso('ana@a.com', 'b')");
  await rejects("Ana NO importa métricas", "insert into importar_metricas (cliente, fecha) values ('a', '2026-08-05')");
  await rejects("Ana NO ve la vista de incidencias del equipo", "select * from edp_incidencias_abiertas");

  await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  await rejects("Anónimo NO lee clientes", "select * from clients");
  await rejects("Anónimo NO lee métricas", "select * from daily_metrics");
  check(`${tag} Anónimo no ve reservas`, (await rows("select * from bookings").catch(() => [])).length === 0);
  await db.exec("reset role;");

  // Herramientas de administración (como el SQL Editor de Supabase)
  const one = async (sql, p) => (await db.query(sql, p)).rows[0];
  const r1 = await one("select edp_nuevo_cliente('Clínica Sol Ñandú', 'Clínica o centro') as r");
  check(`${tag} edp_nuevo_cliente crea el slug`, r1.r === "Cliente listo: clinica-sol-nandu", r1.r);
  await db.exec(`insert into auth.users values ('30000000-0000-0000-0000-000000000001', 'Carla@Sol.es')`);
  const r2 = await one("select edp_dar_acceso('carla@sol.es', 'clinica-sol-nandu', 'Carla') as r");
  check(`${tag} edp_dar_acceso asocia el usuario`, r2.r.startsWith("Acceso concedido"), r2.r);
  let err = "";
  await db.query("select edp_dar_acceso('nadie@x.com', 'clinica-sol-nandu')").catch((e) => (err = e.message));
  check(`${tag} edp_dar_acceso avisa si el usuario no existe`, /Add user/.test(err), err);

  await db.exec(`insert into importar_metricas (cliente, fecha, canal, gasto, nota4, nota5) values
    ('clinica-sol-nandu', '2026-09-01', 'Google', 40.5, 2, 1), ('clinica-sol-nandu', '2026-09-01', 'google', 42, 3, 1)`);
  const dm = await db.query("select m.* from daily_metrics m join clients c on c.id = m.client_id where c.slug = 'clinica-sol-nandu'");
  const staging = await db.query("select count(*)::int as n from importar_metricas");
  check(`${tag} importar_metricas pasa a daily_metrics y sobrescribe`, dm.rows.length === 1 && Number(dm.rows[0].spend) === 42 && dm.rows[0].leads_4 === 3 && staging.rows[0].n === 0, JSON.stringify(dm.rows));
  err = "";
  await db.query("insert into importar_metricas (cliente, fecha) values ('no-existe', '2026-09-01')").catch((e) => (err = e.message));
  check(`${tag} importar_metricas rechaza clientes inexistentes`, /no existe/.test(err), err);

  await one("select edp_responder('20000000-0000-0000-0000-00000000000a', 'Arreglado', 'resuelta') as r");
  const inc = await one("select status from incidents where id = '20000000-0000-0000-0000-00000000000a'");
  const team = await one("select author_name, is_team from incident_messages where is_team");
  check(`${tag} edp_responder contesta como equipo y cambia el estado`, inc.status === "resuelta" && team?.author_name === "Equipo EDP");
  const open = await db.query("select * from edp_incidencias_abiertas");
  check(
    `${tag} vista edp_incidencias_abiertas (sin las resueltas)`,
    open.rows.length === 2 && !open.rows.some((r) => r.id === "20000000-0000-0000-0000-00000000000a"),
    JSON.stringify(open.rows),
  );
}

// ── A · Migraciones sueltas ─────────────────────
{
  console.log("\n\x1b[1mA · Migraciones (supabase/migrations)\x1b[0m");
  const db = await fakeSupabase();
  const dir = path.join(ROOT, "supabase", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const round of [1, 2]) {
    for (const f of files) {
      try {
        await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch (e) {
        check(`[A] ${f} (pasada ${round})`, false, e.message);
        process.exit(1);
      }
    }
  }
  check("[A] migraciones idempotentes (2 pasadas)", true);
  await securityChecks(db, "[A]");
}

// ── B · Script único de instalación ─────────────
{
  console.log("\n\x1b[1mB · supabase/instalar.sql (pegar en Supabase)\x1b[0m");
  const sqlFile = path.join(ROOT, "supabase", "instalar.sql");
  const sql = fs.readFileSync(sqlFile, "utf8");
  const bundled = fs.readdirSync(path.join(ROOT, "supabase", "migrations")).filter((f) => f.endsWith(".sql"));
  check("[B] instalar.sql incluye todas las migraciones", bundled.every((f) => sql.includes(`═══ ${f} ═══`)), "ejecuta npm run db:bundle");

  const db = await fakeSupabase();
  // Proyecto «sucio»: tablas, vistas y funciones de antes.
  await db.exec(`
    create table public.tabla_vieja (id int primary key, dato text);
    insert into public.tabla_vieja values (1, 'antiguo');
    create table public.bookings (id int, basura text);
    create view public.vista_vieja as select * from public.tabla_vieja;
    create function public.funcion_vieja() returns int language sql as $$ select 1 $$;
  `);
  for (const round of [1, 2]) {
    try {
      await db.exec(sql);
    } catch (e) {
      check(`[B] instalar.sql (pasada ${round})`, false, e.message);
      process.exit(1);
    }
  }
  check("[B] instalar.sql se puede ejecutar dos veces", true);
  const left = await db.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('tabla_vieja', 'vista_vieja')",
  );
  const fn = await db.query("select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'funcion_vieja'");
  check("[B] borra tablas, vistas y funciones anteriores", left.rows.length === 0 && fn.rows.length === 0, JSON.stringify(left.rows));
  const cols = await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'bookings'");
  check("[B] bookings recreada con el esquema nuevo", cols.rows.some((r) => r.column_name === "starts_at") && !cols.rows.some((r) => r.column_name === "basura"));
  const holidays = await db.query("select count(*)::int as n from blocked_dates");
  check("[B] festivos cargados", holidays.rows[0].n > 5);
  const bucket = await db.query("select public from storage.buckets where id = 'media'");
  check("[B] bucket «media» público", bucket.rows[0]?.public === true);
  await securityChecks(db, "[B]");
}

console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
