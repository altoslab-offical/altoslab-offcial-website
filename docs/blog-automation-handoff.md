# ALTOS LAB 自動發文交接手冊

最後更新：2026-06-13

這份文件是 ALTOS LAB 官網 Blog 自動發文系統的單一交接入口。接手者應先讀本文件，再依需要展開閱讀引用文件。

## 一句話架構

網站與 CMS 跑在雲端 Cloudflare Workers + Cloudflare D1；n8n 跑在 Tommy 本機，可作為排程、重試、健康檢查與 allowlisted local bridge 控制平面。文章品質、來源判斷、Gemini/GPT 瀏覽器證據、release gate 與最終 publish/no-publish 決策由 Hermes ops profile 作為 CMO/editor owner 負責；n8n、bridge、scripts 都是 Hermes 可選用或替換的工具。

## 系統邊界

### 雲端

- 正式網站：`https://altoslab-ai.cc`
- Cloudflare Worker：官網、Blog、API、RSS、sitemap、`llms.txt`
- Cloudflare D1：正式 CMS / public blog projection 的 durable storage
- Cloudflare KV：generated media 與 best-effort public cache
- 正式健康檢查必須看到 `cmsStorage.provider = cloudflare-d1`

### 本機

- n8n：`http://127.0.0.1:5679`
- local bridge：`http://127.0.0.1:8797`
- n8n compose：`ops/n8n-local/docker-compose.yml`
- n8n workflow：`ops/n8n-local/workflows/altos-blog-control-plane.json`
- bridge script：`scripts/n8n-local-bridge.mjs`
- 本機 secrets：`~/.altoslab-n8n.env`、`~/.altoslab-blog-worker.env`
- run logs：`data/n8n-local-runs/*.json`、`data/blog-worker-runs/`

不要把 secrets、tokens、cookies、admin passwords、Gmail refresh token 寫進 repo、文件、GitHub issue 或 Gemini/GPT prompt。

## 核心不可變規則

- 每個正式 article set 必須剛好包含 `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`。
- 同一組語言必須共享同一個 `translationGroupId`、sourceLinks、cover URL、coverSource、cover credit、contentImages URL set、visual metadata；只有 localized public copy 可以不同。
- Market news 是 source-translation，不是專欄。它必須使用 verified source article 或 official announcement，並使用 credited source/official image。
- Market news 不使用 Gemini，不使用 GPT art，不使用 Unsplash、Pexels、Pixabay、Openverse、local fallback art、generic stock image。
- Column / feature 必須先由 Gemini 在指定 Chrome profile 產出 source-of-truth zh-Hant 文章，main-brain 審過後才可 localization。
- Column / feature 的 cover 與 2-3 張 shared in-article images 只能透過指定 ChatGPT/GPT image workflow 或明確 human-approved editorial design QA。
- Release window 不產生新內容，只發布已經 `ready` 的 prepared candidate。
- n8n/bridge/scripts 不能自行修改 UI、Blog layout、CSS、header、sidebar、language switcher、WonDa widget placement 或任何 public design surface；這類變更必須由 Hermes 明確判斷並留下證據。
- 任何 gate 不完整，回傳 `ok:false` / HTTP 500，讓 n8n execution 顯示 failed，不可吞掉失敗。

## 日常排程

時區固定 Asia/Taipei。

| 時間 | 目的 | 允許行為 |
| --- | --- | --- |
| 08:10 | morning prep | 建立 column candidate skeleton、prompt card、狀態檢查 |
| 09:00 | morning release | 只發布已 ready manifest |
| 09:04 | morning follow-up | 驗證已發布 manifest，或 release grace 內重跑一次 gate |
| 10:30 | market scan | 掃描來源、產生/更新 market source queue，不保證 publish |
| 12:30 | market scan | 同上 |
| 14:30 | market scan | 同上 |
| 15:10 | afternoon prep | 同 morning prep |
| 16:00 | afternoon release | 只發布已 ready manifest |
| 16:04 | afternoon follow-up | 驗證已發布 manifest，或 release grace 內重跑一次 gate |
| 18:30 | market scan | 同上 |
| 20:30 | market scan | 同上 |
| 23:35 | daily closeout | 正式站 public inventory 必須有同日完整 9 語 column group；market-news 依同日 source scan 判斷，有 qualified source 才必須發布，沒有則保留 no-qualified-source evidence |

若 heartbeat 或 n8n webhook 在非設定時間醒來，應回傳 skipped，不應猜測要跑哪條 lane。

## n8n Local Control Plane

### n8n 可負責

- 定時 market-news scan
- column prep/status/validate/release polling
- Cloudflare health checks
- SEO/GEO report job
- daily closeout
- execution history 與 retry visibility

### n8n 不負責

- 網站 runtime
- Cloudflare deploy
- production D1/KV seeding
- 文章品質最終判斷，這是 Hermes CMO/editor owner 的責任
- Gemini / ChatGPT fixed-tab browser evidence，這應由 Hermes 透過 Tommy 的 Chrome 狀態決定如何取得
- Gmail web UI sender verification
- UI/design 修改
- arbitrary shell command execution

### Allowlisted bridge jobs

local bridge 只能執行已 allowlist 的 job：

- `/run/health`
- `/run/worker-smoke`
- `/run/custom-domain-smoke`
- `/run/doctor`
- `/run/ops-audit`
- `/run/seo-geo-report`
- `/run/column-prep`
- `/run/column-status`
- `/run/column-validate`
- `/run/column-release`
- `/run/daily-closeout`
- `/run/scheduled`
- `/run/market-scan-validate`
- `/run/market-scan`

新增 job 前必須更新 bridge allowlist、n8n workflow、文件與 smoke check。

## 安裝與啟動

```bash
scripts/start-n8n-local.sh
scripts/install-n8n-local-bridge-launch-agent.sh
scripts/import-n8n-local-workflows.sh
```

首次啟動後開啟：

```txt
http://127.0.0.1:5679
```

若 n8n 要求 owner setup，就在本機完成。n8n 2.x 預設會擋 node-level `$env`，所以 `ops/n8n-local/docker-compose.yml` 必須保留：

```txt
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

不要把 `ALTOS_N8N_BRIDGE_TOKEN` 貼進 workflow JSON；workflow 只從 container env 讀取，並只放在 bridge auth header。

## 取代舊排程

只有在 n8n 與 bridge 都健康後，才可停用舊 LaunchAgent：

```bash
curl -fsS http://127.0.0.1:8797/health
scripts/replace-blog-launchagent-with-n8n-local.sh
```

舊 LaunchAgent 是 rollback path，不應和 n8n 同時跑正式 production schedule。

Rollback：

```bash
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.altoslab.blog-local-worker.plist"
```

## Market News Lane

### 目的

快速把 verified longform AI/news source 轉成 ALTOS LAB 多語市場快訊。它的價值是來源速度、source fidelity、圖片合法與自然在地化，不是寫成 ALTOS LAB 專欄。

### 流程

1. 掃描來源池：

```bash
npm run blog:market-sources -- --date <YYYY-MM-DD> --queue-dir data/blog-backfill/<YYYY-MM-DD>/queue --write --overwrite
```

2. 從 source pack 挑選非重複、來源可驗、圖片可用的 longform item。
3. Source worker 建立 source-faithful article set，普通 market news 不跑 Gemini。
4. 保留 source article / official announcement image，所有語言共用。
5. 跑 public QA：

```bash
npm run blog:market-public-qa -- --slug <slug> --must <entity> --must <publisher>
```

6. 跑 validate-only / release gate。
7. 發布後跑 release verification。

### Market news hold 條件

- 沒有 usable credited source/official image
- source URL 重複或 cover URL 重複
- 內容像模板、顧問清單、空泛 adoption checklist
- public copy 出現 `SEO`, `GEO`, `AI-generated`, prompt, pipeline, quality gate 等內部詞
- 摘要出現污染字串，例如 `報導「」`、`文中牽涉`、`這則消息可以拿來`
- 來源圖片其實是 stock/free/fallback

## Column / Feature Lane

### 目的

每天至少一篇有 ALTOS LAB 判斷的原創 column group。重點是觀點、source-backed argument、可讀節奏與企業讀者決策價值。

### 流程

1. n8n / scheduled runner 建立 run folder、prompt card、candidate skeleton。
2. main-brain 審 prompt card，不清楚就 hold。
3. 在指定 Chrome profile `john.wu0120@gmail.com` 的 `ALTOS Blog QA` Gemini tab 產出 zh-Hant source-of-truth。
4. main-brain 檢查標題、副標、lead、source claims、ALTOS LAB judgment、public wording。
5. 若 source article 通過，使用 bounded workers localize：
   - `en-ja-ko`
   - `id-vi`
   - `th-ms-fil`
6. 若 Spark quota 或 capacity exhausted，使用 `gpt-5.4-mini` 接同一個 bounded task，不擴 scope。
7. GPT/ChatGPT image tab 產生 shared cover + 2-3 content images，或使用 human-approved editorial design QA。
8. merge 成單一 `article-set.json`，保證九語同 identity / sources / media。
9. validate-only 通過後 manifest 轉 `ready`。
10. release window 只發布 `ready` manifest。

### Column hold 條件

- Gemini evidence 缺失或 Chrome profile 不是 `john.wu0120@gmail.com`
- GPT/ChatGPT visual evidence 缺失
- `article-set.json` 不存在
- 任一語言缺失或有重複
- sourceLinks、cover、contentImages 在語言間不一致
- copy 有 raw `###`、AI/process/backend wording、弱模板節奏
- image QA 未通過或只有 fallback art

## Prepared Candidate Contract

每個 release candidate 位於：

```txt
data/blog-worker-runs/<date>-<slot>-<topic>/prepared-candidate.json
```

常見狀態：

- `awaiting_browser_production`
- `awaiting_source_translation_production`
- `held`
- `ready`
- `released`

Release 只能接受 `ready`。Release time 不生成新內容。

必要欄位包含：

- `status`
- `slot`
- `expectedReleaseAt`
- `articleSetPath`
- `chromeEvidence`
- `validateOnly`
- `humanDesignQa`

詳見 `docs/content/blog-prepared-candidate-manifest.md`。

## Validate / Release Commands

Validate-only 範例：

```bash
node scripts/blog-local-worker.mjs \
  --article-set <runDir>/article-set.json \
  --slot morning \
  --browser-evidence <runDir>/browser-evidence.json \
  --approve-design-qa \
  --manifest <runDir>/prepared-candidate.json \
  --validate-only
```

Publish 範例：

```bash
node scripts/blog-local-worker.mjs \
  --article-set <runDir>/article-set.json \
  --slot morning \
  --browser-evidence <runDir>/browser-evidence.json \
  --approve-design-qa \
  --manifest <runDir>/prepared-candidate.json \
  --publish
```

Release 後必跑：

```bash
node scripts/verify-blog-release.mjs --manifest <runDir>/prepared-candidate.json
```

## Daily Closeout

每日 23:35 Asia/Taipei 必須驗正式站 public inventory，而不是只看本機檔案。

```bash
npm run blog:daily-closeout -- --base-url https://altoslab-ai.cc
```

當日必須存在：

- 一組完整 9 語 column group
- 若同日 source scan 找到 qualified verified source / official announcement 且圖片可用，必須有一組完整 9 語 market-news group；若沒有合格來源，必須有 no-qualified-source 或 held-source evidence，不可硬編新聞

若 daily column 缺失，closeout 必須 failed 並報 exact blocker。Market-news 只有在同日有 qualified source 或 actionable market candidate 時缺失才算 failed。

## 健康檢查與驗證

本機 n8n：

```bash
npm run n8n:verify-local
npm run n8n:verify-local -- --full
curl -fsS http://127.0.0.1:8797/health
docker compose --env-file "$HOME/.altoslab-n8n.env" -f ops/n8n-local/docker-compose.yml ps
docker compose --env-file "$HOME/.altoslab-n8n.env" -f ops/n8n-local/docker-compose.yml exec -T n8n n8n list:workflow
```

Cloudflare：

```bash
npm run verify:cloudflare -- --base-url https://altoslab-ai.cc --expected-provider cloudflare-d1
curl -sSI https://altoslab-ai.cc/api/health
```

測試：

```bash
npm test
npm run test:blog
npm run test:homepage
```

不要把 `workers.dev` 當正式成功證據，除非 custom domain 有已驗證 incident。平常正式 base URL 是 `https://altoslab-ai.cc`。

## 常見故障定位

- `401 unauthorized`：bridge token mismatch。不要跑內容 job，先修 env。
- `423 bridge busy`：已有 job 在跑。等 lock 釋放，不要並行 publish。
- `404 unknown job`：n8n workflow 指到非 allowlisted job。
- `access to env vars denied`：n8n container 缺 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`。
- `awaiting_browser_production`：candidate skeleton 已建立，但 Gemini/GPT browser evidence 尚未產出；不能 publish。
- `articleSetExists=false`：`article-set.json` 尚未寫出。
- `column-release held`：manifest 不是 `ready` 或 validate/design/image/browser evidence 不完整。
- `daily column is not live as a complete 9-language group`：當日 column 未真正進 public inventory。
- `market-news lane did not publish...`：先核對同日 source scan；有 qualified source 或 ready/held actionable market candidate 才是必修復，沒有合格來源則記錄 no-qualified-source evidence。
- `KV put() limit exceeded`：不要回 GCP 或 seed production KV；確認 D1 healthy，刷新 public cache，再重驗。
- Blog UI 變動需求：不屬於自動發文修復，必須走 designer-approved UI change gate。

## 接手者第一天檢查清單

1. 確認 `git status --short` 乾淨。
2. 跑 `npm test`。
3. 跑 `npm run verify:cloudflare -- --base-url https://altoslab-ai.cc --expected-provider cloudflare-d1`。
4. 跑 `npm run n8n:verify-local`。
5. 確認 n8n workflows 已 import 且 active。
6. 手動打 `/run/health`，確認 bridge token 與 local bridge 正常。
7. 找最新 `data/blog-worker-runs/*/prepared-candidate.json`，確認狀態與 release gate reason。
8. 找最新 `data/n8n-local-runs/*.json`，確認是否有 failed execution 需要處理。
9. 檢查今日 public inventory 是否已有 9 語 column；market-news 則核對同日 source scan，有 qualified source 才要求 9 語 group，沒有則要求 no-qualified-source / held-source evidence。
10. 任何缺失都記 blocker，不要補假完成。

## 交接引用文件

- `docs/blog-automation.md`
- `docs/n8n-local-control-plane.md`
- `docs/content/blog-subagent-production-loop.md`
- `docs/content/blog-prepared-candidate-manifest.md`
- `docs/content/blog-localization-operating-model.md`
- `docs/content/blog-market-news-fastlane.md`
- `docs/content/blog-external-ingest-quality-system.md`
- `docs/content/ai-blog-image-style-guide.md`
- `docs/OPERATIONS.md`

## 交接完成定義

自動發文交接只有在以下條件同時成立時才算完成：

- 本文件存在並被 smoke test 檢查。
- n8n local control plane 文件與 workflow 存在。
- market-news lane、column lane、candidate manifest、release gate、daily closeout、Cloudflare verification 都有明確命令。
- 文件明確寫出 n8n 不能改 UI、不能 fabricate Gemini/GPT evidence、不能把 held gate 視為成功。
- `npm test` 通過。
- `npm run verify:cloudflare -- --base-url https://altoslab-ai.cc --expected-provider cloudflare-d1` 通過。
