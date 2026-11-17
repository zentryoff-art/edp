import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.estudiodigitalpro.com";
  const privateDisallows = [
    "/clientes/",
    "/api/",
    "/recuperar",
    "/auth/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateDisallows,
      },
      {
        userAgent: [
          "OAI-SearchBot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
        ],
        allow: "/",
        disallow: privateDisallows,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
