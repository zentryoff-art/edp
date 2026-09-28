# Estudio Digital Pro · web

Next.js 15. Web principal (`/`) y landing de captación con reserva de llamadas de 20 minutos (`/llamada`).
Todo se guarda en **Supabase** y los formularios se reenvían por **correo** a `info@estudiodigitalpro.com`.

## Puesta en marcha rápida (sin terminal)

1. Pega [`supabase/instalar.sql`](supabase/instalar.sql) en el SQL Editor de Supabase y ejecútalo (**borra lo que haya** en ese proyecto).
2. Pon las variables de [`.env.example`](.env.example) en tu hosting y despliega.

Detalles y uso diario desde Supabase: [`supabase/LEEME.md`](supabase/LEEME.md).

## Puesta en marcha con scripts (alternativa)

Necesitas Node 20+ y un proyecto de Supabase.

```bash
npm install
npm run setup
```

`npm run setup` te pide los datos y hace el resto:

1. **Supabase** — `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) y `SUPABASE_DB_URL`
   (Connect → Connection string → URI; si tu red no tiene IPv6, usa la del *Session pooler*).
2. **Correo** — servidor SMTP del buzón `info@estudiodigitalpro.com` (Google Workspace: `smtp.gmail.com`, puerto 465,
   con una *contraseña de aplicación*).
3. Crea las tablas (`supabase/migrations/*.sql`), sube el vídeo a Supabase Storage y lo comprueba todo.
4. Guarda todo en `.env.local` (no se sube a git). Puedes relanzarlo cuando quieras: recuerda lo que ya pusiste.

Después:

```bash
npm run dev            # http://localhost:3000 y /llamada
npm run build && npm start
```

**Vercel:** `npx vercel link` y luego `npm run env:vercel` copia las variables (menos `SUPABASE_DB_URL`) al proyecto.

## Qué hay en Supabase

| Tabla              | Qué guarda                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `bookings`         | Reservas de llamada. Un índice único impide reservar un hueco dos veces. |
| `contact_requests` | Solicitudes del formulario «Pide una auditoría».                  |
| `blocked_dates`    | Días sin llamadas (festivos nacionales precargados; añade los locales y vacaciones). |
| Storage `media`    | Vídeo y portada de `/llamada`.                                    |

Las tablas tienen RLS activado sin políticas públicas: solo el servidor (service role) puede leer y escribir.

## Correos

- Cada **reserva** → aviso a `MAIL_TO` con los datos del lead + invitación `.ics`; el cliente recibe su confirmación con la invitación.
- Cada **solicitud de auditoría** → aviso a `MAIL_TO` (responder al correo contesta directamente al cliente).

Si el SMTP falla, los datos igualmente quedan en Supabase.

## Agenda

Se configura con variables (ver `.env.example`):

```
BOOKING_HOURS="1-4=09:00-14:00,16:00-19:00;5=09:00-14:00"   # lun–jue mañana y tarde, viernes mañana
BOOKING_SLOT_MINUTES=20
BOOKING_MIN_NOTICE_MINUTES=120
BOOKING_HORIZON_DAYS=28
```

Para cancelar una reserva, cambia su `status` a `cancelled` en Supabase: el hueco vuelve a quedar libre.

## Vídeo

El vídeo de `/llamada` se genera por código (`video/`, con Remotion): locución, música propia y animaciones con la marca.

```bash
cd video && npm install
npm run build          # voz + música + render + portada
```

- Guion: `video/voice/script.json`. Cambia una frase y vuelve a generar; las animaciones se sincronizan solas con la voz.
- Voz: por defecto `edge-tts` (`pip install edge-tts numpy`). Con `ELEVENLABS_API_KEY` u `OPENAI_API_KEY` usa ese proveedor.
- Música: `video/scripts/music.py` (sintetizada, sin derechos de terceros).
- Tras regenerarlo, `npm run setup` lo vuelve a subir a Supabase.

## Área de clientes (`/clientes`)

Dashboard privado para cada cliente: resumen de los últimos 30 días, informes mensuales, llamadas (con el mismo
calendario de 20 min) e incidencias con conversación. Login con email y contraseña (Supabase Auth).

**Seguridad.** Cada consulta se hace con la sesión del usuario y las políticas RLS de `supabase/migrations/002_portal.sql`
garantizan que solo ve los datos de su cliente (no puede escribir métricas, publicar informes ni cambiar el estado de
una incidencia). Compruébalo cuando quieras con `npm run test:db` (Postgres local, sin tocar Supabase).

En Supabase → Authentication → Sign In / Providers, **desactiva «Allow new users to sign up»**: las cuentas solo las
creáis vosotros.

### Dar de alta a un cliente

```bash
npm run client:add -- --empresa "Clínica Sol" --email ana@clinicasol.es --nombre "Ana Ruiz" --sector "Clínica o centro"
npm run client:list
```

Le llega un correo para crear su contraseña (si no hay SMTP, el enlace sale en pantalla). Para añadir otra persona al
mismo cliente, repite con su email y `--slug clinica-sol`.

### Subir datos

```bash
# Métricas diarias (se pueden resubir: sobrescribe por fecha + canal)
npm run data:import -- --cliente clinica-sol --archivo septiembre.csv --prueba   # valida sin escribir
npm run data:import -- --cliente clinica-sol --archivo septiembre.csv

# Texto del informe mensual (borrador; con --publicar lo ve el cliente)
npm run data:report -- --cliente clinica-sol --mes 2026-09 --archivo informe.md --publicar
```

Plantillas en `datos/plantillas/` (`metricas.csv`, `metricas-excel.csv` con «;» y coma decimal, `informe.md`).
Columnas: `fecha, canal, gasto, nota1…nota5, cerrados, facturacion`. El CPL, el CPL calificado, las tendencias y las
comparativas se calculan solos.

### Responder incidencias

Cada incidencia y cada mensaje del cliente llegan a `MAIL_TO`. Para contestar, en Supabase → Table Editor:
- `incident_messages`: nueva fila con `incident_id`, `is_team = true`, `author_name = "Equipo EDP"` y el texto.
- `incidents`: cambia `status` a `en_curso` o `resuelta`.

### Sin Supabase

Sin `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` el área de clientes no arranca (ni en desarrollo ni
en producción): hace falta un proyecto de Supabase real configurado con `npm run setup` o las variables de `.env.local`.

