# Plan de Diseño de Marca — EDP (Estudio Digital Pro)

> Objetivo: construir la identidad de marca **desde cero**, usando este documento como brief para trabajar con Claude (chat/artifacts) como asistente de diseño. **Nombre de marca único a partir de ahora: "EDP" / "Estudio Digital Pro"** — se retira "EtherCore" y cualquier otro nombre de todos los materiales de marca nuevos.

## 0. Regla de nombre (no negociable)
- Nombre corto / logotipo: **EDP**
- Nombre completo / legal-comercial: **Estudio Digital Pro**
- No usar: "EtherCore" ni combinaciones tipo "EDP / EtherCore" en ningún material nuevo (web, redes, PDFs, propuestas). Los documentos internos de este vault que aún mencionen EtherCore se pueden actualizar más adelante, pero **nada de cara al cliente** debe llevar ese nombre desde hoy.
- Dominio/handle de referencia: `estudiodigitalpro.com`.

## 1. Punto de partida (por qué diseñamos esto)
Según [[Plan de Empresa]] y [[Plan de Marketing]]: EDP es una agencia de **adquisición de clientes con IA aplicada a la calificación de leads**, hoy centrada en mudanzas/guardamuebles (Google LSA + Meta Ads), con intención de expandirse a verticales adyacentes de servicios locales. Hoy no existe identidad visual documentada — se parte literalmente de cero.

## 2. Estrategia de marca (brief antes del diseño)
Rellenar esto primero — es lo que le das a Claude como contexto antes de pedir cualquier logo o paleta.

### 2.1 Propuesta de valor (resumen de una frase)
"Leads ya filtrados y rentabilidad medible, no solo clics." *(ajustar si los socios prefieren otra formulación)*

### 2.2 Personalidad de marca (elegir 3-4 adjetivos, no más)
Cerrado como punto de partida para el brief a Claude:
- **Precisa** (datos, calificación, medible — "nota 1-5", CPL, nada ambiguo)
- **Tecnológica** (IA, automatización, sistemas propios — no "manualidad de agencia")
- **Directa** (sin humo, sin jerga vacía, resultados en cifras)

### 2.3 Lo que NO queremos transmitir
- Nada de estética "AI slop" (genérico, gradientes moradas de stock, robots clichés) — coherente con lo que ya se dice en [[../00 Inicio/Inicio|Inicio]] sobre evitar ese estilo.
- Nada de imaginería de "agencia de marketing" genérica (megáfonos, cohetes, iconos de flechas ascendentes de stock).

### 2.4 Referentes visuales
- **Marcas que nos gustan por tono/estética** (referencia de "tech precisa, sin ruido"):
  - Linear (linear.app) — minimalismo funcional, tipografía cuidada, un solo color de acento sobre neutros.
  - Stripe — sistema de color/tipografía sobrio que transmite fiabilidad técnica sin parecer "corporativo aburrido".
  - Vercel — paleta blanco/negro casi absoluta + un acento, geometría muy limpia (coherente con que ya usamos Vercel como stack).
- **Marcas que representan lo que NO queremos:**
  - Agencias de marketing genéricas con gradientes morado/azul de stock, iconos de cohete/megáfono y fotos de "gente feliz en oficina" de banco de imágenes.
  - Estética "SaaS de IA" genérica (ilustraciones 3D de robots, ondas neuronales moradas) — no aporta nada al mensaje de precisión y datos reales.
- **Nota:** estos son un punto de partida para el brief a Claude, no una decisión cerrada — ajustar si algún socio tiene otra referencia concreta antes de la sesión de brief.

## 3. Sistema visual a definir con Claude

### 3.1 Naming lockup / logotipo
- Versión principal: wordmark "EDP" (isotipo opcional simple, no obligatorio en fase 1).
- Versión secundaria: "Estudio Digital Pro" completo, para usos donde "EDP" solo genere confusión (ej. pie de página legal, contratos).
- Pedir a Claude 3-5 direcciones de wordmark en texto/descripción (Claude no genera imágenes finales de logo con precisión tipográfica — usar sus artifacts para bocetar en SVG simple/geométrico y afinar en una herramienta vectorial después, ej. Figma/Illustrator, con Ibai).

### 3.2 Paleta de color
- Definir 1 color primario (marca) + 1 color de acento (CTA/highlight) + neutros (fondo claro/oscuro, texto).
- Debe funcionar en modo claro y oscuro (reportes PDF, web, dashboards).
- Pedir a Claude propuestas en formato HEX + justificación (contraste, accesibilidad AA mínimo para texto sobre fondo).

### 3.3 Tipografía
- 1 tipografía para titulares (con carácter, no genérica) + 1 para texto/cuerpo (alta legibilidad, ideal variable font, gratuita/licenciable para web).
- Debe verse bien en: web, informes PDF, y creatividades de anuncios (Meta Ads).

### 3.4 Iconografía / estilo gráfico
- Estilo lineal o geométrico simple, coherente con "precisión + tecnología" (evitar 3D genérico o ilustraciones de stock).
- Definir cómo se representan visualmente los conceptos clave del negocio: "lead calificado", "nota 1-5", "automatización/IA", "resultados medibles".

### 3.5 Tono de voz (para copys, redes, web)
- Directo, sin jerga de marketing vacía, con datos/cifras cuando sea posible.
- Ejemplo de frase válida vs. inválida:
  - ✅ "Calificamos cada lead antes de que te cueste dinero."
  - ❌ "Revolucionamos tu estrategia digital con soluciones 360°."

## 4. Plan de trabajo con Claude (paso a paso)
1. **Sesión de brief:** pegar las secciones 2 y 3 de este documento en Claude y pedirle que las cuestione/mejore antes de generar nada visual (validar personalidad de marca y propuesta de valor primero).
2. **Naming lockup:** pedir 3-5 conceptos de wordmark "EDP" en SVG (artifact), variando geometría/peso, sin imagenería genérica.
3. **Paleta + tipografía:** pedir 2-3 paletas completas con muestras de uso (fondo claro, fondo oscuro, botón CTA) y 2-3 combinaciones tipográficas con ejemplos de titular + cuerpo.
4. **Mockups de aplicación:** pedir a Claude que monte artifacts HTML/CSS simples mostrando la marca aplicada a: portada de informe PDF, landing de estudiodigitalpro.com, plantilla de post LinkedIn.
5. **Selección y cierre:** los 3 socios votan/ajustan una dirección única antes de pasar a producción real (vectorización final con Ibai, ver [[../00 Inicio/Inicio|Inicio]] → "vectorización de identidades visuales").
6. **Manual de marca mínimo:** documentar la decisión final en este mismo archivo (sección 5) para que quede como fuente única de verdad.

## 5. Decisiones finales (rellenar cuando se cierre cada apartado)
- Logotipo final: 
- Paleta final (HEX): 
- Tipografías finales: 
- Tono de voz — 3 reglas fijas: 

## 6. Aplicaciones a actualizar una vez cerrada la marca
- [ ] Web estudiodigitalpro.com
- [ ] Plantilla de reportes ejecutivos PDF (ver [[Roles y Responsabilidades]] — responsable Ibai)
- [ ] Perfiles de redes (LinkedIn de empresa, ver [[Plan de Marketing]])
- [ ] Firma de email / plantillas de propuesta comercial
- [ ] Landing pages de clientes cuando lleven co-branding EDP (ej. `mudanzas-palma-web`)

## Seguimiento
- Revisar y cerrar este plan en una reunión dedicada (ver [[../02 Empresa/Reuniones/_Indice de Reuniones|Reuniones]]) antes de pasar a producción de assets definitivos.
