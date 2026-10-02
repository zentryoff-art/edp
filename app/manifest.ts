import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal de Clientes",
    short_name: "Portal Clientes",
    description: "Gestión operativa de leads, calificación de clientes y métricas en tiempo real.",
    start_url: "/clientes",
    scope: "/clientes",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F7F4",
    theme_color: "#F8F7F4",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
