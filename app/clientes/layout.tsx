import type { Metadata, Viewport } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: { default: "Portal de Clientes", template: "%s · Portal Clientes" },
  description: "Gestión operativa de leads, calificación de clientes y métricas en tiempo real.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Portal Clientes",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#e75623",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
