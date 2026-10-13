# Manual de Operaciones: Onboarding y Alta de Clientes

Este documento describe el procedimiento oficial para dar de alta nuevas empresas y usuarios en el **Área de Clientes** de Estudio Digital Pro (`/clientes`), así como el flujo de primer acceso y configuración de la PWA en sus dispositivos.

---

## 1. Filosofía de Acceso y Arquitectura Multi-Tenant

El portal de clientes es **estrictamente privado y por invitación**:
- **Sin auto-registro público:** Ningún usuario externo puede registrarse por su cuenta desde la web pública.
- **Aislamiento multi-empresa:** Cada cliente cuenta con su propio identificador (`clientId`), y sus datos (métricas, leads, informes y suscripciones push) están completamente aislados en Firestore.
- **Mapeo de accesos:** La relación entre un usuario autenticado y una o más empresas se gestiona en la colección `/client_members/{userId}_{clientId}`.

---

## 2. Procedimiento de Alta (Comando Automatizado)

El repositorio incluye el script `scripts/client.mjs`, que orquesta en un solo paso la creación en Firestore y en Firebase Authentication.

### A. Dar de alta una nueva empresa con su propietario

Para dar de alta una pyme y su usuario principal con rol de propietario (`owner`), ejecuta en la terminal del proyecto:

```bash
npm run client:add -- --empresa "Clínica Dental Sol" --email "doctor@clinicasol.es" --nombre "Ana Ruiz" --sector "Clínica dental"
```

#### Parámetros disponibles:
| Parámetro | Requerido | Descripción | Ejemplo |
|:---|:---:|:---|:---|
| `--empresa` | Sí | Nombre oficial o comercial de la empresa. | `"Clínica Dental Sol"` |
| `--email` | Sí | Correo electrónico de acceso del cliente. | `"doctor@clinicasol.es"` |
| `--nombre` | Opcional | Nombre y apellidos de la persona de contacto. | `"Ana Ruiz"` |
| `--sector` | Opcional | Sector o especialidad comercial de la pyme. | `"Clínica dental"`, `"Mudanzas"` |
| `--slug` | Opcional | Identificador legible en URL (se deduce automáticamente si se omite). | `clinica-dental-sol` |
| `--rol` | Opcional | Rol de permisos: `owner` (por defecto) o `member`. | `owner` |

### B. Añadir un usuario o empleado adicional a una empresa existente

Si la empresa ya está registrada en el sistema y solo deseas dar acceso a otra persona de su equipo (con rol `member`), ejecuta el mismo comando indicando el nombre exacto de la empresa o su slug:

```bash
npm run client:add -- --empresa "Clínica Dental Sol" --email "recepcion@clinicasol.es" --nombre "Carlos Gómez" --rol member
```

---

## 3. ¿Qué ocurre internamente durante el alta?

En menos de dos segundos, el script ejecuta cuatro operaciones sincronizadas:

1. **Alta del Cliente en Firestore (`/clients`):**
   Crea o recupera el documento con su `name`, `slug`, `sector` y marca temporal `created_at`.
2. **Alta de Credenciales en Firebase Authentication:**
   Crea el usuario en Firebase Auth con su `email` y `displayName`. Si el email ya existía previamente en Firebase, reutiliza su UID sin provocar errores.
3. **Vinculación de Membresía (`/client_members`):**
   Genera un documento con identificador determinista `${user.uid}_${clientDoc.id}`, guardando:
   ```json
   {
     "user_id": "abc123Uid",
     "client_id": "clinica-dental-sol",
     "full_name": "Ana Ruiz",
     "role": "owner",
     "created_at": "2026-10-13T10:00:00.000Z"
   }
   ```
4. **Generación del Enlace Seguro de Primer Acceso:**
   El script solicita a Firebase un token criptográfico de establecimiento de contraseña (`generatePasswordResetLink`) y lo imprime en la consola:
   ```text
   Enlace para crear contraseña: https://edp-area-de-clientes.firebaseapp.com/__/auth/action?mode=resetPassword&...
   ```

---

## 4. Flujo de Activación para el Cliente (Paso a Paso)

Una vez completado el alta en consola:

1. **Entrega de la invitación:**
   Copia el enlace de contraseña generado y envíaselo al cliente (por WhatsApp, email corporativo o mensaje de bienvenida).
2. **Definición de clave:**
   El cliente abre el enlace en su móvil o navegador, escribe la contraseña que elija y pulsa *Guardar*.
3. **Inicio de sesión en el Portal:**
   El cliente accede a [estudiodigitalpro.com/clientes](https://estudiodigitalpro.com/clientes) (o `http://localhost:3000/clientes` en desarrollo) e introduce su email y la contraseña que acaba de crear.
4. **Instalación de la PWA en el teléfono:**
   - **Android (Chrome):** El navegador mostrará automáticamente el aviso de instalación o el cliente puede pulsar el menú `⋮` → **«Instalar aplicación»**.
   - **iPhone / iOS (Safari):** El cliente pulsa el botón Compartir (icono de cuadrado con flecha hacia arriba `⎙`) → **«Añadir a pantalla de inicio»**.
5. **Activación de Avisos de Nuevos Leads:**
   Al entrar en la sección **Leads**, verá el banner de notificaciones push. Solo debe pulsar **«Activar en este móvil»** y conceder el permiso del sistema operativo. A partir de ese momento, cada lead que inyecte Hermes hará sonar su teléfono inmediatamente.

---

## 5. Auditoría y Listado de Clientes Activos

Para auditar en cualquier momento qué empresas están configuradas y qué usuarios tienen acceso a cada una:

```bash
npm run client:list
```

#### Salida de ejemplo:
```text
Clínica Dental Sol  (clinica-dental-sol)  Clínica dental
  · Ana Ruiz <doctor@clinicasol.es>  owner
  · Carlos Gómez <recepcion@clinicasol.es>  member

Mudanzas JG  (jg)  Mudanzas
  · Javier Gómez <gerencia@mudanzasjg.es>  owner
```

---

## 6. Resolución de Incidencias Frecuentes

### ¿El cliente ha olvidado su contraseña?
No es necesario volver a ejecutar ningún script. El cliente solo tiene que entrar en la pantalla de login ([/clientes/login](https://estudiodigitalpro.com/clientes/login)), hacer clic en **«¿Has olvidado tu contraseña?»** ([/clientes/recuperar](https://estudiodigitalpro.com/clientes/recuperar)) e indicar su email. Firebase Auth le enviará un correo con un nuevo enlace de recuperación.

### ¿Un usuario debe tener acceso a varias empresas?
El sistema lo soporta de forma nativa. Si ejecutas `client:add` con el mismo email para dos empresas distintas (ej. `empresa-a` y `empresa-b`), el usuario dispondrá de un selector desplegable (*ClientSwitcher*) en la barra superior del portal para alternar entre ambas empresas al instante.
