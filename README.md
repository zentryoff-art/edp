# Estudio Digital Pro · web

Next.js 15. Web principal (`/`), landing de captación con reserva de llamadas de 20 minutos (`/llamada`) y Área Privada de Clientes (`/clientes`).

Todo se gestiona y almacena en **Firebase** (Cloud Firestore + Firebase Authentication + Cloud Storage) y los formularios se reenvían por **correo** a `info@estudiodigitalpro.com`.

## Puesta en marcha

Necesitas Node 20+ y tu configuración de Firebase en `.env`:

```bash
npm install
npm run setup
```

Comandos de desarrollo:

```bash
npm run dev            # http://localhost:3000 y /llamada
npm run build && npm start
```

## Arquitectura de Datos en Firestore

| Colección | Qué guarda |
| :--- | :--- |
| `bookings` | Reservas de llamada (tanto de la web como del área de clientes). |
| `contact_requests` | Solicitudes del formulario «Pide una auditoría» / contacto. |
| `blocked_dates` | Días sin llamadas (festivos nacionales y vacaciones). |
| `clients` | Empresas clientes dadas de alta. |
| `client_members` | Vinculación de usuarios de Firebase Auth con sus empresas cliente y roles. |
| `daily_metrics` | Métricas de rendimiento publicitario diario por canal (gasto, leads 1-5, ventas, facturación). |
| `reports` | Informes ejecutivos mensuales para cada cliente. |
| `incidents` / `incident_messages` | Centro de soporte, tickets y chat interactivo entre cliente y equipo. |

## Correos

- Cada **reserva** → aviso a `MAIL_TO` con los datos del lead + invitación `.ics`; el cliente recibe su confirmación con la invitación.
- Cada **solicitud de auditoría** → aviso a `MAIL_TO` (responder al correo contesta directamente al cliente).
- Avisos inmediatos de nuevas **incidencias** y respuestas de soporte.

Si el SMTP falla, los datos igualmente quedan guardados de forma segura en Firestore.

## Gestión desde la terminal

- `npm run client:add -- --empresa "Nombre" --email cliente@empresa.com --nombre "Responsable"`: Da de alta un nuevo cliente y su usuario.
- `npm run client:list`: Lista todos los clientes y miembros activos.
- `npm run data:import -- --cliente <slug> --archivo datos/mes.csv`: Importa métricas de Excel / CSV a Firestore.
- `npm run data:report -- --cliente <slug> --mes AAAA-MM --archivo informe.md --publicar`: Publica un informe mensual en el portal.
