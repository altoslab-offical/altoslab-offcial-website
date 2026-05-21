import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ALTOS LAB Official Website",
    short_name: "ALTOS LAB",
    description: "AI implementation studio for automation, AI agents, CMS, SEO and GEO.",
    start_url: "/",
    display: "standalone",
    background_color: "#030403",
    theme_color: "#030403",
    lang: "zh-Hant-TW"
  };
}
