# Instalar la base de datos en Supabase

> ⚠ `instalar.sql` **borra todo** el esquema `public` del proyecto (tablas, vistas, funciones y datos).
> Úsalo solo en el proyecto de Supabase de Estudio Digital Pro, no en el de otra web.
> Los usuarios de Authentication no se borran (hay una línea comentada si lo quieres).

## 1 · Pegar el script

Supabase → **SQL Editor** → New query → pega **todo** [`instalar.sql`](instalar.sql) → **Run**.
Al terminar verás `Estudio Digital Pro: base de datos instalada`.

## 2 · Ajustes de Authentication (2 minutos)

1. **Sign In / Providers** → desactiva **Allow new users to sign up** (las cuentas las creáis vosotros).
2. **URL Configuration** → **Site URL**: `https://estudiodigitalpro.com`
3. **Emails → Templates** (solo si vais a usar *Invite user* o no configuráis SMTP). Cambia el enlace de cada plantilla:
   - **Invite user**: `{{ .SiteURL }}/clientes/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - **Reset password**: `{{ .SiteURL }}/clientes/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

## 3 · Variables de entorno

Copia [`.env.example`](../.env.example) y rellena las tres obligatorias (Project Settings → API) y, si quieres
recibir los formularios por correo, las de SMTP. Despliega. Ya funciona.

---

## Uso diario, todo desde Supabase

**Nuevo cliente con acceso a su área** (SQL Editor):

```sql
select edp_nuevo_cliente('Clínica Sol', 'Clínica o centro');   -- slug: clinica-sol
```

Luego en **Authentication → Users**:
- **Add user → Create new user**: email + contraseña, marca *Auto Confirm User*, y se la pasáis; o
- **Invite user**: le llega un correo para crear su contraseña (requiere la plantilla del paso 2.3).

Y le dais acceso:

```sql
select edp_dar_acceso('ana@clinicasol.es', 'clinica-sol', 'Ana Ruiz');
select edp_quitar_acceso('ana@clinicasol.es', 'clinica-sol');   -- para retirarlo
```

**Métricas**: Table Editor → `importar_metricas` → Insert → **Import data from CSV**.
Columnas: `cliente` (slug), `fecha`, `canal`, `gasto`, `nota1`…`nota5`, `cerrados`, `facturacion`.
Cada fila se guarda en `daily_metrics` (si ya existía esa fecha y canal, se sobrescribe) y `importar_metricas` queda vacía.
Plantilla: [`datos/plantillas/importar_metricas.csv`](../datos/plantillas/importar_metricas.csv).

**Informe mensual**: Table Editor → `reports` → Insert row: `client_id`, `period` (día 1 del mes, p. ej. `2026-09-01`),
`title`, `summary`, `highlights`, `next_steps` (una idea por línea), `published = true` cuando quieras que lo vea.

**Incidencias**:

```sql
select * from edp_incidencias_abiertas;                                  -- pendientes, las urgentes primero
select edp_responder('<id de la incidencia>', 'Ya está arreglado.', 'resuelta');
select edp_responder('<id>', 'Lo estamos mirando.');                     -- queda «en curso»
```

**Reservas y formularios**: tablas `bookings` y `contact_requests`. Para cancelar una llamada, pon `status = cancelled`.
**Festivos y vacaciones**: tabla `blocked_dates` (una fila por día).
