# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The old 40-post recovery number is only a backfill milestone, not a production cap. Routine production is three Gemini-approved columns per Taipei day plus source-verified market news whenever qualified items arrive. Market news has no daily upper cap; eight complete 9-language market-news groups per Taipei day is the minimum floor, not the target ceiling.
- It does not scrape or republish full articles.
- The production path must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied or rehosted just because attribution is present.
- For news posts, each source becomes a visible source-card/dossier item: title, publisher, date, URL and a concise original summary of what the source supports.
- Market-news cover images must be the credited source article image or an official announcement/press-kit image shared by every language version. If the source/official image is missing, generic, tilted, unsafe, already used, or visually weak, hold the candidate for source-image repair; do not generate or manually substitute an ALTOS LAB fallback cover.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## Subagent Orchestration v3

- DeepSeek is no longer part of the formal publishing path.
- The current production loop follows the Claude/Hermes architecture: Hermes is the operator and release owner, OpenClaw supplies compact source/style/visual research packets, and Codex is coach, reviewer, verifier, and harness maintainer. Columns/features use the approved source-of-truth article first; after quality approval, bounded workers localize the approved article into the remaining languages.
- Subagent model policy: start with `gpt-5.3-codex-spark`. If Spark usage is exhausted, quota/rate-limited, returns `429`, `resource_exhausted`, or otherwise reports capacity/budget exhaustion, continue the same bounded worker task with `gpt-5.4-mini`. The fallback worker inherits the same owned files, output cap, no-publish rule and no-final-quality-decision boundary.
- Market-news fast lane uses source-translation: Codex/source workers translate and adapt a verified source article into ALTOS LAB's reader-first brief format, with source links and one shared source/official cover across all languages. Daily floor-filling uses `ALTOS_BLOG_MARKET_NEWS_DEPTH=standard`; `longform` is an enrichment mode, not the default throughput lane. Ordinary market news does not need Gemini, but it cannot release without a credited source/official image.
- Gemini and ChatGPT/GPT are browser workbenches, not release authorities. They may help draft prose or images only inside the dedicated Chrome tabs documented in `docs/content/blog-subagent-production-loop.md`.
- Localization is not literal translation. Subagents must rewrite naturally for local readers while preserving the same article identity, source facts, sources, cover/media set and editorial angle.
- The main brain is the only role allowed to call `--release`.
- Local n8n is the active deterministic safety runner for prep, status, validate-only, ready-release polling, market scans, daily closeout and diagnostics. The old blog LaunchAgent is now a rollback path only. Gemini/GPT browser production is still handled by Codex/main-brain inside the fixed Chrome tabs, but n8n owns the repeated wakeups and gate execution around it.
- The n8n bridge fails closed at the HTTP layer: if an allowlisted job returns `ok:false`, the bridge returns HTTP 500 so n8n marks the execution as failed.

## Speed And Chrome Memory Guard

- Market news is the fast lane: source selection, source-faithful localization, validation and release should stay terminal-first and should not open Gemini, ChatGPT, Gmail or extra Chrome tabs.
- Columns/features are the expensive lane: only the approved zh-Hant source article and GPT visual production may use Chrome. Localization, duplicate checks, validate-only, release verification and SEO/GEO reporting should run outside Chrome.
- All column/Gemini/ChatGPT/Gmail browser work must use Tommy's Chrome profile signed in as `john.wu0120@gmail.com`. Do not use, claim, or switch into a `tm.studio` profile. Browser evidence for publishable column/feature candidates must record `profileEmail: "john.wu0120@gmail.com"` for every used Gemini or ChatGPT tab.
- Published market-news repair is terminal-first and source-first: run `npm run blog:repair-copy -- --base-url https://altoslab-official-website.altoslab-ai.workers.dev --content-type breaking --language all --bulk` only after the source article, canonical URL and credited source/official image are present. Market news must not use ALTOS LAB generated/manual fallback covers; missing or weak source images return to source-image repair. The repair tool must not touch columns/features; those return to the Gemini column lane.
- Market-source discovery is terminal-first: run `npm run blog:market-sources -- --date <date> --queue-dir data/blog-backfill/<date>/queue --write --overwrite` to create `market-source-packs.generated.json` from current RSS/API signals, duplicate checks and source/official image extraction before any market-news copy worker starts.
- `scripts/blog-scheduled-runner.mjs --scheduled` now fails closed outside the configured time windows instead of falling through to release mode.
- `scripts/blog-scheduled-runner.mjs --column-status` exposes whether the daily column has an `article-set.json`, ready manifest and release-gate issues.
- `scripts/blog-scheduled-runner.mjs --column-validate` runs validate-only for a browser-produced article set and fails closed when Gemini/GPT evidence, language parity, image metadata or main-brain QA is missing.
- If a column prep would otherwise stop at `awaiting_browser_production` with no `article-set.json`, enable the durable Codex fallback with `ALTOS_BLOG_AUTO_CODEX_COLUMN_PRODUCER=1` only when the slot already has an approved GPT image2 visual packet. The runner calls `scripts/blog-codex-column-producer.mjs` to create a 9-language source-backed column set with `codexEvidence` and release metadata, but local/generated placeholder art is not production-safe. Missing visuals must go into image repair/rewrite, not publish.
- Generated column media must be large enough for both image QA and generated-media reachability. The Codex producer writes detailed low-compression PNGs so content images do not fail production release with `generated media is too small`.
- The n8n column release poll calls the release gate every 15 minutes during the day. It publishes only a `ready` manifest. Missing candidates, missing article sets and held release gates return `ok:false`, so n8n records execution failure instead of silently passing.
- The daily closeout gate runs at 23:35 Asia/Taipei and verifies public inventory, not just local files: the same Taipei date must have three spaced complete 9-language column groups and at least eight complete 9-language market-news groups on `https://altoslab-ai.cc`.
- The scheduled runner uses a single local lock so overlapping heartbeat/LaunchAgent wakes cannot stack production jobs.
- Column prep checks Chrome Memory Kit before creating a new browser-production candidate. Default guardrails are `ALTOS_BLOG_CHROME_TOTAL_RSS_MB=5200` and `ALTOS_BLOG_CHROME_RENDERER_RSS_MB=1200`; if either is exceeded, the column is held and the reason is logged.
- Backfill planning is tied to prep windows by default. Market-scan windows focus on current news; set `ALTOS_BLOG_BACKFILL_ON_MARKET_SCAN=true` only for a deliberate catch-up burst.

## Cover Image Strategy

- Preferred production path: market news uses credited, non-reused source or official announcement images; when that image is weak or unusable, the candidate returns to source-image repair. Columns/features use topic-matched ALTOS LAB editorial visuals generated in the dedicated GPT/ChatGPT image tab, uploaded through the signed media route with internal provider/prompt/QA metadata.
- Hermes visual packets are now the shared input for generated column/feature imagery. Build them from `/Users/asdc163/LocalProjects/Hermes/scripts/hermes_visual_generation_system.py`; only packets with a real generated image path/URL may be converted into this repo's `merge-column-gemini-gpt.mjs --visuals-file` schema.
- Public generated-cover credit should read `ALTOS LAB editorial visual`; provider and prompt remain internal quality metadata.
- Column/feature images must contain a concrete editorial scene, object system, source photograph, or deliberately selected style family. Abstract rounded cards, node maps, random connecting lines, "permission/source cards" without physical context, and repeated workflow wallpaper are failure patterns even when the URL, dimensions and alt text pass.
- Licensed third-party images are allowed only for explicit, reviewed non-market editorial use when the license, credit URL and landing page are stored and checked.
- Do not use Pexels, Pixabay, Openverse, Unsplash, local fallback art or generic stock imagery for formal market-news publishing.
- Market-news discovery can use free official/community signals such as official RSS feeds, arXiv RSS, GDELT DOC API, Hacker News API and Semantic Scholar API, but these are discovery sources only. The published item must still link to the original article/announcement and pass source-image checks.
- The source scanner rejects missing article images, generic stock-image hosts, duplicate source URLs, duplicate live cover URLs, duplicate normalized live titles and obvious consumer-news noise that is not an enterprise AI/workflow story.
- Pinterest can be used as style inspiration, but the automation must not copy Pinterest images because Pinterest does not grant commercial rights to the pinned image.
- Required env for the formal workflow:
  - `BLOG_IMAGE_PROVIDER=none`
  - `AUTO_GENERATE_BLOG_COVERS=false`
  - `BLOG_IMAGE_STORE_BLOB=false`
- The preferred path for columns/features is generated imagery, saved through the signed media upload route and served from same-origin generated media. Market-news posts use credited source or official announcement images only; weak or missing source images block release until source-image repair finds an acceptable public image.
- If GPT image generation is used, it must happen only in the dedicated ChatGPT/GPT image tab and the final image still has to pass production image QA.
- If GPT image generation is unavailable, the candidate is held; local fallback art is disabled for production publishing.

## Publishing Rule

Auto-publishing requires:

- A full multilingual article set: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`.
- Trusted visible source links.
- Topic-matched legally sourced cover image with attribution.
- Market-news copy is source-faithful, readable, non-template, and free of backend/process language.
- Column/feature copy has a Gemini-approved zh-Hant source article before localization.
- No unsupported claims or copied source content.
- Public author is either `Tommy` or `Ken`; morning uses Tommy and afternoon uses Ken by default.
- Body uses site-supported Markdown only: `##` sections, lists, tables, charts and short `**bold emphasis**`. FAQ items live in the `faqs` field, not as raw `###` headings in the body.
- Public review copy uses ALTOS LAB editorial responsibility wording, not AI-generation disclosure copy.

## Column Cadence Guard

- Market news and columns must stay separated. Market news can publish during market-scan/fill windows only when a source-verifiable item and source/official image pass QA. A held market-news candidate is repair/replace work, not a healthy skip.
- Columns/features are capped at three translation groups per Taipei calendar day by default.
- `scripts/blog-local-worker.mjs --publish` enforces `ALTOS_BLOG_COLUMN_DAILY_LIMIT=3` for non-breaking article sets. It blocks release when a payload would exceed the daily limit.
- Backfill column drafts must be rewritten and released through the normal column lane instead of being bulk-published. A local batch of nine draft columns is a backlog, not a publish queue.
- Emergency bursts require an explicit `--allow-column-burst` flag or `ALTOS_BLOG_ALLOW_COLUMN_BURST=true`; do not use that override for ordinary content catch-up.

## Production Targets

- Public production is `https://altoslab-ai.cc` on AWS ECS/Fargate with AWS S3-backed CMS storage. Cloudflare Worker/KV/D1 paths are legacy diagnostics and must not be treated as production truth.
- Market-news inventory has no hard upper cap; each configured language grows together through complete 9-language translation groups.
- Column inventory grows at the daily cadence guard: three Gemini-produced columns per Taipei calendar day, each released only after the same quality, visual and public readback gates pass.
- Routine cadence: three Gemini-produced columns per Taipei calendar day; market news publishes during scheduled scan/fill windows whenever a verified source item, accepted cover path, and multilingual source-faithful copy pass release checks. Keep publishing beyond eight if qualified source-backed items remain.
- Bulk column backfills stay staged and are released over time; do not publish nine columns in one burst unless Tommy explicitly approves a burst.
- Market news must preserve the source article's news style: natural headline, clear subtitle, source facts in readable paragraphs, no fixed H2 template, no generic adoption checklist, no internal QA or automation language.
