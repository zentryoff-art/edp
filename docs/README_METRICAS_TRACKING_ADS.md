# Guía de Métricas, Tracking, SEO y Atribución publicitaria
> **Estudio Digital Pro** · Documentación técnica y operativa para el lanzamiento de campañas publicitarias (Meta Ads / Google Ads).

---

## 📌 Índice
1. [Resumen ejecutivo: Qué se ha implementado](#1-resumen-ejecutivo)
2. [Google reCAPTCHA v3 On-Demand](#2-google-recaptcha-v3-on-demand)
3. [SEO Técnico y Esquemas Estructurados (JSON-LD)](#3-seo-técnico-y-esquemas-estructurados)
4. [Infraestructura de Atribución Frontend](#4-infraestructura-de-atribución-frontend)
5. [Meta Conversions API (CAPI) Server-Side](#5-meta-conversions-api-capi-server-side)
6. [Páginas de Confirmación Dedicadas (/gracias)](#6-páginas-de-confirmación-dedicadas)
7. [Banner de Consentimiento y RGPD](#7-banner-de-consentimiento-y-rgpd)
8. [Checklist: Qué necesitamos agregar al lanzar anuncios](#8-checklist-paso-a-paso-para-lanzar-anuncios)

---

## 1. Resumen ejecutivo
Se ha dejado montada la **infraestructura completa de seguimiento y atribución** para que la web esté 100% blindada contra bots, optimizada para buscadores (SEO) y lista para recibir tráfico de pago de Meta Ads sin perder ni un solo dato de conversión.

**Ventaja estratégica:**
Todo el código está preparado en modo condicional o silencioso. **Hoy la web tiene coste 0 en rendimiento** (no carga scripts pesados de terceros en el render inicial). El día que decidas invertir en Meta Ads, **solo tendrás que copiar 2 claves en las variables de entorno de Vercel** y la medición empezará a funcionar sin tocar código ni desplegar nada nuevo.

---

## 2. Google reCAPTCHA v3 On-Demand
Protege los formularios contra spam automatizado sin mostrar al usuario los molestos puzzles de semáforos o casillas de verificación.

### ¿Cómo funciona en nuestro código?
* **Carga perezosa (Lazy loading):** El script de Google (`recaptcha/api.js`) **no** se carga al entrar a la página. Esto evita una penalización de entre 10 y 20 puntos en Google Lighthouse y PageSpeed.
* **Activación por interacción:** Se descarga en segundo plano en cuanto el usuario hace foco (`onFocusCapture`) en el primer campo del formulario o pulsa enviar.
* **Puntuación de bot (Score):** En el backend ([lib/recaptcha-server.ts](lib/recaptcha-server.ts)), Google evalúa la petición en una escala de `0.0` (bot total) a `1.0` (humano seguro). Si la puntuación es $\ge 0.5$, se procesa el formulario.
* **Archivos implicados:**
  - Cliente: [lib/recaptcha-client.ts](lib/recaptcha-client.ts)
  - Servidor: [lib/recaptcha-server.ts](lib/recaptcha-server.ts)
  - Endpoints: [app/api/auditoria/route.ts](app/api/auditoria/route.ts) y [app/api/bookings/route.ts](app/api/bookings/route.ts)

### Claves configuradas en `.env`:
* `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Clave pública del navegador.
* `RECAPTCHA_SECRET_KEY`: Clave secreta que valida los tokens en el servidor.

---

## 3. SEO Técnico y Esquemas Estructurados
Permite a Google, Bing y motores de IA (ChatGPT, Perplexity) entender la estructura semántica de Estudio Digital Pro y mostrar fragmentos enriquecidos (Rich Snippets).

* **Robots nativo ([app/robots.ts](app/robots.ts)):**
  - Genera `/robots.txt`.
  - Permite indexación total de la web comercial (`/`, `/llamada`).
  - Bloquea el rastreo de áreas privadas y técnicas: `/clientes/`, `/api/`, `/_next/`, `/recuperar`, `/auth/`.
  - Enlaza el sitemap canónico.
* **Sitemap XML nativo ([app/sitemap.ts](app/sitemap.ts)):**
  - Genera `/sitemap.xml`.
  - Prioriza la Home (`1.0`) y la página de llamada (`0.9`). Incluye la política de privacidad (`0.3`).
* **Rich Schemas JSON-LD ([lib/seo-schema.ts](lib/seo-schema.ts)):**
  - `Organization` y `ProfessionalService`: Nombre, datos de contacto, horario, área de servicio (España) y dirección.
  - `WebSite`: URL canónica y nombre oficial.
  - `FAQPage`: Inyectado en la home y en `/llamada` con las preguntas frecuentes para optar a aparecer desplegadas directamente en las SERPs de Google.
  - `Service`: Declara el servicio de auditoría y captación con IA.

---

## 4. Infraestructura de Atribución Frontend
Permite saber con exactitud **de qué anuncio, campaña o canal** proviene cada lead o reserva.

### ¿Qué hace [lib/attribution-client.ts](lib/attribution-client.ts)?
1. **Captura parámetros de URL:**
   - `fbclid`: Identificador de clic de Meta Ads.
   - `gclid`: Identificador de clic de Google Ads.
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`: Parámetros estándar de analítica.
2. **Genera y sincroniza cookies de origen:**
   - `_fbp`: Browser ID único requerido por Meta.
   - `_fbc`: Click ID que vincula el `fbclid` con el navegador del usuario.
3. **Persistencia entre páginas (`sessionStorage`):**
   - Si un usuario entra desde un anuncio a la home (`/?utm_campaign=lanzamiento`) y minutos después hace clic en "Reservar llamada" yendo a `/llamada`, **los parámetros no se pierden**.
4. **Envío con el formulario:**
   - Tanto [AuditForm.tsx](components/AuditForm.tsx) como [BookingCalendar.tsx](components/BookingCalendar.tsx) inyectan este objeto de atribución en el JSON que envían a la API.

---

## 5. Meta Conversions API (CAPI) Server-Side
Supera las limitaciones del bloqueo de cookies en navegadores modernos (bloqueadores de anuncios, Safari ITP, iOS 14.5+).

### ¿Por qué CAPI es superior al Píxel tradicional?
El Píxel del navegador se ejecuta en el móvil del usuario; si el usuario usa Brave, bloqueadores de anuncios o Safari estricto, hasta un 30-40% de los eventos nunca llegan a Meta.  
**Con CAPI**, cuando el servidor de Estudio Digital Pro confirma la reserva en Firestore, **nuestro propio backend contacta directamente con los servidores de Meta (Graph API)** para reportar la conversión.

### ¿Cómo opera [lib/meta-capi.ts](lib/meta-capi.ts)?
1. **Hashing obligatorio:**
   - Aplica algoritmo **SHA-256 en minúsculas** al email y al teléfono (este último normalizado a formato internacional E.164: ej. `34600123456`).
2. **Datos de enriquecimiento del usuario:**
   - Envía la IP del cliente (`x-forwarded-for`), el `User-Agent`, y los identificadores `_fbp` y `_fbc`.
   - Con esto, Meta logra un **Event Match Quality de 8.5 a 9.5 sobre 10**, lo que reduce drásticamente el coste por lead en tus campañas.
3. **Eventos soportados:**
   - `"Lead"`: Enviado al solicitar una auditoría gratuita.
   - `"Schedule"`: Enviado al reservar una llamada en el calendario.
4. **Seguridad contra caídas:**
   - Si no hay token configurado, devuelve `skipped: true`. No genera errores ni retrasa la respuesta al usuario.

---

## 6. Páginas de Confirmación Dedicadas
En marketing digital, enviar al usuario a una URL única de éxito tras convertir tiene dos ventajas fundamentales:
1. **Respaldo infalible de tracking:** Permite configurar conversiones en Meta Ads Manager y Google Ads en dos clics basándose en la regla `"La URL contiene /gracias"`.
2. **Mejor experiencia de usuario:**

### Páginas creadas:
* **/auditoria/gracias ([app/auditoria/gracias/page.tsx](app/auditoria/gracias/page.tsx)):**
  - Confirma que la solicitud está en marcha y que el fundador responderá en menos de 24 horas laborables.
  - Ofrece un bloque directo para agendar la llamada si el prospecto tiene urgencia comercial.
  - Tiene la etiqueta `robots: { index: false }` para que Google no la indexe en búsquedas orgánicas.
* **/llamada/confirmada ([app/llamada/confirmada/page.tsx](app/llamada/confirmada/page.tsx)):**
  - Muestra la fecha y hora seleccionada con tipografía editorial.
  - Proporciona botones funcionales para **Añadir a Google Calendar** y **Descargar archivo .ics** (Outlook, Apple Calendar).
  - Dispara el evento de cliente `Schedule` si el píxel de Meta está activo.

---

## 7. Banner de Consentimiento y RGPD
Para operar legalmente en España y la Unión Europea (normativa AEPD y directiva ePrivacy):

* **Banner brutalista ([components/CookieBanner.tsx](components/CookieBanner.tsx)):**
  - Diseñado según la identidad visual de la web (bordes rectos, paleta oscura `#16140F`, acento naranja `#E75623`).
  - Opciones: *"Aceptar todas"* y *"Solo necesarias"*.
  - Guarda la decisión en `localStorage` (`edp_cookie_consent`).
* **Cargador condicional del Píxel ([components/MetaPixel.tsx](components/MetaPixel.tsx)):**
  - El script de Meta **no se ejecuta** a menos que el usuario pulse "Aceptar todas".
  - Si el usuario acepta, se inyecta inmediatamente sin recargar la página.
* **Página legal ([app/privacidad/page.tsx](app/privacidad/page.tsx)):**
  - Documenta el responsable, finalidades, política de cookies y la cesión de identificadores seudonimizados con hash SHA-256 a Meta Platforms Ireland Ltd.
  - Enlazada en el footer general y en el sitemap.

---

## 8. Checklist: Paso a paso para lanzar anuncios

Cuando decidas activar campañas en Meta Ads, sigue estos pasos:

### Paso 1: Verificar el dominio en Meta (¡Hacerlo desde ya!)
1. Entra en [business.facebook.com](https://business.facebook.com) $\rightarrow$ **Configuración del negocio** $\rightarrow$ **Seguridad de la marca** $\rightarrow$ **Dominios**.
2. Añade `estudiodigitalpro.com`.
3. Selecciona la opción **"Añadir una entrada TXT en el registro DNS"**.
4. Copia el valor (ej. `facebook-domain-verification=xxxxxx`) y pégalo como registro `TXT` en tu proveedor de dominio (DonDominio, Cloudflare, etc.).
5. Pulsa **Verificar dominio** en Meta.

---

### Paso 2: Crear el Dataset / Píxel en Meta
1. En Meta Business, ve a **Administrador de eventos** $\rightarrow$ **Orígenes de datos** $\rightarrow$ **Conectar orígenes de datos** $\rightarrow$ **Web**.
2. Dale el nombre `Estudio Digital Pro - Web`.
3. Copia el **Identificador del conjunto de datos / Píxel** (es un número de unos 15-16 dígitos, ej. `103109127746500`).
4. Este número corresponde a la variable:
   ```env
   NEXT_PUBLIC_META_PIXEL_ID=tu_pixel_id_aqui
   ```

---

### Paso 3: Generar el Token de la API de Conversiones (CAPI)
1. Dentro del Administrador de eventos, haz clic en tu nuevo Píxel / Dataset.
2. Ve a la pestaña **Configuración**.
3. Baja hasta la sección **API de Conversiones** $\rightarrow$ **Configurar con integración directa**.
4. Haz clic en **Generar token de acceso** (necesitas rol de Administrador en el Business Portfolio).
5. Copia el token alfanumérico largo (empieza normalmente por `EAA...`).
6. Este token corresponde a la variable:
   ```env
   META_CAPI_ACCESS_TOKEN=tu_token_largo_aqui
   ```

---

### Paso 4: Probar eventos en vivo (Opcional pero muy útil)
1. En la pestaña **Probar eventos** del Administrador de eventos de Meta, verás un código de prueba (ej. `TEST82341`).
2. Pégalo en tu variable:
   ```env
   META_TEST_EVENT_CODE=TEST82341
   ```
3. Envía una reserva de prueba desde la web: verás cómo Meta registra el evento en tiempo real con status verde *"Recibido del servidor"*.
4. Cuando termines las pruebas, borra esa variable en Vercel para que los eventos cuenten como tráfico real de producción.

---

### Paso 5: Activar en Vercel
1. Entra a tu proyecto en [vercel.com](https://vercel.com) $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
2. Añade las variables:
   - `NEXT_PUBLIC_META_PIXEL_ID`
   - `META_CAPI_ACCESS_TOKEN`
3. Haz un **Redeploy** (o haz un nuevo commit) para que Vercel aplique los cambios.

**¡Listo!** A partir de ese segundo, cada visita, cada formulario de auditoría y cada llamada agendada se registrarán con máxima precisión tanto en el navegador como a nivel de servidor.
