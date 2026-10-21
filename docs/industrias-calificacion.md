# Mapeo de Nichos para Calificación de Leads (Estudio Digital Pro)

Este documento contiene la base de conocimiento y correspondencia de nichos/industrias para adaptar las tarjetas de calificación de leads en la PWA de clientes, manteniendo inalterada la lógica de señales hacia Google Ads LSA, Meta Ads CAPI y la automatización con Playwright en el VPS.

---

## 1. Reformas Integrales / Construcción

### Descartes Claros (4 botones)
- **Descarte 1 (`spam_empleo`)**: 🚫 **Spam / Empleo / Ofertas** — Llamadas comerciales, venta de software/materiales o gente buscando trabajo en obra.
- **Descarte 2 (`fuera_zona`)**: 📍 **Fuera de Cobertura** — Ubicaciones fuera del radio operativo o en municipios no cubiertos.
- **Descarte 3 (`porte_bulto`)**: 🔨 **Manitas / Chapuza puntual** — Reparaciones mínimas (colgar cuadros, sellar una silicona o cambiar una baldosa suelta).
- **Descarte 4 (`furgoneta`)**: 📦 **Solo Mano de Obra / Bricolaje** — Petición de peones por horas o clientes que quieren poner ellos todo el material y solo buscan jornaleros.

### Servicios Principales (4 botones)
- **Servicio Pequeño (`servicio_pequeno` / `mudanza_pequena`)**: 🚿 **Reforma de Baño o Cocina**
- **Servicio Mediano (`servicio_mediano` / `mudanza_mediana`)**: 🏠 **Reforma Parcial (2 o más estancias / Suelos y carpintería)**
- **Servicio Grande (`servicio_grande` / `mudanza_grande`)**: 🏡 **Reforma Integral de Vivienda (Piso completo o chalet)**
- **Comercial / B2B (`comercial`)**: 🏢 **Locales Comerciales, Oficinas o Portales de Comunidad**

### Modificadores de Valor / Extras (3 toggles On/Off)
- **Toggle 1 (`has_storage`)**: 📐 **+ Incluye Proyecto / Interiorismo / Gestión de Licencias**
- **Toggle 2 (`has_elevator`)**: 🏗️ **+ Demolición Estructural / Movimiento de Tabiques de Carga**
- **Toggle 3 (`is_national`)**: 🏰 **+ Vivienda Unifamiliar / Obra de Gran Metraje (+150 m²)**

---

## 2. Fontanería / Desatascos

### Descartes Claros (4 botones)
- **Descarte 1 (`spam_empleo`)**: 🚫 **Spam / Telemarketing / Empleo** — Venta de herramientas, ofertas de directorio o candidatos a fontanero.
- **Descarte 2 (`fuera_zona`)**: 📍 **Fuera de Zona** — Dirección fuera del área de servicio o provincia no atendida.
- **Descarte 3 (`porte_bulto`)**: 🔧 **Reparación Mínima / Sin Margen** — Cambio de una junta de goma, zapatilla de grifo o arreglo de 20 €.
- **Descarte 4 (`furgoneta`)**: 🔍 **Solo Consultoría / Peritaje** — Llamadas para pedir diagnósticos gratis por teléfono o informes para seguros sin contratación.

### Servicios Principales (4 botones)
- **Servicio Pequeño (`servicio_pequeno` / `mudanza_pequena`)**: 🚰 **Grifería, Sanitarios o Fuga Menor Visible**
- **Servicio Mediano (`servicio_mediano` / `mudanza_mediana`)**: 🌀 **Desatasco General / Fuga Oculta con Localizador**
- **Servicio Grande (`servicio_grande` / `mudanza_grande`)**: 🔄 **Renovación Completa de Tuberías / Bajantes**
- **Comercial / B2B (`comercial`)**: 🏢 **Comunidades de Propietarios, Hostelería o Naves**

### Modificadores de Valor / Extras (3 toggles On/Off)
- **Toggle 1 (`has_storage`)**: 🛡️ **+ Contrato de Mantenimiento Preventivo (B2B / Comunidad)**
- **Toggle 2 (`has_elevator`)**: 🚨 **+ Servicio Urgente 24h / Camión Cuba de Alta Presión**
- **Toggle 3 (`is_national`)**: 🏗️ **+ Obra Civil / Sustitución de Acometida Principal**

---

## 3. Electricistas / Instalaciones

### Descartes Claros (4 botones)
- **Descarte 1 (`spam_empleo`)**: 🚫 **Spam / Publicidad / Empleo** — Comercializadoras de luz vendiendo tarifas, distribuidores o currículums.
- **Descarte 2 (`fuera_zona`)**: 📍 **Fuera de Radio** — Poblaciones lejanas no rentables para desplazamiento de instaladores.
- **Descarte 3 (`porte_bulto`)**: **Mecanismo / Manitas** — Colgar una lámpara sencilla o cambiar un mecanismo/interruptor suelto.
- **Descarte 4 (`furgoneta`)**: 📺 **Reparación de Aparatos** — Averías internas de televisores, ordenadores o electrodomésticos (SAT de electrónica).

### Servicios Principales (4 botones)
- **Servicio Pequeño (`servicio_pequeno` / `mudanza_pequena`)**: 🔌 **Reparación de Avería / Cortocircuito / Punto Eléctrico**
- **Servicio Mediano (`servicio_mediano` / `mudanza_mediana`)**: ⚡ **Cuadro Eléctrico / Boletín (CIE) / Aumento de Potencia**
- **Servicio Grande (`servicio_grande` / `mudanza_grande`)**: 🏠 **Recableado Completo de Vivienda / Instalación Integral**
- **Comercial / B2B (`comercial`)**: 🏢 **Naves Industriales, Comercios o Alumbrado Comunitario**

### Modificadores de Valor / Extras (3 toggles On/Off)
- **Toggle 1 (`has_storage`)**: 🔋 **+ Instalación de Punto de Recarga Vehículo Eléctrico (VE)**
- **Toggle 2 (`has_elevator`)**: 🚨 **+ Intervención Urgente / Guardia Nocturna**
- **Toggle 3 (`is_national`)**: ☀️ **+ Integración con Fotovoltaica / Baterías / Domótica**

---

## 4. Climatización (Aire Acondicionado / Aerotermia / Calefacción)

### Descartes Claros (4 botones)
- **Descarte 1 (`spam_empleo`)**: 🚫 **Spam / Proveedores / Empleo** — Venta de repuestos B2B, marketing o técnicos buscando empleo.
- **Descarte 2 (`fuera_zona`)**: 📍 **Fuera de Cobertura** — Avisos fuera de la provincia o del perímetro de actuación.
- **Descarte 3 (`porte_bulto`)**: 🧽 **Limpieza Básica de Filtros** — Operaciones de mantenimiento menor sin avería ni instalación.
- **Descarte 4 (`furgoneta`)**: 🚗 **Carga de Aire para Coches** — Talleres mecánicos o aire acondicionado de vehículos (fuera de edificación).

### Servicios Principales (4 botones)
- **Servicio Pequeño (`servicio_pequeno` / `mudanza_pequena`)**: ❄️ **Reparación de Avería / Recarga de Gas / Mantenimiento**
- **Servicio Mediano (`servicio_mediano` / `mudanza_mediana`)**: 🌬️ **Instalación 1x1 / Sustitución de Caldera Mural**
- **Servicio Grande (`servicio_grande` / `mudanza_grande`)**: 🏠 **Sistema Multisplit / Conductos en Toda la Vivienda**
- **Comercial / B2B (`comercial`)**: 🏢 **Climatización de Oficinas, Locales o Edificios**

### Modificadores de Valor / Extras (3 toggles On/Off)
- **Toggle 1 (`has_storage`)**: 📄 **+ Plan de Mantenimiento Anual / Revisión Oficial RITE**
- **Toggle 2 (`has_elevator`)**: 🧗 **+ Trabajo en Altura / Descolgado / Grúa para Condensadora**
- **Toggle 3 (`is_national`)**: ♨️ **+ Proyecto Completo de Aerotermia con Suelo Radiante**

---

## 5. Pintura y Rehabilitación de Fachadas

### Descartes Claros (4 botones)
- **Descarte 1 (`spam_empleo`)**: 🚫 **Spam / Comercial / Empleo** — Fabricantes de pintura vendiendo catálogo o pintores buscando trabajo.
- **Descarte 2 (`fuera_zona`)**: 📍 **Ubicación Lejana** — Trabajos fuera de la zona metropolitana o comarca cubierta.
- **Descarte 3 (`porte_bulto`)**: 🖌️ **Retoque** — Repasar un arañazo, pintar una puerta suelta o tapar 2 agujeros de taco.
- **Descarte 4 (`furgoneta`)**: 🪑 **Lacado de Muebles Sueltos** — Peticiones de restauración de mobiliario antiguo (taller/ebanistería).

### Servicios Principales (4 botones)
- **Servicio Pequeño (`servicio_pequeno` / `mudanza_pequena`)**: 🚪 **Habitación Suelta / Alisado de Zona Puntual**
- **Servicio Mediano (`servicio_mediano` / `mudanza_mediana`)**: 🎨 **Pintura Integral de Piso / Quitar Gotelé**
- **Servicio Grande (`servicio_grande` / `mudanza_grande`)**: 🏡 **Pintura Completa de Chalet (Interior + Exterior)**
- **Comercial / B2B (`comercial`)**: 🏢 **Comunidad de Vecinos / Fachada / Nave Industrial**

### Modificadores de Valor / Extras (3 toggles On/Off)
- **Toggle 1 (`has_storage`)**: 🛡️ **+ Tratamiento Antihumedades / Impermeabilización de Terrazas**
- **Toggle 2 (`has_elevator`)**: 🏗️ **+ Montaje de Andamios / Trabajos Verticales con Cuerda**
- **Toggle 3 (`is_national`)**: 🧱 **+ Aislamiento Térmico Exterior (SATE) / Fachada Completa**
