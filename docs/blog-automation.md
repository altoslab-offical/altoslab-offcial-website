# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The old 40-post recovery number is only a backfill milestone, not a production cap. Routine production is at least one Gemini-approved column per Taipei day, with the remaining capacity going to source-verified longform market news whenever qualified items arrive.
- It does not scrape or republish full articles.
- The production path must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied or rehosted just because attribution is present.
- For news posts, each source becomes a visible source-card/dossier item: title, publisher, date, URL and a concise original summary of what the source supports.
- Market-news cover images must be the credited source article image or an official announcement/press-kit image shared by every language version. If no usable source/official image is available, hold the item instead of substituting GPT art, stock images or fallback artwork.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## Subagent Orchestration v3

- DeepSeek is no longer part of the formal publishing path.
- The current production loop uses the main Codex thread as the release controller. Columns/features use Gemini to write the source-of-truth article first; after Codex approves it, subagent workers localize the approved article into the remaining languages.
- Subagent model policy: start with `gpt-5.3-codex-spark`. If Spark usage is exhausted, quota/rate-limited, returns `429`, `resource_exhausted`, or otherwise reports capacity/budget exhaustion, continue the same bounded worker task with `gpt-5.4-mini`. The fallback worker inherits the same owned files, output cap, no-publish rule and no-final-quality-decision boundary.
- Market-news fast lane uses source-translation: Codex/source workers translate and adapt a verified source article into ALTOS LAB's reader-first brief format, with source links and the credited source/official image shared by all languages. Ordinary market news does not need Gemini.
- Gemini and ChatGPT/GPT are browser workbenches, not release authorities. They may help draft prose or images only inside the dedicated Chrome tabs documented in `docs/content/blog-subagent-production-loop.md`.
- Localization is not literal translation. Subagents must rewrite naturally for local readers while preserving the same article identity, source facts, sources, cover/media set and editorial angle.
- The main brain is the only role allowed to call `--release`.
- The LaunchAgent is a deterministic safety runner for prep/release timing, while Gemini/GPT browser production is handled by the Codex heartbeat/main-brain workflow.

## Speed And Chrome Memory Guard

- Market news is the fast lane: source selection, source-faithful localization, validation and release should stay terminal-first and should not open Gemini, ChatGPT, Gmail or extra Chrome tabs.
- Columns/features are the expensive lane: only the approved zh-Hant source article and GPT visual production may use Chrome. Localization, duplicate checks, validate-only, release verification and SEO/GEO reporting should run outside Chrome.
- All column/Gemini/ChatGPT/Gmail browser work must use Tommy's Chrome profile signed in as `john.wu0120@gmail.com`. Do not use, claim, or switch into a `tm.studio` profile. Browser evidence for publishable column/feature candidates must record `profileEmail: "john.wu0120@gmail.com"` for every used Gemini or ChatGPT tab.
- Published market-news repair is terminal-first and source-only: run `npm run blog:repair-copy -- --base-url https://altoslab-ai.cc --content-type breaking --language all --bulk` only after the source article, canonical URL and credited source image are present. The repair tool must not touch columns/features; those return to the Gemini column lane.
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

- Market news and columns must stay separated. Market news can publish during market-scan windows when a source-verifiable item and source/official image pass QA.
- Columns/features are capped at one translation group per Taipei calendar day by default.
- `scripts/blog-local-worker.mjs --publish` enforces `ALTOS_BLOG_COLUMN_DAILY_LIMIT=1` for non-breaking article sets. It blocks release when a payload contains more than one column/feature translation group or when the daily limit is already reached.
- Backfill column drafts must be rewritten and released through the normal column lane instead of being bulk-published. A local batch of nine draft columns is a backlog, not a publish queue.
- Emergency bursts require an explicit `--allow-column-burst` flag or `ALTOS_BLOG_ALLOW_COLUMN_BURST=true`; do not use that override for ordinary content catch-up.

## Production Targets

- Public production is GCP/Cloud Run with GCS-backed CMS storage.
- Market-news inventory has no hard upper cap; each configured language grows together through complete 9-language translation groups.
- Column inventory grows at the daily cadence guard: at least one Gemini-produced column per Taipei calendar day, with additional columns allowed only when the same Gemini/GPT visual and release gates pass.
- Routine cadence: at least one Gemini-produced column per Taipei calendar day; market news publishes opportunistically during scheduled scan windows when a verified source item, source image and multilingual source-faithful copy pass release checks.
- Bulk column backfills stay staged and are released over time; do not publish nine columns in one burst unless Tommy explicitly approves a burst.
- Market news must preserve the source article's news style: natural headline, clear subtitle, source facts in readable paragraphs, no fixed H2 template, no generic adoption checklist, no internal QA or automation language.
