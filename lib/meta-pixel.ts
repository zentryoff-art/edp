/**
 * Identificador predeterminado del conjunto de datos / Píxel de Meta de Estudio Digital Pro.
 */
const DEFAULT_META_PIXEL_ID = "1303817294098526";

export function validateMetaPixelId(pixelId: string | undefined): string | undefined {
  if (!pixelId) return undefined;
  const trimmed = pixelId.trim();
  if (!/^\d{5,20}$/.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Obtiene el ID del píxel de Meta unificado tanto para cliente (navegador) como servidor (CAPI).
 * Prioriza la variable de entorno NEXT_PUBLIC_META_PIXEL_ID configurada en Vercel.
 */
export function getMetaPixelId(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (configured) {
    return validateMetaPixelId(configured);
  }
  return validateMetaPixelId(DEFAULT_META_PIXEL_ID);
}

/**
 * Coherencia retrocompatible: ambas funciones devuelven el mismo ID validado.
 */
export function getConfiguredMetaPixelId(): string | undefined {
  return getMetaPixelId();
}
