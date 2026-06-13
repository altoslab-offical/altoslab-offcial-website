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
const agents = read("AGENTS.md");
const index = read("index.html");
const siteHeader = read("components/site/SiteHeader.tsx");
const contactForm = read("components/ContactForm.tsx");
const contactRoute = read("app/api/contact/route.ts");
const contactNotification = read("lib/contact-notification.ts");
const publicHomepage = fs.existsSync(new URL("../public/altoslab-homepage.html", import.meta.url))
  ? read("public/altoslab-homepage.html")
  : "";

for (const forbidden of [
  "altos-home-header",
  "data-altos-home-header",
  "body > nav.fixed.top-0",
  "document.body.prepend",
  "HTMLRewriter",
  "response.text()",
  "readCloudflareHomepageHtml",
  "components/site",
  "app/page.tsx"
]) {
  assert(!route.includes(forbidden), `homepage route must not inject or replace UI via ${forbidden}`);
}

for (const marker of ["<div id=\"root\"></div>", "fixed top-0", "children:`ALTOS`", "children:`LAB`"]) {
  assert(index.includes(marker), `index.html keeps original homepage marker ${marker}`);
}

assert(
  index.includes("function setElementText(element, label)") &&
    index.includes("if (element.textContent !== label) element.textContent = label"),
  "homepage header language enhancer avoids repeated textContent mutations"
);

for (const html of [index, publicHomepage].filter(Boolean)) {
  assert(html.includes("children:`合作洽談 ↗`"), "homepage raw header CTA keeps the designer-approved cooperation label");
  assert(html.includes("children:`開始合作 ↗`"), "homepage raw hero CTA keeps the original start-project label");
  assert(html.includes('cta.textContent = "合作洽談 ↗"'), "homepage fallback CTA keeps the designer-approved cooperation label");
  assert(html.includes('cta: "合作洽談 ↗"'), "homepage zh-Hant header CTA copy does not get overwritten by unrelated wording");
  assert(html.includes('mobileCta: "合作洽談 ↗"'), "homepage zh-Hant mobile CTA copy does not get overwritten by unrelated wording");
  assert(!html.includes('cta: "預約討論 ↗"'), "homepage CTA copy must not be changed to unapproved booking wording");
  assert(!html.includes('mobileCta: "預約討論 ↗"'), "homepage mobile CTA copy must not be changed to unapproved booking wording");
  assert(!html.includes('"zh-Hant": "預約討論 ↗"'), "homepage copy aliases must not rewrite approved CTA labels");
}

assert(siteHeader.includes('"合作洽談"'), "React site header zh-Hant CTA uses the designer-approved cooperation label");
assert(siteHeader.includes('"Talk"'), "React site header English CTA uses the designer-approved short label");
assert(!siteHeader.includes('"預約討論"'), "React site header does not expose unapproved booking wording");
assert(!siteHeader.includes('"Book a Call"'), "React site header does not replace the designer-provided short English CTA");

if (publicHomepage) {
  for (const marker of ["<div id=\"root\"></div>", "children:`ALTOS`", "children:`LAB`"]) {
    assert(publicHomepage.includes(marker), `Cloudflare homepage asset keeps original homepage marker ${marker}`);
  }

  assert(
    publicHomepage.includes("function setElementText(element, label)") &&
      publicHomepage.includes("if (element.textContent !== label) element.textContent = label"),
    "Cloudflare homepage header enhancer avoids repeated textContent mutations"
  );
}

assert(route.includes("CLOUDFLARE_HOMEPAGE_ASSET = \"/altoslab-homepage\""), "homepage route reads the Cloudflare homepage asset");
assert(route.includes("withLaunchMetadata(html)"), "homepage route wraps the original homepage HTML");
assert(route.includes("homepageAnalyticsSnippet()"), "homepage route keeps analytics without visual replacement");
assert(route.includes("wondaWidgetSnippet()"), "homepage route keeps WonDa widget as a script-only integration");
assert(route.includes("withCloudflareHomepageAssetHeaders(await readCloudflareHomepageResponse(request))"), "Cloudflare homepage returns the static asset without request-time HTML rewriting");

if (publicHomepage) {
  assert(publicHomepage.includes("id=\"wonda-ai-widget\""), "Cloudflare homepage asset includes the WonDa widget script");
  assert(publicHomepage.includes("data-channel-id=\"cmqb6hynd002hs619tqxc3pe5\""), "Cloudflare homepage asset uses the configured WonDa channel id");
}

assert(contactForm.includes("formRef.current?.reset()"), "contact form resets only after a successful submit");
assert(contactForm.includes("已送出"), "contact success state uses the designer-approved heading");
assert(contactForm.includes("我們已收到你的合作需求"), "contact success state uses the designer-approved message");
assert(contactRoute.includes("sendContactLeadNotification"), "contact API attempts the Gmail notification after saving the lead");
assert(contactNotification.includes("multipart/alternative"), "contact Gmail notification sends multipart text and HTML email");
assert(contactNotification.includes("missing-env"), "contact Gmail notification fails open when Gmail env is not configured");

for (const file of ["SPEC.md", "DESIGN.md", "docs/FRONTEND_ARCHITECTURE.md"]) {
  assert(read(file).includes("Homepage UI Stability Contract"), `${file} documents the Homepage UI Stability Contract`);
  assert(read(file).includes("Public UI Change Control"), `${file} documents the Public UI Change Control`);
}

assert(agents.includes("Public UI Change Control"), "AGENTS.md includes the public UI change-control rule");
assert(agents.includes("must not change public UI unless Tommy explicitly asks"), "AGENTS.md blocks accidental UI changes in non-design work");

if (!process.exitCode) console.log("PASS homepage UI contract smoke checks");
