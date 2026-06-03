import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readFirst(files) {
  const found = files.find((file) => fs.existsSync(path.join(root, file)));
  if (!found) throw new Error(`Missing required file: ${files.join(" or ")}`);
  return read(found);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

const sourceRegistry = read("lib/blog-source-registry.ts");
const generation = read("lib/blog-generation.ts");
const quality = read("lib/blog-quality.ts");
const covers = read("lib/blog-cover-generation.ts");
const cron = read("lib/blog-cron.ts");
const imageQuality = read("lib/blog-image-quality.ts");
const ingestAuth = read("lib/blog-ingest-auth.ts");
const ingestRoute = read("app/api/admin/blog/ingest-set/route.ts");
const releaseRoute = read("app/api/admin/blog/release-set/route.ts");
const mediaRoute = read("app/api/admin/blog/media/route.ts");
const generatedMediaRoute = read("app/api/blog/generated-media/[filename]/route.ts");
const healthRoute = read("app/api/health/route.ts");
const proxy = readFirst(["middleware.ts", "proxy.ts"]);
const localWorker = read("scripts/blog-local-worker.mjs");
const orchestrator = read("scripts/blog-antigravity-orchestrator.mjs");
const scheduledRunner = read("scripts/blog-scheduled-runner.mjs");
const sopDoctor = read("scripts/blog-sop-doctor.mjs");
const releaseVerifier = read("scripts/verify-blog-release.mjs");
const launchAgentPlist = read("scripts/com.altoslab.blog-local-worker.plist.example");
const launchAgentInstaller = read("scripts/install-blog-launch-agent.sh");
const seoGeoReport = read("scripts/seo-geo-insight-report.mjs");
const operations = read("docs/OPERATIONS.md");
const adminShell = read("components/AdminShell.tsx");
const blogAuthors = read("lib/blog-authors.ts");
const blogTypes = read("lib/types.ts");
const cms = read("lib/cms.ts");
const blogArticle = read("components/BlogArticle.tsx");
const blogIndex = read("components/BlogIndex.tsx");
const richText = read("components/RichText.tsx");
const siteHeader = read("components/site/SiteHeader.tsx");
const globals = read("app/globals.css");
const tokensCss = read("design/tokens.css");
const tokensJson = JSON.parse(read("design/tokens.json"));
const vercel = JSON.parse(read("vercel.json"));
const envExample = read(".env.example");
const marketSeed = read("lib/market-blog-seed.ts");
const seedMatch = marketSeed.match(/export const marketBlogPosts = ([\s\S]*?) satisfies BlogPost\[];/);
const seedPosts = seedMatch ? JSON.parse(seedMatch[1]) : [];
const targetLanguages = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const legacySeedLanguages = ["zh-Hant", "en", "ja", "ko"];

assert(sourceRegistry.includes("BLOG_NEWS_MIX"), "source registry exposes content/news mix");
assert((sourceRegistry.match(/tier: "official-rss"/g) || []).length >= 8, "source registry has at least 8 official RSS sources");
assert((sourceRegistry.match(/tier: "licensed-image"/g) || []).length >= 3, "source registry has licensed image providers");
assert(!/pinterest\.(com|[a-z]+)/i.test(sourceRegistry), "source registry does not use Pinterest as an image source");

assert(generation.includes("BLOG_PROMPT_VERSION"), "generation records prompt version");
assert(generation.includes("sourceRegistryEntryForUrl"), "generation ranks sources with registry metadata");
assert(!generation.includes("deepseek-chat"), "generation does not use deprecated deepseek-chat alias");
assert(generation.includes("Subtitle/standfirst craft rules"), "generation trains DeepSeek on compelling subtitle/standfirst rules");
assert(generation.includes("Medium-style scene hook"), "generation includes creative narrative modes learned from market writing");
assert(
  generation.includes("Foreign-source sections must be plain-language source translation"),
  "generation requires foreign news to become plain-language source translation"
);
assert(
  generation.includes("compact footnote"),
  "generation tells DeepSeek source-translation notes render as compact footnotes"
);

assert(quality.includes("withLlmQualityEvaluation"), "quality gate can merge LLM-as-judge evaluation");
assert(quality.includes("registryTrustedHostFragments"), "quality source trust uses the source registry");
assert(quality.includes("weakSubtitlePatterns"), "quality gate rejects weak generic subtitles");
assert(quality.includes("subtitleEvidencePattern"), "quality gate requires subtitle evidence or operator tension");
assert(quality.includes("rawZhEnglishJargonPattern"), "quality gate rejects raw English AI-ops jargon in zh-Hant articles");
assert(quality.includes("technicalJargonPattern"), "quality gate requires jargon-heavy paragraphs to explain terms plainly");
assert(quality.includes('"hentai"'), "quality gate blocks obvious off-topic adult typo terms in public blog copy");
assert(quality.includes("through Gemini"), "quality gate requires Gemini-written/revised production articles");
assert(quality.includes("market news posts must use a credited source article or official announcement image"), "quality gate requires market-news source covers");
assert(quality.includes("ChatGPT/GPT"), "quality gate requires ChatGPT/GPT-generated production covers for generated-cover lanes");
assert(covers.includes("BLOG_IMAGE_STORE_BLOB"), "image pipeline supports optional Vercel Blob persistence");
assert(covers.includes("searchPexels") && covers.includes("searchPixabay"), "image pipeline supports expanded free image APIs");
assert(covers.includes("pinterest") && covers.includes("approvedImageUrl"), "image pipeline rejects Pinterest URLs while allowing style inspiration");
assert(imageQuality.includes("visualChecks"), "image QA requires visualChecks for generated covers");
assert(imageQuality.includes("MIN_IMAGE_WIDTH = 1200"), "image QA checks generated cover dimensions");
assert(imageQuality.includes("isManagedGeneratedCoverUrl"), "image QA accepts managed generated media URLs for Cloudflare or legacy Blob storage");
assert(imageQuality.includes("/api/blog/generated-media/"), "image QA accepts Cloudflare generated-media cover URLs");
assert(imageQuality.includes("multilingualCoverConsistencyIssues"), "image QA requires one shared cover URL across translated article versions");
assert(imageQuality.includes("not a stock/free image provider"), "image QA blocks stock/free images for market-news source covers");
assert(ingestAuth.includes("createHmac") && ingestAuth.includes("timingSafeEqual"), "ingest API uses HMAC and timing-safe signature comparison");
assert(ingestRoute.includes("verifyBlogIngestRequest"), "ingest route verifies HMAC before parsing release payloads");
assert(ingestRoute.includes("validateOnly"), "ingest route supports validateOnly dry runs");
assert(ingestRoute.includes("reviewBlogImagesForRelease"), "ingest route runs production image QA before release");
assert(ingestRoute.includes("publish-if-valid"), "ingest route supports publish-if-valid fail-closed mode");
assert(ingestRoute.includes("generation.provider must be gemini-chatgpt"), "ingest route requires the Gemini + GPT production provider");
assert(ingestRoute.includes("duplicateTopicIssues"), "ingest route blocks repeated topics/source angles");
assert(ingestRoute.includes("duplicateCoverIssues"), "ingest route blocks repeated cover images across different article groups");
assert(ingestRoute.includes("market news coverSource must be source"), "ingest route requires source images for market-news posts");
assert(ingestRoute.includes("not stock/free image providers"), "ingest route blocks stock/free images for market-news source covers");
assert(releaseRoute.includes("verifyBlogIngestRequest"), "release-set route verifies HMAC before parsing release payloads");
assert(releaseRoute.includes("qualityManifest") && releaseRoute.includes("contentSha256"), "release-set route requires a signed quality manifest digest");
assert(releaseRoute.includes("generation.provider must be gemini-chatgpt"), "release-set route accepts the Gemini + GPT production provider");
assert(releaseRoute.includes("releaseCoverContractIssues"), "release-set route blocks localhost/http covers and mismatched multilingual covers");
assert(releaseRoute.includes("column/feature posts require at least two in-article images"), "release-set route blocks columns/features without required in-article images");
assert(releaseRoute.includes("contentImages URLs do not match release payload"), "release-set route verifies signed content image URLs during publish");
assert(releaseRoute.includes("applyManifestReleaseReview"), "release-set route applies the signed manifest release decision directly");
assert(!releaseRoute.includes("reviewBlogPairForAutoPublish"), "release-set route does not rerun full article QA during publish");
assert(!releaseRoute.includes("reviewBlogImagesForRelease"), "release-set route does not rerun remote image QA during publish");
assert(mediaRoute.includes("verifyBlogIngestRequest"), "media upload route is protected by the same signed request contract");
assert(mediaRoute.includes("@vercel/blob"), "media upload route stores production images in Vercel Blob");
assert(mediaRoute.includes("storeGcsImage"), "media upload route can store production images in GCS for Cloud Run");
assert(mediaRoute.includes("BLOG_MEDIA_ALLOW_LOCAL_STORAGE"), "media upload route supports local-only image storage for end-to-end testing");
assert(generatedMediaRoute.includes("generated-blog-media"), "local generated media can be fetched during end-to-end image QA");
assert(generatedMediaRoute.includes("readGcsObject"), "generated media route can read GCS-backed images");
assert(healthRoute.includes("externalBlogIngestConfigured"), "health check reports whether signed external blog ingest is configured");
assert(healthRoute.includes("imageGcsStorageConfigured"), "health check reports whether GCS generated media is configured");
assert(healthRoute.includes("legacyDeepSeekCronDisabled"), "health check reports whether the legacy DeepSeek cron path is disabled");
assert(proxy.includes("isPublicSignedIngestRoute") && proxy.includes("/api/admin/blog/release-set"), "proxy lets signed ingest/release reach the route without admin cookies");
assert(proxy.includes("/sitemap.xml") && proxy.includes("/robots.txt"), "proxy canonical redirect also covers public metadata routes");
assert(localWorker.includes("localPreflight"), "local worker performs local preflight before production ingest");
assert(localWorker.includes("X-Altos-Signature"), "local worker signs ingest requests");
assert(localWorker.includes("requestMediaUpload"), "local worker uploads generated cover files before ingest");
assert(localWorker.includes("requestRelease") && localWorker.includes("/api/admin/blog/release-set"), "local worker publishes through the formal release-set route");
assert(localWorker.includes("qualityManifest") && localWorker.includes("contentSha256"), "local worker writes a quality manifest with a content digest");
assert(localWorker.includes("reuse-validated-manifest"), "local worker can reuse a signed validate-only manifest during release");
assert(localWorker.includes("chromeEvidence.gemini.usedExistingTab"), "local worker requires Gemini existing-tab evidence");
assert(localWorker.includes("requiresGptCover"), "local worker only requires ChatGPT/GPT evidence when generated covers are needed");
assert(localWorker.includes("String(post.generatedBy || \"\").toLowerCase().includes(\"gemini\")"), "local worker requires per-post Gemini provenance");
assert(localWorker.includes("Local fallback cover generation is disabled"), "local worker fails closed on fallback cover generation");
assert(localWorker.includes("coverGeneration.provider must be ChatGPT/GPT"), "local worker requires GPT cover provenance");
assert(localWorker.includes("articleSetCoverIssues"), "local worker requires one shared cover URL across translated article versions");
assert(localWorker.includes("articleSetContentImageIssues"), "local worker requires one shared content image URL set across translated article versions");
assert(localWorker.includes("contentImages.length < 2"), "local worker blocks columns/features without at least two in-article images");
assert(localWorker.includes("blog-content-image"), "local worker uploads GPT content images through the signed media route");
assert(localWorker.includes("not stock/free image providers"), "local worker blocks stock/free images for market-news source covers");
assert(localWorker.includes("market news fast lane requires translated versions for every configured language"), "local worker blocks market-news sets missing any configured language");
assert(ingestRoute.includes("market news fast lane requires translated versions for every configured language"), "ingest route blocks market-news sets missing any configured language");
assert(releaseRoute.includes("market news fast lane requires translated versions for every configured language"), "release route blocks market-news sets missing any configured language");
assert(orchestrator.includes("Gemini must write/revise") && orchestrator.includes("market news must use the credited source article"), "orchestrator documents Gemini copy and market-news source image requirements");
assert(orchestrator.includes("Column/feature cover images must be generated through ChatGPT/GPT"), "orchestrator documents GPT covers for columns/features");
assert(orchestrator.includes("--lane must be column or market"), "orchestrator separates column and market-news lanes");
assert(orchestrator.includes("All ${LANGUAGES.length} languages must share the same cover URL"), "orchestrator requires one shared cover across translations");
assert(orchestrator.includes("2-3 ChatGPT/GPT-generated in-article images"), "orchestrator requires GPT in-article images for columns/features");
assert(orchestrator.includes("Create exactly ${LANGUAGES.length} posts") && orchestrator.includes("LANGUAGE_LABEL"), "orchestrator requires the full multilingual production set");
assert(orchestrator.includes("Close or release Gemini/GPT tabs"), "orchestrator includes Chrome tab cleanup requirements");
assert(!orchestrator.includes("--generate-missing-covers"), "orchestrator does not route production covers through local fallback art");
assert(scheduledRunner.includes("PREP_WINDOWS") && scheduledRunner.includes("RELEASE_WINDOWS"), "scheduled runner separates prep and release windows");
assert(scheduledRunner.includes("MARKET_SCAN_WINDOWS"), "scheduled runner has a separate market-news scan cadence");
assert(scheduledRunner.includes("--market-scan"), "scheduled runner can create market-news fast-lane scan prompts");
assert(
  scheduledRunner.includes("{ hour: 10, minute: 30 }") &&
    scheduledRunner.includes("{ hour: 12, minute: 30 }") &&
    scheduledRunner.includes("{ hour: 14, minute: 30 }"),
  "scheduled runner includes all daytime market-scan window times"
);
assert(
  scheduledRunner.includes("{ hour: 18, minute: 30 }") &&
    scheduledRunner.includes("{ hour: 20, minute: 30 }"),
  "scheduled runner includes all late market-scan window times"
);
assert(scheduledRunner.includes("awaiting_browser_production"), "scheduled prep creates a manifest skeleton instead of pretending to publish");
assert(scheduledRunner.includes("releaseGateIssues"), "scheduled release checks the prepared candidate manifest before publishing");
assert(scheduledRunner.includes("releaseWindowIssue"), "scheduled release refuses to publish outside the configured release window");
assert(scheduledRunner.includes("RELEASE_GRACE_MINUTES"), "scheduled release allows a small launchd delay but no early or stale publish");
assert(scheduledRunner.includes("force-release"), "scheduled release has an explicit manual override for emergency operation");
assert(scheduledRunner.includes("missing prepared candidate"), "scheduled release skips safely when no candidate exists");
assert(scheduledRunner.includes("articleSetPath file is missing"), "scheduled release checks that the ready article set still exists");
assert(scheduledRunner.includes("scripts/blog-sop-doctor.mjs"), "scheduled prep/release runs the SOP doctor before continuing");
assert(scheduledRunner.includes("compactDoctorResult") && scheduledRunner.includes("scheduled-runner.log"), "scheduled runner records compact doctor evidence in output and logs");
assert(scheduledRunner.includes("scripts/verify-blog-release.mjs"), "scheduled release runs post-release verification before reporting success");
assert(scheduledRunner.includes("reuse-validated-manifest"), "scheduled release reuses the already approved signed manifest instead of running duplicate QA");
assert(scheduledRunner.includes("retryableHeldManifest"), "scheduled release can retry a transient release failure without bypassing gates");
assert(sopDoctor.includes("BLOG_DISABLE_DEEPSEEK_CRON must be true"), "SOP doctor requires the legacy DeepSeek cron to stay disabled");
assert(sopDoctor.includes("[8, 10]") && sopDoctor.includes("[9, 0]") && sopDoctor.includes("[9, 4]"), "SOP doctor enforces prep/release launch windows in its trigger checks");
assert(sopDoctor.includes("[10, 30]") && sopDoctor.includes("[12, 30]") && sopDoctor.includes("[14, 30]"), "SOP doctor enforces all market-scan launch windows");
assert(sopDoctor.includes("[15, 10]") && sopDoctor.includes("[16, 0]") && sopDoctor.includes("[16, 4]"), "SOP doctor enforces late-day prep/release launch windows");
assert(sopDoctor.includes("[18, 30]") && sopDoctor.includes("[20, 30]"), "SOP doctor enforces late market-scan launch windows");
assert(sopDoctor.includes("production cmsStorage.provider must be cloudflare-kv or gcs"), "SOP doctor verifies a durable production CMS store");
assert(sopDoctor.includes("release verification requires ALTOS_ADMIN_PASSWORD"), "SOP doctor requires admin readback credentials for release");
assert(sopDoctor.includes("\"ready\", \"released\""), "SOP doctor accepts already released candidates for post-release audit");
assert(sopDoctor.includes("releaseVerification.ok"), "SOP doctor verifies released candidates have successful post-release verification");
assert(sopDoctor.includes("market news coverSource must be source"), "SOP doctor verifies source cover provenance in market-news candidates");
assert(sopDoctor.includes("not stock/free image providers"), "SOP doctor blocks stock/free images for market-news source covers");
assert(sopDoctor.includes("coverGeneration.provider must be ChatGPT/GPT"), "SOP doctor verifies GPT cover provenance in prepared release candidates");
assert(sopDoctor.includes("column/feature posts require at least two in-article images"), "SOP doctor verifies columns/features carry in-article images");
assert(sopDoctor.includes("translated column/feature posts must share contentImages[${index}] URL"), "SOP doctor verifies translated columns/features share identical content image URLs");
assert(releaseVerifier.includes("manifest status must be released"), "release verifier requires a released prepared-candidate manifest");
assert(
  releaseVerifier.includes("qualityStatus: \"passed\"") && releaseVerifier.includes("admin readback ${key} must be ${expected}"),
  "release verifier checks protected admin quality metadata"
);
assert(releaseVerifier.includes("admin readback generatedBy must keep Gemini provenance"), "release verifier checks Gemini provenance without exposing it publicly");
assert(!releaseVerifier.includes("public API generatedBy does not show Gemini provenance"), "release verifier does not require public Gemini provenance leakage");
assert(releaseVerifier.includes("public API market news coverSource must be source"), "release verifier checks market-news source cover metadata");
assert(releaseVerifier.includes("not stock/free image providers"), "release verifier blocks stock/free images for market-news source covers");
assert(releaseVerifier.includes("public API column/feature contentImages must include at least two images"), "release verifier checks live column/feature in-article images");
assert(releaseVerifier.includes("qualityManifest content image URLs do not match article set"), "release verifier checks content image URLs against the signed manifest");
assert(releaseVerifier.includes("ALTOS_ADMIN_PASSWORD") && releaseVerifier.includes("/api/admin/auth/login"), "release verifier can log in for protected admin readback");
assert(releaseVerifier.includes("og:image") && releaseVerifier.includes("twitter:image"), "release verifier checks social preview images");
assert(releaseVerifier.includes("/feed.xml") && releaseVerifier.includes("/sitemap.xml") && releaseVerifier.includes("/llms.txt"), "release verifier checks public metadata surfaces");
assert(releaseVerifier.includes("AI-generated") && releaseVerifier.includes("SEO\\s*\\/\\s*GEO"), "release verifier blocks public leakage of internal production copy");
assert(launchAgentPlist.includes("blog-scheduled-runner.mjs --scheduled"), "LaunchAgent runs the scheduled prep/release runner");
assert(launchAgentPlist.includes("<integer>8</integer>") && launchAgentPlist.includes("<integer>15</integer>"), "LaunchAgent includes prep windows");
assert(launchAgentPlist.includes("<integer>10</integer>") && launchAgentPlist.includes("<integer>20</integer>"), "LaunchAgent includes market scan windows");
assert(launchAgentPlist.includes("<integer>4</integer>"), "LaunchAgent includes post-release follow-up minutes");
assert(launchAgentInstaller.includes("replace-with|test-secret"), "LaunchAgent installer refuses placeholder or test ingest secrets");
assert(launchAgentInstaller.includes("launchctl bootstrap"), "LaunchAgent installer can bootstrap the scheduled local worker");
assert(blogArticle.includes("extractSourceTranslationNote"), "article renderer extracts source translation note from main body");
assert(blogArticle.includes("source-translation-note"), "article renderer displays source translation note as a compact support block");
assert(richText.includes("rich-highlight"), "rich text renderer supports in-article highlight marks");
assert(richText.includes("==[^=\\n]+=="), "rich text renderer parses ==highlight== syntax");
assert(
  globals.includes("--article-highlight-line: rgb(164 255 0 / 0.18);") && globals.includes("color: #000000;"),
  "article highlight underline uses ALTOS LAB lime at 18% opacity with black text"
);
assert(adminShell.includes("applyBodyHighlight"), "admin editor can insert article highlight syntax from the body editor");
assert(generation.includes("#A4FF00 emphasis underline"), "generation prompt teaches the fixed article highlight convention");
assert(!blogArticle.includes("alternates.map"), "article renderer does not show the extra language pill row above the headline");
assert(!blogIndex.includes("blog-language-links"), "blog index does not show extra language pill links in the sidebar");
assert(tokensCss.includes("--paper: oklch(99.5% 0 0);"), "runtime tokens include source-aligned Blog paper token");
assert(tokensCss.includes("--ink-1000: oklch(8% 0 0);"), "runtime tokens reserve source-aligned Blog display ink");
assert(tokensCss.includes("--font-display: var(--font-serif), var(--cjk-serif);"), "runtime tokens expose combined display font stack");
assert(
  tokensCss.includes('--font-space: "Space Grotesk", var(--font-space-grotesk'),
  "runtime tokens expose Space Grotesk first for the AI wordmark"
);
assert(tokensCss.includes("--tap-min: 44px;"), "runtime tokens preserve 44px touch target contract");
assert(tokensCss.includes("--al-blog-accent: var(--fg-display);"), "Blog accent compatibility token stays greyscale");
assert(tokensCss.includes("--al-blog-column-gap: var(--sp-8);"), "Blog layout compatibility gap points to spacing token");
assert(tokensCss.includes("--type-breaking-bg: oklch(96% 0.035 72);"), "runtime tokens include breaking badge color");
assert(tokensCss.includes("--type-breaking-fg: oklch(31% 0.12 58);"), "runtime tokens include deep breaking badge text color");
assert(tokensJson.color.paper.$value === "oklch(99.5% 0 0)", "tokens.json mirrors Blog paper token");
assert(tokensJson.color["type-breaking-bg"].$value === "oklch(96% 0.035 72)", "tokens.json mirrors breaking badge color");
assert(tokensJson.color["type-column-bg"].$value === "oklch(96% 0.025 250)", "tokens.json mirrors column badge color");
assert(tokensJson.color["type-feature-bg"].$value === "oklch(96% 0.032 150)", "tokens.json mirrors feature badge color");
assert(tokensJson.color["type-breaking-fg"].$value === "oklch(31% 0.12 58)", "tokens.json mirrors deep breaking badge text color");
assert(tokensJson.color["type-column-fg"].$value === "oklch(31% 0.1 250)", "tokens.json mirrors deep column badge text color");
assert(tokensJson.color["type-feature-fg"].$value === "oklch(30% 0.095 150)", "tokens.json mirrors deep feature badge text color");
assert(tokensJson.fontSize.prose.$value === "17px", "tokens.json includes prose size to match runtime token");
assert(tokensJson.compatibility.blog.accent.$value === "{semantic.fg-display}", "tokens.json keeps Blog accent greyscale");
assert(tokensJson.legacyWebsite.color["lime-500"].$value === "#C8FF00", "tokens.json preserves non-blog legacy website tokens");
assert(!globals.includes("--al-blog-bg: #"), "Blog shell does not hard-code local background color");
assert(!globals.includes("--al-blog-accent: #"), "Blog shell does not hard-code local accent color");
assert(!globals.includes("rgba(188, 255, 77, 0.08)"), "rich chart chrome does not use old green accent wash");
assert(!globals.includes("rgba(162, 198, 38"), "Blog type badges do not use green UI accents");
assert(!globals.includes("rgba(45, 95, 225"), "Blog type badges do not use blue UI accents");
assert(globals.includes(".blog-craft-brand h1") && globals.includes("font-family: var(--font-space);"), "Blog AI wordmark uses the Space Grotesk token");
assert(globals.includes(".blog-craft-brand h1 em") && globals.includes("font-family: var(--font-display);"), "Blog Craft wordmark stays Newsreader italic");
assert(globals.includes("--type-badge-bg: var(--type-breaking-bg);"), "breaking badge uses its content-type color token");
assert(globals.includes("--type-badge-bg: var(--type-column-bg);"), "column badge uses its content-type color token");
assert(globals.includes("--type-badge-bg: var(--type-feature-bg);"), "feature badge uses its content-type color token");
assert(siteHeader.includes("Globe"), "site header uses a globe icon for language switching");
assert(!siteHeader.includes("Globe2"), "site header uses the simpler line globe icon");
assert(siteHeader.includes("aria-expanded={isLanguageMenuOpen}"), "language menu trigger exposes expanded state");
assert(siteHeader.includes("role=\"menuitemradio\""), "language dropdown options expose selectable menu semantics");
assert(!siteHeader.includes("aria-pressed={language"), "language switcher no longer renders as a segmented control");
assert(blogArticle.includes("related-article-image"), "related article cards include an image area");
assert(blogArticle.includes("SafeBlogImage compact post={relatedVisualPost}"), "related article cards render real covers when available");
assert(blogArticle.includes("article-tag-strip"), "article footer renders tag chips before the author note");
assert(blogArticle.includes("article-author-card"), "article footer replaces CTA with ALTOS LAB author card");
assert(blogTypes.includes("BlogInlineImage"), "blog schema supports structured in-article images");
assert(cms.includes("normalizeContentImages"), "CMS normalizes structured in-article images");
assert(cms.includes("column and feature posts require at least two in-article images"), "CMS publish validation blocks columns/features without content images");
assert(blogArticle.includes("ArticleBodyWithImages"), "article renderer interleaves structured content images into the article body");
assert(globals.includes(".article-inline-figure"), "Blog article CSS styles structured in-article images");
assert(blogIndex.includes("市場專欄"), "Blog navigation restores the Traditional Chinese market-column lane");
assert(!blogArticle.includes("blog-cta-panel"), "article footer no longer renders the old content-system CTA panel");
assert(blogArticle.includes("const relatedVisualPost = toBlogVisualPost(related)"), "related article image props are sanitized before client serialization");
assert(!blogArticle.includes("SafeBlogImage compact post={related}"), "related article cards do not serialize full post metadata into client image props");
assert(blogIndex.includes("const visualPost = toBlogVisualPost(post)"), "blog index image props are sanitized before client serialization");
assert(!blogIndex.includes("SafeBlogImage compact post={post}"), "blog index cards do not serialize full post metadata into client image props");
assert(!/quality gates/i.test(blogAuthors), "public author profiles do not expose internal quality-gate language");
assert(!globals.includes("site-language-toggle button:nth-child"), "mobile CSS no longer hides segmented language buttons");

assert(cron.includes("pickEditorialBrief"), "cron uses editorial brief and content mix");
assert(cron.includes("reviewBlogPairWithDeepSeek"), "cron runs LLM-as-judge before publish when configured");
assert(cron.includes("BLOG_DISABLE_DEEPSEEK_CRON"), "legacy DeepSeek cron is disabled by default");
assert(cron.includes("hour: \"16:00\""), "afternoon slot is aligned to 16:00 Asia/Taipei");
assert(!vercel.crons?.length, "Vercel no longer runs DeepSeek blog generation crons");
assert(envExample.includes("BLOG_INGEST_HMAC_SECRET"), "env example documents the signed ingest secret");
assert(envExample.includes("ALTOS_BLOG_NODE_BIN"), "env example documents the explicit Node binary for launchd");
assert(envExample.includes("ALTOS_BLOG_WORKER_WAIT_MINUTES"), "env example documents orchestrator timeout");
assert(envExample.includes("BLOG_IMAGE_ALLOW_NON_BLOB"), "env example documents generated image Blob enforcement");
assert(envExample.includes("BLOG_MEDIA_ALLOW_LOCAL_STORAGE"), "env example documents local-only media upload mode");
assert(envExample.includes("BLOG_ALLOW_LOCAL_FALLBACK_COVERS=0"), "env example keeps local fallback covers disabled");
assert(envExample.includes("GCS_STORAGE_ENABLED=1"), "env example documents GCP/GCS storage configuration");
assert(envExample.includes("GA4_PROPERTY_ID="), "env example documents GA4 Data API property configuration");
assert(envExample.includes("SEARCH_CONSOLE_SITE_URL="), "env example documents Search Console reporting configuration");
assert(envExample.includes("ALTOS_REPORT_FROM_EMAIL=Altoslab447@gmail.com"), "env example documents the official daily report sender");
assert(seoGeoReport.includes("ALTOS LAB 每日搜尋與內容成效報告"), "SEO/GEO report renders a plain-language daily report title");
assert(seoGeoReport.includes("Google 搜尋健康分數") && seoGeoReport.includes("AI 搜尋可引用分數"), "SEO/GEO report renders readable readiness scores");
assert(seoGeoReport.includes("下一步行動") && seoGeoReport.includes("為什麼"), "SEO/GEO report converts findings into action motivation");
assert(seoGeoReport.includes("ai_referral_landing"), "SEO/GEO report checks AI referral event wiring");
assert(seoGeoReport.includes("GA4_PROPERTY_ID"), "SEO/GEO report supports optional GA4 Data API metrics");
assert(seoGeoReport.includes("SEARCH_CONSOLE_SITE_URL"), "SEO/GEO report supports optional Search Console metrics");
assert(seoGeoReport.includes("gcloud token fallback"), "SEO/GEO report can use local gcloud token fallback for diagnostics");
assert(seoGeoReport.includes("No qualified public blog posts are currently published"), "SEO/GEO report explains empty fail-closed blog inventory");
assert(seoGeoReport.includes("incompleteMarketNewsGroups"), "SEO/GEO report calls out market-news language gaps");
assert(seoGeoReport.includes("Altoslab447@gmail.com") && seoGeoReport.includes("Altoslab.offical@gmail.com"), "SEO/GEO report documents the official sender and recipient");
assert(operations.includes("Gmail web UI") && operations.includes("hold the send instead of using a connector"), "operations require SEO/GEO daily email to be sent through Gmail web, not a connector");
const gcpSmoke = read("scripts/gcp-production-smoke.mjs");
assert(gcpSmoke.includes("publishedPosts === 0"), "GCP production smoke warns when the public blog inventory is empty");

for (const language of legacySeedLanguages) {
  const languagePosts = seedPosts.filter((post) => post.language === language);
  const languageTypes = new Set(languagePosts.map((post) => post.contentType));
  const languageCategories = new Set(languagePosts.map((post) => post.newsCategory));
  assert(languagePosts.length === 3, `${language} has exactly 3 baseline seed articles`);
  assert(languageTypes.size === 3, `${language} baseline covers breaking, column and feature`);
  assert(languageCategories.size === 3, `${language} baseline covers three editorial categories`);
}

const typeCounts = seedPosts.reduce((counts, post) => {
  counts[post.contentType] = (counts[post.contentType] || 0) + 1;
  return counts;
}, {});
assert(seedPosts.length === 12, "seed archive is currently pruned to 12 baseline articles");
assert(typeCounts.breaking === 4, "baseline has one breaking article per language");
assert(typeCounts.column === 4, "baseline has one column article per language");
assert(typeCounts.feature === 4, "baseline has one feature article per language");

const languageSet = legacySeedLanguages.sort().join("|");
const incompleteGroups = Object.values(
  seedPosts.reduce((groups, post) => {
    groups[post.translationGroupId] ||= new Set();
    groups[post.translationGroupId].add(post.language);
    return groups;
  }, {})
).filter((languages) => [...languages].sort().join("|") !== languageSet);
assert(incompleteGroups.length === 0, "baseline seed translation groups keep the legacy four-language archive complete");

const titlesWithTypeLabels = seedPosts.filter((post) =>
  /市場快訊|Market brief|市場ブリーフ|시장 브리프|專欄[:：]|Column[:：]|Feature[:：]|專題[:：]|特集[:：]|기획[:：]/i.test(
    post.title
  )
);
assert(titlesWithTypeLabels.length === 0, "seed article titles do not contain UI taxonomy labels");

const postsWithoutDatedSource = seedPosts.filter(
  (post) => !post.sourceLinks?.some((source) => source.publishedAt)
);
assert(postsWithoutDatedSource.length === 0, "seed articles include at least one dated real news/source link");

const zhAgentPilot = seedPosts.find((post) => post.slug === "agent-pilot-scorecard-zh-hant");
const zhAgentPilotReadableText = zhAgentPilot
  ? [
      zhAgentPilot.title,
      zhAgentPilot.excerpt,
      zhAgentPilot.geoSummary,
      zhAgentPilot.body,
      ...(zhAgentPilot.keyTakeaways || []),
      ...(zhAgentPilot.faqs || []).flatMap((faq) => [faq.question, faq.answer])
    ].join("\n")
  : "";
assert(Boolean(zhAgentPilot), "zh-Hant agent pilot baseline exists");
assert(
  zhAgentPilotReadableText.includes("把海外新聞翻成企業能用的判斷"),
  "agent pilot article has a clear source-translation section heading"
);
assert(
  !/\b(?:production traces?|eval(?:uation)? loops?|eval-driven|trace|evals?|rollback)\b/i.test(zhAgentPilotReadableText),
  "zh-Hant agent pilot article translates trace/eval/rollback jargon into plain Chinese"
);
assert(/\*\*[^*\n]{4,80}\*\*/.test(zhAgentPilot?.body || ""), "zh-Hant agent pilot article uses concise bold emphasis for scanability");

const breakingWithoutNewsAnchor = seedPosts.filter(
  (post) =>
    post.contentType === "breaking" &&
    !/最新背景|Latest context|最新背景：|최신 배경/.test(post.body || "")
);
assert(breakingWithoutNewsAnchor.length === 0, "breaking articles visibly cite latest source context");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("PASS blog system smoke checks");
