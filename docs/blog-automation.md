# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads a source registry of official RSS/API/docs, trusted media and licensed image sources as research signals.
- The default publishing mix is `breaking` 40%, `column` 35%, `feature` 25% so the blog includes fresh market news instead of only evergreen self-written essays.
- It does not scrape or republish full articles.
- DeepSeek must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied.
- Pinterest can be used only as visual direction. It must not be used as an image source.

## DeepSeek Orchestration v2

- `DEEPSEEK_ROUTER_MODEL` defaults to `deepseek-v4-flash` for source planning and low-cost routing work.
- `DEEPSEEK_CONTENT_MODEL` defaults to `deepseek-v4-pro` for article drafting.
- `DEEPSEEK_REVIEW_MODEL` defaults to the content model for LLM-as-judge review.
- Every DeepSeek call records `promptVersion`, `model`, `latencyMs`, finish reason and token/cache usage when the provider returns it.
- Prompt prefixes are stable so DeepSeek context cache can help repeated cron/editorial jobs.

## Cover Image Strategy

- Preferred production path: source topic-matched open-licensed images from Openverse, store a copy in Vercel Blob, and keep visible attribution metadata.
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
- If legal image sourcing fails, the system uses internal fallback assets, but AI-generated posts will not pass auto-publish quality review.

## Publishing Rule

Auto-publishing requires:

- DeepSeek article generation.
- Trusted visible source links.
- Topic-matched legally sourced cover image with attribution.
- Quality score at or above the content-type threshold.
- LLM-as-judge review approval when `BLOG_LLM_REVIEW` is enabled.
- Anti-slop writing score at or above the content-type threshold.
- No unsupported claims or copied source content.

## Anti-Slop Writing Gate

- The reviewer scores directness, rhythm, trust, authenticity and density on a 50-point scale.
- The gate blocks AI drafts that use throat-clearing openers, "this article will" framing, generic hype, passive/actorless phrasing, repeated sentence rhythm, empty transitions or formulaic "not X but Y" contrasts.
- Thresholds: `breaking` >= 35, `column` >= 38, `feature` >= 40.
- The admin blog editor stores `antiSlopScore`, `antiSlopIssues` and `hasAntiSlopReview` with the normal quality review record.
