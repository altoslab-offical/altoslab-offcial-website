import fs from "node:fs";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

const route = read("app/route.ts");
const index = read("index.html");
const publicHomepage = fs.existsSync(new URL("../public/altoslab-homepage.html", import.meta.url))
  ? read("public/altoslab-homepage.html")
  : "";

for (const forbidden of [
  "altos-home-header",
  "data-altos-home-header",
  "body > nav.fixed.top-0",
  "document.body.prepend",
  "HTMLRewriter",
  "components/site",
  "app/page.tsx"
]) {
  assert(!route.includes(forbidden), `homepage route must not inject or replace UI via ${forbidden}`);
}

for (const marker of ["<div id=\"root\"></div>", "fixed top-0", "children:`ALTOS`", "children:`LAB`"]) {
  assert(index.includes(marker), `index.html keeps original homepage marker ${marker}`);
}

if (publicHomepage) {
  for (const marker of ["<div id=\"root\"></div>", "children:`ALTOS`", "children:`LAB`"]) {
    assert(publicHomepage.includes(marker), `Cloudflare homepage asset keeps original homepage marker ${marker}`);
  }
}

assert(route.includes("CLOUDFLARE_HOMEPAGE_ASSET = \"/altoslab-homepage\""), "homepage route reads the Cloudflare homepage asset");
assert(route.includes("withLaunchMetadata(html)"), "homepage route wraps the original homepage HTML");
assert(route.includes("homepageAnalyticsSnippet()"), "homepage route keeps analytics without visual replacement");

for (const file of ["SPEC.md", "DESIGN.md", "docs/FRONTEND_ARCHITECTURE.md"]) {
  assert(read(file).includes("Homepage UI Stability Contract"), `${file} documents the Homepage UI Stability Contract`);
}

if (!process.exitCode) console.log("PASS homepage UI contract smoke checks");
