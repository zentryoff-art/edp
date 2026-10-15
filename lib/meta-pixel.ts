const DEFAULT_META_PIXEL_ID = "1303817294098526";

function validateMetaPixelId(pixelId: string | undefined): string | undefined {
  if (!pixelId || !/^\d{5,20}$/.test(pixelId)) return undefined;
  return pixelId;
}

export function getMetaPixelId(): string | undefined {
  const configuredPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return validateMetaPixelId(configuredPixelId || DEFAULT_META_PIXEL_ID);
}

export function getConfiguredMetaPixelId(): string | undefined {
  return validateMetaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);
}
