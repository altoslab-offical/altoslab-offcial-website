# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The default publishing mix is `breaking` 40%, `column` 35%, `feature` 25% so the blog includes fresh market news instead of only evergreen self-written essays.
- It does not scrape or republish full articles.
- Gemini must write or revise original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## Gemini + GPT Production Contract

- Gemini is the production article workspace. Codex may orchestrate, research,
  QA and publish, but production copy must pass through Gemini before ingest.
- ChatGPT/GPT is the production cover workspace. Local generated art and stock
  fallbacks are not production covers.
- The worker must record `generation.provider=gemini-chatgpt`,
  `generatedBy` containing `gemini`, and `coverGeneration.provider` containing
  `ChatGPT`, `GPT` or `OpenAI`.
- The ALTOS Blog QA Chrome group is used only while the run needs Gemini/GPT.
  Tabs opened or claimed for the run must be closed or released afterward to
  avoid Chrome memory pressure.
- DeepSeek is legacy/admin fallback only and is not part of the formal daily
  publishing pipeline.

## Cover Image Strategy

- Preferred production path: generate a topic-specific, wordless cover through
  ChatGPT/GPT, store/upload it to Vercel Blob, and keep prompt/provider metadata.
- Optional curated/source images are for manual editorial exceptions only, not
  the daily production default.
- Pinterest, Midjourney galleries and design references can be used only as
  style inspiration. The automation must not copy third-party images.
- Required env:
  - optional `BLOG_IMAGE_PROVIDER=openverse`
  - optional `AUTO_GENERATE_BLOG_COVERS=true`
  - optional `OPENVERSE_API_BASE_URL=https://api.openverse.engineering/v1`
  - optional `PEXELS_API_KEY=<pexels-key>`
  - optional `PIXABAY_API_KEY=<pixabay-key>`
  - optional `BLOG_IMAGE_STORE_BLOB=true`
  - optional `BLOB_READ_WRITE_TOKEN=<vercel-blob-token>`
- If GPT image generation or image QA fails, the article is held. The system
  must not substitute local fallback art just to publish.

## Publishing Rule

Auto-publishing requires:

- Gemini article drafting/revision.
- ChatGPT/GPT-generated cover image.
- Duplicate-topic/source-angle check against published and draft posts.
- Trusted visible source links.
- Topic-matched generated cover image with prompt/provider metadata and credit.
- Quality score at or above the content-type threshold.
- LLM-as-judge review approval when `BLOG_LLM_REVIEW` is enabled.
- Anti-slop writing score at or above the content-type threshold.
- No unsupported claims or copied source content.
- Post-release monitoring through GA/GTM, Search Console, live URL checks, RSS
  and sitemap evidence. Publishing is not counted as success by itself.

## Anti-Slop Writing Gate

- The reviewer scores directness, rhythm, trust, authenticity and density on a 50-point scale.
- The gate blocks AI drafts that use throat-clearing openers, "this article will" framing, generic hype, passive/actorless phrasing, repeated sentence rhythm, empty transitions or formulaic "not X but Y" contrasts.
- Thresholds: `breaking` >= 35, `column` >= 38, `feature` >= 40.
- The admin blog editor stores `antiSlopScore`, `antiSlopIssues` and `hasAntiSlopReview` with the normal quality review record.
