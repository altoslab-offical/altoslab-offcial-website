# ALTOS LAB Blog External Ingest Quality System

Production blog publishing is now fail-closed:

1. Gemini creates or revises the multilingual article set in the ALTOS Blog QA Chrome group.
2. Local worker runs preflight checks before contacting production.
3. ChatGPT/GPT creates generated covers; the local worker uploads them through signed `POST /api/admin/blog/media`.
4. Production accepts only signed `POST /api/admin/blog/ingest-set` requests.
5. Production runs content quality, duplicate-topic, source, multilingual parity and generated-image QA again.
6. Posts publish only when every gate passes; otherwise the whole article set is held as draft.

## Required Payload

- `slot`: `morning` or `afternoon`.
- `publishMode`: `publish-if-valid`.
- `generation.provider`: `gemini-chatgpt`.
- `posts`: exactly one `zh-Hant`, `en`, `ja` and `ko` post.
- All posts share the same `translationGroupId` and `sourceLinks`.
- Each post records `generatedBy` containing `gemini`.
- Every post uses `coverSource: "generated"`.
- Every generated cover includes a ChatGPT/GPT/OpenAI `coverGeneration.provider`, `prompt`, `generatedAt`, `visualChecks`, `coverAlt` and `coverCredit`.

## Auth

The local worker signs the exact JSON body:

```txt
HMAC_SHA256(BLOG_INGEST_HMAC_SECRET, X-Altos-Timestamp + "." + X-Altos-Nonce + "." + body)
```

Production rejects missing, stale, replayed or invalid signatures.

The media upload route uses the same signature contract. Production stores images in Vercel Blob. `BLOG_MEDIA_ALLOW_LOCAL_STORAGE=1` and `BLOG_IMAGE_ALLOW_LOCAL_HTTP=1` are for local end-to-end tests only.

## Runbook

```bash
node scripts/blog-antigravity-orchestrator.mjs --dry-run --slot morning --topic "AI agents in customer operations"
node scripts/blog-antigravity-orchestrator.mjs --publish --slot morning
node scripts/blog-local-worker.mjs --make-prompt --slot morning --topic "AI agents in customer operations"
node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --validate-only
node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --publish
```

Use `validateOnly` before every publish attempt. If production returns `wouldPublish: false`, fix the article set or image and retry; do not bypass the gate.

## Scheduler

Install `scripts/com.altoslab.blog-local-worker.plist.example` as a LaunchAgent after copying
`scripts/altoslab-blog-worker.env.example` to `~/.altoslab-blog-worker.env` and filling the real
`BLOG_INGEST_HMAC_SECRET`. The LaunchAgent runs the orchestrator at `09:00` and `16:00` Asia/Taipei.

Use `scripts/install-blog-launch-agent.sh` after the env file is filled. It refuses to install when
the secret is missing, too short, or still a placeholder/test value.

The orchestrator writes a run folder under `data/blog-worker-runs` and produces a prompt for the
browser production run. The subagent uses Gemini for article copy and ChatGPT/GPT for covers inside
the ALTOS Blog QA Chrome group, then closes or releases those tabs after the run. The worker waits for
valid JSON, uploads the GPT-generated cover files through the signed media route, runs `validateOnly`,
and publishes only if production returns `wouldPublish: true`.

If Gemini/GPT output is missing, if a cover is broken, if the topic duplicates an existing article, or
if any quality gate fails, the run exits without publishing.
