# ALTOS LAB Blog Automation

## Legal Source Strategy

- The cron job reads whitelisted RSS/source URLs as research signals.
- It does not scrape or republish full articles.
- DeepSeek must write original ALTOS LAB synthesis in its own words.
- Every generated article keeps visible `sourceLinks` for attribution and fact checking.
- Source images, charts, screenshots and article art are not copied.

## Cover Image Strategy

- Preferred production path: source topic-matched open-licensed images from Openverse, store a copy in Vercel Blob, and keep visible attribution metadata.
- Pinterest can be used as style inspiration, but the automation must not copy Pinterest images because Pinterest does not grant commercial rights to the pinned image.
- Required env:
  - optional `BLOG_IMAGE_PROVIDER=openverse`
  - optional `AUTO_GENERATE_BLOG_COVERS=true`
  - optional `OPENVERSE_API_BASE_URL=https://api.openverse.engineering/v1`
- If legal image sourcing fails, the system uses internal fallback assets, but AI-generated posts will not pass auto-publish quality review.

## Publishing Rule

Auto-publishing requires:

- DeepSeek article generation.
- Trusted visible source links.
- Topic-matched legally sourced cover image with attribution.
- Quality score at or above the content-type threshold.
- No unsupported claims or copied source content.
