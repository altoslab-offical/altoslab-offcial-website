# ALTOS LAB Blog External Ingest Quality System

Production blog publishing is now fail-closed:

1. Gemini creates and revises the multilingual article set in the dedicated ALTOS Blog QA browser workflow.
2. Local worker runs preflight checks before contacting production.
3. Local worker keeps market-news source images as credited external source URLs and uploads only generated column/feature covers through signed `POST /api/admin/blog/media`.
4. Production accepts signed `POST /api/admin/blog/ingest-set` requests for full validation diagnostics.
5. The formal GCP Cloud Run release path is signed `POST /api/admin/blog/release-set`; Cloudflare remains fallback only.
6. `release-set` requires an approved `qualityManifest`, matching content/body hashes, configured-language completeness, valid publish metadata and a fresh image QA pass.
7. Posts publish only when every release gate passes; otherwise the whole article set is held or rejected.

## Required Payload

- `slot`: `morning` or `afternoon`.
- `publishMode`: `publish-if-valid`.
- `generation.provider`: `gemini-chatgpt`.
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

The media upload route uses the same signature contract. GCP production stores generated images in private Cloud Storage and serves them through same-origin `/api/blog/generated-media/:filename`. Cloudflare KV/R2 and Vercel Blob remain fallback providers. `BLOG_MEDIA_ALLOW_LOCAL_STORAGE=1` and `BLOG_IMAGE_ALLOW_LOCAL_HTTP=1` are for local end-to-end tests only.

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
`docs/content/blog-subagent-production-loop.md`. It wakes the main-brain thread at `08:10`, `09:00`,
`15:10` and `16:00` Asia/Taipei. Prep windows use Gemini for article writing, source images for
market news, and ChatGPT/GPT for column/feature covers, then run production `validateOnly`. Release windows publish only an already-ready
candidate after all quality gates pass.

The old macOS LaunchAgent installer remains in the repo as a fallback for a future CLI-only writer
bridge, but it should not be the primary path while Gemini/GPT browser tabs and Codex subagents are
part of the workflow. A plain LaunchAgent cannot spawn Codex subagents or safely control the fixed
browser tabs.
