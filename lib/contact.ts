/** Datos de contacto públicos (se pueden sobrescribir con variables NEXT_PUBLIC_*). */
const rawPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+34643168396";

export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@estudiodigitalpro.com",
  phone: rawPhone.replace(/\s+/g, ""),
  /** 643 168 396 */
  phoneDisplay: rawPhone
    .replace(/\s+/g, "")
    .replace(/^\+34/, "")
    .replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
  site: process.env.NEXT_PUBLIC_SITE_URL || "https://estudiodigitalpro.com",
};

export const VIDEO = {
  src: process.env.NEXT_PUBLIC_VIDEO_URL || "/video/edp-llamada.mp4",
  poster: process.env.NEXT_PUBLIC_VIDEO_POSTER_URL || "/video/edp-llamada-poster.jpg",
};
