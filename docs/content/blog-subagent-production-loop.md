# ALTOS LAB Blog Subagent Production Loop

This is the current long-term production path for AI blog publishing.

## Roles

- Main brain: the current Codex thread. It owns source judgment, production publish decisions, Cloudflare/API verification, admin readback, and final quality reporting.
- Writing worker: a `gpt-5.3-codex-spark` subagent. It owns repetitive article-set drafting, multilingual revision, and validate-only iteration.
- Prompt research worker: a `gpt-5.3-codex-spark` subagent. It owns market/media pattern research, source-pack compression, prompt-card drafting, and QA issue extraction. It does not operate fixed tabs unless the main brain explicitly delegates that exact tab task.
- Browser workbench: dedicated Chrome tabs only.
  - Gemini tab: article writing and rewrite assistance.
  - ChatGPT/GPT tab: generated cover prompts or image generation assistance.

The worker is not allowed to publish. Publishing is only done by the main brain after production returns `wouldPublish: true`.
The worker is also not allowed to send prompts from memory. A prompt-card must exist first, and the main brain approves it before anything is pasted into Gemini or ChatGPT.

## Fixed Chrome Tabs

Browser work must stay inside the dedicated tabs:

- `https://gemini.google.com/app`
- `https://chatgpt.com/`

Do not claim, inspect, or operate unrelated user tabs.

Hard tab rule:

- Use `browser.user.openTabs()` and claim only the existing Gemini and ChatGPT tabs when they are present.
- If the previous run closed those task tabs, open only `https://gemini.google.com/app` and `https://chatgpt.com/` as task-scoped tabs for this run.
- Do not start new conversations.
- Do not reload or navigate away from those existing tabs unless the main brain explicitly approves a recovery step.
- Do not change the user's selected model or account.
- Close task-scoped Gemini/ChatGPT tabs after evidence capture so Chrome memory does not accumulate.
- If either fixed tab is blocked after a recovery attempt, stop and report the exact blocker.

Do not include secrets, HMAC keys, admin passwords, cookies, or private customer data in any Gemini or ChatGPT prompt.

## Daily Schedule

The Codex app heartbeat automation is the primary scheduler for this workflow:

- Automation id: `altos-blog-subagent-production-loop`
- Target: current main-brain thread
- Times: `08:10`, `09:00`, `15:10`, and `16:00` Asia/Taipei
- Prep windows: `08:10` and `15:10`
- Release windows: `09:00` and `16:00`

The macOS LaunchAgent is the deterministic safety runner. It wakes at the same four windows and does only two things:

- prep windows: create a run folder, prompt card, and `awaiting_browser_production` manifest skeleton;
- release windows: publish only an already `ready` manifest.

It does not pretend to operate Gemini or ChatGPT. Browser/Gemini/GPT production remains owned by the Codex heartbeat/main-brain workflow because it has Chrome extension access and can enforce tab-group rules.

At prep time, the main brain must prepare a publishable candidate manifest before the release window.
At release time, the main brain must not start fresh generation. If no prepared, validate-only-passed, design-approved candidate exists, skip publishing.
The manifest contract lives in `docs/content/blog-prepared-candidate-manifest.md`.
The prompt-card contract lives in `docs/content/blog-prompt-card-template.md`.

## Production Flow

1. Main brain creates a run folder under `data/blog-worker-runs/`.
2. Main brain prepares a source pack from official docs, product blogs, trusted technology media, or primary sources.
3. Main brain prepares or delegates a `prompt-card.md` using `docs/content/blog-prompt-card-template.md`.
4. Main brain approves the prompt-card. If the prompt-card does not clearly define the reader hook, source limits, image angle, tab target, user-selected model policy, and fail-closed QA rules, the run is held.
5. Main brain spawns a `gpt-5.3-codex-spark` worker with a bounded task:
   - write or revise exactly one four-language article set,
   - keep one `translationGroupId`,
   - keep identical `sourceLinks`,
   - do not publish,
   - run validate-only up to a bounded retry count.
6. Worker may use the dedicated Gemini tab for prose assistance only after the approved prompt-card names the exact Gemini prompt chain.
7. Worker writes `article-set.json`.
8. Main brain obtains covers through the dedicated GPT image tab or a human-approved editorial design workflow. Local generated-cover fallback art cannot auto-publish.
9. Main brain runs:

```bash
node scripts/blog-local-worker.mjs \
  --article-set <runDir>/article-set.json \
  --slot morning \
  --browser-evidence <runDir>/browser-evidence.json \
  --approve-design-qa \
  --manifest <runDir>/prepared-candidate.json \
  --validate-only
```

10. If validation fails, main brain sends the exact quality and image issues back to the worker.
11. If validation and main-brain quality review pass, the manifest becomes `ready`. Release time runs the same command with `--publish`; the local worker signs a `qualityManifest` and writes only through production `release-set`.
12. Release time immediately runs the post-release verifier:

```bash
node scripts/verify-blog-release.mjs \
  --manifest <runDir>/prepared-candidate.json
```

13. Main brain reviews the verifier output and reports live URLs, public/API metadata, optional admin readback, RSS, sitemap, `llms.txt`, content hash, image QA, OG/Twitter image status, and any warnings.

## Release Rule

Publish only when all are true:

- `wouldPublish: true`
- `qualitySummary.approved: true`
- `imageQualitySummary.approved: true`
- `qualityManifest.contentSha256` matches the release payload
- four languages are present
- all covers are reachable generated media
- all covers were created through GPT/ChatGPT or explicit human-approved editorial design QA
- all covers include aesthetic visual checks: brand fit, editorial specificity, visual hierarchy, thumbnail readability, no cliché, and mobile crop resilience
- production returns published IDs
- `scripts/verify-blog-release.mjs` passes after publication

If any gate fails, hold the set and report the exact reasons. Do not publish a lower-quality replacement just to satisfy the schedule.

## Worker Prompt Contract

Use this shape when spawning the worker:

```txt
You are the ALTOS LAB blog production worker. The main Codex thread is the main brain.
Use model gpt-5.3-codex-spark.
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
