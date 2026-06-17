# ALTOS LAB Blog API Publishing Spec

Status: draft v1  
Last updated: 2026-06-17  
Owner: ALTOS LAB website/blog automation

This document defines the supported API contract for publishing blog articles into the ALTOS LAB official website. It is written for external workers, n8n flows, local schedulers, or future API clients that need to submit complete article sets safely.

The production publishing path is intentionally fail-closed. A caller must validate the exact article set first, then publish the same content through the signed release endpoint. Do not publish by calling generic admin CRUD endpoints directly.

## Source Of Truth

Implementation files:

- `app/api/admin/blog/media/route.ts`
- `app/api/admin/blog/ingest-set/route.ts`
- `app/api/admin/blog/release-set/route.ts`
- `lib/blog-ingest-auth.ts`
- `lib/types.ts`
- `lib/cms.ts`
- `scripts/blog-local-worker.mjs`

Related operating docs:

- `docs/content/blog-external-ingest-quality-system.md`
- `docs/content/blog-prepared-candidate-manifest.md`
- `docs/content/blog-subagent-production-loop.md`
- `docs/OPERATIONS.md`

## Supported Environments

Production base URL:

```txt
https://altoslab-ai.cc
```

Worker preview base URL:

```txt
https://altoslab-official-website.altoslab-ai.workers.dev
```

Local development base URL:

```txt
http://localhost:3001
```

Clients may also use `ALTOS_BLOG_BASE_URL` to switch the target base URL.

## Required Secrets

The publishing API uses HMAC signing. The client and production must share:

```txt
BLOG_INGEST_HMAC_SECRET
```

Never send this value in the request body or logs.

## Authentication

Every publishing request must sign the exact JSON body string that is sent over the wire.

Required headers:

```http
Content-Type: application/json
X-Altos-Timestamp: 2026-06-17T09:00:00.000Z
X-Altos-Nonce: 4f2c0d9f1f604aa8a8e7e37c8f879c2e
X-Altos-Signature: 8d4f...
```

Signature formula:

```txt
hex_hmac_sha256(BLOG_INGEST_HMAC_SECRET, X-Altos-Timestamp + "." + X-Altos-Nonce + "." + body)
```

Rules:

- Timestamp must parse as a date and be within 5 minutes of server time.
- Nonce/signature pairs are rejected on replay during the accepted window.
- Signature may be sent as raw hex or `sha256=<hex>`.
- If the body is modified after signing, the request will fail.

Node signing helper:

```js
import crypto from "node:crypto";

function signedHeaders(secret, body) {
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
    "X-Altos-Signature": signature
  };
}
```

## Publishing Flow

Use this sequence for all automated publishing:

1. Prepare a complete article set.
2. Upload generated column/feature media with `POST /api/admin/blog/media` if needed.
3. Dry-run the exact article set with `POST /api/admin/blog/ingest-set?validateOnly=true`.
4. Build and sign a `qualityManifest` from the approved article set.
5. Publish the same article set with `POST /api/admin/blog/release-set`.
6. Verify the live public URLs and API metadata.

Release-time jobs must not generate fresh content. If the payload changes after validation, validate again.

## Endpoint: Upload Generated Media

```http
POST /api/admin/blog/media
```

Purpose:

- Store generated covers or in-article images for `column` and `feature` posts.
- Return a same-origin public URL under `/api/blog/generated-media/:filename`.

Authentication:

- Admin session cookie, or
- HMAC headers described above.

Request body:

```json
{
  "ingestRunId": "ingest_20260617_morning_agents",
  "filename": "agents-workflow-cover.webp",
  "contentType": "image/webp",
  "base64": "<base64 image bytes>"
}
```

Constraints:

- `contentType` must be `image/png`, `image/jpeg`, or `image/webp`.
- `base64` is required.
- Maximum decoded image size is 8 MB.
- The returned `url` must be copied into `post.cover` or `post.contentImages[].url`.

Success response:

```json
{
  "ok": true,
  "url": "https://altoslab-ai.cc/api/blog/generated-media/ingest_20260617_morning_agents-agents-workflow-cover.webp",
  "pathname": "blog-generated/ingest_20260617_morning_agents-agents-workflow-cover.webp",
  "provider": "cloudflare-kv",
  "contentType": "image/webp",
  "size": 483920
}
```

Market-news posts normally do not use this endpoint. They should use credited source or official images.

## Endpoint: Validate Article Set

```http
POST /api/admin/blog/ingest-set?validateOnly=true
```

Purpose:

- Run contract, duplicate, content, multilingual, source, and image QA.
- Return whether the set would publish.
- Diagnose release problems before a production write.

Request body:

```json
{
  "ingestRunId": "ingest_20260617_morning_agents",
  "slot": "morning",
  "generationDate": "2026-06-17",
  "scheduledFor": "2026-06-17T09:00:00+08:00",
  "translationGroupId": "tg_20260617_agents_ops",
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

Required top-level fields:

- `slot`: `morning` or `afternoon`.
- `publishMode`: `publish-if-valid` for production candidates.
- `generation.provider`: `gemini-chatgpt` or `source-translation`.
- `posts`: complete article set.

Language requirement:

`posts` must include exactly one post for each configured language:

```txt
zh-Hant, en, ja, ko, id, vi, th, ms, fil
```

Validate-only success response:

```json
{
  "ok": true,
  "validateOnly": true,
  "ingestRunId": "ingest_20260617_morning_agents",
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
      "id": "blog_...",
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

If `wouldPublish` is false or `errors` is not empty, fix the payload and validate again.

## Endpoint: Release Article Set

```http
POST /api/admin/blog/release-set
```

Purpose:

- Publish an already-reviewed article set.
- Require a signed `qualityManifest`.
- Write only if every release gate passes.

Request body:

```json
{
  "ingestRunId": "ingest_20260617_morning_agents",
  "slot": "morning",
  "generationDate": "2026-06-17",
  "scheduledFor": "2026-06-17T09:00:00+08:00",
  "translationGroupId": "tg_20260617_agents_ops",
  "publishMode": "publish-if-valid",
  "replaceExistingPublished": true,
  "generation": {
    "provider": "gemini-chatgpt",
    "model": "gemini-and-chatgpt-browser",
    "promptVersion": "altos-gemini-gpt-browser-v1",
    "sourceCount": 3
  },
  "qualityManifest": {
    "gateVersion": "altos-blog-release-v1",
    "reviewer": "main-brain",
    "reviewedAt": "2026-06-17T00:55:00.000Z",
    "contentSha256": "<release content digest>",
    "posts": [
      {
        "language": "zh-Hant",
        "slug": "ai-agents-customer-ops",
        "bodySha256": "<sha256 of body>",
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
- `qualityManifest.qualitySummary.approved` must be `true`.
- `qualityManifest.imageQualitySummary.approved` must be `true`.
- Scores must meet their thresholds.
- `qualityManifest.qualitySummary.issues` must be empty.
- `qualityManifest.imageQualitySummary.issues` and `warnings` must be empty.
- `qualityManifest.contentSha256` must match the current request payload.
- Every manifest post must match the corresponding payload `language`, `slug`, `body`, `cover`, and `contentImages`.

Success response:

```json
{
  "ok": true,
  "skipped": false,
  "ingestRunId": "ingest_20260617_morning_agents",
  "publishedIds": ["blog_zh_...", "blog_en_..."],
  "heldDraftIds": [],
  "updatedIds": ["blog_old_..."],
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
      "id": "blog_...",
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

If release validation fails, the route returns `400` with `errors`. If the article set is valid but not publishable, it may write held drafts and return `event: "blog_release_held"`.

## Post Payload Schema

Each item in `posts` is a partial `BlogPost`, but these fields are required for publishable generated posts:

```json
{
  "slug": "ai-agents-customer-ops",
  "language": "zh-Hant",
  "translationGroupId": "tg_20260617_agents_ops",
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
    "AI Agent 導入要從流程責任開始。",
    "評估重點是可維護的判斷閉環。"
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
      "publishedAt": "2026-06-17T00:00:00.000Z",
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
    "generatedAt": "2026-06-17T00:40:00.000Z",
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
      "generatedAt": "2026-06-17T00:43:00.000Z",
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

Notes:

- `status`, `reviewStatus`, `qualityStatus`, `imageQualityStatus`, `releaseDecision`, timestamps, author normalization, and public editorial disclosure are normalized by the API.
- `readTimeMinutes` is required for publish validation.
- Generated posts require at least one `sourceLinks` item.
- Non-breaking posts require at least one FAQ for GEO.

## Content-Type Contracts

### breaking

Use for market-news/source-translation articles.

Required:

- `generation.provider`: `source-translation`.
- `coverSource`: `source`.
- `cover`: public HTTPS source or official image URL.
- `coverCredit`: visible attribution.
- `coverCreditUrl`: public URL that matches one of `sourceLinks`.
- `coverLicense`: source-rights metadata.
- `coverAlt`: descriptive alt text.
- `contentImages`: optional unless reusable source supporting media is available.

Forbidden:

- Generic stock/free image providers for covers.
- GPT/generated art as the default market-news cover.

### column and feature

Use for original ALTOS LAB perspective articles.

Required:

- `generation.provider`: `gemini-chatgpt`.
- `coverSource`: `generated`.
- `cover`: public HTTPS URL, normally returned from `/api/admin/blog/media`.
- `coverGeneration.provider`: ChatGPT/GPT/OpenAI wording.
- `coverGeneration.prompt`: stored full prompt.
- `coverGeneration.generatedAt`: ISO timestamp.
- `coverGeneration.visualChecks`: all core checks true.
- `contentImages`: 2 to 3 images.
- Every translated version must share the same `contentImages` URLs in the same order.
- Every content image must use public HTTPS URL, `source: "generated"`, ChatGPT/GPT provider wording, prompt, alt, caption, credit, generatedAt, and visual checks.

## Quality Manifest Digest Contract

`release-set` recalculates the release digest. A client must compute the same values.

Per-post `bodySha256`:

```txt
sha256(String(post.body || ""))
```

Top-level `contentSha256`:

1. Create a digest copy of every post with these fields only:
   - `language`
   - `slug`
   - `title`
   - `seoTitle`
   - `seoDescription`
   - `excerpt`
   - `contentType`
   - `newsCategory`
   - `topic`
   - `audience`
   - `geoSummary`
   - `body`
   - `keyTakeaways`
   - `faqs`
   - `sourceLinks`
   - `tags`
   - `author`
   - `cover`
   - `coverAlt`
   - `coverSource`
   - `coverGeneration`
   - `coverCredit`
   - `coverCreditUrl`
   - `coverLicense`
   - `coverLicenseUrl`
   - `contentImages`
   - `aiDisclosure`
2. Sort the digest posts by `language`.
3. Build this object:

```json
{
  "translationGroupId": "tg_20260617_agents_ops",
  "slot": "morning",
  "generationDate": "2026-06-17",
  "scheduledFor": "2026-06-17T09:00:00+08:00",
  "posts": []
}
```

4. Serialize with stable JSON: object keys sorted recursively, arrays in existing order.
5. Hash with SHA-256 hex.

Reference helper:

```js
import crypto from "node:crypto";

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

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
```

Important:

- The manifest must reference the same `cover` and `contentImages[].url` values that are present in `posts`.
- Any translation, copy edit, media URL change, or metadata change after digest generation requires a new digest.

## Error Handling

Common responses:

```json
{ "ok": false, "error": "Missing ingest signature headers" }
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
- For `202`, retry the same request after a short delay.
- For `500`, do not blindly retry in a loop; inspect logs and public CMS health first.

## Post-Release Verification

After a successful release, verify all of these:

```bash
npm run verify:cloudflare -- --base-url https://altoslab-ai.cc --expected-provider cloudflare-d1
```

For each language version:

```txt
GET /api/blog/:slug?language=<language>
GET /<language-prefix>/blog/:slug
```

Also verify:

- `/blog` returns the article in the expected archive position.
- `/feed.xml` and `/rss.xml` return XML with recent posts.
- `/sitemap.xml` includes new public URLs.
- `/llms.txt` and `/llms-full.txt` remain 200.
- Cover and content image URLs return image content types.
- Public API does not expose internal prompt or secret fields beyond approved public metadata.

## Do Not Use

Do not use these as external publishing APIs:

- `POST /api/admin/blog`
- `PATCH /api/admin/blog/:id`
- Any direct Cloudflare D1/KV write
- Any public `/api/blog` route

Those routes are for admin UI, public readback, or storage internals. The supported write path is the signed `media` plus `ingest-set` plus `release-set` flow above.

