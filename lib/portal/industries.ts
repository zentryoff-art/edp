import type { QualificationServiceKey } from "./types";

export interface IndustryServiceItem {
  key: QualificationServiceKey;
  label: string;
  description: string;
  isDiscard: boolean;
}

export interface IndustryModifierItem {
  key: "has_addon" | "requires_special_equipment" | "is_large_scale";
  legacyKey: "has_storage" | "has_elevator" | "is_national";
  label: string;
  description: string;
  capabilityField?: "has_elevator" | "accepts_national";
}

export interface IndustryConfig {
  id: string;
  name: string;
  discardsTitle: string;
  servicesTitle: string;
  discards: IndustryServiceItem[];
  services: IndustryServiceItem[];
  modifiers: IndustryModifierItem[];
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  mudanzas: {
    id: "mudanzas",
    name: "Mudanzas y Transportes",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Mudanza",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Llamadas comerciales, venta o búsqueda de empleo.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Ubicación o trayecto no cubierto por la operativa.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Porte / 1 Bulto",
        description: "Traslado menor de 1 o pocos objetos sin entidad de mudanza.",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "Furgoneta",
        description: "Portes ligeros o alquiler con conductor.",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Mudanza Pequeña",
        description: "Estudios o viviendas de 1 habitación.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Mudanza Mediana",
        description: "Pisos habituales de 2 a 3 habitaciones.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Mudanza Grande",
        description: "Chalets y pisos grandes de 4+ habitaciones.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Comercial",
        description: "Oficinas, locales comerciales, empresas, naves o despachos.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Guardamuebles",
        description: "Custodia y depósito temporal de mobiliario.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Elevador / Grúa",
        description: "Requiere maquinaria elevadora para fachadas.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Mudanza Nacional",
        description: "Traslado interurbano de larga distancia.",
        capabilityField: "accepts_national",
      },
    ],
  },

  reformas: {
    id: "reformas",
    name: "Reformas y Construcción",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Reforma",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Venta de materiales o peones buscando trabajo.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Ubicación fuera del radio de desplazamiento habitual.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Manitas / Parche",
        description: "Reparaciones mínimas (colgar cuadros, sellados o baldosas).",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "Solo Mano de Obra",
        description: "Petición de peones o jornaleros sin encargar obra.",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Baño o Cocina",
        description: "Reforma puntual de una sola estancia húmeda.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Reforma Parcial",
        description: "2 o más estancias, carpintería, suelos o fontanería.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Reforma Integral",
        description: "Piso completo, vivienda o chalet unifamiliar.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Comercial / Local",
        description: "Oficinas, locales, naves o comunidades de vecinos.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Proyecto / Licencias",
        description: "Incluye diseño técnico, interiorismo o licencias.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Obra Estructural",
        description: "Tabiques de carga, apeos o demolición pesada.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Gran Metraje (+150 m²)",
        description: "Chalets o proyectos de gran envergadura.",
        capabilityField: "accepts_national",
      },
    ],
  },

  fontaneria: {
    id: "fontaneria",
    name: "Fontanería y Desatascos",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Fontanería",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Publicidad de herramientas o búsqueda de trabajo.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Dirección fuera del área de cobertura técnica.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Reparación Mínima",
        description: "Cambio de zapatilla, junta de goma o arreglo de 20 €.",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "Solo Peritaje / Seguro",
        description: "Diagnósticos telefónicos gratuitos o informes de seguro sin encargo.",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Grifería / Fuga Leve",
        description: "Sanitarios, grifos o fugas menores visibles.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Desatasco / Fuga Oculta",
        description: "Localizador acústico, desatasco estándar o tuberías.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Bajantes / Red Completa",
        description: "Renovación integral de red de agua o colectores.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Comunidad / B2B",
        description: "Fincas de vecinos, hostelería o naves industriales.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Mantenimiento Preventivo",
        description: "Contrato de mantenimiento periódico para fincas o empresas.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Urgencia / Camión Cuba",
        description: "Servicio 24h urgente o cuba de alta presión.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Obra / Acometida",
        description: "Apertura de zanja o sustitución de acometida general.",
        capabilityField: "accepts_national",
      },
    ],
  },

  electricistas: {
    id: "electricistas",
    name: "Electricistas e Instalaciones",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Electricidad",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Comercializadoras de luz o publicidad.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Poblaciones fuera del radio de desplazamiento.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Mecanismo / Manitas",
        description: "Colgar lámpara sencilla o cambiar interruptor suelto.",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "SAT de Aparatos",
        description: "Averías internas de electrodomésticos, TVs o electrónica.",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Avería / Cortocircuito",
        description: "Salto de térmico o punto eléctrico sin tensión.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Cuadro / Boletín (CIE)",
        description: "Sustitución de cuadro, aumento de potencia o boletín.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Recableado Completo",
        description: "Instalación eléctrica completa de piso o unifamiliar.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Industrial / Comunidad",
        description: "Alumbrado de fincas, naves o locales comerciales.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Punto Recarga Coche",
        description: "Instalación homologada de punto de recarga de VE.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Guardia Urgente 24h",
        description: "Intervención nocturna o inmediata fuera de horario.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Solar / Domótica",
        description: "Integración fotovoltaica, baterías o automatización.",
        capabilityField: "accepts_national",
      },
    ],
  },

  climatizacion: {
    id: "climatizacion",
    name: "Climatización y Aerotermia",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Climatización",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Venta de recambios B2B o búsqueda de trabajo.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Avisos fuera del radio de actuación.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Limpieza de Filtros",
        description: "Mantenimiento básico sin avería ni instalación.",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "Aire de Vehículos",
        description: "Climatización de automóviles o camiones (taller).",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Avería / Recarga Gas",
        description: "Fuga, recarga de gas o mantenimiento de equipo.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Instalación Split / Caldera",
        description: "Instalación 1x1 o cambio de caldera mural.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Conductos / Multisplit",
        description: "Climatización completa por conductos en toda la vivienda.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Comercial / Oficinas",
        description: "Sistemas VRF, oficinas, locales o edificios.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Contrato RITE / Anual",
        description: "Plan de mantenimiento anual o revisión oficial RITE.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Trabajo en Altura",
        description: "Descolgado vertical o grúa para unidad exterior.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Aerotermia Completa",
        description: "Proyecto integral de aerotermia con suelo radiante.",
        capabilityField: "accepts_national",
      },
    ],
  },

  pintura: {
    id: "pintura",
    name: "Pintura y Fachadas",
    discardsTitle: "Descartes Claros",
    servicesTitle: "Servicios de Pintura",
    discards: [
      {
        key: "spam_empleo",
        label: "Spam / Empleo",
        description: "Fabricantes vendiendo producto o pintores buscando trabajo.",
        isDiscard: true,
      },
      {
        key: "fuera_zona",
        label: "Fuera de Zona",
        description: "Localidad lejana fuera del área cubierta.",
        isDiscard: true,
      },
      {
        key: "trabajo_minimo",
        label: "Retoque",
        description: "Pintar una puerta, raspones o agujeros puntuales.",
        isDiscard: true,
      },
      {
        key: "servicio_no_ofrecido",
        label: "Restauración Muebles",
        description: "Lacado o restauración de mobiliario antiguo (taller).",
        isDiscard: true,
      },
    ],
    services: [
      {
        key: "servicio_pequeno",
        label: "Habitación / Estancia",
        description: "Pintar 1 habitación suelta o alisar un tramo.",
        isDiscard: false,
      },
      {
        key: "servicio_mediano",
        label: "Pintura Piso / Gotelé",
        description: "Piso completo estándar o quitar gotelé y alisar.",
        isDiscard: false,
      },
      {
        key: "servicio_grande",
        label: "Chalet / Exterior Completo",
        description: "Interior + exterior de chalet o unifamiliar grande.",
        isDiscard: false,
      },
      {
        key: "comercial",
        label: "Fachadas / Comunidad",
        description: "Patios de luces, fachadas, portales o naves.",
        isDiscard: false,
      },
    ],
    modifiers: [
      {
        key: "has_addon",
        legacyKey: "has_storage",
        label: "Impermeabilización",
        description: "Tratamiento antihumedades o sellado de terrazas.",
      },
      {
        key: "requires_special_equipment",
        legacyKey: "has_elevator",
        label: "Andamio / Verticales",
        description: "Montaje de andamio o descuelgue con cuerdas.",
        capabilityField: "has_elevator",
      },
      {
        key: "is_large_scale",
        legacyKey: "is_national",
        label: "Sistema SATE / Térmico",
        description: "Aislamiento térmico exterior integral de fachada.",
        capabilityField: "accepts_national",
      },
    ],
  },
};

/**
 * Obtiene la configuración de industria para un cliente.
 * Por defecto retorna 'mudanzas' si no se especifica o no coincide.
 */
export function getIndustryConfig(industryOrSector?: string | null): IndustryConfig {
  if (!industryOrSector) return INDUSTRIES.mudanzas;

  const normalized = industryOrSector.toLowerCase().trim();

  // Coincidencia directa por id
  if (INDUSTRIES[normalized]) {
    return INDUSTRIES[normalized];
  }

  // Detección heurística por palabras clave en sector/nombre
  if (normalized.includes("reforma") || normalized.includes("construc")) {
    return INDUSTRIES.reformas;
  }
  if (normalized.includes("fontan") || normalized.includes("desatasc")) {
    return INDUSTRIES.fontaneria;
  }
  if (normalized.includes("electr") || normalized.includes("instalac")) {
    return INDUSTRIES.electricistas;
  }
  if (normalized.includes("clima") || normalized.includes("aire") || normalized.includes("calefac")) {
    return INDUSTRIES.climatizacion;
  }
  if (normalized.includes("pintur") || normalized.includes("fachad")) {
    return INDUSTRIES.pintura;
  }

  return INDUSTRIES.mudanzas;
}

/**
 * Normaliza cualquier key de servicio (antigua o universal) a la etiqueta
 * correspondiente de la industria activa.
 */
export function getIndustryServiceLabel(
  serviceKey?: string | null,
  industryOrSector?: string | null
): string {
  if (!serviceKey) return "Sin especificar";

  // Mapeo retrocompatible de keys legacy a keys universales
  let normalizedKey = serviceKey;
  if (serviceKey === "porte_bulto") normalizedKey = "trabajo_minimo";
  if (serviceKey === "furgoneta") normalizedKey = "servicio_no_ofrecido";
  if (serviceKey === "mudanza_pequena" || serviceKey === "mudanza_chica") normalizedKey = "servicio_pequeno";
  if (serviceKey === "mudanza_mediana") normalizedKey = "servicio_mediano";
  if (serviceKey === "mudanza_grande") normalizedKey = "servicio_grande";
  if (serviceKey === "mudanza_comercial") normalizedKey = "comercial";

  const config = getIndustryConfig(industryOrSector);
  const found = [...config.discards, ...config.services].find((s) => s.key === normalizedKey);
  return found ? found.label : serviceKey;
}
