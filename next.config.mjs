import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
const canonicalHost = new URL(siteUrl).host;
const canonicalRedirectHosts = Array.from(
  new Set(
    (
      process.env.CANONICAL_REDIRECT_HOSTS?.split(",") || [
        `www.${canonicalHost.replace(/^www\./, "")}`,
        "altoslab.com",
        "www.altoslab.com",
        "altoslab-offcial-website.vercel.app",
        "altoslab-offcial-website-altoslaboffical-3015s-projects.vercel.app"
      ]
    )
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host && host !== canonicalHost.toLowerCase())
  )
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" ? { output: "standalone" } : {}),
  images: {
    unoptimized: true
  },
  turbopack: {
    resolveAlias: {
      sharp: "./lib/sharp-disabled.ts"
    }
  },
  async redirects() {
    return canonicalRedirectHosts.map((host) => ({
      source: "/:path((?!api/).*)",
      has: [{ type: "host", value: host }],
      destination: `${siteUrl}/:path*`,
      permanent: true
    }));
  }
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
