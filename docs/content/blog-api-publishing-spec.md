# ALTOS LAB Blog Article Publishing API

Status: production guide v2
Last updated: 2026-06-18
Owner: ALTOS LAB website/blog automation

這份文件整理目前正式站「用 API 發佈文章」的安全流程。適用於 n8n、
外部 worker、本機排程器、Codex/Claude 產文流程，或任何需要把完整
文章組寫入 ALTOS LAB official website 的 API client。

正式站目前跑在 AWS ECS/Fargate，CMS 與 generated media 存在 AWS S3。
Cloudflare 只保留 DNS-only，不是目前 production runtime。

## Current Production Target

```txt
Production base URL: https://altoslab-ai.cc
CMS provider: aws-s3
CMS object: s3://altoslab-official-cms-487316829524/cms/altoslab-cms-v1.json
Generated media prefix: blog-generated/
```

發佈文章不需要重新部署 ECS。文章 API 會直接寫入 CMS storage，前台
blog route 是 dynamic read。只有改程式碼、API contract 或 smoke guard
時才需要重新 build image / update ECS task definition。

## Source Of Truth

Implementation files:

- `app/api/admin/blog/media/route.ts`
- `app/api/admin/blog/ingest-set/route.ts`
- `app/api/admin/blog/release-set/route.ts`
- `app/api/blog/route.ts`
- `app/api/blog/[slug]/route.ts`
- `lib/blog-ingest-auth.ts`
- `lib/cms.ts`
- `lib/types.ts`
- `scripts/aws-production-smoke.mjs`

Related docs:

- `docs/content/blog-external-ingest-quality-system.md`
- `docs/content/blog-prepared-candidate-manifest.md`
- `docs/content/blog-subagent-production-loop.md`
- `docs/aws-migration-plan.md`
- `docs/OPERATIONS.md`

## Supported Flow

Production publishing is fail-closed. Use this sequence:

1. Prepare one complete article set with 9 language versions.
2. Upload generated cover/content images with `POST /api/admin/blog/media`.
3. Validate the exact article set with `POST /api/admin/blog/ingest-set?validateOnly=true`.
4. Build a `qualityManifest` for the same payload.
5. Publish with `POST /api/admin/blog/release-set`.
6. Verify public API, article pages, RSS/sitemap/llms, and AWS smoke.

Do not publish by calling generic admin CRUD endpoints directly.

## Authentication

Publishing APIs use HMAC. The API client and production server must share:

```txt
BLOG_INGEST_HMAC_SECRET
```

Never put the secret in the request body, URL, article payload, logs, or docs.

Every write request signs the exact JSON body string sent over the wire.

Required headers:

```http
Content-Type: application/json
X-Altos-Timestamp: 2026-06-18T09:00:00.000Z
X-Altos-Nonce: 4f2c0d9f1f604aa8a8e7e37c8f879c2e
X-Altos-Signature: sha256=<hex hmac sha256>
```

Signature formula:

```txt
hex_hmac_sha256(secret, X-Altos-Timestamp + "." + X-Altos-Nonce + "." + body)
```

Rules:

- Timestamp must parse as a date.
- Timestamp must be within 5 minutes of server time.
- Nonce/signature pairs are rejected on replay during the accepted window.
- Signature can be raw hex or `sha256=<hex>`.
- If body formatting changes after signing, the signature fails.

Node helper:

```js
import crypto from "node:crypto";

export function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest("hex");

  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": `sha256=${signature}`
  };
}
```

## Endpoint 1: Upload Generated Media

```http
POST /api/admin/blog/media
```

Purpose:

- Upload generated covers or in-article images.
- Store bytes in the active media backend, currently AWS S3.
- Return a same-origin URL under `/api/blog/generated-media/:filename`.

Authentication:

- HMAC headers above, or
- Admin session cookie from the CMS admin UI.

Request:

```json
{
  "ingestRunId": "ingest_20260618_morning_agents",
  "filename": "agents-workflow-cover.webp",
  "contentType": "image/webp",
  "base64": "<base64 image bytes>"
}
```

Constraints:

- `contentType` must be `image/png`, `image/jpeg`, or `image/webp`.
- Decoded image must be greater than 0 bytes and no more than 8 MB.
- `filename` is sanitized by the server and prefixed with `ingestRunId`.
- Returned `url` must be copied into `post.cover` or `post.contentImages[].url`.

Success response on AWS:

```json
{
  "ok": true,
  "url": "https://altoslab-ai.cc/api/blog/generated-media/ingest_20260618_morning_agents-agents-workflow-cover.webp",
  "pathname": "blog-generated/ingest_20260618_morning_agents-agents-workflow-cover.webp",
  "provider": "aws-s3",
  "contentType": "image/webp",
  "size": 483920
}
```

Market-news posts normally should not use generated covers. They should use
credited source or official images.

## Endpoint 2: Validate Article Set

```http
POST /api/admin/blog/ingest-set?validateOnly=true
```

Purpose:

- Validate article contract, language coverage, duplicate topic/cover risk,
  source links, writing quality, image quality, and public publish readiness.
- Return `wouldPublish` without writing to CMS.

Required top-level fields:

```json
{
  "ingestRunId": "ingest_20260618_morning_agents",
  "slot": "morning",
  "generationDate": "2026-06-18",
  "scheduledFor": "2026-06-18T09:00:00+08:00",
  "translationGroupId": "tg_20260618_agents_ops",
  "publishMode": "publish-if-valid",
  "validateOnly": true,
  "generation": {
    "provider": "gemini-chatgpt",
    "model": "gemini-and-chatgpt-browser",
    "promptVersion": "altos-gemini-gpt-browser-v1",
    "sourceCount": 3
  },
  "posts": []
}
```

Rules:

- `slot` must be `morning` or `afternoon`.
- Default scheduled time is `09:10 +08:00` for morning, `14:40 +08:00` for afternoon, and `20:20 +08:00` for evening.
- `generation.provider` must be `gemini-chatgpt` or `source-translation`.
- `publishMode` should be `publish-if-valid` for production candidates.
- `posts` must contain exactly one post for each language:

```txt
zh-Hant, en, ja, ko, id, vi, th, ms, fil
```

Validate-only success response:

```json
{
  "ok": true,
  "validateOnly": true,
  "ingestRunId": "ingest_20260618_morning_agents",
  "wouldPublish": true,
  "publishedIds": [],
  "heldDraftIds": [],
  "updatedIds": [],
  "errors": [],
  "qualitySummary": {
    "approved": true,
    "score": 86,
    "threshold": 80,
    "issues": [],
    "warnings": []
  },
  "imageQualitySummary": {
    "approved": true,
    "score": 92,
    "threshold": 85,
    "issues": [],
    "warnings": []
  },
  "posts": [
    {
      "id": "post_...",
      "language": "zh-Hant",
      "slug": "ai-agents-customer-ops",
      "status": "published",
      "qualityStatus": "passed",
      "imageQualityStatus": "passed",
      "releaseDecision": "published"
    }
  ]
}
```

If `wouldPublish` is false or `errors` is non-empty, fix the article set and
validate again. Do not proceed to release with a changed payload unless you
revalidate and regenerate the release manifest.

## Endpoint 3: Release Article Set

```http
POST /api/admin/blog/release-set
```

Purpose:

- Publish an already validated and reviewed article set.
- Require a signed `qualityManifest`.
- Write only if every release gate passes.

Request skeleton:

```json
{
  "ingestRunId": "ingest_20260618_morning_agents",
  "slot": "morning",
  "generationDate": "2026-06-18",
  "scheduledFor": "2026-06-18T09:00:00+08:00",
  "translationGroupId": "tg_20260618_agents_ops",
  "publishMode": "publish-if-valid",
  "replaceExistingPublished": false,
  "generation": {
    "provider": "gemini-chatgpt",
    "model": "gemini-and-chatgpt-browser",
    "promptVersion": "altos-gemini-gpt-browser-v1",
    "sourceCount": 3
  },
  "qualityManifest": {
    "gateVersion": "altos-blog-release-v1",
    "reviewer": "main-brain",
    "reviewedAt": "2026-06-18T01:00:00.000Z",
    "contentSha256": "<release content digest>",
    "posts": [
      {
        "language": "zh-Hant",
        "slug": "ai-agents-customer-ops",
        "bodySha256": "<sha256 of post.body>",
        "cover": "https://altoslab-ai.cc/api/blog/generated-media/agents-cover.webp",
        "contentImages": [
          "https://altoslab-ai.cc/api/blog/generated-media/agents-inline-1.webp",
          "https://altoslab-ai.cc/api/blog/generated-media/agents-inline-2.webp"
        ]
      }
    ],
    "qualitySummary": {
      "approved": true,
      "score": 86,
      "threshold": 80,
      "issues": [],
      "warnings": []
    },
    "imageQualitySummary": {
      "approved": true,
      "score": 92,
      "threshold": 85,
      "issues": [],
      "warnings": []
    }
  },
  "posts": []
}
```

Release constraints:

- Request body must be no larger than 850,000 bytes.
- `publishMode` must be `publish-if-valid`.
- `posts` must contain exactly 9 language versions.
- `qualityManifest.gateVersion`, `reviewer`, `reviewedAt`, and `contentSha256` are required.
- `qualityManifest.contentSha256` must match the current request payload.
- Every manifest post must match the corresponding payload `language`, `slug`, `body`, `cover`, and `contentImages`.
- `qualityManifest.qualitySummary.approved` must be `true`.
- `qualityManifest.imageQualitySummary.approved` must be `true`.
- Quality and image scores must meet thresholds.
- Quality issues must be empty.
- Image issues and image warnings must be empty.

Success response:

```json
{
  "ok": true,
  "skipped": false,
  "ingestRunId": "ingest_20260618_morning_agents",
  "publishedIds": ["post_..."],
  "heldDraftIds": [],
  "updatedIds": [],
  "errors": [],
  "qualitySummary": {
    "approved": true,
    "score": 86,
    "threshold": 80,
    "issues": [],
    "warnings": [],
    "gateVersion": "altos-blog-release-v1",
    "reviewer": "main-brain",
    "contentSha256": "<release content digest>"
  },
  "imageQualitySummary": {
    "approved": true,
    "score": 92,
    "threshold": 85,
    "issues": [],
    "warnings": [],
    "gateVersion": "altos-blog-release-v1",
    "reviewer": "main-brain",
    "contentSha256": "<release content digest>"
  },
  "posts": [
    {
      "id": "post_...",
      "language": "zh-Hant",
      "slug": "ai-agents-customer-ops",
      "status": "published",
      "qualityStatus": "passed",
      "imageQualityStatus": "passed",
      "releaseDecision": "published"
    }
  ],
  "event": "blog_release_published"
}
```

If release validation fails, the route returns `400` with `errors`. If CMS
storage is locked, the route may return `202`; retry the same exact request
after a short delay.

Use `replaceExistingPublished: true` only for an intentional quality refresh or
replacement of an already-published article set. Otherwise keep it false.

## Post Payload Minimum Schema

Each `posts[]` item is a partial `BlogPost`, but publishable posts should carry
at least:

```json
{
  "slug": "ai-agents-customer-ops",
  "language": "zh-Hant",
  "translationGroupId": "tg_20260618_agents_ops",
  "title": "AI Agent 不是工具清單，而是營運系統",
  "seoTitle": "AI Agent 營運系統指南｜ALTOS LAB",
  "seoDescription": "用營運系統角度看 AI Agent 導入，避免只買工具卻沒有流程閉環。",
  "excerpt": "AI Agent 的真正價值不是多一個工具，而是把判斷、資料與流程接成可維護的營運系統。",
  "contentType": "column",
  "newsCategory": "agent-ops",
  "topic": "AI agents in customer operations",
  "audience": "Business owners and operations leaders",
  "geoSummary": "短答摘要，回答搜尋者最想知道的導入重點。",
  "body": "Markdown article body...",
  "keyTakeaways": [
    "AI Agent 導入要從流程責任開始。"
  ],
  "faqs": [
    {
      "question": "AI Agent 適合先導入在哪裡？",
      "answer": "先從資料完整、流程明確、判斷頻率高的營運工作開始。"
    }
  ],
  "sourceLinks": [
    {
      "title": "Source title",
      "url": "https://example.com/source",
      "publisher": "Example",
      "publishedAt": "2026-06-18T00:00:00.000Z",
      "summary": "Why this source supports the article."
    }
  ],
  "tags": ["AI Agent", "Automation", "Operations"],
  "author": "ALTOS LAB",
  "cover": "https://altoslab-ai.cc/api/blog/generated-media/agents-cover.webp",
  "coverAlt": "Editorial image showing AI agent workflow orchestration across business systems.",
  "coverSource": "generated",
  "coverGeneration": {
    "source": "generated",
    "provider": "ChatGPT/GPT image",
    "model": "gpt-image",
    "prompt": "Full prompt used to generate the cover...",
    "generatedAt": "2026-06-18T00:40:00.000Z",
    "status": "generated",
    "storedUrl": "https://altoslab-ai.cc/api/blog/generated-media/agents-cover.webp",
    "visualChecks": {
      "topicFit": true,
      "noTextArtifacts": true,
      "noLogos": true,
      "noPeople": true,
      "noTrademarkRisk": true,
      "noGenericStockLook": true
    }
  },
  "coverCredit": "Generated by ALTOS LAB with ChatGPT/GPT image workflow",
  "contentImages": [
    {
      "url": "https://altoslab-ai.cc/api/blog/generated-media/agents-inline-1.webp",
      "alt": "Diagram-like editorial image of an AI agent handoff across CRM and support queues.",
      "caption": "Agent workflows need ownership boundaries, not only prompts.",
      "source": "generated",
      "credit": "Generated by ALTOS LAB",
      "aspectRatio": "wide",
      "placement": "after-lead",
      "provider": "ChatGPT/GPT image",
      "prompt": "Full image prompt...",
      "generatedAt": "2026-06-18T00:43:00.000Z",
      "visualChecks": {
        "topicFit": true,
        "noTextArtifacts": true,
        "noLogos": true,
        "noPeople": true,
        "noTrademarkRisk": true,
        "noGenericStockLook": true
      }
    }
  ],
  "readTimeMinutes": 6,
  "featured": false,
  "generatedBy": "external:morning:gemini-chatgpt"
}
```

Server-normalized fields:

- `status`
- `reviewStatus`
- `qualityStatus`
- `imageQualityStatus`
- `releaseDecision`
- `publishedAt`, `updatedAt`, `createdAt`
- public editorial disclosure
- author normalization

## Content-Type Contracts

### `breaking`

Use for market-news/source-translation articles.

Required:

- `generation.provider: "source-translation"`
- `coverSource: "source"`
- `cover`: public HTTPS source or official image URL.
- `coverCredit`: visible attribution.
- `coverCreditUrl`: public URL matching one of `sourceLinks`.
- `coverLicense`: source-rights metadata.
- `coverAlt`: descriptive alt text.

Forbidden:

- Generic stock/free image provider covers.
- GPT/generated art as the default market-news cover.

### `column` and `feature`

Use for original ALTOS LAB perspective articles.

Required:

- `generation.provider: "gemini-chatgpt"`
- `coverSource: "generated"`
- `cover`: public HTTPS URL, normally returned from `/api/admin/blog/media`.
- `coverGeneration.provider`: contains ChatGPT/GPT/OpenAI wording.
- `coverGeneration.prompt`: full stored prompt.
- `coverGeneration.generatedAt`: ISO timestamp.
- `coverGeneration.visualChecks`: all core checks true.
- `contentImages`: 2 to 3 images.
- Every translated version shares the same `cover` URL.
- Every translated version shares the same `contentImages[].url` values in the same order.
- Every content image has public HTTPS URL, `source: "generated"`, ChatGPT/GPT provider wording, prompt, alt, caption, credit, generatedAt, and visual checks.

## Quality Manifest Digest Contract

`release-set` recalculates the release digest. A client must compute the same
values.

Per-post `bodySha256`:

```txt
sha256(String(post.body || ""))
```

Top-level `contentSha256`:

1. Create a digest copy of every post with only these fields:

```txt
language
slug
title
seoTitle
seoDescription
excerpt
contentType
newsCategory
topic
audience
geoSummary
body
keyTakeaways
faqs
sourceLinks
tags
author
cover
coverAlt
coverSource
coverGeneration
coverCredit
coverCreditUrl
coverLicense
coverLicenseUrl
contentImages
aiDisclosure
```

2. Sort digest posts by `language`.
3. Build:

```json
{
  "translationGroupId": "tg_20260618_agents_ops",
  "slot": "morning",
  "generationDate": "2026-06-18",
  "scheduledFor": "2026-06-18T09:00:00+08:00",
  "posts": []
}
```

4. Serialize with stable JSON: object keys sorted recursively, arrays in
   existing order.
5. Hash with SHA-256 hex.

Reference helper:

```js
import crypto from "node:crypto";

const DIGEST_POST_FIELDS = [
  "language",
  "slug",
  "title",
  "seoTitle",
  "seoDescription",
  "excerpt",
  "contentType",
  "newsCategory",
  "topic",
  "audience",
  "geoSummary",
  "body",
  "keyTakeaways",
  "faqs",
  "sourceLinks",
  "tags",
  "author",
  "cover",
  "coverAlt",
  "coverSource",
  "coverGeneration",
  "coverCredit",
  "coverCreditUrl",
  "coverLicense",
  "coverLicenseUrl",
  "contentImages",
  "aiDisclosure"
];

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestSourcePost(post) {
  return Object.fromEntries(DIGEST_POST_FIELDS.map((field) => [field, post[field]]));
}

export function bodySha256(post) {
  return sha256(String(post.body || ""));
}

export function releaseContentSha256(payload) {
  const posts = [...payload.posts]
    .map(digestSourcePost)
    .sort((a, b) => String(a.language || "").localeCompare(String(b.language || "")));

  return sha256(
    stableJson({
      translationGroupId:
        payload.translationGroupId || payload.posts.find((post) => post.translationGroupId)?.translationGroupId,
      slot: payload.slot,
      generationDate: payload.generationDate,
      scheduledFor: payload.scheduledFor,
      posts
    })
  );
}
```

Any translation edit, copy edit, media URL change, metadata change, or body
formatting change after digest generation requires a new manifest.

## Public Readback APIs

These are read-only verification surfaces.

List/inventory:

```http
GET /api/blog?fields=inventory&limit=24
GET /api/blog?fields=inventory&language=zh-Hant&limit=24
```

Article detail:

```http
GET /api/blog/:slug?language=zh-Hant
```

Public page:

```txt
/blog/:slug
/en/blog/:slug
/ja/blog/:slug
/ko/blog/:slug
/id/blog/:slug
/vi/blog/:slug
/th/blog/:slug
/ms/blog/:slug
/fil/blog/:slug
```

## Post-Release Verification

Run the production smoke:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

This smoke checks:

- homepage 200
- all language blog indexes 200
- RSS/feed aliases
- sitemap
- `llms.txt`
- unauthenticated admin redirect
- `/api/health` reports `cmsStorage.provider: aws-s3`
- public blog API returns posts
- at least one article detail page renders non-empty `.rich-text`

Manual spot checks:

```bash
curl -sS "https://altoslab-ai.cc/api/blog?fields=inventory&limit=24" \
  | jq '.posts[0] | {language, slug, title}'

curl -sS "https://altoslab-ai.cc/api/blog/<slug>?language=<language>" \
  | jq '.post | {language, slug, bodyLength: (.body | length)}'

curl -sS "https://altoslab-ai.cc/<language-prefix>/blog/<slug>" \
  | rg '<div class="rich-text"><(p|h2|h3|ul|ol|blockquote)'
```

Also verify:

- `/blog` includes the article in the expected archive position.
- `/feed.xml` and `/rss.xml` are 200 and include recent URLs.
- `/sitemap.xml` includes the new public URLs.
- `/llms.txt` and `/llms-full.txt` are 200.
- Cover and content image URLs return image content types.
- Public API does not expose secrets or unapproved internal fields.

## Error Handling

Common responses:

```json
{ "ok": false, "error": "Missing ingest signature headers" }
```

```json
{ "ok": false, "error": "Ingest signature timestamp is outside the accepted window" }
```

```json
{ "ok": false, "ingestRunId": "ingest_...", "errors": ["missing en article"] }
```

```json
{ "ok": false, "error": "Blog release payload is too large" }
```

Status behavior:

- `400`: malformed body or validation errors.
- `401`: missing, stale, replayed, or invalid HMAC signature.
- `413`: release body exceeds 850,000 bytes.
- `202`: CMS lock contention; retry later with the same payload.
- `500`: storage or unexpected server failure.

Retry guidance:

- For `400`, fix the payload and validate again.
- For `401`, regenerate timestamp, nonce, signature, and send the exact signed body.
- For `202`, retry the exact same request after a short delay.
- For `500`, inspect logs and `/api/health`; do not blindly retry in a tight loop.

## Do Not Use For External Publishing

Do not use these as external publishing APIs:

- `POST /api/admin/blog`
- `PATCH /api/admin/blog/:id`
- Direct S3 object writes
- Direct Cloudflare D1/KV writes
- Public `/api/blog` routes as write targets

Those routes are for admin UI, readback, or storage internals. The supported
external write path is:

```txt
POST /api/admin/blog/media
POST /api/admin/blog/ingest-set?validateOnly=true
POST /api/admin/blog/release-set
```
