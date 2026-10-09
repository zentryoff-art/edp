import "server-only";
import { getDb } from "./firebase/admin";
import { CONTACT } from "./contact";

export interface LegalConfig {
  holderName: string;
  tradeName: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
  phoneDisplay: string;
  registryDetails?: string;
}

export const DEFAULT_LEGAL: LegalConfig = {
  holderName: "Estudio Digital Pro",
  tradeName: "Estudio Digital Pro",
  taxId: "Pendiente de consignación",
  address: "Madrid, España",
  email: CONTACT.email,
  phone: CONTACT.phone,
  phoneDisplay: CONTACT.phoneDisplay,
  registryDetails: "",
};

/**
 * Obtiene los datos fiscales y legales desde Firestore (colección 'config', doc 'legal').
 * Si el documento no existe o Firestore no está disponible, devuelve valores seguros por defecto.
 */
export async function getLegalConfig(): Promise<LegalConfig> {
  try {
    const db = getDb();
    const snap = await db.collection("config").doc("legal").get();
    if (snap.exists) {
      const data = snap.data() || {};
      return {
        holderName: data.holder_name || data.holderName || DEFAULT_LEGAL.holderName,
        tradeName: data.trade_name || data.tradeName || DEFAULT_LEGAL.tradeName,
        taxId: data.tax_id || data.taxId || DEFAULT_LEGAL.taxId,
        address: data.address || DEFAULT_LEGAL.address,
        email: data.email || DEFAULT_LEGAL.email,
        phone: data.phone || DEFAULT_LEGAL.phone,
        phoneDisplay: data.phone_display || data.phoneDisplay || DEFAULT_LEGAL.phoneDisplay,
        registryDetails: data.registry_details || data.registryDetails || DEFAULT_LEGAL.registryDetails,
      };
    }
  } catch {
    // Fallback silencioso a valores por defecto
  }
  return DEFAULT_LEGAL;
}
