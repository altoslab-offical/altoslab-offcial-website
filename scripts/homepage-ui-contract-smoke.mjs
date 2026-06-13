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
}

if (!process.exitCode) console.log("PASS homepage UI contract smoke checks");
