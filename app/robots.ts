import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const disallowPrivateSurfaces = ["/admin/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Meta-ExternalAgent",
        allow: "/",
        disallow: disallowPrivateSurfaces
      },
      {
        userAgent: "Bytespider",
        allow: "/",
        disallow: disallowPrivateSurfaces
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
