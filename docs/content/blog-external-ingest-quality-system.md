# ALTOS LAB Blog External Ingest Quality System

Production blog publishing is now fail-closed:

1. Column/feature posts use Gemini to create and revise one zh-Hant source-of-truth article in the dedicated ALTOS Blog QA browser workflow, then Spark/local workers localize the approved source.
2. Market-news posts use source-translation from verified source articles by default; Gemini is only an optional rewrite helper when the main-brain explicitly requests it.
3. Local worker runs preflight checks before contacting production.
4. Local worker keeps market-news source images as credited external source URLs and uploads only generated column/feature covers through signed `POST /api/admin/blog/media`.
5. Production accepts signed `POST /api/admin/blog/ingest-set` requests for full validation diagnostics.
6. The active Cloudflare Worker release path is signed `POST /api/admin/blog/release-set`; GCP Cloud Run is legacy recovery only until credentials and DNS are freshly revalidated.
7. `release-set` requires an approved `qualityManifest`, matching content/body hashes, configured-language completeness, valid publish metadata and a fresh image QA pass.
8. Posts publish only when every release gate passes; otherwise the whole article set is held or rejected.

## Required Payload

- `slot`: `morning` or `afternoon`.
- `publishMode`: `publish-if-valid`.
- `generation.provider`:
  - `source-translation` for market-news sets where every post is `contentType: "breaking"`.
  - `gemini-chatgpt` for `contentType: "column"` or `contentType: "feature"` sets.
- `posts`: exactly one post for each configured language: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`.
- All posts share the same `translationGroupId` and `sourceLinks`.
- `contentType: "breaking"` posts use `coverSource: "source"` and include `coverCredit`, `coverCreditUrl`, `coverLicense`, `coverAlt` and a non-reused source image URL.
- `contentType: "column"` and `contentType: "feature"` posts use `coverSource: "generated"` and include `coverGeneration.provider`, `prompt`, `generatedAt`, `visualChecks`, `coverAlt` and `coverCredit`.
- `contentType: "column"` and `contentType: "feature"` posts also include 2-3 `contentImages`. They must be GPT/ChatGPT-generated, shared across every language version, uploaded to managed media, and carry `alt`, `caption`, `aspectRatio`, `placement`, `provider`, `prompt`, `generatedAt`, `credit` and `visualChecks`.
- `contentType: "breaking"` posts do not use GPT art by default. They use the credited source/official source image and may leave `contentImages` empty unless the source explicitly provides reusable supporting media.

## Auth

The local worker signs the exact JSON body:

```txt
HMAC_SHA256(BLOG_INGEST_HMAC_SECRET, X-Altos-Timestamp + "." + X-Altos-Nonce + "." + body)
```

Production rejects missing, stale, replayed or invalid signatures.

The media upload route uses the same signature contract. Active Cloudflare production stores CMS state in Cloudflare KV and serves generated media through same-origin `/api/blog/generated-media/:filename`. R2 remains a future object-storage upgrade. GCP Cloud Storage is legacy recovery only. `BLOG_MEDIA_ALLOW_LOCAL_STORAGE=1` and `BLOG_IMAGE_ALLOW_LOCAL_HTTP=1` are for local end-to-end tests only.

## Runbook

```bash
node scripts/blog-local-worker.mjs --make-prompt --slot morning --topic "AI agents in customer operations"
node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --validate-only --manifest ./prepared-candidate.json --approve-design-qa
node scripts/blog-scheduled-runner.mjs --release --slot morning
```

Use `validateOnly` before every release attempt. If production returns `wouldPublish: false`, fix the article set or image and retry; do not bypass the gate.
Use release only after the main-brain quality gate has approved the same article set and images. The release route remains fail-closed on missing languages, mismatched content hashes, invalid signed payloads, publish metadata errors and image QA failures.

## Scheduler

The active production scheduler is the Codex app heartbeat automation documented in
`docs/content/blog-subagent-production-loop.md`. It wakes the main-brain thread at `08:10`, `09:00`, `09:04`,
`10:30`, `12:30`, `14:30`, `15:10`, `16:00`, `16:04`, `18:30`, and `20:30` Asia/Taipei.
- `09:00` and `16:00` are publish checkpoints; `09:04` and `16:04` are in-window post-release follow-ups.
- `08:10` and `15:10` are prep windows. `10:30`, `12:30`, `14:30`, `18:30`, and `20:30` are market-scan checkpoints only and do not publish.
Prep windows use Gemini for column/feature source writing, source-translation and source images for
market news, and ChatGPT/GPT for column/feature covers, then run production `validateOnly`. Release windows publish only an already-ready
candidate after all quality gates pass.

The old macOS LaunchAgent installer remains in the repo as a fallback for a future CLI-only writer
bridge, but it should not be the primary path while Gemini/GPT browser tabs and Codex subagents are
part of the workflow. A plain LaunchAgent cannot spawn Codex subagents or safely control the fixed
browser tabs.
