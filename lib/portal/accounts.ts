import type { DailyMetric, Lead, LeadChannel } from "./types";
import { JG_LSA_ACCOUNTS, JG_META_CAMPAIGNS, META_CAMPAIGNS_CATALOG } from "./types";

export interface AccountOption {
  id: string; // customer_id o campaign_id
  label: string; // Nombre descriptivo humano
  shortLabel: string; // Nombre corto / Ciudad (ej: "Barcelona")
  city?: string;
  channel: LeadChannel;
}

function getAdvertisingSourceId(source?: Lead["advertising_source"]): string | undefined {
  if (!source) return undefined;
  if (source.channel === "google_lsa") return source.customer_id;
  if (source.channel === "meta_ads") return source.campaign_id;
  return undefined;
}

/**
 * Extrae y normaliza dinámicamente las cuentas publicitarias y campañas
 * disponibles para cualquier cliente a partir de sus métricas y leads.
 */
export function extractAccountOptions(
  rows: DailyMetric[] = [],
  leads: Lead[] = [],
  channelFilter: "all" | LeadChannel = "all"
): AccountOption[] {
  // 'Todos los Canales' muestra todo en conjunto sin filtros por cuenta o anuncio individual.
  if (channelFilter === "all") {
    return [];
  }

  const map = new Map<string, AccountOption>();

  // 1. Extraer desde leads del canal activo
  for (const lead of leads) {
    const channel = lead.channel || "google_lsa";
    if (channel !== channelFilter) continue;

    const id = lead.account_id || getAdvertisingSourceId(lead.advertising_source);
    if (!id || map.has(id)) continue;

    const option = resolveAccountOption(id, channel, lead);
    map.set(id, option);
  }

  // 2. Extraer desde métricas diarias del canal activo
  for (const row of rows) {
    const channel = (row.channel as LeadChannel) || "google_lsa";
    if (channel !== channelFilter) continue;

    const id = row.customer_id || row.campaign_id;
    if (!id || map.has(id)) continue;

    const option = resolveAccountOption(id, channel, row);
    map.set(id, option);
  }

  // 3. Sembrado de cuentas/campañas registradas para clientes con múltiples zonas conocidas (ej. JG)
  const isJg =
    leads.some((l) => l.client_id === "jg" || (l.account_id && (JG_LSA_ACCOUNTS as any)[l.account_id])) ||
    rows.some((r) => r.client_id === "jg" || (r.customer_id && (JG_LSA_ACCOUNTS as any)[r.customer_id]));

  if (isJg) {
    if (channelFilter === "google_lsa") {
      const lsaRecords = JG_LSA_ACCOUNTS as Record<string, { name: string; city: string }>;
      for (const [id, item] of Object.entries(lsaRecords)) {
        if (!map.has(id)) {
          map.set(id, {
            id,
            label: item.name,
            shortLabel: item.city || item.name,
            city: item.city,
            channel: "google_lsa",
          });
        }
      }
    } else if (channelFilter === "meta_ads") {
      const metaRecords = JG_META_CAMPAIGNS as Record<string, { name: string; city: string }>;
      for (const [id, item] of Object.entries(metaRecords)) {
        if (!map.has(id)) {
          map.set(id, {
            id,
            label: item.name,
            shortLabel: item.city || item.name,
            city: item.city,
            channel: "meta_ads",
          });
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.shortLabel.localeCompare(b.shortLabel));
}

/**
 * Resuelve el nombre humano y ciudad de cualquier cuenta o campaña,
 * combinando el catálogo conocido con metadatos del lead o formatos estándar.
 */
export function resolveAccountOption(
  id: string,
  channel: LeadChannel,
  sampleContext?: Lead | DailyMetric
): AccountOption {
  // 1. Catálogo conocido de Google LSA (JG y ampliables)
  const lsaCatalog = JG_LSA_ACCOUNTS as Record<string, { name: string; city: string }>;
  if (channel === "google_lsa" && lsaCatalog[id]) {
    const item = lsaCatalog[id];
    return {
      id,
      label: item.name,
      shortLabel: item.city || item.name,
      city: item.city,
      channel: "google_lsa",
    };
  }

  // 2. Catálogo conocido de Meta Ads (JG, Duala, Henry, Laterra, etc.)
  const metaCatalog = (META_CAMPAIGNS_CATALOG || JG_META_CAMPAIGNS) as Record<string, { name: string; city?: string }>;
  if (channel === "meta_ads" && metaCatalog[id]) {
    const item = metaCatalog[id];
    return {
      id,
      label: item.name,
      shortLabel: item.city || item.name,
      city: item.city,
      channel: "meta_ads",
    };
  }

  // 3. Extracción desde DailyMetric si incluye campaign_name o ad_name
  if (sampleContext && "campaign_name" in sampleContext && sampleContext.campaign_name) {
    const rawName = sampleContext.campaign_name;
    const adName = sampleContext.ad_name;
    return {
      id,
      label: adName ? `${rawName} · ${adName}` : rawName,
      shortLabel: adName || rawName,
      channel: "meta_ads",
    };
  }

  // 4. Extracción de metadatos del lead si existen (ej. location display_name)
  if (sampleContext && "location" in sampleContext && sampleContext.location?.display_name) {
    return {
      id,
      label: `${sampleContext.location.display_name} (${id})`,
      shortLabel: sampleContext.location.display_name,
      city: sampleContext.location.display_name,
      channel,
    };
  }

  // 5. Formato estándar para cualquier otro cliente genérico
  const fallbackLabel = channel === "google_lsa" ? `Cuenta LSA ${id}` : `Campaña ${id}`;
  return {
    id,
    label: fallbackLabel,
    shortLabel: id.length > 8 ? `ID …${id.slice(-4)}` : id,
    channel,
  };
}

/**
 * Comprueba si un lead coincide con los filtros de cuentas seleccionados.
 * selectedIds vacío o ['all'] significa "todas las cuentas permitidas".
 */
export function matchLeadAccount(lead: Lead, selectedIds: string[] = []): boolean {
  if (!selectedIds || selectedIds.length === 0 || selectedIds.includes("all")) {
    return true;
  }

  const sourceId = getAdvertisingSourceId(lead.advertising_source);
  const adId = lead.advertising_source?.channel === "meta_ads" ? lead.advertising_source.ad_id : null;
  const ids = [lead.account_id, sourceId, adId].filter(Boolean) as string[];

  if (ids.some((id) => selectedIds.includes(id))) {
    return true;
  }

  // Fallback inteligente para JG o cuentas con cobertura geográfica conocida
  if (lead.client_id === "jg" || (!lead.client_id && lead.location?.display_name)) {
    const loc = (lead.location?.display_name || "").toLowerCase();
    const notes = (lead.notes || "").toLowerCase();

    // Madrid: LSA 4270099298 o Meta 120256065861880002
    if (
      (selectedIds.includes("4270099298") || selectedIds.includes("120256065861880002")) &&
      (notes.includes("madrid") ||
        [
          "madrid",
          "leganés",
          "fuenlabrada",
          "alcorcón",
          "coslada",
          "getafe",
          "parla",
          "móstoles",
          "collado villalba",
          "colmenar viejo",
          "san sebastián de los reyes",
          "las rozas",
        ].some((c) => loc.includes(c)))
    ) {
      return true;
    }

    // Barcelona: LSA 3270480556 o Meta 120256065951050002
    if (
      (selectedIds.includes("3270480556") || selectedIds.includes("120256065951050002")) &&
      (notes.includes("zaragonjga") ||
        notes.includes("barcelona") ||
        ["barcelona", "tarragona", "lleida", "mataró", "calella", "08415", "reus"].some((c) => loc.includes(c)))
    ) {
      return true;
    }

    // Zaragoza: LSA 9060286511 o Meta 120236907543380002
    if (
      (selectedIds.includes("9060286511") || selectedIds.includes("120236907543380002")) &&
      (notes.includes("zaragon jg") ||
        notes.includes("zaragoza") ||
        ["zaragoza", "50196"].some((c) => loc.includes(c)))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Comprueba si una fila de métricas coincide con los filtros de cuentas seleccionados.
 */
export function matchMetricAccount(row: DailyMetric, selectedIds: string[] = []): boolean {
  if (!selectedIds || selectedIds.length === 0 || selectedIds.includes("all")) {
    return true;
  }

  const ids = [row.customer_id, row.campaign_id].filter(Boolean) as string[];
  return ids.some((id) => selectedIds.includes(id));
}

/**
 * Devuelve una etiqueta amigable de origen/cuenta para mostrar en las tarjetas de leads.
 */
export function getLeadAccountBadge(lead: Lead): { label: string; city?: string } | null {
  const id = lead.account_id || getAdvertisingSourceId(lead.advertising_source);

  if (!id) return null;

  const resolved = resolveAccountOption(id, lead.channel || "google_lsa", lead);
  return {
    label: resolved.shortLabel,
    city: resolved.city,
  };
}
