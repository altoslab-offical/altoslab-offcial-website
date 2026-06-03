# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The default publishing mix is `breaking` 40%, `column` 35%, `feature` 25% so the blog includes fresh market news instead of only evergreen self-written essays.
- It does not scrape or republish full articles.
- The production path must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied or rehosted just because attribution is present.
- For news posts, each source becomes a visible source-card/dossier item: title, publisher, date, URL and a concise original summary of what the source supports.
- Source article images may only be used when the license or official press-kit permission is explicit and stored. The default is a generated ALTOS LAB editorial visual.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## Subagent Orchestration v3

- DeepSeek is no longer part of the formal publishing path.
- The current production loop uses the main Codex thread as the release controller and a `gpt-5.3-codex-spark` worker for repetitive drafting, multilingual revision and validate-only iteration.
- Gemini and ChatGPT/GPT are browser workbenches, not release authorities. They may help draft prose or images only inside the dedicated Chrome tabs documented in `docs/content/blog-subagent-production-loop.md`.
- The main brain is the only role allowed to call `--release`.
- The LaunchAgent is a deterministic safety runner for prep/release timing, while Gemini/GPT browser production is handled by the Codex heartbeat/main-brain workflow.

## Cover Image Strategy

- Preferred production path: market news uses credited, non-reused source images; columns/features use topic-matched ALTOS LAB editorial visuals generated in the dedicated GPT/ChatGPT image tab, uploaded through the signed media route with internal provider/prompt/QA metadata.
- Public generated-cover credit should read `ALTOS LAB editorial visual`; provider and prompt remain internal quality metadata.
- Licensed third-party images are allowed only when the license, credit URL and landing page are stored and checked.
- Optional expanded sources: Pexels API, Pixabay API, Openverse, Wikimedia/Openverse results, NASA and museum/public-domain registries through the source registry.
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
- No unsupported claims or copied source content.
- Public author is either `Tommy` or `Ken`; morning uses Tommy and afternoon uses Ken by default.
- Body uses site-supported Markdown only: `##` sections, lists, tables, charts and short `**bold emphasis**`. FAQ items live in the `faqs` field, not as raw `###` headings in the body.
- Public review copy uses ALTOS LAB editorial responsibility wording, not AI-generation disclosure copy.

## Anti-Slop Writing Gate

- The reviewer scores directness, rhythm, trust, authenticity and density on a 50-point scale.
- The gate blocks AI drafts that use throat-clearing openers, "this article will" framing, generic hype, passive/actorless phrasing, repeated sentence rhythm, empty transitions or formulaic "not X but Y" contrasts.
- Thresholds: `breaking` >= 35, `column` >= 38, `feature` >= 40.
- The admin blog editor stores `antiSlopScore`, `antiSlopIssues` and `hasAntiSlopReview` with the normal quality review record.
