# Arquitectura y Pipeline: Calificación, Cierre y Sincronización (Web ↔ Firestore ↔ VPS Hermes)

Esta guía documenta el funcionamiento integral del sistema para que cualquier desarrollador comprenda el flujo de datos entre la plataforma web (Next.js), la base de datos (Google Cloud Firestore) y los workers automatizados en el VPS (`hermesbot`).

---

## 1. Topología de Colecciones en Firestore

Cada empresa cliente registrada en el área privada (`palma`, `shalom`, `jg`) posee sub-colecciones segmentadas por canal publicitario:

```text
/clients/{clientId}/
    ├── leads_lsa/{leadId}        # Leads provenientes de Google Local Services Ads (LSA)
    └── leads_meta/{leadId}       # Leads captados a través de Meta Ads (Facebook/Instagram)
```

- **ID de Clientes Actuales:**
  - `palma` (Mudanzas Palma)
  - `shalom` (Mudanzas Shalom)
  - `jg` (Mudanzas JG)
- **Control de Acceso Multi-Cliente:**
  - Definido en `/client_members/{userId}_{clientId}`.
  - El usuario activo conmuta entre clientes mediante la cookie `portal_client_id`, cargando dinámicamente sus respectivas subcolecciones.

---

## 2. Ciclo de Vida y Pipeline de un Lead

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Operador en la Web
    participant Web as Portal Web (Next.js)
    participant DB as Firestore DB
    participant Hermes as Worker VPS (Hermes)
    participant APIs as Google Ads LSA / Meta CAPI

    Note over Hermes,DB: Inyección de leads en tiempo real
    Hermes->>DB: Crea doc en /clients/{clientId}/leads_lsa/{id} (status: "activo")
    DB-->>Web: Evento reactivo onSnapshot actualiza la interfaz

    Note over Usuario,Web: Calificación Interoperable
    Usuario->>Web: Selecciona servicio + modificadores de valor (Bloques A, B, C)
    Web->>Web: computeLeadSignals() deduce señales oficiales LSA/Meta y rating (1-5)
    Usuario->>Web: Clic en "Guardar en Conversación" o "Marcar Rechazo"
    Web->>DB: updateLeadAction(): Actualiza doc + sync.api_status = "pending"

    Hermes->>DB: Worker escucha sync.api_status == "pending"
    Hermes->>APIs: Califica conversión vía Google Ads LSA API / Meta Graph API
    Hermes->>DB: Marca sync.api_status = "done"

    Note over Usuario,Web: Cierre Operativo Final
    Usuario->>Web: Marca "Venta Cerrada" (con importe real en €) o "Rechazado"
    Web->>DB: updateLeadAction(): Actualiza status = "cerrado", sync.playwright_status = "pending"
    Hermes->>DB: Worker detecta sync.playwright_status == "pending"
    Hermes->>APIs: Automatización Playwright ejecuta cierre operativo (archive / booked)
    Hermes->>DB: Marca sync.playwright_status = "done"
```

---

## 3. Estructura del Documento Lead en Firestore

Cuando la web califica o cierra un lead, actualiza el documento con la siguiente estructura estricta:

```typescript
{
  // 1. Datos operativos y contacto
  "id": "lsa_335433531",
  "client_id": "jg",
  "channel": "google_lsa",          // "google_lsa" | "meta_ads"
  "status": "en_conversacion",       // "activo" | "en_conversacion" | "cerrado" | "rechazado"
  "contact_name": "Carlos Mendoza",
  "phone": "+34600000000",
  "created_at": "2026-03-12T10:18:00Z",

  // 2. Hechos operativos registrados por el usuario
  "qualification": {
    "service": "mudanza_mediana",   // Servicio base
    "has_storage": true,            // Toggle Guardamuebles
    "has_elevator": false,          // Toggle Elevador / Grúa
    "is_national": true,            // Toggle Mudanza Nacional
    "price_range": "500_1000",      // "<250" | "250_500" | "500_1000" | "+1000" | null
    "status": "en_conversacion",    // "en_conversacion" | "venta" | "rechazado"
    "sale_amount": null,            // Importe monetario cerrado en € (solo si status === "venta")
    "qualified_at": "2026-10-01T12:00:00Z"
  },

  // 3. Señales deducidas automáticamente por el motor
  "score": 5,                       // Rating algorítmico interno (1 a 5)
  "computed_signals": {
    "internal_rating": 5,
    "lsa_sentiment": "VERY_SATISFIED",   // Enum oficial Google Ads LSA
    "lsa_reason": "HIGH_VALUE_SERVICE",  // Enum oficial Google Ads LSA
    "meta_event": "QualifiedLead",       // Enum oficial Meta CAPI
    "meta_value": null,                  // Valor en € para Meta ROAS (solo compras reales)
    "playwright_action": null            // "archive" | "booked" | null (solo al cerrar)
  },

  // 4. Cola de sincronización para el worker Hermes en el VPS
  "sync": {
    "api_status": "pending",        // "pending" -> Hermes califica vía API -> "done"
    "playwright_status": null       // Permanece null hasta el cierre definitivo ("pending" -> "done")
  }
}
```

---

## 4. Matriz de Deducción y Reglas de Negocio Específicas

El archivo `lib/portal/qualification.ts` centraliza las reglas algorítmicas:

### A. Descartes Claros (Incompatibilidad Universal)
Aplica a cualquier lead que sea:
- **`spam_empleo`** (LSA: `SOLICITATION` / Meta: `DisqualifiedLead` / Rating: **1**)
- **`fuera_zona`** (LSA: `GEO_MISMATCH` / Meta: `DisqualifiedLead` / Rating: **1**)
- **`porte_bulto`** o **`furgoneta`** (LSA: `JOB_TYPE_MISMATCH` / Meta: `DisqualifiedLead` / Rating: **1**)

> **Regla UI:** Bloquea de inmediato el estado comercial a **Rechazado** e impide guardar en "En Conversación" o "Venta".

### B. Reglas Particulares por Cliente

1. **Mudanzas con Elevador / Grúa (`has_elevator: true`):**
   - **`palma`:** Cuenta con maquinaria propia. Es considerado **servicio de alto valor** (`VERY_SATISFIED`, `HIGH_VALUE_SERVICE`, Rating: **5**).
   - **`jg` y `shalom`:** No disponen de elevador propio. Cualquier lead con elevador se negativiza automáticamente a **Rating 1** (`JOB_TYPE_MISMATCH`, `VERY_DISSATISFIED`, `DisqualifiedLead`) y se fija como **Rechazado**.

2. **Mudanzas Nacionales (`is_national: true`):**
   - **`palma` y `jg`:** Operan a nivel nacional. Suma valor máximo a la calificación (`VERY_SATISFIED`, `HIGH_VALUE_SERVICE`, Rating: **5**).
   - **`shalom`:** Únicamente opera en ámbito local/regional. Toda mudanza nacional se negativiza automáticamente a **Rating 1** (`GEO_MISMATCH`, `VERY_DISSATISFIED`, `DisqualifiedLead`) y se fija como **Rechazado**.

---

## 5. Protocolo de Sincronización con el VPS (Worker Hermes)

Para evitar colisiones entre la API de Google Ads y la automatización por navegador (Playwright), el pipeline divide la sincronización en dos fases explícitas:

1. **Fase 1: Calificación Preliminar (API)**
   - Ocurre mientras el lead está en estado `en_conversacion` o descarte temprano.
   - La web escribe `sync.api_status: "pending"`.
   - Hermes procesa la calificación de satisfacción (`lsa_sentiment` / `lsa_reason`) enviando la solicitud HTTP contra la **Google Ads LSA API** / **Meta Graph API**, y concluye marcando `sync.api_status: "done"`.
   - `sync.playwright_status` permanece como `null`.

2. **Fase 2: Cierre Definitivo (Playwright)**
   - Ocurre cuando el operador resuelve el lead a `venta` (reserva cerrada) o `rechazado` (archivo definitivo).
   - La web actualiza `status` a `"cerrado"` (o `"rechazado"`) y activa `sync.playwright_status: "pending"`.
   - El script de Playwright en el VPS toma la tarea, abre la consola publicitaria correspondiente, archiva o marca como "Booked" el lead según `computed_signals.playwright_action`, y concluye actualizando `sync.playwright_status: "done"`.
