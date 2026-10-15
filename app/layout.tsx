import type { Metadata, Viewport } from "next";
import { Archivo, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./site.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

import { getOrganizationSchema } from "@/lib/seo-schema";
import { MetaPixel } from "@/components/MetaPixel";
import { GoogleTag } from "@/components/GoogleTag";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.estudiodigitalpro.com"),
  title: "Estudio Digital Pro · Conseguimos clientes para tu negocio",
  description:
    "Conseguimos clientes para pymes de servicios con publicidad, una web que convierte y seguimiento de contactos. Más clientes cualificados, no solo clics.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Estudio Digital Pro · Conseguimos clientes para tu negocio",
    description:
      "Conseguimos clientes para pymes de servicios con publicidad, una web que convierte y seguimiento de contactos. Más clientes cualificados, no solo clics.",
    url: "https://www.estudiodigitalpro.com",
    siteName: "Estudio Digital Pro",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Estudio Digital Pro",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Estudio Digital Pro",
    description:
      "Conseguimos clientes para pymes de servicios con publicidad y seguimiento de contactos. Más clientes cualificados, no solo clics.",
    images: ["/icons/icon-512x512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F7F4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schema = getOrganizationSchema();

  return (
    <html lang="es" className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body>
        {children}
        <CookieBanner />
        <MetaPixel />
        <GoogleTag />
      </body>
    </html>
  );
}
