# ALTOS LAB Blog Operations Flow Review

Updated: 2026-06-05

This note is the durable operating review for the current blog production system. It separates market-news and column workflows, records the live quality evidence, and defines the next optimizations for speed, Chrome memory, and token use.

## Current Quality State

Fresh checks on 2026-06-05:

- Live counts meet the target in every configured language: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`.
- Each language has `50` live posts: `41` market-news posts and `9` column posts.
- `blog:market-public-qa` passes for the previously broken Amazon, Lovable, and Voice AI articles across all 9 languages.
- Live template scan finds `0` public posts with the old market-news template phrases.
- LaunchAgent is loaded, not currently running, and its last exit code is `0`.
- `blog:audit-ai-feeling` still has one column repair item: `ai-minimal-governance-circle`.

Quality interpretation:

- Market-news lane is clean against the current source-fidelity and public-copy gates.
- The full corpus should not be called completely clean until `ai-minimal-governance-circle` is repaired through the column lane.
- Do not repair that column through Codex-only copy. Column repair must go through Gemini-approved zh-Hant source copy, then bounded localization, with visual metadata preserved.

## Lane Contracts

### Market-News Fast Lane

Purpose: fast, source-faithful public news briefs.

Method:

- Use source extraction and deterministic source-backed rendering.
- Do not use Gemini for ordinary market news.
- Use mainstream AI source pools first: TechCrunch AI, The Verge AI, VentureBeat AI, MIT Technology Review AI, WIRED AI, plus official company announcements when they have usable images.
- Require a usable source or official image.
- Require a confirmed canonical URL, at least three source-backed facts, named entities, and source numbers when available.
- Translate and localize naturally across the 9 configured languages without changing facts, source links, cover, credit, or visual metadata.

Hard rejects:

- Old H2 templates such as `消息落在哪個產品環節`, `來源裡的具體細節`, `先看採用而不是聲量`, `下一步先看三個指標`.
- Public copy mentioning pipeline terms such as `source-translation`, `quality gate`, `SEO/GEO`, `AI-generation`, `prompt`, or backend process language.
- English source titles leaking into non-English public copy.
- GPT art, Unsplash, Pexels, Pixabay, Openverse, local fallback art, repeated covers, or generic stock covers.

### Column Lane

Purpose: original ALTOS LAB editorial judgment.

Method:

- Gemini writes or revises one zh-Hant source-of-truth column first.
- Main-brain approves the zh-Hant version before localization.
- Bounded workers localize `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil` without inventing facts or changing shared identity/media.
- ChatGPT/GPT or an approved headless image provider creates one shared cover plus 2-3 shared in-article images.
- Every generated image needs provider, prompt, generatedAt, credit, aspectRatio, placement, alt, caption, and visualChecks.

Hard rejects:

- Column copy that sounds like generic AI advice: repeated `不是 X 而是 Y`, exaggerated claims, broad "enterprise should" filler, or repeated "先..." heading rhythm.
- Missing GPT visual evidence.
- Missing shared media metadata.
- Publishing more column batches just to hit volume if the article voice is not approved.

## Bottlenecks

### 1. Chrome Is The Column Bottleneck

Market news no longer needs Chrome. Column production still depends on Gemini/GPT browser evidence when headless providers are not configured. This is the main memory risk.

Current headless status from `blog:ops-audit`:

- Gemini CLI installed but auth missing.
- OpenAI image provider missing.
- Upload storage detection missing in local worker env, although live health reports GCS image storage.

Action:

- Configure a headless Gemini path for column zh-Hant drafting or keep Chrome usage to one claimed Gemini tab only.
- Configure a headless image provider plus GCS upload for column visuals.
- Until that is done, queued columns such as `seq32` and `seq33` must stay blocked on visual evidence.

### 2. Token Waste Comes From Tool Output, Not The Articles

The recurring waste pattern was reading full JSON, long git status, and large generated backfill artifacts. The actual production decision needs only compact signals:

- counts per language,
- market QA pass/fail,
- bad template count,
- AI-feeling repair queue,
- LaunchAgent state,
- headless provider status,
- candidate blockers.

Action:

- Use `npm run blog:quality-gate -- --base-url https://altoslab-ai.cc` as the first check.
- Use `npm run blog:quality-gate -- --base-url https://altoslab-ai.cc --allow-repair-queue` for routine monitoring where known column repair items should not block market/automation health.
- Read full JSON only when the compact gate points to a specific slug or file.

### 3. Old Market Template Constants Still Exist In Code

The live renderer now uses source-backed bodies, and public output is clean. However `scripts/blog-market-newsroom.mjs` still contains legacy `LABELS` with old headings. They are currently technical debt because another future code path could accidentally reuse them.

Action:

- Remove or quarantine the legacy `LABELS` block after confirming no old tests depend on it.
- Keep `blog-market-newsroom-smoke` and `blog:market-public-qa` as regression gates.

## Daily Operating Sequence

1. Run compact quality gate:

```bash
npm run blog:quality-gate -- --base-url https://altoslab-ai.cc
```

2. If only the known column repair queue blocks strict pass, monitor routine health with:

```bash
npm run blog:quality-gate -- --base-url https://altoslab-ai.cc --allow-repair-queue
```

3. For market scans, keep production no-Chrome:

```bash
npm run blog:market-scan
```

4. For column production, do not publish until Gemini/GPT evidence and visual metadata exist:

```bash
npm run blog:column-worklist -- --base-url https://altoslab-ai.cc
```

5. For a prepared release candidate, verify after publish:

```bash
npm run blog:verify-release -- --manifest <manifestPath>
```

## Efficiency Plan

Priority 1:

- Make `blog:quality-gate` the first command in every maintenance run.
- Keep market-news fully terminal/source-based.
- Keep market source pool small and mainstream-first.
- Treat the AI-feeling repair queue as a hard truth source; do not manually claim clean when it is non-empty.

Priority 2:

- Remove dead legacy market renderer constants.
- Add a source-pool cache so one market scan fetches each publisher feed once per window.
- Store compact scan evidence in a dated JSON summary, not many prompt/output scratch files.
- Move old generated backfill scratch artifacts out of the active worktree or archive them under a clearly ignored evidence path.

Priority 3:

- Configure headless Gemini and image generation for column production.
- Add token/cost logging for every model-backed column operation: lane, model, input tokens, output tokens, cache hits, article sequence, pass/fail.
- Use one high-quality zh-Hant Gemini draft per column, then bounded localization workers; do not ask high-cost models to rewrite all 9 languages from scratch.

## Acceptance Gate Before Saying "Done"

The blog operation is ready only when all of these are true:

- 9 languages are present for every translation group.
- Each language meets the current target count.
- Market QA passes for the named high-risk slugs and at least five rotating samples.
- Template slop scan is zero.
- AI-feeling repair queue is empty, or the remaining items are explicitly documented as held and not claimed clean.
- `npm run test`, `npm run build`, live RSS, sitemap, `llms.txt`, image checks, and release verification pass for newly published manifests.
- Chrome has no long-lived task-owned Gemini/GPT tabs after production evidence is captured.

