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

The bridge is deliberately allowlisted. n8n can call `/run/health`, `/run/worker-smoke`, `/run/custom-domain-smoke`, `/run/doctor`, `/run/ops-audit`, `/run/seo-geo-report`, `/run/scheduled`, and `/run/market-scan`. It cannot execute arbitrary shell commands.

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
curl -fsS http://127.0.0.1:8797/health
curl -fsS -X POST -H "x-altos-n8n-token: $(grep '^ALTOS_N8N_BRIDGE_TOKEN=' ~/.altoslab-n8n.env | cut -d= -f2-)" http://127.0.0.1:8797/run/health
docker compose --env-file "$HOME/.altoslab-n8n.env" -f ops/n8n-local/docker-compose.yml ps
npm run verify:cloudflare -- --base-url https://altoslab-official-website.altoslab-ai.workers.dev
npm run verify:cloudflare -- --base-url https://altoslab-ai.cc
```
