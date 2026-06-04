# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The default publishing mix is `breaking` 40%, `column` 35%, `feature` 25% so the blog includes fresh market news instead of only evergreen self-written essays.
- It does not scrape or republish full articles.
- The production path must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied or rehosted just because attribution is present.
- For news posts, each source becomes a visible source-card/dossier item: title, publisher, date, URL and a concise original summary of what the source supports.
- Market-news cover images must be the credited source article image or an official announcement/press-kit image shared by every language version. If no usable source/official image is available, hold the item instead of substituting GPT art, stock images or fallback artwork.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## Subagent Orchestration v3

- DeepSeek is no longer part of the formal publishing path.
- The current production loop uses the main Codex thread as the release controller. Columns/features use Gemini to write the source-of-truth article first; after Codex approves it, `gpt-5.3-codex-spark` workers localize the approved article into the remaining languages.
- Market-news fast lane uses source-translation: Codex/source workers translate and adapt a verified source article into ALTOS LAB's reader-first brief format, with source links and the credited source/official image shared by all languages. Ordinary market news does not need Gemini.
- Gemini and ChatGPT/GPT are browser workbenches, not release authorities. They may help draft prose or images only inside the dedicated Chrome tabs documented in `docs/content/blog-subagent-production-loop.md`.
- Localization is not literal translation. Subagents must rewrite naturally for local readers while preserving the same article identity, source facts, sources, cover/media set and editorial angle.
- The main brain is the only role allowed to call `--release`.
- The LaunchAgent is a deterministic safety runner for prep/release timing, while Gemini/GPT browser production is handled by the Codex heartbeat/main-brain workflow.

## Speed And Chrome Memory Guard

- Market news is the fast lane: source selection, source-faithful localization, validation and release should stay terminal-first and should not open Gemini, ChatGPT, Gmail or extra Chrome tabs.
- Columns/features are the expensive lane: only the approved zh-Hant source article and GPT visual production may use Chrome. Localization, duplicate checks, validate-only, release verification and SEO/GEO reporting should run outside Chrome.
- Published-article repair is also terminal-first for discovery: run `npm run blog:audit-ai-feeling -- --base-url https://altoslab-ai.cc --language zh-Hant` to create `data/blog-repair/ai-feeling-audit-<date>.json` and `.md`, then route repair by lane. Columns/features go back through Gemini for the zh-Hant source rewrite; market-news repairs stay source-faithful and do not need Gemini by default.
- Market-source discovery is terminal-first: run `npm run blog:market-sources -- --date <date> --queue-dir data/blog-backfill/<date>/queue --write --overwrite` to create `market-source-packs.generated.json` from current RSS/API signals, duplicate checks and source/official image extraction before any market-news copy worker starts.
- `scripts/blog-scheduled-runner.mjs --scheduled` now fails closed outside the configured time windows instead of falling through to release mode.
- The scheduled runner uses a single local lock so overlapping heartbeat/LaunchAgent wakes cannot stack production jobs.
- Column prep checks Chrome Memory Kit before creating a new browser-production candidate. Default guardrails are `ALTOS_BLOG_CHROME_TOTAL_RSS_MB=5200` and `ALTOS_BLOG_CHROME_RENDERER_RSS_MB=1200`; if either is exceeded, the column is held and the reason is logged.
- Backfill planning is tied to prep windows by default. Market-scan windows focus on current news; set `ALTOS_BLOG_BACKFILL_ON_MARKET_SCAN=true` only for a deliberate catch-up burst.

## Cover Image Strategy

- Preferred production path: market news uses credited, non-reused source or official announcement images; columns/features use topic-matched ALTOS LAB editorial visuals generated in the dedicated GPT/ChatGPT image tab, uploaded through the signed media route with internal provider/prompt/QA metadata.
- Public generated-cover credit should read `ALTOS LAB editorial visual`; provider and prompt remain internal quality metadata.
- Licensed third-party images are allowed only when the license, credit URL and landing page are stored and checked.
- Optional expanded sources: Pexels API, Pixabay API, Openverse, Wikimedia/Openverse results, NASA and museum/public-domain registries through the source registry.
- Market-news discovery can use free official/community signals such as official RSS feeds, arXiv RSS, GDELT DOC API, Hacker News API and Semantic Scholar API, but these are discovery sources only. The published item must still link to the original article/announcement and pass source-image checks.
- The source scanner rejects missing article images, generic stock-image hosts, duplicate source URLs, duplicate live cover URLs, duplicate normalized live titles and obvious consumer-news noise that is not an enterprise AI/workflow story.
- Pinterest can be used as style inspiration, but the automation must not copy Pinterest images because Pinterest does not grant commercial rights to the pinned image.
- Required env:
  - optional `BLOG_IMAGE_PROVIDER=openverse`
  - optional `AUTO_GENERATE_BLOG_COVERS=true`
  - optional `OPENVERSE_API_BASE_URL=https://api.openverse.engineering/v1`
  - optional `PEXELS_API_KEY=<pexels-key>`
  - optional `PIXABAY_API_KEY=<pixabay-key>`
  - optional `BLOG_IMAGE_STORE_BLOB=true`
  - optional `BLOB_READ_WRITE_TOKEN=<vercel-blob-token>`
- The preferred path for columns/features is generated imagery, saved through the signed media upload route and served from GCS-backed same-origin generated media. Market-news posts use credited source or official announcement images instead of GPT art.
- If GPT image generation is used, it must happen only in the dedicated ChatGPT/GPT image tab and the final image still has to pass production image QA.
- If GPT image generation is unavailable, the candidate is held; local fallback art is disabled for production publishing.

## Publishing Rule

Auto-publishing requires:

- A local/subagent-generated full multilingual article set: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`.
- Trusted visible source links.
- Topic-matched legally sourced cover image with attribution.
- Quality score at or above the content-type threshold.
- Anti-slop writing score at or above the content-type threshold.
- AI-feeling repair audit has no blocking repair items for the article group, or a main-brain-approved repair exception is recorded in the run folder.
- No unsupported claims or copied source content.
- Public author is either `Tommy` or `Ken`; morning uses Tommy and afternoon uses Ken by default.
- Body uses site-supported Markdown only: `##` sections, lists, tables, charts and short `**bold emphasis**`. FAQ items live in the `faqs` field, not as raw `###` headings in the body.
- Public review copy uses ALTOS LAB editorial responsibility wording, not AI-generation disclosure copy.

## Anti-Slop Writing Gate

- The reviewer scores directness, rhythm, trust, authenticity and density on a 50-point scale.
- The gate blocks AI drafts that use throat-clearing openers, "this article will" framing, generic hype, passive/actorless phrasing, repeated sentence rhythm, empty transitions or formulaic "not X but Y" contrasts.
- Thresholds: `breaking` >= 35, `column` >= 38, `feature` >= 40.
- The admin blog editor stores `antiSlopScore`, `antiSlopIssues` and `hasAntiSlopReview` with the normal quality review record.

## AI-Feeling Repair Audit

- Run `npm run blog:audit-ai-feeling -- --base-url https://altoslab-ai.cc --language zh-Hant` before large repair or backfill batches.
- The audit checks public posts for generic AI openings, template contrast sentences, inflated claims, weak title shapes, fixed-template headings, missing reader action, source gaps and internal process-language leaks.
- Repair thresholds: market news should clear 90, columns should clear 85 and features should clear 88. Scores below threshold are queued before new same-topic posts are added.
- Public articles must not mention the audit, prompts, internal scoring, source-translation, SEO/GEO checks, model routing or quality gates.
