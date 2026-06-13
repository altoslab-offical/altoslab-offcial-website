import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const EXPECTED_SCRIPT = "https://wonda-web-kxbpzwq4sa-de.a.run.app/widget.js";
const EXPECTED_CHANNEL = "cmqb6hynd002hs619tqxc3pe5";
const EXPECTED_API = "https://wonda-api-kxbpzwq4sa-de.a.run.app/api/v1";

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
  existing("docs/wonda/altoslab-website-knowledge-base.md"),
  existing("docs/wonda/web-widget-integration.md")
].join("\n");

assert(layout.includes("<WonDaWidgetScript pathname={pathname} />"), "Next layout renders the WonDa widget on public app routes");
assert(component.includes("next/script"), "WonDa widget uses next/script");
assert(component.includes("pathname.startsWith(\"/admin\")"), "WonDa widget is excluded from admin routes");
assert(component.includes("pathname.startsWith(\"/api\")"), "WonDa widget is excluded from API routes");

for (const source of [component, route, sync, directBlog, homepage]) {
  assert(source.includes(EXPECTED_SCRIPT), "WonDa widget script src is present in every render surface");
  assert(source.includes(EXPECTED_CHANNEL), "WonDa widget channel id is present in every render surface");
  assert(source.includes(EXPECTED_API), "WonDa widget API base is present in every render surface");
}

assert(route.includes("withCloudflareHomepageAssetHeaders(await readCloudflareHomepageResponse(request))"), "homepage still returns static Cloudflare asset");
assert(directBlog.includes("wondaWidgetHtml(env)"), "direct Cloudflare blog renderer injects the widget script");
assert(docs.includes("ALTOS LAB 客服回答邊界"), "WonDa knowledge base documents customer-service boundaries");
assert(docs.includes("不要回答或透露"), "WonDa knowledge base blocks internal secret disclosure");

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
