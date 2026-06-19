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
const blogAdsense = read("lib/blog-adsense.ts");
const blogAdSlot = read("components/BlogAdSlot.tsx");
const blogArticle = read("components/BlogArticle.tsx");
const blogIndex = read("components/BlogIndex.tsx");
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
assert(blogAdsense.includes("NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT"), "blog AdSense contract documents the index slot env key");
assert(blogAdsense.includes("NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT"), "blog AdSense contract documents the after-summary slot env key");
assert(blogAdsense.includes("NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT"), "blog AdSense contract documents the mid-article slot env key");
assert(blogAdsense.includes("NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT"), "blog AdSense contract documents the before-related slot env key");
assert(blogAdsense.includes("ADSENSE_SLOT_PATTERN"), "blog AdSense contract validates numeric ad unit slot ids");
assert(blogAdSlot.includes("adsbygoogle.push({})"), "React blog ad slot initializes manual AdSense units");
assert(blogArticle.includes('<BlogAdSlot placement="after-summary" />'), "BlogArticle renders the after-summary ad placement");
assert(blogArticle.includes('<BlogAdSlot placement="mid-article" />'), "BlogArticle renders the mid-article ad placement");
assert(blogArticle.includes('<BlogAdSlot placement="before-related" />'), "BlogArticle renders the before-related ad placement");
assert(blogIndex.includes('<BlogAdSlot placement="index-feed" />'), "BlogIndex renders the index-feed ad placement");

assert(layout.includes("adsenseScriptSrc") && layout.includes("isAdsenseConfigured"), "root layout wires AdSense from analytics");
assert(layout.includes("<WonDaWidgetScript pathname={pathname} />"), "root layout still renders the WonDa widget");
assert(homepageRoute.includes("adsenseHeadSnippet()"), "homepage route injects AdSense metadata without replacing UI");
assert(homepageRoute.includes("wondaWidgetSnippet()"), "homepage route still keeps the WonDa widget integration");
assert(htmlRenderer.includes("adsenseHeadSnippet()"), "API blog HTML renderer includes AdSense");
assert(htmlRenderer.includes('blogAdSlotHtml("index-feed")'), "API blog HTML renderer supports the index-feed ad placement");
assert(htmlRenderer.includes('blogAdSlotHtml("after-summary")'), "API blog HTML renderer supports the after-summary ad placement");
assert(htmlRenderer.includes('blogAdSlotHtml("mid-article")'), "API blog HTML renderer supports the mid-article ad placement");
assert(htmlRenderer.includes('blogAdSlotHtml("before-related")'), "API blog HTML renderer supports the before-related ad placement");
assert(
  homepageSync.includes("adsenseHeadSnippet()") &&
    homepageSync.includes("pagead2.googlesyndication.com") &&
    homepageSync.includes("?client=${adsenseClient}"),
  "Cloudflare homepage sync includes AdSense"
);
assert(homepageSync.includes("wondaWidgetSnippet()"), "Cloudflare homepage sync still includes the WonDa widget");
assert(directBlog.includes("NEXT_PUBLIC_ADSENSE_CLIENT") && directBlog.includes("pagead2.googlesyndication.com"), "direct blog renderer supports AdSense fallback");
assert(directBlog.includes("NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT"), "direct blog renderer supports after-summary manual ad slots");
assert(directBlog.includes("NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT"), "direct blog renderer supports mid-article manual ad slots");
assert(directBlog.includes("NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT"), "direct blog renderer supports before-related manual ad slots");
assert(directBlog.includes("wondaWidgetHtml(env)"), "direct blog renderer still injects the WonDa widget fallback");

assert(adsTxt.includes("google.com") && adsTxt.includes("f08c47fec0942fa0"), "ads.txt emits the Google seller line");
assert(adsTxt.includes("pub-\\d+"), "ads.txt derives the publisher id from the configured client id");
assert(wrangler.includes(`"NEXT_PUBLIC_ADSENSE_CLIENT": "${EXPECTED_CLIENT}"`), "Cloudflare vars include AdSense client id");
assert(wrangler.includes('"NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT"'), "Cloudflare vars include blog AdSense slot keys");
assert(envExample.includes(`NEXT_PUBLIC_ADSENSE_CLIENT=${EXPECTED_CLIENT}`), ".env.example documents AdSense client id");
assert(envExample.includes("NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED=true"), ".env.example documents blog AdSense enablement");
assert(envExample.includes("NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT="), ".env.example documents blog AdSense slot placeholders");
assert(packageJson.includes("\"test:adsense\""), "npm test includes the AdSense smoke script");

const derivedPublisher = EXPECTED_CLIENT.replace(/^ca-/, "");
assert(derivedPublisher === EXPECTED_PUBLISHER, "expected AdSense publisher id derives from the client id");

if (!process.exitCode) console.log("PASS AdSense smoke checks");
