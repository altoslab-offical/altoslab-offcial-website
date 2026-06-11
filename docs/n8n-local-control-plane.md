# ALTOS LAB Local n8n Control Plane

## Decision

The official website and CMS runtime stay in the cloud on Cloudflare Workers + Cloudflare KV. n8n runs locally on Tommy's Mac and replaces the scattered local scheduling layer. It is an orchestration and monitoring control plane, not the public website runtime.

## Responsibilities

n8n owns:

- Timed market-news scan windows.
- Scheduled prep/release wakeups.
- Cloudflare health monitoring.
- SEO/GEO report generation.
- Codex-operated automatic QA/release gate execution through the local bridge.
- Future status notifications.
- Retry visibility and execution history.

n8n does not own:

- Public website serving.
- Cloudflare Worker deployments.
- CMS encryption keys or production KV seeding.
- Article quality judgment.
- Nine-language identity/media parity gates.
- Gemini/ChatGPT browser production.
- Gmail sending unless the browser-sender rule is explicitly changed.

## Runtime Shape

- Cloud production base: `https://altoslab-ai.cc`.
- Cloud rescue/diagnostic base: `https://altoslab-official-website.altoslab-ai.workers.dev`.
- Local n8n: Docker Compose, bound to `127.0.0.1:5679` by default so it does not collide with any existing local n8n on `5678`.
- Local bridge: `scripts/n8n-local-bridge.mjs`, bound to `127.0.0.1:8797`.
- Secrets and local overrides: `~/.altoslab-n8n.env` and `~/.altoslab-blog-worker.env`, never committed.
- Logs: `data/n8n-local-runs/*.json`.

The bridge is deliberately allowlisted. n8n can call `/run/health`, `/run/worker-smoke`, `/run/custom-domain-smoke`, `/run/doctor`, `/run/ops-audit`, `/run/seo-geo-report`, `/run/column-prep`, `/run/scheduled`, `/run/market-scan-validate`, and `/run/market-scan`. It cannot execute arbitrary shell commands.

The default automation base URL is `https://altoslab-ai.cc`. Set `ALTOS_BLOG_AUTOMATION_BASE_URL=https://altoslab-official-website.altoslab-ai.workers.dev` in `~/.altoslab-n8n.env` only during a verified custom-domain incident.

There is no human approval step in the normal publishing loop. The review gate is Codex-operated and automatic:

- Deterministic gates run from repo scripts.
- Codex/main-brain remains accountable for editorial/source/media judgment.
- If any required evidence is missing, the job stops with `ok=false` and the article is not published.
- External account blockers such as Chrome login, Gemini/ChatGPT browser evidence, or Gmail sender verification remain fail-closed because automation cannot safely fake those states.

## Install

```bash
scripts/start-n8n-local.sh
scripts/install-n8n-local-bridge-launch-agent.sh
scripts/import-n8n-local-workflows.sh
```

Open `http://127.0.0.1:5679` and complete the local owner setup if n8n requests it.

The local workflow reads `ALTOS_N8N_BRIDGE_TOKEN` from the container environment and sends it only as the bridge auth header. On n8n 2.x, node-level `$env` access is blocked by default, so `ops/n8n-local/docker-compose.yml` must explicitly set `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. Do not paste the token into workflow JSON.

`WEBHOOK_URL` should stay `http://127.0.0.1:5679/` for this local deployment. The n8n container listens on `5678`, but Tommy-facing local access and production webhooks are exposed on `127.0.0.1:5679`.

## Replace Old Scheduler

Only after n8n is running and the bridge health endpoint passes:

```bash
curl -fsS http://127.0.0.1:8797/health
scripts/replace-blog-launchagent-with-n8n-local.sh
```

Rollback:

```bash
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.altoslab.blog-local-worker.plist"
```

## Verification

```bash
npm run n8n:verify-local
npm run n8n:verify-local -- --full
curl -fsS http://127.0.0.1:8797/health
curl -fsS -X POST -H "x-altos-n8n-token: $(grep '^ALTOS_N8N_BRIDGE_TOKEN=' ~/.altoslab-n8n.env | cut -d= -f2-)" http://127.0.0.1:8797/run/health
docker compose --env-file "$HOME/.altoslab-n8n.env" -f ops/n8n-local/docker-compose.yml ps
docker compose --env-file "$HOME/.altoslab-n8n.env" -f ops/n8n-local/docker-compose.yml exec -T n8n n8n list:workflow
curl -fsS -X POST -H "content-type: application/json" --data '{"source":"manual-smoke"}' http://127.0.0.1:5679/webhook/altos-blog/manual/health
curl -fsS -X POST -H "content-type: application/json" --data '{"source":"manual-smoke"}' http://127.0.0.1:5679/webhook/altos-blog/manual/column-prep
curl -fsS -X POST -H "content-type: application/json" --data '{"source":"manual-smoke"}' http://127.0.0.1:5679/webhook/altos-blog/manual/market-validate
npm run verify:cloudflare -- --base-url https://altoslab-official-website.altoslab-ai.workers.dev
npm run verify:cloudflare -- --base-url https://altoslab-ai.cc
```

## Fail-Closed Outcomes

- Bridge `401 unauthorized`: token mismatch or missing token. Stop; do not run content jobs.
- Bridge `423 bridge busy`: another job is active. Stop and retry after the active run finishes.
- Bridge `404 unknown job`: workflow is pointing at a non-allowlisted job. Stop and fix workflow JSON or bridge allowlist.
- n8n workflow error with `access to env vars denied`: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is missing from the running container. Recreate n8n and rerun `npm run n8n:verify-local`.
- `column-prep` returns `awaiting_browser_production`: this is a healthy hold. Codex must use the john.wu0120@gmail.com Chrome profile to produce Gemini/GPT evidence before release.
- `scheduled` returns `release gate held`: this is expected when the candidate is not `ready`. Do not publish manually unless the manifest passes validate-only, design/image QA and browser evidence.
- `market-scan-validate` returns `ready` in `validate-only`: the news item passed dry-run gates but was not published. Use the timed `market-scan` workflow or the explicit manual market-scan webhook for a release attempt.
