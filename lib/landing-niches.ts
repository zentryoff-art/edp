export interface RealCase {
  badge: string;
  metric: string;
  title: string;
  desc: string;
  client: string;
  url: string;
}

export interface NicheConfig {
  id: string;
  eyebrow: string;
  headline: string;
  lede: string;
  cases: RealCase[];
  whatsappText: string;
}

const COMMON_CASES: Record<string, RealCase> = {
  mudanzasPalma: {
    badge: "Mudanzas & Guardamuebles",
    metric: "x15 de retorno",
    title: "11.800 € en presupuestos en Octubre 2026",
    desc: "52 contactos recibidos con solo 782 € de inversión publicitaria. El 83% fueron llamadas directas al teléfono de clientes listos para contratar.",
    client: "Mudanzas Palma · Valencia",
    url: "https://mudanzaspalma.es",
  },
  mudanzasZaragon: {
    badge: "Mudanzas & Traslados",
    metric: "+45 llamadas / mes",
    title: "Presupuestos de pisos completos y oficinas",
    desc: "Captación directa en el momento exacto en que particulares y empresas buscan furgón, operarios y embalaje profesional en su ciudad.",
    client: "Mudanzas Aragón JG · España",
    url: "https://mudanzaszaragonjg.com/",
  },
  laTerra: {
    badge: "Plataformas & Maquinaria",
    metric: "x2.8 llamadas",
    title: "Teléfono sonando para obras y particulares",
    desc: "Captación directa para alquiler de elevadores verticales en el momento exacto en que constructores, empresas y familias necesitan subir muebles o materiales.",
    client: "Plataformas La Terra · Valencia",
    url: "https://plataformaslaterra.es",
  },
  caspian: {
    badge: "Reformas Integrales & Fontanería",
    metric: "+65.000 € cerrados",
    title: "Propietarios con vivienda y presupuesto real",
    desc: "Filtrado previo en los formularios para descartar curiosos y entregar proyectos de reformas de cocina, baños e instalaciones completas de alta rentabilidad.",
    client: "Caspian Renovations · UK",
    url: "https://caspianrenovations.co.uk",
  },
  mahonia: {
    badge: "Pintura & Decoración",
    metric: "-40% coste por lead",
    title: "Proyectos de interiores y locales comerciales",
    desc: "Estrategia de captación local con anuncios visuales de trabajos terminados que generan confianza inmediata y solicitudes de presupuesto directo.",
    client: "Mahonia Decor · UK",
    url: "https://www.mahoniadecor.co.uk/",
  },
};

export const NICHES: Record<string, NicheConfig> = {
  general: {
    id: "general",
    eyebrow: "20 minutos con los fundadores · sin coste ni permanencia",
    headline: "¿Cuántos clientes nuevos podrías captar en tu ciudad cada mes?",
    lede: "Analizamos en directo la demanda de tu sector, qué hace tu competencia local y el plan exacto para captarlas. Si encaja, arrancas con tu primer mes de gestión gratis: solo pagas la publicidad.",
    cases: [COMMON_CASES.mudanzasPalma, COMMON_CASES.laTerra, COMMON_CASES.mahonia],
    whatsappText:
      "Hola Jorge / Facundo, vengo de la web de Estudio Digital Pro y me gustaría consultar sobre la captación de clientes para mi empresa.",
  },
  mudanzas: {
    id: "mudanzas",
    eyebrow: "Especialistas en captación para empresas de mudanzas y guardamuebles",
    headline: "¿Cuántas mudanzas y traslados podrías cerrar en tu ciudad cada mes?",
    lede: "Sabemos exactamente cuánto cuesta un cliente de mudanza local, qué busca cuando llama por teléfono y cómo filtrar a los curiosos para que solo atiendas presupuestos que merezcan la pena.",
    cases: [COMMON_CASES.mudanzasPalma, COMMON_CASES.mudanzasZaragon, COMMON_CASES.laTerra],
    whatsappText:
      "Hola Jorge / Facundo, tengo una empresa de mudanzas y me gustaría ver cuántas solicitudes y llamadas podemos captar en mi ciudad durante el mes de prueba.",
  },
  climatizacion: {
    id: "climatizacion",
    eyebrow: "Especialistas en captación para empresas de aire acondicionado y climatización",
    headline: "¿Cuántas instalaciones y mantenimientos de climatización podrías captar en tu zona?",
    lede: "Campañas enfocadas a propietarios y locales comerciales que necesitan sustituir su equipo, instalar aire o calderas, y requieren respuesta inmediata de un profesional local de confianza.",
    cases: [COMMON_CASES.laTerra, COMMON_CASES.caspian, COMMON_CASES.mudanzasPalma],
    whatsappText:
      "Hola Jorge / Facundo, tengo una empresa de climatización / aire acondicionado y quiero analizar cuántos avisos e instalaciones podemos captar en mi zona durante el mes de prueba.",
  },
  fontaneros: {
    id: "fontaneros",
    eyebrow: "Especialistas en captación directa para fontaneros y reparaciones del hogar",
    headline: "¿Cuántos avisos directos y reformas de fontanería podrías captar en tu ciudad?",
    lede: "El 85% de las personas que buscan un fontanero o instalador quieren llamar en el acto. Diseñamos tus campañas para que el teléfono suene con clientes que necesitan tu servicio ya.",
    cases: [COMMON_CASES.caspian, COMMON_CASES.laTerra, COMMON_CASES.mudanzasPalma],
    whatsappText:
      "Hola Jorge / Facundo, tengo un negocio de fontanería / instalaciones y me gustaría ver cuántas llamadas y avisos podemos generar en mi ciudad durante el mes de prueba.",
  },
  reformas: {
    id: "reformas",
    eyebrow: "Especialistas en captación para empresas de reformas integrales y parciales",
    headline: "¿Cuántos proyectos de reforma de vivienda y locales podrías cerrar en tu ciudad?",
    lede: "Filtramos antes de que te llamen para descartar personas sin presupuesto o buscando chapuzas baratas. Entregamos solicitudes de reformas integrales, cocinas y baños con metros y fecha de inicio claros.",
    cases: [COMMON_CASES.caspian, COMMON_CASES.mahonia, COMMON_CASES.laTerra],
    whatsappText:
      "Hola Jorge / Facundo, tengo una empresa de reformas y me gustaría analizar cuántos proyectos con presupuesto solvente se pueden captar en mi zona durante el mes de prueba.",
  },
};

const NICHE_ALIASES: Record<string, string> = {
  mudanza: "mudanzas",
  traslados: "mudanzas",
  guardamuebles: "mudanzas",
  climatización: "climatizacion",
  aire: "climatizacion",
  "aire-acondicionado": "climatizacion",
  calefaccion: "climatizacion",
  calefacción: "climatizacion",
  fontaneria: "fontaneros",
  fontanería: "fontaneros",
  fontanero: "fontaneros",
  plumbing: "fontaneros",
  reforma: "reformas",
  construccion: "reformas",
  construcción: "reformas",
  pintura: "reformas",
};

export function getNicheConfig(nicheParam?: string): NicheConfig {
  if (!nicheParam) return NICHES.general;
  const clean = nicheParam.toLowerCase().trim();
  const targetId = NICHE_ALIASES[clean] || clean;
  return NICHES[targetId] || NICHES.general;
}

