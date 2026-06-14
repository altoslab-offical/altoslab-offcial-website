import fs from "node:fs";

const root = new URL("../", import.meta.url);
const EXPECTED_CLIENT = "ca-pub-8663357592872896";
const EXPECTED_PUBLISHER = "pub-8663357592872896";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

function read(file) {
  return fs.readFileSync(new URL(file, root), "utf8");
}

const analytics = read("lib/analytics.ts");
const layout = read("app/layout.tsx");
const homepageRoute = read("app/route.ts");
const htmlRenderer = read("lib/blog-html-render.ts");
const homepageSync = read("scripts/sync-cloudflare-homepage.mjs");
const directBlog = read("cloudflare/blog-html-direct-worker.js");
const adsTxt = read("app/ads.txt/route.ts");
const wrangler = read("wrangler.jsonc");
const envExample = read(".env.example");
const packageJson = read("package.json");

assert(analytics.includes("ADSENSE_CLIENT_PATTERN"), "analytics validates AdSense client ids");
assert(analytics.includes("export const adsenseClient"), "analytics exports the AdSense client");
assert(analytics.includes("adsenseScriptSrc()"), "analytics exposes the AdSense script URL helper");
assert(analytics.includes("adsenseHeadSnippet()"), "analytics exposes the AdSense head snippet helper");

assert(layout.includes("adsenseScriptSrc") && layout.includes("isAdsenseConfigured"), "root layout wires AdSense from analytics");
assert(layout.includes("<WonDaWidgetScript pathname={pathname} />"), "root layout still renders the WonDa widget");
assert(homepageRoute.includes("adsenseHeadSnippet()"), "homepage route injects AdSense metadata without replacing UI");
assert(homepageRoute.includes("wondaWidgetSnippet()"), "homepage route still keeps the WonDa widget integration");
assert(htmlRenderer.includes("adsenseHeadSnippet()"), "API blog HTML renderer includes AdSense");
assert(
  homepageSync.includes("adsenseHeadSnippet()") &&
    homepageSync.includes("pagead2.googlesyndication.com") &&
    homepageSync.includes("?client=${adsenseClient}"),
  "Cloudflare homepage sync includes AdSense"
);
assert(homepageSync.includes("wondaWidgetSnippet()"), "Cloudflare homepage sync still includes the WonDa widget");
assert(directBlog.includes("NEXT_PUBLIC_ADSENSE_CLIENT") && directBlog.includes("pagead2.googlesyndication.com"), "direct blog renderer supports AdSense fallback");
assert(directBlog.includes("wondaWidgetHtml(env)"), "direct blog renderer still injects the WonDa widget fallback");

assert(adsTxt.includes("google.com") && adsTxt.includes("f08c47fec0942fa0"), "ads.txt emits the Google seller line");
assert(adsTxt.includes("pub-\\d+"), "ads.txt derives the publisher id from the configured client id");
assert(wrangler.includes(`"NEXT_PUBLIC_ADSENSE_CLIENT": "${EXPECTED_CLIENT}"`), "Cloudflare vars include AdSense client id");
assert(envExample.includes(`NEXT_PUBLIC_ADSENSE_CLIENT=${EXPECTED_CLIENT}`), ".env.example documents AdSense client id");
assert(packageJson.includes("\"test:adsense\""), "npm test includes the AdSense smoke script");

const derivedPublisher = EXPECTED_CLIENT.replace(/^ca-/, "");
assert(derivedPublisher === EXPECTED_PUBLISHER, "expected AdSense publisher id derives from the client id");

if (!process.exitCode) console.log("PASS AdSense smoke checks");
