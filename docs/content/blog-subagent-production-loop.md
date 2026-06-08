# ALTOS LAB Blog Subagent Production Loop

This is the current long-term production path for AI blog publishing.

## Roles

- Main brain: the current Codex thread. It owns source judgment, production publish decisions, Cloudflare/API verification, admin readback, and final quality reporting.
- Writing worker: primary `gpt-5.3-codex-spark`, fallback `gpt-5.4-mini` when Spark usage is exhausted. It owns bounded localization and QA repair after the source-of-truth draft has passed main-brain review. It does not create the initial source article.
- Localization workers: primary `gpt-5.3-codex-spark`, fallback `gpt-5.4-mini` when Spark usage is exhausted, split by language group. They localize approved source-of-truth copy into natural local writing, not literal translation.
- Prompt research worker: primary `gpt-5.3-codex-spark`, fallback `gpt-5.4-mini` when Spark usage is exhausted. It owns market/media pattern research, source-pack compression, prompt-card drafting, and QA issue extraction. It does not operate fixed tabs unless the main brain explicitly delegates that exact tab task.
- Browser workbench: dedicated Chrome tabs only.
  - Gemini tab: column/feature source-of-truth writing and rewrite assistance.
  - ChatGPT/GPT tab: generated cover prompts or image generation assistance for columns/features. Market-news covers come from credited source images.
  - Market-news fast lane: Codex/source workers translate and adapt source articles into ALTOS LAB's reader-first brief format; Gemini is not required for ordinary source-translation market news.

The worker is not allowed to publish. Publishing is only done by the main brain after production returns `wouldPublish: true`.
The worker is also not allowed to send prompts from memory. A prompt-card must exist first, and the main brain approves it before anything is pasted into Gemini or ChatGPT.

## Fixed Chrome Tabs

Browser work must stay inside the dedicated tabs:

- `https://gemini.google.com/app`
- `https://chatgpt.com/`

Do not claim, inspect, or operate unrelated user tabs.
All task-owned Gemini, ChatGPT and Gmail browser work must use the Chrome profile signed in as `john.wu0120@gmail.com`. Do not switch into or continue from `tm.studio`. If the visible Chrome profile is not `john.wu0120@gmail.com`, stop and report the blocker before entering prompts, generating images, or sending mail.

Hard tab rule:

- Use `browser.user.openTabs()` and claim only the existing Gemini and, when generated covers are needed, ChatGPT tabs.
- If the previous run closed those task tabs, open only the task-scoped tabs required for this run: `https://gemini.google.com/app` always, and `https://chatgpt.com/` only for generated column/feature covers.
- Do not start new conversations.
- Do not reload or navigate away from those existing tabs unless the main brain explicitly approves a recovery step.
- Do not change the user's selected model or account.
- Record `profileEmail: "john.wu0120@gmail.com"` in `chromeEvidence.gemini` and `chromeEvidence.chatgpt` for any used browser workbench; release gates hold candidates that omit it or show another profile.
- Close task-scoped Gemini/ChatGPT tabs after evidence capture so Chrome memory does not accumulate.
- If either fixed tab is blocked after a recovery attempt, stop and report the exact blocker.

Do not include secrets, HMAC keys, admin passwords, cookies, or private customer data in any Gemini or ChatGPT prompt.

## Daily Schedule

The Codex app heartbeat automation is the primary scheduler for this workflow:

- Automation id: `altos-blog-subagent-production-loop`
- Target: current main-brain thread
- Times: `08:10`, `09:00`, `09:04`, `10:30`, `12:30`, `14:30`, `15:10`, `16:00`, `16:04`, `18:30`, and `20:30` Asia/Taipei
- Prep windows: `08:10` and `15:10`
- Release windows: `09:00` and `16:00`
- Market-scan windows: `10:30`, `12:30`, `14:30`, `18:30`, and `20:30`
- Post-release follow-up windows: `09:04` and `16:04`

The macOS LaunchAgent is the deterministic safety runner. It wakes at all above windows and does only three things:

- prep windows: create a run folder, prompt card, and `awaiting_browser_production` manifest skeleton;
- release windows: publish only an already `ready` manifest.
- market-scan windows: refresh source-fast-lane prompts/manifests for source-translation production;

The runner is intentionally narrow:

- It accepts scheduled work only inside the configured minute windows, with a small grace period. A heartbeat that wakes outside those windows returns `skipped` instead of guessing a lane.
- It uses a local lock under `data/blog-worker-runs/.locks/` so a slow release verification, market scan or backfill planner cannot overlap the next runner process.
- It runs Chrome Memory Kit before creating a new column browser-production candidate. If Chrome RSS or the largest renderer is above the configured guardrail, column prep is held instead of opening more Gemini/GPT work.
- Backfill planning runs during prep windows by default. Market-scan windows do not recompute the 40-post queue unless `ALTOS_BLOG_BACKFILL_ON_MARKET_SCAN=true` is explicitly set.

Before either path continues, the runner executes:

```bash
node scripts/blog-sop-doctor.mjs \
  --mode prep|release \
  --slot morning|afternoon
```

The doctor checks the local worker env, LaunchAgent registration, production `/api/health`, durable CMS status (`gcs` or `cloudflare-kv`), disabled legacy DeepSeek cron, and release candidate readiness. Release mode also requires admin readback credentials so the post-release verifier can inspect protected blog metadata.

It does not pretend to operate Gemini or ChatGPT. Column/feature Gemini/GPT production remains owned by the Codex heartbeat/main-brain workflow because it has Chrome extension access and can enforce tab-group rules. Market-news source-translation can be prepared without Gemini when the source article, source image and attribution are verifiable.

At prep time, the main brain must prepare a publishable candidate manifest before the release window.
At release time, the main brain must not start fresh generation. If no prepared, validate-only-passed, design-approved candidate exists, skip publishing.
At market-scan windows, the runner never publishes. It only creates/updates `awaiting_source_translation_production` manifests and keeps fail-closed gate coverage unchanged for the same-day 09:00 / 16:00 publish windows.
At post-release follow-up time, the main brain must not start fresh generation. It verifies a released manifest or reruns the release gate once if the manifest is still ready and the five-minute release grace window is still open.
The manifest contract lives in `docs/content/blog-prepared-candidate-manifest.md`.
The prompt-card contract lives in `docs/content/blog-prompt-card-template.md`.

## Production Flow

1. Main brain creates a run folder under `data/blog-worker-runs/`.
2. Main brain prepares a source pack from official docs, product blogs, trusted technology media, or primary sources.
3. Main brain prepares or delegates a `prompt-card.md` using `docs/content/blog-prompt-card-template.md`.
4. Main brain approves the prompt-card. If the prompt-card does not clearly define the reader hook, source limits, image angle, tab target, user-selected model policy, and fail-closed QA rules, the run is held.
5. If the lane is `column` or `feature`, main brain uses the dedicated Gemini tab to produce one source-of-truth article first, usually `zh-Hant`.
6. If the lane is market news, main brain or a source-translation worker builds the source-faithful zh-Hant brief directly from the original source article and official/source image. Do not run ordinary market news through Gemini unless an editorial rewrite is explicitly needed.
7. Main brain runs the source quality gate. If the title, subtitle, lead, source fidelity, body rhythm, public wording, or image policy is weak, columns/features go back to Gemini; market news goes back to source-translation repair.
8. After the source draft passes, main brain spawns bounded localization workers. Use `gpt-5.3-codex-spark` first; if usage is exhausted, quota/rate-limited, `429`, `resource_exhausted`, or capacity/budget-limited, continue the same bounded task with `gpt-5.4-mini`:
   - `en-ja-ko`
   - `id-vi`
   - `th-ms-fil`
   Each worker localizes from the approved source article and writes only its assigned parsed output files.
9. Main brain merges the source post and localized posts into one `article-set.json`, keeping one `translationGroupId`, identical `sourceLinks`, identical cover/media metadata, and exactly one post per configured language.
10. For columns/features, main brain obtains covers and 2-3 in-article visuals through the dedicated GPT image tab or a human-approved editorial design workflow. Local generated-cover fallback art cannot auto-publish. For market news, the cover remains the credited source or official announcement image.
11. Main brain runs:

```bash
node scripts/blog-local-worker.mjs \
  --article-set <runDir>/article-set.json \
  --slot morning \
  --browser-evidence <runDir>/browser-evidence.json \
  --approve-design-qa \
  --manifest <runDir>/prepared-candidate.json \
  --validate-only
```

12. If validation fails, main brain sends the exact quality and image issues back to the source draft or localization worker responsible for the failed field.
13. If validation and main-brain quality review pass, the manifest becomes `ready`. Release time runs the same command with `--publish`; the local worker signs a `qualityManifest` and writes only through production `release-set`.
14. Release time immediately runs the post-release verifier:

```bash
node scripts/verify-blog-release.mjs \
  --manifest <runDir>/prepared-candidate.json
```

15. Main brain reviews the verifier output and reports live URLs, public/API metadata, admin readback when `ALTOS_ADMIN_PASSWORD`, `ADMIN_PASSWORD`, `ALTOS_ADMIN_SESSION_TOKEN`, or `ADMIN_SESSION_TOKEN` is available, RSS, sitemap, `llms.txt`, content hash, image QA, OG/Twitter image status, and any warnings.

The localization contract is defined in `docs/content/blog-localization-operating-model.md`.

## Release Rule

Publish only when all are true:

- `wouldPublish: true`
- `qualitySummary.approved: true`
- `imageQualitySummary.approved: true`
- `qualityManifest.contentSha256` matches the release payload
- all configured languages are present: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`
- original column/feature covers are reachable generated media created through GPT/ChatGPT or explicit human-approved editorial design QA
- market-news covers are reachable, credited source/official images with a reviewed usage note; do not substitute GPT art for market news
- all covers include aesthetic visual checks: brand fit, editorial specificity, visual hierarchy, thumbnail readability, no cliché, and mobile crop resilience
- production returns published IDs
- `scripts/verify-blog-release.mjs` passes after publication

If any gate fails, hold the set and report the exact reasons. Do not publish a lower-quality replacement just to satisfy the schedule.

## Worker Prompt Contract

Use this shape when spawning the worker:

```txt
You are the ALTOS LAB blog production worker. The main Codex thread is the main brain.
Use model gpt-5.3-codex-spark. If Spark usage is exhausted, retry the same bounded worker job with gpt-5.4-mini.
You are not alone in the codebase; do not revert changes you did not make.
Own only this run folder and article-set JSON.
Do not publish.
Revise until validate-only returns wouldPublish=true, or stop after 3 rounds and report exact remaining errors.
```

## Prompt-card Gate

Before fixed-tab browser work, every run must answer:

- What is the one-line reader hook?
- Which media pattern is this borrowing from: fast news brief, reported feature, operator playbook, or strategy analysis?
- What are the exact source boundaries and unsupported claims?
- Which fixed tab is used, and does it say `user-selected model; do not change`?
- What is the Gemini persona and step sequence?
- What is the ChatGPT/GPT editorial art director persona and image QA sequence?
- What would make the article or image held instead of published?

If any answer is vague, the run stays in prep and does not reach the release window.
