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
const adminShell = read("components/AdminShell.tsx");
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
assert(quality.includes("through Gemini"), "quality gate requires Gemini-written/revised production articles");
assert(quality.includes("ChatGPT/GPT"), "quality gate requires ChatGPT/GPT-generated production covers");
assert(covers.includes("BLOG_IMAGE_STORE_BLOB"), "image pipeline supports optional Vercel Blob persistence");
assert(covers.includes("searchPexels") && covers.includes("searchPixabay"), "image pipeline supports expanded free image APIs");
assert(covers.includes("pinterest") && covers.includes("approvedImageUrl"), "image pipeline rejects Pinterest URLs while allowing style inspiration");
assert(imageQuality.includes("visualChecks"), "image QA requires visualChecks for generated covers");
assert(imageQuality.includes("MIN_IMAGE_WIDTH = 1200"), "image QA checks generated cover dimensions");
assert(imageQuality.includes("isManagedGeneratedCoverUrl"), "image QA accepts managed generated media URLs for Cloudflare or legacy Blob storage");
assert(imageQuality.includes("/api/blog/generated-media/"), "image QA accepts Cloudflare generated-media cover URLs");
assert(ingestAuth.includes("createHmac") && ingestAuth.includes("timingSafeEqual"), "ingest API uses HMAC and timing-safe signature comparison");
assert(ingestRoute.includes("verifyBlogIngestRequest"), "ingest route verifies HMAC before parsing release payloads");
assert(ingestRoute.includes("validateOnly"), "ingest route supports validateOnly dry runs");
assert(ingestRoute.includes("reviewBlogImagesForRelease"), "ingest route runs production image QA before release");
assert(ingestRoute.includes("publish-if-valid"), "ingest route supports publish-if-valid fail-closed mode");
assert(ingestRoute.includes("generation.provider must be gemini-chatgpt"), "ingest route requires the Gemini + GPT production provider");
assert(ingestRoute.includes("duplicateTopicIssues"), "ingest route blocks repeated topics/source angles");
assert(releaseRoute.includes("verifyBlogIngestRequest"), "release-set route verifies HMAC before parsing release payloads");
assert(releaseRoute.includes("qualityManifest") && releaseRoute.includes("contentSha256"), "release-set route requires a signed quality manifest digest");
assert(releaseRoute.includes("generation.provider must be gemini-chatgpt"), "release-set route accepts the Gemini + GPT production provider");
assert(mediaRoute.includes("verifyBlogIngestRequest"), "media upload route is protected by the same signed request contract");
assert(mediaRoute.includes("@vercel/blob"), "media upload route stores production images in Vercel Blob");
assert(mediaRoute.includes("BLOG_MEDIA_ALLOW_LOCAL_STORAGE"), "media upload route supports local-only image storage for end-to-end testing");
assert(generatedMediaRoute.includes("generated-blog-media"), "local generated media can be fetched during end-to-end image QA");
assert(healthRoute.includes("externalBlogIngestConfigured"), "health check reports whether signed external blog ingest is configured");
assert(healthRoute.includes("legacyDeepSeekCronDisabled"), "health check reports whether the legacy DeepSeek cron path is disabled");
assert(proxy.includes("isPublicSignedIngestRoute") && proxy.includes("/api/admin/blog/release-set"), "proxy lets signed ingest/release reach the route without admin cookies");
assert(proxy.includes("/sitemap.xml") && proxy.includes("/robots.txt"), "proxy canonical redirect also covers public metadata routes");
assert(localWorker.includes("localPreflight"), "local worker performs local preflight before production ingest");
assert(localWorker.includes("X-Altos-Signature"), "local worker signs ingest requests");
assert(localWorker.includes("requestMediaUpload"), "local worker uploads generated cover files before ingest");
assert(localWorker.includes("requestRelease") && localWorker.includes("/api/admin/blog/release-set"), "local worker publishes through the formal release-set route");
assert(localWorker.includes("qualityManifest") && localWorker.includes("contentSha256"), "local worker writes a quality manifest with a content digest");
assert(localWorker.includes("chromeEvidence.gemini.usedExistingTab"), "local worker requires Gemini existing-tab evidence");
assert(localWorker.includes("chromeEvidence.chatgpt.usedExistingTab"), "local worker requires ChatGPT/GPT existing-tab evidence");
assert(localWorker.includes("String(post.generatedBy || \"\").toLowerCase().includes(\"gemini\")"), "local worker requires per-post Gemini provenance");
assert(localWorker.includes("Local fallback cover generation is disabled"), "local worker fails closed on fallback cover generation");
assert(localWorker.includes("coverGeneration.provider must be ChatGPT/GPT"), "local worker requires GPT cover provenance");
assert(orchestrator.includes("Gemini must write/revise") && orchestrator.includes("ChatGPT/GPT must generate"), "orchestrator documents Gemini copy and GPT cover requirements");
assert(orchestrator.includes("Close or release Gemini/GPT tabs"), "orchestrator includes Chrome tab cleanup requirements");
assert(!orchestrator.includes("--generate-missing-covers"), "orchestrator does not route production covers through local fallback art");
assert(scheduledRunner.includes("PREP_WINDOWS") && scheduledRunner.includes("RELEASE_WINDOWS"), "scheduled runner separates prep and release windows");
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
assert(sopDoctor.includes("BLOG_DISABLE_DEEPSEEK_CRON must be true"), "SOP doctor requires the legacy DeepSeek cron to stay disabled");
assert(sopDoctor.includes("production cmsStorage.provider must be cloudflare-kv"), "SOP doctor verifies the Cloudflare KV production CMS store");
assert(sopDoctor.includes("release verification requires ALTOS_ADMIN_PASSWORD"), "SOP doctor requires admin readback credentials for release");
assert(sopDoctor.includes("coverGeneration.provider must be ChatGPT/GPT"), "SOP doctor verifies GPT cover provenance in prepared release candidates");
assert(releaseVerifier.includes("manifest status must be released"), "release verifier requires a released prepared-candidate manifest");
assert(releaseVerifier.includes("public API qualityStatus must be passed"), "release verifier checks public quality metadata");
assert(releaseVerifier.includes("ALTOS_ADMIN_PASSWORD") && releaseVerifier.includes("/api/admin/auth/login"), "release verifier can log in for protected admin readback");
assert(releaseVerifier.includes("og:image") && releaseVerifier.includes("twitter:image"), "release verifier checks social preview images");
assert(releaseVerifier.includes("/feed.xml") && releaseVerifier.includes("/sitemap.xml") && releaseVerifier.includes("/llms.txt"), "release verifier checks public metadata surfaces");
assert(releaseVerifier.includes("AI-generated") && releaseVerifier.includes("SEO\\s*\\/\\s*GEO"), "release verifier blocks public leakage of internal production copy");
assert(launchAgentPlist.includes("blog-scheduled-runner.mjs --scheduled"), "LaunchAgent runs the scheduled prep/release runner");
assert(launchAgentPlist.includes("<integer>8</integer>") && launchAgentPlist.includes("<integer>15</integer>"), "LaunchAgent includes prep windows");
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
assert(blogArticle.includes("SafeBlogImage compact post={related}"), "related article cards render real covers when available");
assert(blogArticle.includes("article-tag-strip"), "article footer renders tag chips before the author note");
assert(blogArticle.includes("article-author-card"), "article footer replaces CTA with ALTOS LAB author card");
assert(!blogArticle.includes("blog-cta-panel"), "article footer no longer renders the old content-system CTA panel");
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

for (const language of ["zh-Hant", "en", "ja", "ko"]) {
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

const languageSet = ["zh-Hant", "en", "ja", "ko"].sort().join("|");
const incompleteGroups = Object.values(
  seedPosts.reduce((groups, post) => {
    groups[post.translationGroupId] ||= new Set();
    groups[post.translationGroupId].add(post.language);
    return groups;
  }, {})
).filter((languages) => [...languages].sort().join("|") !== languageSet);
assert(incompleteGroups.length === 0, "baseline translation groups have all four languages");

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
