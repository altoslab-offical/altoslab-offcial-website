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
const adminBlogRefreshRoute = read("app/api/admin/blog/refresh-public-cache/route.ts");
const bulkPatchRoute = read("app/api/admin/blog/bulk-patch/route.ts");
const mediaRoute = read("app/api/admin/blog/media/route.ts");
const generatedMediaRoute = read("app/api/blog/generated-media/[filename]/route.ts");
const healthRoute = read("app/api/health/route.ts");
const proxy = readFirst(["middleware.ts", "proxy.ts"]);
const nextConfig = read("next.config.mjs");
const localWorker = read("scripts/blog-local-worker.mjs");
const orchestrator = read("scripts/blog-antigravity-orchestrator.mjs");
const scheduledRunner = read("scripts/blog-scheduled-runner.mjs");
const productionRepair = read("scripts/blog-production-repair.mjs");
const backfillPlanner = read("scripts/blog-backfill-planner.mjs");
const subagentModelPolicy = read("scripts/blog-subagent-model-policy.mjs");
const marketSourceScanner = read("scripts/blog-market-source-scanner.mjs");
const marketSourceWorker = read("scripts/blog-market-source-worker.mjs");
const marketAutoRepair = read("scripts/blog-market-auto-repair.mjs");
const marketTranslationService = read("scripts/blog-market-translation-service.mjs");
const publicMarketProjectionCleaner = read("scripts/blog-clean-public-market-news-projection.mjs");
const sopDoctor = read("scripts/blog-sop-doctor.mjs");
const releaseVerifier = read("scripts/verify-blog-release.mjs");
const cloudflareSetup = read("scripts/cloudflare-free-deploy-setup.sh");
const cloudflareSeed = read("scripts/cloudflare-seed-kv.mjs");
const cloudflareMigratePublicBlogCache = read("scripts/cloudflare-migrate-public-blog-cache.mjs");
const cloudflareSmoke = read("scripts/cloudflare-smoke.mjs");
const cloudflareDirectBlog = read("cloudflare/blog-html-direct-worker.js");
const n8nLocalBridge = read("scripts/n8n-local-bridge.mjs");
const n8nLocalControlPlaneVerifier = read("scripts/verify-n8n-local-control-plane.sh");
const blogDailyCloseout = read("scripts/blog-daily-closeout.mjs");
const blogTrafficSelfEvolution = read("scripts/blog-traffic-self-evolution.mjs");
const cloudflareStagingConfig = read("wrangler.staging.jsonc");
const cmsStorage = read("lib/cms-storage.ts");
const launchAgentPlist = read("scripts/com.altoslab.blog-local-worker.plist.example");
const launchAgentInstaller = read("scripts/install-blog-launch-agent.sh");
const seoGeoReport = read("scripts/seo-geo-insight-report.mjs");
const operations = read("docs/OPERATIONS.md");
const automationHandoff = read("docs/blog-automation-handoff.md");
const imageStyleGuide = read("docs/content/ai-blog-image-style-guide.md");
const columnVisualStyleLibrary = read("scripts/blog-column-visual-style-library.mjs");
const adminShell = read("components/AdminShell.tsx");
const blogAuthors = read("lib/blog-authors.ts");
const blogTypes = read("lib/types.ts");
const cms = read("lib/cms.ts");
const blogArticle = read("components/BlogArticle.tsx");
const blogIndex = read("components/BlogIndex.tsx");
const blogApiRoute = read("app/api/blog/route.ts");
const feedRoute = read("app/feed.xml/route.ts");
const rssAliasRoute = read("app/rss.xml/route.ts");
const llmsRoute = read("app/llms.txt/route.ts");
const llmsFullRoute = read("app/llms-full.txt/route.ts");
const sitemapRoute = read("app/sitemap.ts");
const richText = read("components/RichText.tsx");
const siteHeader = read("components/site/SiteHeader.tsx");
const blogUtils = read("lib/blog-utils.ts");
const globals = read("app/globals.css");
const tokensCss = read("design/tokens.css");
const tokensJson = JSON.parse(read("design/tokens.json"));
const vercel = JSON.parse(read("vercel.json"));
const envExample = read(".env.example");
const marketSeed = read("lib/market-blog-seed.ts");
const seedMatch = marketSeed.match(/export const marketBlogPosts = ([\s\S]*?) satisfies BlogPost\[];/);
const seedPosts = seedMatch ? JSON.parse(seedMatch[1]) : [];
const targetLanguages = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

assert(sourceRegistry.includes("BLOG_NEWS_MIX"), "source registry exposes content/news mix");
assert((sourceRegistry.match(/tier: "official-rss"/g) || []).length >= 8, "source registry has at least 8 official RSS sources");
assert(
  sourceRegistry.includes("Hacker News Algolia API") &&
    sourceRegistry.includes("hn.algolia.com/api/v1/search_by_date") &&
    sourceRegistry.includes("TechCrunch AI") &&
    sourceRegistry.includes("The Verge AI") &&
    sourceRegistry.includes("VentureBeat AI") &&
    sourceRegistry.includes("WIRED AI") &&
    sourceRegistry.includes("MIT Technology Review AI") &&
    sourceRegistry.includes("The Register AI/ML") &&
    sourceRegistry.includes("InfoWorld AI") &&
    sourceRegistry.includes("Channel NewsAsia AI") &&
    sourceRegistry.includes("Tech in Asia AI") &&
    sourceRegistry.includes("KrASIA AI") &&
    sourceRegistry.includes("DealStreetAsia Southeast Asia"),
  "source registry includes mainstream AI RSS feeds and a free market-news discovery API"
);
assert(
  read("scripts/blog-market-source-scanner.mjs").includes("\"the-register-ai\"") &&
    read("scripts/blog-market-source-scanner.mjs").includes("\"infoworld-ai\"") &&
    read("scripts/blog-market-source-scanner.mjs").includes("\"microsoft-azure-ai\"") &&
    read("scripts/blog-market-source-scanner.mjs").includes("\"microsoft-research\"") &&
    read("scripts/blog-market-source-scanner.mjs").includes("\"channel-newsasia-ai\""),
  "longform market-news source profile includes expanded official/media/APAC feeds"
);
assert((sourceRegistry.match(/tier: "licensed-image"/g) || []).length >= 3, "source registry has licensed image providers");
assert(!/pinterest\.(com|[a-z]+)/i.test(sourceRegistry), "source registry does not use Pinterest as an image source");

assert(generation.includes("BLOG_PROMPT_VERSION"), "generation records prompt version");
assert(generation.includes("sourceRegistryEntryForUrl"), "generation ranks sources with registry metadata");
assert(!generation.includes("deepseek-chat"), "generation does not use deprecated deepseek-chat alias");
assert(generation.includes("Subtitle/standfirst craft rules"), "generation keeps compelling subtitle/standfirst guidance");
assert(
  generation.includes("Read the sources first, notice the actual story shape") &&
    generation.includes("They should not look like a filled-in framework"),
  "generation absorbs article feel without forcing creative narrative templates"
);
assert(
  generation.includes("Foreign-source context must be plain-language news attribution"),
  "generation requires foreign news to become plain-language source translation"
);
assert(
  generation.includes("Do not turn the article into an ALTOS LAB column"),
  "generation prevents market-news briefs from becoming column templates"
);

assert(quality.includes("withLlmQualityEvaluation"), "quality gate can merge LLM-as-judge evaluation");
assert(quality.includes("registryTrustedHostFragments"), "quality source trust uses the source registry");
assert(quality.includes("weakSubtitlePatterns"), "quality gate rejects weak generic subtitles");
assert(quality.includes("subtitleEvidencePattern"), "quality gate requires subtitle evidence or operator tension");
assert(quality.includes("rawZhEnglishJargonPattern"), "quality gate rejects raw English AI-ops jargon in zh-Hant articles");
assert(quality.includes("technicalJargonPattern"), "quality gate requires jargon-heavy paragraphs to explain terms plainly");
assert(quality.includes('"hentai"'), "quality gate blocks obvious off-topic adult typo terms in public blog copy");
assert(
  quality.includes("source-translation") && quality.includes("production articles must be written or revised through Gemini or Codex before release"),
  "quality gate requires Gemini/Codex-written or revised columns/features while allowing source-translated market news"
);
assert(quality.includes("official announcement image lane before release"), "quality gate requires market-news source or official announcement covers");
assert(quality.includes("market news posts must not expose internal source-translation"), "quality gate blocks market-news template/process headings");
assert(quality.includes("ChatGPT/GPT"), "quality gate requires ChatGPT/GPT-generated production covers for generated-cover lanes");
assert(quality.includes("legacy repair visual"), "quality gate rejects legacy repair visuals in generated column lanes");
assert(quality.includes("recycled section template headings"), "quality gate rejects recycled column section templates");
assert(quality.includes("professional source-backed column"), "quality gate requires knowledge-dense professional columns");
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
assert(ingestRoute.includes("getPublishedBlogDuplicatePosts"), "Cloudflare ingest validate uses a lightweight duplicate cache instead of reading full CMS data");
assert(ingestRoute.includes("verifySourceLinks: !boundedValidate"), "Cloudflare ingest validate skips remote source probes in bounded Worker path");
assert(ingestRoute.includes("verifyRemoteImage: !boundedValidate"), "Cloudflare ingest validate skips remote image probes in bounded Worker path");
assert(ingestRoute.includes("publish-if-valid"), "ingest route supports publish-if-valid fail-closed mode");
assert(
  ingestRoute.includes("hermes-owner") && ingestRoute.includes("codex-gpt-5.4") && ingestRoute.includes("source-translation"),
  "ingest route accepts Gemini/GPT columns plus source-translation and Hermes/Codex market-news lanes"
);
assert(ingestRoute.includes("duplicateTopicIssues"), "ingest route blocks repeated topics/source angles");
assert(ingestRoute.includes("duplicateCoverIssues"), "ingest route blocks repeated cover images across different article groups");
assert(ingestRoute.includes("market news coverSource must be source"), "ingest route enforces source covers for market-news posts");
assert(ingestRoute.includes("not stock/free image providers"), "ingest route blocks stock/free images for market-news source covers");
assert(releaseRoute.includes("verifyBlogIngestRequest"), "release-set route verifies HMAC before parsing release payloads");
assert(releaseRoute.includes("qualityManifest") && releaseRoute.includes("contentSha256"), "release-set route requires a signed quality manifest digest");
assert(
  releaseRoute.includes("hermes-owner") && releaseRoute.includes("codex-gpt-5.4") && releaseRoute.includes("source-translation"),
  "release-set route accepts Gemini/GPT columns plus source-translation and Hermes/Codex market-news lanes"
);
assert(releaseRoute.includes("releaseCoverContractIssues"), "release-set route blocks localhost/http covers and mismatched multilingual covers");
assert(releaseRoute.includes("column/feature posts require at least two in-article images"), "release-set route blocks columns/features without required in-article images");
assert(releaseRoute.includes("contentImages URLs do not match release payload"), "release-set route verifies signed content image URLs during publish");
assert(releaseRoute.includes("generatedMediaReachabilityIssues"), "release-set route verifies same-origin generated-media URLs before publish");
assert(releaseRoute.includes("applyManifestReleaseReview"), "release-set route applies the signed manifest release decision directly");
assert(releaseRoute.includes("reviewBlogPairForAutoPublish"), "release-set route reruns full article QA during publish");
assert(!releaseRoute.includes("reviewBlogImagesForRelease"), "release-set route does not rerun remote image QA during publish");
assert(mediaRoute.includes("verifyBlogIngestRequest"), "media upload route is protected by the same signed request contract");
assert(mediaRoute.includes("@vercel/blob"), "media upload route stores production images in Vercel Blob");
assert(mediaRoute.includes("storeGcsImage"), "media upload route can store production images in GCS for Cloud Run");
assert(mediaRoute.includes("BLOG_MEDIA_ALLOW_LOCAL_STORAGE"), "media upload route supports local-only image storage for end-to-end testing");
assert(adminBlogRefreshRoute.includes("verifyBlogIngestRequest"), "public cache refresh route accepts the same signed request contract");
assert(bulkPatchRoute.includes("refreshPublicBlogCacheFromStorage"), "bulk patch refreshes derived public blog caches after published content changes");
assert(bulkPatchRoute.includes("generatedMediaReachabilityIssues"), "bulk patch blocks published articles with missing same-origin generated-media URLs");
assert(generatedMediaRoute.includes("generated-blog-media"), "local generated media can be fetched during end-to-end image QA");
assert(generatedMediaRoute.includes("readGcsObject"), "generated media route can read GCS-backed images");
assert(healthRoute.includes("externalBlogIngestConfigured"), "health check reports whether signed external blog ingest is configured");
assert(healthRoute.includes("imageGcsStorageConfigured"), "health check reports whether GCS generated media is configured");
assert(healthRoute.includes("legacyDeepSeekCronDisabled"), "health check reports whether the legacy DeepSeek cron path is disabled");
assert(
  proxy.includes("isPublicSignedIngestRoute") &&
    proxy.includes("/api/admin/blog/release-set") &&
    proxy.includes("/api/admin/blog/refresh-public-cache"),
  "proxy lets signed ingest/release/refresh reach the route without admin cookies"
);
assert(proxy.includes("/sitemap.xml") && proxy.includes("/robots.txt"), "proxy canonical redirect also covers public metadata routes");
assert(
  nextConfig.includes("agent-products-need-evidence-contracts-before-autonomy-zh-hant") &&
    nextConfig.includes("ai-agent-first-workflow-pilot-quality-loop-zh-hant"),
  "Next config redirects the stale GTM coverage blog slug to a live article"
);
assert(localWorker.includes("localPreflight"), "local worker performs local preflight before production ingest");
assert(localWorker.includes("X-Altos-Signature"), "local worker signs ingest requests");
assert(localWorker.includes("requestMediaUpload"), "local worker uploads generated cover files before ingest");
assert(localWorker.includes("legacy repair visual"), "local worker rejects legacy repair visuals before production ingest");
assert(localWorker.includes("requestRelease") && localWorker.includes("/api/admin/blog/release-set"), "local worker publishes through the formal release-set route");
assert(localWorker.includes("qualityManifest") && localWorker.includes("contentSha256"), "local worker writes a quality manifest with a content digest");
assert(localWorker.includes("reuse-validated-manifest"), "local worker can reuse a signed validate-only manifest during release");
assert(localWorker.includes('evening: "20:00"'), "local worker supports the evening daily column slot");
assert(localWorker.includes("isSourceTranslationLane"), "local worker allows source-translation market news without Gemini tab evidence");
assert(localWorker.includes("requiresGptCover"), "local worker only requires ChatGPT/GPT evidence when generated covers are needed");
assert(localWorker.includes("sourceTranslatedMarketNews") && localWorker.includes("generatedBy.includes(\"codex\")"), "local worker requires Gemini/Codex provenance except source-translated market news");
assert(localWorker.includes("Local fallback cover generation is disabled"), "local worker fails closed on fallback cover generation");
assert(localWorker.includes("coverGeneration.provider must be ChatGPT/GPT"), "local worker requires GPT cover provenance");
assert(localWorker.includes("articleSetCoverIssues"), "local worker requires one shared cover URL across translated article versions");
assert(localWorker.includes("articleSetContentImageIssues"), "local worker requires one shared content image URL set across translated article versions");
assert(localWorker.includes("contentImages.length < 2"), "local worker blocks columns/features without at least two in-article images");
assert(localWorker.includes("content image caption must be localized"), "local worker blocks non-localized public image captions");
assert(localWorker.includes("blog-content-image"), "local worker uploads GPT content images through the signed media route");
assert(localWorker.includes("not stock/free image providers"), "local worker blocks stock/free images for market-news source covers");
assert(localWorker.includes("market news fast lane requires translated versions for every configured language"), "local worker blocks market-news sets missing any configured language");
assert(ingestRoute.includes("market news fast lane requires translated versions for every configured language"), "ingest route blocks market-news sets missing any configured language");
assert(releaseRoute.includes("market news fast lane requires translated versions for every configured language"), "release route blocks market-news sets missing any configured language");
assert(
  orchestrator.includes("source-translation") &&
    orchestrator.includes("Market news uses verified source articles") &&
    orchestrator.includes("Do not use Gemini by default for market-news backfill"),
  "orchestrator documents source-translated market news without default Gemini requirements"
);
assert(orchestrator.includes("Column/feature cover images must be generated through ChatGPT/GPT"), "orchestrator documents GPT covers for columns/features");
assert(subagentModelPolicy.includes("gpt-5.3-codex-spark"), "subagent policy keeps Spark as the primary bounded worker model");
assert(subagentModelPolicy.includes("gpt-5.4-mini"), "subagent policy falls back to 5.4 mini when Spark usage is exhausted");
assert(subagentModelPolicy.includes("isSubagentUsageExhausted") && subagentModelPolicy.includes("resource[_\\s-]*exhausted"), "subagent policy detects quota/rate/resource exhaustion");
assert(scheduledRunner.includes("subagentModelPolicyText"), "scheduled runner includes subagent fallback policy in column prompt cards");
assert(backfillPlanner.includes("subagentModelPolicyText"), "backfill planner includes subagent fallback policy in column prompt cards");
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
  scheduledRunner.includes("Array.from({ length: 12 }") && scheduledRunner.includes("hour: index + 10, minute: 15"),
  "scheduled runner scans market fastlane hourly during the active website window"
);
assert(
  scheduledRunner.includes("skipped remote source reachability probe in bounded Worker validate path"),
  "scheduled runner does not treat bounded Worker source-probe skip warnings as hard market-news blockers"
);
assert(scheduledRunner.includes("awaiting_browser_production"), "scheduled prep creates a manifest skeleton instead of pretending to publish");
assert(scheduledRunner.includes("releaseGateIssues"), "scheduled release checks the prepared candidate manifest before publishing");
assert(scheduledRunner.includes("releaseWindowIssue"), "scheduled release refuses to publish outside the configured release window");
assert(scheduledRunner.includes("RELEASE_GRACE_MINUTES"), "scheduled release allows a small launchd delay but no early or stale publish");
assert(scheduledRunner.includes("dailyColumnTargetStatus") && scheduledRunner.includes("column-release-daily-target-met"), "scheduled release checks public daily column inventory before stale held candidates can fail an already-complete day");
assert(scheduledRunner.includes("force-release"), "scheduled release has an explicit manual override for emergency operation");
assert(
  scheduledRunner.includes("column-quality-repair-required") && scheduledRunner.includes("quality-repair-required") && scheduledRunner.includes("publish-after-validate"),
  "scheduled release turns missing or held candidates into repair-required work and publishes after validation"
);
assert(scheduledRunner.includes("articleSetPath file is missing"), "scheduled release checks that the ready article set still exists");
assert(scheduledRunner.includes("scripts/blog-sop-doctor.mjs"), "scheduled prep/release runs the SOP doctor before continuing");
assert(scheduledRunner.includes("compactDoctorResult") && scheduledRunner.includes("scheduled-runner.log"), "scheduled runner records compact doctor evidence in output and logs");
assert(scheduledRunner.includes("scripts/blog-production-repair.mjs"), "scheduled runner attempts bounded production CMS/GCS repair before holding on doctor failure");
assert(scheduledRunner.includes("ALTOS_BLOG_PRODUCTION_AUTO_REPAIR"), "scheduled runner can disable production repair explicitly during maintenance");
assert(scheduledRunner.includes("production-repair"), "scheduled runner records production repair evidence in the schedule log");
assert(scheduledRunner.includes("scripts/verify-blog-release.mjs"), "scheduled release runs post-release verification before reporting success");
assert(scheduledRunner.includes("reuse-validated-manifest"), "scheduled release reuses the already approved signed manifest instead of running duplicate QA");
assert(scheduledRunner.includes("retryableHeldManifest"), "scheduled release can retry a transient release failure without bypassing gates");
assert(scheduledRunner.includes("--backfill") && scheduledRunner.includes("runBackfillPlanner"), "scheduled runner can create a backfill queue without publishing");
assert(scheduledRunner.includes("ALTOS_BLOG_BACKFILL_TARGET_POSTS") && scheduledRunner.includes("blog-backfill-planner.mjs"), "scheduled runner wires backfill to the local launchd worker");
assert(backfillPlanner.includes("DEFAULT_TARGET_POSTS = 0"), "backfill planner has no hard public post cap by default");
assert(backfillPlanner.includes("disabled_no_hard_cap"), "backfill planner stays disabled until an explicit target is provided");
assert(backfillPlanner.includes("held_public_inventory_empty"), "backfill planner fails closed when public inventory is empty");
assert(scheduledRunner.includes("ALTOS_BLOG_AUTO_BACKFILL") && scheduledRunner.includes("--with-backfill"), "scheduled runner only runs target backfill when explicitly enabled");
assert(backfillPlanner.includes("targetPostsPerLanguage") && backfillPlanner.includes("currentMinPostsPerLanguage"), "backfill planner treats explicit targets as per-language inventory, not whole-site inventory");
assert(backfillPlanner.includes("missingByLanguage") && backfillPlanner.includes("Math.max(0, ...missingByLanguage"), "backfill planner creates one multilingual set for each missing post in the lowest-coverage language");
assert(backfillPlanner.includes("POSTS_PER_SET = LANGUAGES.length"), "backfill planner calculates missing posts in complete language sets");
assert(backfillPlanner.includes('DEFAULT_LANES = ["market", "column"]'), "backfill planner alternates market-news and column lanes");
assert(
  backfillPlanner.includes("awaiting_source_translation_production") && backfillPlanner.includes("awaiting_browser_production"),
  "backfill planner creates lane-specific held production queue states"
);
assert(backfillPlanner.includes("Old 4-language sets") && backfillPlanner.includes("cannot satisfy backfill"), "backfill planner rejects old incomplete language sets as a backfill shortcut");
assert(backfillPlanner.includes("Market news must use the credited source article") && backfillPlanner.includes("Original columns need ChatGPT/GPT"), "backfill planner preserves market source-image and column GPT-image rules");
assert(backfillPlanner.includes("/api/blog") && backfillPlanner.includes("publishedPosts"), "backfill planner measures the live public blog inventory");
assert(backfillPlanner.includes("plannedPublishedPosts"), "backfill planner reports the post count expected after complete multilingual sets");
assert(marketSourceScanner.includes("og:image") && marketSourceScanner.includes("twitter:image"), "market source scanner extracts source article social images");
assert(marketSourceScanner.includes("GDELT") || sourceRegistry.includes("GDELT DOC API"), "market source scanner is backed by expanded free discovery sources");
assert(marketSourceScanner.includes("CONSUMER_NOISE_PATTERN"), "market source scanner filters irrelevant consumer-news noise");
assert(marketSourceScanner.includes("google-cloud-ai-blog") && marketSourceScanner.includes("search-engine-land"), "longform market-news profile includes expanded AI infrastructure and GEO/search sources");
assert(marketSourceScanner.includes("liveDuplicateState"), "market source scanner checks live duplicate source URLs, covers and titles");
assert(marketSourceWorker.includes('contentType: "breaking"'), "market source worker marks every generated post as breaking so source-image QA uses market-news thresholds");
assert(marketAutoRepair.includes("removeRepeatedPublisherLead"), "market auto-repair removes repeated publisher lead templates from body paragraphs");
assert(!marketSourceScanner.includes("current AI coverage page for related reporting"), "market source scanner does not publish generic source index pages as article sources");
assert(sopDoctor.includes("BLOG_DISABLE_DEEPSEEK_CRON must be true"), "SOP doctor requires the legacy DeepSeek cron to stay disabled");
assert(sopDoctor.includes("[8, 10]") && sopDoctor.includes("[9, 0]") && sopDoctor.includes("[9, 4]"), "SOP doctor enforces prep/release launch windows in its trigger checks");
assert(sopDoctor.includes("[10, 15]") && sopDoctor.includes("[11, 15]") && sopDoctor.includes("[14, 15]"), "SOP doctor enforces hourly market-scan launch windows");
assert(sopDoctor.includes("[15, 10]") && sopDoctor.includes("[16, 0]") && sopDoctor.includes("[16, 4]"), "SOP doctor enforces late-day prep/release launch windows");
assert(sopDoctor.includes("[19, 10]") && sopDoctor.includes("[20, 0]") && sopDoctor.includes("[21, 15]"), "SOP doctor enforces evening release and late market-scan launch windows");
assert(sopDoctor.includes("production cmsStorage.provider must be cloudflare-d1, cloudflare-kv, gcs or aws-s3"), "SOP doctor verifies a durable production CMS store");
assert(cmsStorage.includes('provider: "cloudflare-d1"') || cmsStorage.includes("provider: \"cloudflare-d1\""), "CMS storage can use Cloudflare D1 as the primary durable store");
assert(cmsStorage.includes('provider: "aws-s3"') || cmsStorage.includes("provider: \"aws-s3\""), "CMS storage can use AWS S3 as the migration durable store");
assert(
  read("scripts/migrate-d1-cms-to-aws-s3.mjs").includes("cloudflareD1Chunked") &&
    read("scripts/migrate-d1-cms-to-aws-s3.mjs").includes("PutObjectCommand") &&
    read("scripts/migrate-d1-cms-to-aws-s3.mjs").includes("public-projection"),
  "AWS migration can copy the chunked D1 CMS payload into S3 or rebuild from public projection"
);
assert(productionRepair.includes("altoslab-official-cms-934551798702"), "production repair targets the canonical GCS CMS bucket");
assert(productionRepair.includes("gcloud") && productionRepair.includes("run") && productionRepair.includes("services") && productionRepair.includes("update"), "production repair can update the existing Cloud Run service env");
assert(productionRepair.includes("--update-env-vars"), "production repair updates only runtime env vars instead of rebuilding or publishing content");
assert(productionRepair.includes("CLOUDSDK_CORE_ACCOUNT"), "production repair tests available gcloud accounts without changing global account state");
assert(productionRepair.includes("DEFAULT_GCLOUD_ACCOUNT = \"altoslab.offical@gmail.com\""), "production repair defaults to the official production GCP account");
assert(productionRepair.includes("ALTOS_GOOGLE_OPERATOR_ACCOUNT"), "production repair can inherit the unified Google operator account");
assert(!productionRepair.includes("process.env.CLOUDSDK_CORE_ACCOUNT || DEFAULT_GCLOUD_ACCOUNT"), "production repair is not redirected by ambient CLOUDSDK_CORE_ACCOUNT");
assert(productionRepair.includes("It never generates") && productionRepair.includes("publishes blog content"), "production repair documents its no-content-generation boundary");
assert(productionRepair.includes("data/blog-repair"), "production repair writes a durable repair report");
assert(cloudflareSetup.includes("ALTOS_CLOUDFLARE_WRANGLER_CONFIG"), "Cloudflare setup can target staging or production Wrangler configs");
assert(cloudflareSetup.includes("secret put \"$name\" --config \"$WRANGLER_CONFIG\""), "Cloudflare setup syncs secrets to the selected Worker config without printing values");
assert(cloudflareSeed.includes("cms:${safeStorageKey") && cloudflareSeed.includes("\"kv\"") && cloudflareSeed.includes("\"key\"") && cloudflareSeed.includes("\"put\""), "Cloudflare seed writes the CMS snapshot into the configured KV namespace");
assert(cloudflareSeed.includes("\"--remote\""), "Cloudflare seed writes staging CMS data to remote KV, not local Wrangler storage");
assert(cms.includes("public-blog-list") && cms.includes("public-blog-detail"), "public blog cache is split into list and detail keys for Cloudflare CPU safety");
assert(cms.includes("public_blog_posts") && cms.includes("readPublicBlogD1ProjectionDetail"), "public blog reads can use compact D1 projection instead of reconstructing the full CMS blob");
assert(
  cms.includes("publicBlogDetailRefreshLimitPerLanguage") &&
    cms.includes("isCloudflarePublicRuntime() ? 0 : 24") &&
    cms.includes("PUBLIC_BLOG_AWS_CACHE_WRITE_CONCURRENCY"),
  "Cloudflare KV publish avoids detail fan-out while AWS S3 keeps a bounded visible-page detail projection"
);
assert(cms.includes("const data = await readPublicRawCmsData()") && cms.includes("matchesBlogSlug(item.slug, slug)"), "Cloudflare detail pages fall back to primary CMS reads when detail cache is absent");
assert(cms.includes("public-blog-inventory") && cloudflareSmoke.includes("fields=inventory&limit=24"), "Cloudflare public blog inventory uses a bounded lightweight cache");
assert(blogIndex.includes("getPublishedBlogInventoryPageByLanguage"), "Cloudflare blog index renders the default archive from a paged inventory read");
assert(
  blogIndex.includes("const BLOG_INDEX_PAGE_SIZE = 24") && !blogIndex.includes("process.env.BLOG_INDEX_PAGE_SIZE"),
  "blog index shows the full 24-card page without runtime env shrinking the archive shelf"
);
assert(blogIndex.includes("filteredPostCount > BLOG_INDEX_PAGE_SIZE") && blogIndex.includes("blog-craft-pagination"), "blog index exposes all inventory through pagination instead of rendering every card on one Worker request");
assert(cms.includes("PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE || 600"), "public blog list projection does not keep the old 8-post-per-language cap");
assert(
  cms.includes("PUBLIC_BLOG_D1_PROJECTION_READ_CHUNK_SIZE = 20") && cms.includes("OFFSET ${offset}"),
  "public D1 projection reads are chunked so Worker reads do not stop at the runtime's 20-row page"
);
assert(blogApiRoute.includes("cloudflareLimitCap") && blogApiRoute.includes("getPublishedBlogInventoryPostsForApi(language || undefined, limit)"), "public blog API uses bounded D1 inventory projection for list and inventory responses");
assert(blogApiRoute.includes("BLOG_API_LIMIT_CAP || 1000"), "AWS blog inventory API cap is high enough for full SEO/GEO coverage audits");
assert(feedRoute.includes("getPublishedBlogInventoryPostsForApi(undefined, itemLimit)"), "Cloudflare feed renders from bounded inventory cache instead of full blog bodies");
assert(
  rssAliasRoute.includes("export const dynamic = \"force-dynamic\"") && rssAliasRoute.includes("export { GET } from \"../feed.xml/route\""),
  "rss.xml aliases the canonical feed.xml endpoint with a local route config"
);
assert(llmsRoute.includes("CLOUDFLARE_LLMS_INVENTORY_LIMIT") && llmsRoute.includes("getPublishedBlogInventoryPostsForApi(undefined, inventoryLimit)"), "Cloudflare llms.txt reads a bounded inventory window instead of scanning the full archive");
assert(
  llmsFullRoute.includes("CLOUDFLARE_LLMS_FULL_INVENTORY_LIMIT") &&
    llmsFullRoute.includes("getPublishedBlogInventoryPostsForApi(undefined, inventoryLimit)") &&
    llmsFullRoute.includes("recentPostSummaries"),
  "Cloudflare llms-full avoids detail cache fan-out and full-archive scans during Worker requests"
);
assert(sitemapRoute.includes("getPublishedBlogSitemapEntries") && sitemapRoute.includes("Promise.resolve([])"), "Cloudflare sitemap avoids full project CMS reads and full blog JSON parsing during Worker requests");
assert(cms.includes("public-blog-duplicates") && cms.includes("getPublishedBlogDuplicatePosts"), "Cloudflare validate has a lightweight duplicate-check cache");
assert(cms.includes("sortedByPublicRecency") && cms.includes("updatedAt || post.publishedAt || post.createdAt"), "Cloudflare public blog lists are selected by release recency, not sortOrder");
assert(cms.includes("PUBLIC_BLOG_DETAIL_REFRESH_LIMIT_PER_LANGUAGE") && cms.includes("publicBlogDetailRefreshPostsFromPosts"), "publish-time detail cache refresh is bounded per language for Cloudflare subrequest safety");
assert(cms.includes("refreshPublicBlogCacheFromStorage") && adminBlogRefreshRoute.includes("refreshPublicBlogCacheFromStorage"), "admin can refresh derived public blog caches inside the Worker runtime");
assert(releaseRoute.includes("revalidatePath") && releaseRoute.includes("revalidateBlogPublicRoutes"), "release-set revalidates public Next blog pages after publish");
assert(adminBlogRefreshRoute.includes("revalidatePath") && adminBlogRefreshRoute.includes("revalidateBlogIndexes"), "admin public cache refresh revalidates public Next blog indexes");
assert(cms.includes("return []") && cms.includes("instead of rebuilding during a public request"), "public Cloudflare blog reads fail closed instead of rebuilding large CMS data on request");
assert(cloudflareMigratePublicBlogCache.includes("public-blog:v1") && cloudflareMigratePublicBlogCache.includes("public-blog-list:v2"), "Cloudflare public blog cache migration can split the legacy large cache");
assert(cloudflareMigratePublicBlogCache.includes("canonicalCmsKey") && cloudflareMigratePublicBlogCache.includes("parseCmsPayload"), "Cloudflare public blog cache migration rebuilds from canonical CMS before falling back to legacy public cache");
assert(cloudflareMigratePublicBlogCache.includes("--legacy-source") && cloudflareMigratePublicBlogCache.includes("Refusing to rebuild public cache from legacy"), "Cloudflare public blog cache migration fails closed before using legacy public cache");
assert(cloudflareMigratePublicBlogCache.includes("sortByPublicRecency"), "Cloudflare public blog cache migration selects latest public posts by recency");
assert(cloudflareMigratePublicBlogCache.includes("public-blog-duplicates:v1") && cloudflareMigratePublicBlogCache.includes("duplicatePosts"), "Cloudflare public blog cache migration writes the duplicate-check cache");
assert(cloudflareMigratePublicBlogCache.includes("detailPosts") && cloudflareMigratePublicBlogCache.includes("\"--remote\""), "Cloudflare public blog cache migration writes remote detail keys without printing article bodies");
assert(cloudflareSmoke.includes("expected-provider") && cloudflareSmoke.includes("imageCloudflareKvConfigured"), "Cloudflare smoke verifies KV storage and generated-media configuration");
assert(cloudflareSmoke.includes("resolve-ip") && cloudflareSmoke.includes("activeResolveOverride"), "Cloudflare smoke can pin DNS during resolver-cache cutover diagnostics");
assert(cloudflareSmoke.includes("publishedPosts === 0"), "Cloudflare smoke fails closed when public blog inventory is empty");
assert(cloudflareSmoke.includes("fastMode") && cloudflareSmoke.includes("CLOUDFLARE_SMOKE_FAST"), "Cloudflare smoke supports a bounded fast mode for daily automation health checks");
assert(
  n8nLocalBridge.includes("aws-production-smoke.mjs") &&
    n8nLocalBridge.includes('"--expected-provider"') &&
    n8nLocalBridge.includes('"aws-s3"'),
  "n8n bridge health job verifies the AWS/S3 production runtime"
);
assert(
  n8nLocalControlPlaneVerifier.includes("N8N_VERIFY_WEBHOOK_TIMEOUT_SECONDS") &&
    n8nLocalControlPlaneVerifier.includes("--max-time"),
  "n8n local control-plane verifier bounds webhook calls so verification cannot hang indefinitely"
);
assert(cloudflareStagingConfig.includes("\"name\": \"altoslab-official-website-staging\""), "Cloudflare staging config uses a separate Worker");
assert(cloudflareStagingConfig.includes("\"id\": \"246977568bf14ed0916a21eedbdbdbc1\""), "Cloudflare staging config binds the staging KV namespace");
assert(cloudflareStagingConfig.includes("\"ALTOS_BLOG_COLUMN_DAILY_LIMIT\": \"3\""), "Cloudflare staging config enforces three daily column target");
assert(!cloudflareStagingConfig.includes("\"routes\""), "Cloudflare staging config does not bind production custom-domain routes");
const cloudflareProductionConfig = read("wrangler.jsonc");
assert(cloudflareProductionConfig.includes("\"ALTOS_BLOG_COLUMN_DAILY_LIMIT\": \"3\""), "Cloudflare production config enforces three daily column target");
assert(cloudflareProductionConfig.includes("\"pattern\": \"altoslab-ai.cc/*\""), "Cloudflare production config uses a zone route for the apex domain");
assert(!cloudflareProductionConfig.includes("\"custom_domain\": true"), "Cloudflare production config does not use custom-domain records that conflict with existing DNS");
assert(sopDoctor.includes("release verification requires ALTOS_ADMIN_PASSWORD"), "SOP doctor requires admin readback credentials for release");
assert(sopDoctor.includes("REQUIRED_CHROME_PROFILE_EMAIL = \"john.wu0120@gmail.com\""), "SOP doctor enforces the required Chrome profile account");
assert(scheduledRunner.includes("REQUIRED_CHROME_PROFILE_EMAIL = \"john.wu0120@gmail.com\""), "scheduled release gate enforces the required Chrome profile account");
assert(localWorker.includes("REQUIRED_CHROME_PROFILE_EMAIL = \"john.wu0120@gmail.com\""), "local worker preflight enforces the required Chrome profile account");
assert(orchestrator.includes("\"profileEmail\": \"${marketLane ? \"\" : \"john.wu0120@gmail.com\"}\""), "orchestrator prompt contract records the required Chrome profile account");
assert(operations.includes("john.wu0120@gmail.com") && operations.includes("tm.studio"), "operations runbook documents the Chrome profile identity rule");
assert(sopDoctor.includes("\"ready\", \"released\""), "SOP doctor accepts already released candidates for post-release audit");
assert(sopDoctor.includes("releaseVerification.ok"), "SOP doctor verifies released candidates have successful post-release verification");
assert(sopDoctor.includes("market news coverSource must be source"), "SOP doctor requires source covers in market-news candidates");
assert(sopDoctor.includes("not stock/free image providers"), "SOP doctor blocks stock/free images for market-news source covers");
assert(sopDoctor.includes("coverGeneration.provider must be ChatGPT/GPT"), "SOP doctor verifies GPT cover provenance in prepared release candidates");
assert(sopDoctor.includes("column/feature posts require at least two in-article images"), "SOP doctor verifies columns/features carry in-article images");
assert(sopDoctor.includes("translated column/feature posts must share contentImages[${index}] URL"), "SOP doctor verifies translated columns/features share identical content image URLs");
assert(releaseVerifier.includes("manifest status must be released"), "release verifier requires a released prepared-candidate manifest");
assert(
  releaseVerifier.includes("qualityStatus: \"passed\"") && releaseVerifier.includes("admin readback ${key} must be ${expected}"),
  "release verifier checks protected admin quality metadata"
);
assert(releaseVerifier.includes("Gemini/Codex provenance") && releaseVerifier.includes("source-translation provenance for market news"), "release verifier checks Gemini/Codex provenance for columns/features and source-translation provenance for market news");
assert(!releaseVerifier.includes("public API generatedBy does not show Gemini provenance"), "release verifier does not require public Gemini provenance leakage");
assert(releaseVerifier.includes("public API market news coverSource must be source"), "release verifier checks market-news source cover metadata");
assert(releaseVerifier.includes("not stock/free image providers"), "release verifier blocks stock/free images for market-news source covers");
assert(releaseVerifier.includes("public API column/feature contentImages must include at least two images"), "release verifier checks live column/feature in-article images");
assert(releaseVerifier.includes("qualityManifest content image URLs do not match article set"), "release verifier checks content image URLs against the signed manifest");
assert(releaseVerifier.includes("ALTOS_ADMIN_PASSWORD") && releaseVerifier.includes("/api/admin/auth/login"), "release verifier can log in for protected admin readback");
assert(releaseVerifier.includes("/api/admin/blog?fields=release-readback"), "release verifier uses compact admin readback on Cloudflare");
assert(releaseVerifier.includes("/api/admin/blog/refresh-public-cache"), "release verifier refreshes derived public blog caches before metadata checks");
assert(releaseVerifier.includes("og:image") && releaseVerifier.includes("twitter:image"), "release verifier checks social preview images");
assert(releaseVerifier.includes("/feed.xml") && releaseVerifier.includes("/sitemap.xml") && releaseVerifier.includes("/llms.txt"), "release verifier checks public metadata surfaces");
assert(releaseVerifier.includes("AI-generated") && releaseVerifier.includes("SEO\\s*\\/\\s*GEO"), "release verifier blocks public leakage of internal production copy");
assert(launchAgentPlist.includes("blog-scheduled-runner.mjs --scheduled"), "LaunchAgent runs the scheduled prep/release runner");
assert(launchAgentPlist.includes("<integer>8</integer>") && launchAgentPlist.includes("<integer>15</integer>"), "LaunchAgent includes prep windows");
assert(launchAgentPlist.includes("<integer>10</integer>") && launchAgentPlist.includes("<integer>20</integer>"), "LaunchAgent includes market scan windows");
assert(launchAgentPlist.includes("<integer>4</integer>"), "LaunchAgent includes post-release follow-up minutes");
assert(launchAgentInstaller.includes("replace-with|test-secret"), "LaunchAgent installer refuses placeholder or test ingest secrets");
assert(launchAgentInstaller.includes("launchctl bootstrap"), "LaunchAgent installer can bootstrap the scheduled local worker");
assert(
  automationHandoff.includes("ALTOS LAB 自動發文交接手冊") &&
    automationHandoff.includes("AWS ECS/Fargate") &&
    automationHandoff.includes("AWS S3") &&
    automationHandoff.includes("scheduled runner / n8n / LaunchAgent") &&
    automationHandoff.includes("Hermes ops profile 作為 CMO/editor owner") &&
    automationHandoff.includes("Market News Lane") &&
    automationHandoff.includes("Column / Feature Lane") &&
    automationHandoff.includes("Prepared Candidate Contract") &&
    automationHandoff.includes("Daily Closeout") &&
    automationHandoff.includes("Public Blog Performance Gate") &&
    automationHandoff.includes("不能自行修改 UI") &&
    automationHandoff.includes("不能 fabricate Gemini/GPT evidence") &&
    automationHandoff.includes("npm run blog:performance-smoke -- --base-url https://altoslab-ai.cc") &&
    automationHandoff.includes("npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3"),
  "automation handoff documents the AWS/S3 local-scheduler/Hermes blog publishing contract and fail-closed boundaries"
);
assert(blogArticle.includes("extractSourceTranslationNote"), "article renderer extracts source translation note from main body");
assert(globals.includes("source-credit-note"), "article stylesheet displays source credit note as a compact support block");
assert(richText.includes("rich-highlight"), "rich text renderer supports in-article highlight marks");
assert(richText.includes("==[^=\\n]+=="), "rich text renderer parses ==highlight== syntax");
assert(
  globals.includes("--article-highlight-line: rgb(200 255 0 / 0.78);") && globals.includes("color: #050603;"),
  "article highlight underline uses landing-page lime with black text"
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
assert(blogUtils.includes('export const SITE_LANGUAGES: BlogLanguage[] = ["zh-Hant", "en"];'), "public site languages are limited to Traditional Chinese and English");
assert(siteHeader.includes("siteLanguageOptions"), "site header can use public site language options");
assert(siteHeader.includes("blogLanguageOptions"), "blog header exposes every configured blog content language");
assert(siteHeader.includes("isBlogPage ? fullBlogOptions : siteOptions"), "site header chooses full blog languages only on blog routes");
assert(!siteHeader.includes("aria-pressed={language"), "language switcher no longer renders as a segmented control");
assert(blogArticle.includes("related-article-image"), "related article cards include an image area");
assert(blogArticle.includes("SafeBlogImage compact post={relatedVisualPost}"), "related article cards render real covers when available");
assert(blogArticle.includes("article-tag-strip"), "article footer renders tag chips before the author note");
assert(blogArticle.includes("article-author-card"), "article footer replaces CTA with ALTOS LAB author card");
assert(blogTypes.includes("BlogInlineImage"), "blog schema supports structured in-article images");
assert(cms.includes("normalizeContentImages"), "CMS normalizes structured in-article images");
assert(cms.includes("column and feature posts require at least two in-article images"), "CMS publish validation blocks columns/features without content images");
assert(blogArticle.includes("ArticleBodyWithImages"), "article renderer interleaves structured content images into the article body");
assert(blogArticle.includes("[IMAGE:") && blogArticle.includes("imageMatchesMarker"), "article renderer supports explicit in-body content image markers");
assert(richText.includes("<blockquote") && richText.includes("/^>\\s+/"), "RichText renders markdown blockquotes instead of leaking raw > characters");
assert(globals.includes(".article-inline-figure"), "Blog article CSS styles structured in-article images");
assert(blogIndex.includes("市場專欄"), "Blog navigation restores the Traditional Chinese market-column lane");
assert(!blogArticle.includes("blog-cta-panel"), "article footer no longer renders the old content-system CTA panel");
assert(blogArticle.includes("const relatedVisualPost = toBlogVisualPost(related)"), "related article image props are sanitized before client serialization");
assert(!blogArticle.includes("SafeBlogImage compact post={related}"), "related article cards do not serialize full post metadata into client image props");
assert(blogIndex.includes("const visualPost = toBlogVisualPost(post)"), "blog index image props are sanitized before client serialization");
assert(!blogIndex.includes("SafeBlogImage compact post={post}"), "blog index cards do not serialize full post metadata into client image props");
assert(blogIndex.includes("blog-craft-index") && blogIndex.includes("<SiteHeader />"), "blog index keeps the full source-aligned craft UI shell");
assert(!blogIndex.includes("blog-lite-shell") && !blogIndex.includes("lightweightCloudflareRender"), "blog index does not degrade to the lightweight Cloudflare UI");
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
assert(envExample.includes("ALTOS_BLOG_BASE_URL=https://altoslab-ai.cc"), "env example defaults local workers to the Cloudflare-live production domain");
assert(envExample.includes("CLOUDFLARE_KV_ENABLED=1"), "env example documents active Cloudflare KV storage");
assert(envExample.includes("GCS_STORAGE_ENABLED=0"), "env example keeps legacy GCP/GCS storage disabled by default");
assert(envExample.includes("ALTOS_BLOG_PRODUCTION_AUTO_REPAIR=0"), "env example keeps blind GCP repair disabled by default");
assert(envExample.includes("BLOG_MARKET_TRANSLATION_PROVIDER=google-strict"), "env example keeps market-news translation on a strict provider by default");
assert(envExample.includes("BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK=0"), "env example keeps local market-news fallback disabled for production publishing");
assert(localWorker.includes("BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK"), "local worker documents the explicit local market-news fallback switch");
assert(marketTranslationService.includes("BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK=1"), "market-news translation service requires an explicit opt-in before local fallback");
assert(!marketTranslationService.includes("文中牽涉") && !marketTranslationService.includes("放在企業採用脈絡看"), "market-news fallback no longer emits legacy extraction-template copy");
assert(quality.includes("文中牽涉") && quality.includes("報導「」") && quality.includes("放在企業採用脈絡看"), "quality gate blocks market-news source extraction pollution");
assert(
  cloudflareDirectBlog.includes("--highlight:#c8ff00") &&
    cloudflareDirectBlog.includes(".article-takeaways li") &&
    !cloudflareDirectBlog.includes("--accent:#8b5cf6"),
  "Cloudflare direct blog article renderer uses designer article highlight styling instead of legacy purple"
);
assert(cms.includes("hasPublicMarketNewsPollution") && cms.includes("skippedPollutedPosts"), "public cache refresh refuses to overwrite clean projections with polluted market-news copy");
assert(publicMarketProjectionCleaner.includes("OpenAI News's current AI coverage") && publicMarketProjectionCleaner.includes("cleanContentImages"), "public market projection cleaner removes generic OpenAI index links and unrelated inline images");
assert(envExample.includes("BLOG_IMAGE_PROVIDER=none") && envExample.includes("AUTO_GENERATE_BLOG_COVERS=false"), "env example disables stock/fallback cover generation for the formal workflow");
assert(envExample.includes("GA4_PROPERTY_ID="), "env example documents GA4 Data API property configuration");
assert(envExample.includes("SEARCH_CONSOLE_SITE_URL="), "env example documents Search Console reporting configuration");
assert(envExample.includes("ALTOS_GOOGLE_OPERATOR_ACCOUNT=altoslab.offical@gmail.com"), "env example documents the unified Google operator account");
assert(envExample.includes("ALTOS_REPORT_FROM_EMAIL=altoslab.offical@gmail.com"), "env example documents the official daily report sender");
assert(seoGeoReport.includes("ALTOS LAB 每日搜尋與內容成效報告"), "SEO/GEO report renders a plain-language daily report title");
assert(seoGeoReport.includes("Google 搜尋健康分數") && seoGeoReport.includes("AI 搜尋可引用分數"), "SEO/GEO report renders readable readiness scores");
assert(seoGeoReport.includes("下一步行動") && seoGeoReport.includes("為什麼"), "SEO/GEO report converts findings into action motivation");
assert(seoGeoReport.includes("ai_referral_landing"), "SEO/GEO report checks AI referral event wiring");
assert(seoGeoReport.includes("GA4_PROPERTY_ID"), "SEO/GEO report supports optional GA4 Data API metrics");
assert(seoGeoReport.includes("SEARCH_CONSOLE_SITE_URL"), "SEO/GEO report supports optional Search Console metrics");
assert(seoGeoReport.includes("gcloud token fallback"), "SEO/GEO report can use local gcloud token fallback for diagnostics");
assert(seoGeoReport.includes("No qualified public blog posts are currently published"), "SEO/GEO report explains empty fail-closed blog inventory");
assert(seoGeoReport.includes("incompleteMarketNewsGroups"), "SEO/GEO report calls out market-news language gaps");
assert(blogDailyCloseout.includes("writeHermesCloseout") && blogDailyCloseout.includes("hermes_official_blog_daily_closeout_v1"), "daily closeout writes a compact Hermes self-evolution learning packet when requested");
assert(n8nLocalBridge.includes("--write-hermes"), "n8n daily closeout writes Hermes learning evidence by default");
assert(blogTrafficSelfEvolution.includes("hermes_official_blog_traffic_self_evolution_readback_v1") && blogTrafficSelfEvolution.includes("canOptimizeTopicSelectionFromTraffic"), "traffic self-evolution runner writes GA/GSC readback into Hermes");
assert(n8nLocalBridge.includes("scripts/blog-traffic-self-evolution.mjs"), "n8n SEO/GEO job writes traffic self-evolution evidence instead of terminal-only text");
assert(imageQuality.includes("MIN_SOURCE_IMAGE_WIDTH = 768") && imageQuality.includes("MIN_SOURCE_IMAGE_HEIGHT = 432"), "market-news credited source images use source-preserving dimensions instead of generated-cover dimensions");
const seoGeoReportEmails = [...seoGeoReport.matchAll(/[A-Za-z0-9._%+-]+@gmail\.com/g)].map((match) => match[0]);
assert(
  seoGeoReport.includes("altoslab.offical@gmail.com") &&
    seoGeoReportEmails.every((email) => email === "altoslab.offical@gmail.com"),
  "SEO/GEO report documents only the official Gmail sender/recipient"
);
assert(operations.includes("Gmail web UI") && operations.includes("hold the send instead of using a connector"), "operations require SEO/GEO daily email to be sent through Gmail web, not a connector");
assert(imageStyleGuide.includes("GPT Image 2 / 生成案例庫的採納規則"), "image style guide documents safe use of external GPT Image 2 prompt galleries");
assert(imageStyleGuide.includes("不照抄完整 prompt") && imageStyleGuide.includes("OpenAI 官方 docs"), "image style guide keeps prompt-gallery inspiration bounded and official-doc grounded");
assert(columnVisualStyleLibrary.includes("editorial-poster-signal-map"), "column visual style library includes an editorial poster case family");
assert(columnVisualStyleLibrary.includes("interface-less-product-mockup"), "column visual style library includes a UI-mockup-inspired non-UI family");
assert(columnVisualStyleLibrary.includes("comparison-diptych-audit"), "column visual style library includes a comparison/audit family");
assert(columnVisualStyleLibrary.includes("pinterest-editorial-product-photo"), "column visual style library includes Pinterest-like editorial product photography");
assert(columnVisualStyleLibrary.includes("pickDistinctStyle"), "column visual style library selects distinct visual families across article images");
assert(columnVisualStyleLibrary.includes("Do not use the 3D workflow/checkpoint/card/arrow family for more than one image"), "column visual prompts block repeated workflow-card family");
assert(columnVisualStyleLibrary.includes("Captions must say what the image adds to the argument"), "column visual prompts require argument-specific captions");
const gcpSmoke = read("scripts/gcp-production-smoke.mjs");
assert(gcpSmoke.includes("publishedPosts === 0"), "GCP production smoke warns when the public blog inventory is empty");
assert(gcpSmoke.includes("function printJson") && gcpSmoke.includes("process.stdout.write"), "GCP production smoke flushes JSON before exiting on failures");
assert(operations.includes("Legacy Production CMS/GCS Drift Repair"), "operations runbook documents the legacy Cloud Run CMS/GCS repair path");
assert(operations.includes("Cloudflare Active Lane"), "operations runbook documents the active Cloudflare lane");
assert(operations.includes("wrangler.staging.jsonc") && operations.includes("has no custom-domain routes"), "operations runbook makes Cloudflare staging-first deployment explicit");
assert(operations.includes("npm run verify:cloudflare"), "operations runbook requires Cloudflare smoke before cutover");

assert(seedPosts.length === 0, "blog seed archive stays empty so old template-written articles cannot rehydrate local or fallback CMS data");

const breakingWithoutNewsAnchor = seedPosts.filter(
  (post) => {
    if (post.contentType !== "breaking") return false;
    const readable = [post.title, post.excerpt, post.geoSummary, post.body].join("\n");
    const citesSourcePublisher = (post.sourceLinks || [])
      .map((source) => source.publisher || "")
      .filter(Boolean)
      .some((publisher) => readable.toLowerCase().includes(publisher.toLowerCase().split("/")[0].trim()));
    const citesDatedContext = /\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b|\b20\d{2}\b/i.test(
      readable
    );
    return !citesSourcePublisher || !citesDatedContext;
  }
);
assert(breakingWithoutNewsAnchor.length === 0, "breaking articles visibly cite latest source context");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("PASS blog system smoke checks");
