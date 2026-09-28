#!/usr/bin/env node
/**
 * Genera supabase/instalar.sql: un único script para pegar en el SQL Editor de Supabase
 * que BORRA el esquema public y crea todo lo que necesita la web.
 *
 *   npm run db:bundle
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const header = `-- ═══════════════════════════════════════════════════════════════════
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

`;

const body = files
  .map((f) => `-- ═══ ${f} ═══════════════════════════════════════════════\n\n${fs.readFileSync(path.join(dir, f), "utf8").trim()}\n`)
  .join("\n");

const footer = `
-- ═══ Listo ═══════════════════════════════════════════════════════
-- Siguientes pasos (aquí mismo, en el SQL Editor):
--   select edp_nuevo_cliente('Clínica Sol', 'Clínica o centro');          -- crea el cliente (slug: clinica-sol)
--   -- Authentication → Users → Add user (email + contraseña) o Invite user
--   select edp_dar_acceso('ana@clinicasol.es', 'clinica-sol', 'Ana Ruiz'); -- le da acceso a su área
--   select * from edp_incidencias_abiertas;                                -- incidencias pendientes
--   select edp_responder('<id>', 'Respuesta al cliente', 'resuelta');      -- contestar y cerrar
-- Métricas: Table Editor → importar_metricas → Insert → Import data from CSV.

select 'Estudio Digital Pro: base de datos instalada' as resultado;
`;

const out = header + body + footer;
fs.writeFileSync(path.join(ROOT, "supabase", "instalar.sql"), out);
console.log(`supabase/instalar.sql generado (${files.join(" + ")}, ${out.split("\n").length} líneas)`);
