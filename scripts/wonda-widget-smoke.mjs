import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const EXPECTED_SCRIPT = "https://wonda-web-kxbpzwq4sa-de.a.run.app/widget.js";
const EXPECTED_CHANNEL = "cmqb6hynd002hs619tqxc3pe5";
const EXPECTED_API = "https://altoslab-ai.cc/api/wonda";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

function read(file) {
  return fs.readFileSync(new URL(file, root), "utf8");
}

function existing(file) {
  const url = new URL(file, root);
  return fs.existsSync(url) ? read(file) : "";
}

const layout = read("app/layout.tsx");
const component = read("components/WonDaWidgetScript.tsx");
const route = read("app/route.ts");
const sync = read("scripts/sync-cloudflare-homepage.mjs");
const directBlog = read("cloudflare/blog-html-direct-worker.js");
const homepage = existing("public/altoslab-homepage.html");
const docs = [
  existing("docs/wonda/altoslab-direct-qa-ai-support-widget.md"),
  existing("docs/wonda/altoslab-website-support-scope-rules.md"),
  existing("docs/wonda/altoslab-website-knowledge-base.md"),
  existing("docs/wonda/altoslab-service-tone-and-language-rules.md"),
  existing("docs/wonda/web-widget-integration.md")
].join("\n");

assert(layout.includes("<WonDaWidgetScript pathname={pathname} />"), "Next layout renders the WonDa widget on public app routes");
assert(component.includes("next/script"), "WonDa widget uses next/script");
assert(component.includes("pathname.startsWith(\"/admin\")"), "WonDa widget is excluded from admin routes");
assert(component.includes("pathname.startsWith(\"/api\")"), "WonDa widget is excluded from API routes");

// `public/altoslab-homepage.html` is a generated Cloudflare artifact and is
// intentionally absent in a clean checkout. Validate it only when a build has
// materialized it; the tracked generator remains mandatory in every run.
const renderSurfaces = [component, route, sync, directBlog, ...(homepage ? [homepage] : [])];
for (const source of renderSurfaces) {
  assert(source.includes(EXPECTED_SCRIPT), "WonDa widget script src is present in every render surface");
  assert(source.includes(EXPECTED_CHANNEL), "WonDa widget channel id is present in every render surface");
  assert(source.includes(EXPECTED_API), "WonDa widget API base is present in every render surface");
}

assert(route.includes("withCloudflareHomepageAssetHeaders(await readCloudflareHomepageResponse(request))"), "homepage still returns static Cloudflare asset");
assert(directBlog.includes("wondaWidgetHtml(env)"), "direct Cloudflare blog renderer injects the widget script");
assert(docs.includes("ALTOS LAB 客服回答邊界"), "WonDa knowledge base documents customer-service boundaries");
assert(docs.includes("不要回答或透露"), "WonDa knowledge base blocks internal secret disclosure");
assert(docs.includes("語言匹配"), "WonDa knowledge base documents language matching behavior");
assert(docs.includes("Filipino / Tagalog"), "WonDa knowledge base covers Filipino / Tagalog language behavior");
assert(docs.includes("不要像硬推銷或後台機器人"), "WonDa knowledge base documents a warmer customer-service tone");
assert(docs.includes("不要回答「訪客自己該怎麼操作後台或串接第三方平台」"), "WonDa knowledge base documents website-support scope control");
assert(docs.includes("Can ALTOS LAB help us add an AI support widget to our website?"), "WonDa knowledge base includes direct AI support widget Q&A");

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: new URL(".", root), encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith(".next/") && !file.startsWith(".open-next/") && !file.startsWith("node_modules/"));
const secretPattern = /(wonda\.integration\.full\.\d+@wonda\.ai|WondaFullDemo\d+!)/i;
for (const file of trackedFiles) {
  const body = fs.readFileSync(new URL(file, root), "utf8");
  assert(!secretPattern.test(body), `${file} must not contain WonDa demo credentials`);
}

if (!process.exitCode) console.log("PASS WonDa widget smoke checks");
