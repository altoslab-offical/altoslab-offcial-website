# ALTOS LAB 自動發文交接手冊

最後更新：2026-06-22

這份文件是 ALTOS LAB 官網 Blog 自動發文系統的單一交接入口。接手者應先讀本文件，再依需要展開閱讀引用文件。

## 一句話架構

正式網站跑在 AWS ECS/Fargate，CMS 與 generated media 跑在 AWS S3；Cloudflare 只保留 DNS/legacy context，不是當前 Blog runtime。Tommy 本機的 scheduled runner / n8n / LaunchAgent 可作為排程、重試、健康檢查與 allowlisted local bridge 控制平面。文章品質、來源判斷、Gemini/GPT 瀏覽器證據、release gate 與最終 publish/no-publish 決策由 Hermes ops profile 作為 CMO/editor owner 負責；n8n、bridge、scripts 都是 Hermes 可選用或替換的工具。

## 系統邊界

### 雲端

- 正式網站：`https://altoslab-ai.cc`
- AWS ECS/Fargate：官網、Blog、API、RSS、sitemap、`llms.txt`
- AWS S3：正式 CMS / generated media durable storage
- Public Blog read path：優先走 bounded public projection / in-memory cache；CMS write/release 後必須刷新 public cache
- 正式健康檢查必須看到 `cmsStorage.provider = aws-s3`

### 本機

- scheduled runtime mirror：`/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime`
- source/work repo：`/Users/asdc163/LocalProjects/altoslab-offcial-website`
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
- Market news 是 source-translation，不是專欄。它必須使用 verified source article 或 official announcement；cover 優先使用 credited source/official image。若來源圖缺失、歪斜、generic、低資訊密度、已重複或不貼題，必須進入 repair/rewrite/re-image/re-QA，並可改用通過 rendered review 的 ALTOS LAB editorial fallback cover；不可把正常品質問題記成 successful skip。
- Market news 不使用 Gemini 寫稿，不使用 Unsplash、Pexels、Pixabay、Openverse、local fallback art、generic stock image。若使用 ALTOS LAB editorial fallback cover，必須留下 `coverSource=manual|generated`、ALTOS LAB credit/license、`imageQualityStatus=passed` 與 topic-fit evidence。
- Column / feature 必須有明確 production provenance。舊 lane 可用 Gemini + GPT；Hermes/OpenClaw 新 lane 可用 Codex `gpt-5.4`，但 candidate / article-set / manifest 必須留下 `codexEvidence`，不能用空白或口頭聲明取代。
- Column / feature 的 cover 與 2-3 張 shared in-article images 必須共享同一組 public URL；圖片 workflow 可以是指定 ChatGPT/GPT 或 Codex image lane，但都要通過 visual metadata、topic-fit、source/rights 與 rendered review gate。Market news 的 ALTOS LAB fallback cover 也走同一個 rendered topic-fit gate，不因為是快訊而降低標準。
- Release window 不產生新內容，只發布已經 `ready` 的 prepared candidate；若沒有可發布 candidate，必須產出 repair plan，直到 validate-only pass 後 publish + public readback。
- `held`、`validateOnly.wouldPublish=false`、duplicate topic、untrusted source、H2/body merged、content image unsafe/mismatched 都是 repair/rewrite/re-image blockers；不可當成 skip 或成功發文。
- Prep 不能覆寫已存在且有 usable `articleSetPath` 的 ready/released candidate；即使用 `--force` 也只能重建空的 awaiting skeleton，若真的要替換有效候選，必須顯式使用 `--replace-valid-candidate` 並留下 rollback/evidence。避免 late prep 把可發布 evening slot 蓋成 `awaiting_browser_production`。
- n8n/bridge/scripts 不能自行修改 UI、Blog layout、CSS、header、sidebar、language switcher、WonDa widget placement 或任何 public design surface；這類變更必須由 Hermes 明確判斷並留下證據。
- 任何 gate 不完整，回傳 `ok:false` / HTTP 500，讓 n8n execution 顯示 failed，不可吞掉失敗。

## 2026-06-22 Production Repair Lessons

這些規則要進 Hermes / OpenClaw 的 official-blog lane，避免下次又把同樣問題當成新問題重查。

- Chrome QA 以 Tommy 已登入的既有 Chrome 群組為準。若 Playwright locator click 或座標 click 沒有真的從 `/blog` 進入 article detail，不要改用無痕、Safari 或 DevTools session；改用 Chrome extension 的 DOM-CUA node click / in-page native anchor click，並記錄從 `/blog` 到 article URL 的 elapsed time。
- Blog list-to-detail 慢時，先分離三件事：native anchor click path、public projection/detail cache、`/llms.txt` / `/feed.xml` read path。不要先重寫文章或換圖片。修復後必跑 `blog:performance-smoke`，並用 Chrome extension 做使用者路徑 readback。
- Release doctor 擋住缺 browser evidence / provider metadata / translated content image shared URL 時，代表 candidate production evidence 壞掉；要修 article set / manifest normalization，不可以 bypass release doctor。
- Production admin password/session token stale 時，不要猜密碼或 direct-write S3。若 `BLOG_INGEST_HMAC_SECRET` 已設定，正式 publish/repair 走 `scripts/blog-local-worker.mjs` 的 HMAC signed ingest/release path；release 後仍要跑 public readback、`verify-blog-release`、SOP doctor。`verify-blog-release --admin-readback --refresh-public-cache` 要 source `~/.altoslab-aws.env`，不要只 source `~/.altoslab-blog-worker.env`，兩者是不同 control plane，後者可能沒有可用的 admin readback session。
- 已發布文章 title/subtitle refresh 是 repair batch，不是每日 slot production。跑 `scripts/blog-local-worker.mjs` 做這類 ad-hoc repair 時要加 `--no-index` 或使用獨立 manifest 目錄，避免覆蓋 `data/blog-prepared-candidates/<date>-<slot>-column.json`，讓 SOP doctor 誤把修稿候選當成正式 slot candidate。
- Title/subtitle 的新準則：title 先交代主體、動作與讀者關係；subtitle/excerpt 補來源、日期、數字、風險或為什麼現在要看，不重複 title，不出現 `workflow`、`content readback loop`、`decision hook`、`risk lens` 這類內部營運語氣。多語版本要各自自然，不做英文術語直譯。
- 若 Tommy 在 article QA 說 `Sub-title`，不要自動理解成 public subtitle/excerpt；先檢查是否指文章內每段的 `H2/H3`。段落小標要像 mini headline，帶出該段的主體、機制、風險或決策，不要用 `ALTOS LAB view`、`What to watch`、`先看範圍`、`接下來看什麼` 這類可複製骨架詞。
- Column / feature 的 in-article images 必須服務不同閱讀工作，例如 workflow anchor、mechanism/evidence、review/rollback loop；同一篇內不可重複同一 URL / localPath / prompt。多語版本仍共享同一組 public image URL。
- 市場快訊封面預設使用來源文章或官方公告圖片，並保留 `coverSource:"source"`、`coverCredit`、`coverCreditUrl`、`coverLicense`。只有來源頁 403、沒有可用圖片、圖片品質/權利不合格時，才允許 ALTOS LAB editorial fallback；fallback 不能被當成快訊預設。
- `/api/blog?fields=inventory&limit=120` 是以單篇 post 切頁，不是以 9 語 translation group 切頁。當最新 120 筆正好切在最後一組中間時，最後一個 partial group 是 sample boundary，不應被 SEO/GEO report 當成缺語言；真正缺語言要用非邊界 group 或 full inventory/admin readback 判斷。
- AWS/S3 runtime 的 `/api/blog?fields=inventory` cap 必須足夠支援 full SEO/GEO coverage audit；預設使用 `BLOG_API_LIMIT_CAP=1000`，`seo:geo-report` 預設用 `SEO_GEO_INVENTORY_LIMIT=1000`。不要用 120 筆 sample 結論決定是否刪文、補語言或宣稱多語缺口。
- SEO/GEO source-count gate 必須按內容類型判斷：市場快訊可以是單一可信原始來源；專欄/feature 才要求多來源平均健康度。不要為了分數替快訊硬塞不必要來源。
- Hermes/OpenClaw Codex lane 必須把 `codexEvidence.provider/runtime/model/reasoning` 寫進 manifest；不要為了通過 legacy doctor 偽造 Gemini/ChatGPT Chrome evidence。若 release verifier 看到 internal copy，例如 `SEO/GEO`，要修公開文案後重新 release/readback。
- Market-news ALTOS LAB fallback cover 的 quality review 不應在 image review 前要求 `imageQualityStatus=passed`。可先用 `coverSource=manual|generated`、ALTOS LAB credit/license、alt text 和 shared public URL 通過 copy gate，再由 image gate 判定 `imageQualityStatus=passed`。
- 破圖修復不能等同於圖片品質修復。若 generated-media object 遺失，短期只允許用穩定 fallback 或恢復原始/source-safe 圖止血；不要用本地 SVG/抽象流程板硬補正式 cover。正式 column/feature cover 必須走 ChatGPT/GPT raster lane 或可授權來源圖，prompt 要指定具體主體、構圖、鏡頭/版式、材質光線、色彩與負面約束；拒絕抽象節點板、workflow card、glass cube、假 dashboard、generic network map、過度 3D SaaS 感與一眼 AI 圖。
- AWS deploy 使用唯一 ECR image tag 作為 production evidence；不要依賴脆弱的 `latest` tag shell interpolation。部署後以 ECS task definition、service stable、`verify:aws` 和 production performance smoke 作為完成證據。
- 候選稿品質不合格時，流程是 repair/rewrite/re-image/re-QA 到 validate-only pass，再 publish + public readback；不是 skip，也不是把 `wouldPublish=true` 當成已發布。
- 已發布文章的 copy refresh 走 `scripts/blog-copy-refresh.mjs`，可用 `ALTOS_ADMIN_SESSION_TOKEN` / `ADMIN_SESSION_TOKEN` 或 admin password。若本機 admin credential stale，先確認是否 source 了 `~/.altoslab-aws.env`；若仍 stale，這是 tooling/auth blocker，不可猜密碼、不可改用 direct storage write。

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
- AWS `/api/health` / production smoke checks
- SEO/GEO report job
- daily closeout
- execution history 與 retry visibility

### n8n 不負責

- 網站 runtime
- AWS ECS deploy
- production S3 CMS mutation outside signed blog API
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
4. 優先保留 source article / official announcement image，所有語言共用；若 source image 本身不合格，改用同一張 ALTOS LAB editorial fallback cover，並保留 credit/license/QA evidence。
5. 跑 public QA：

```bash
npm run blog:market-public-qa -- --slug <slug> --must <entity> --must <publisher>
```

6. 跑 validate-only / release gate。
7. 發布後跑 release verification。

### Market news hold 條件

- 沒有 usable credited source/official image，且沒有通過 QA 的 ALTOS LAB editorial fallback cover
- source URL 重複或 cover URL 重複
- 內容像模板、顧問清單、空泛 adoption checklist
- public copy 出現 `SEO`, `GEO`, `AI-generated`, prompt, pipeline, quality gate 等內部詞
- 摘要出現污染字串，例如 `報導「」`、`文中牽涉`、`這則消息可以拿來`
- 來源圖片其實是 stock/free/generic fallback，或 ALTOS LAB fallback cover 沒有 topic-fit/rendered review evidence

## Column / Feature Lane

### 目的

每天至少一篇好讀、有知識量、保 SEO、非來源摘要堆疊的原創 column group。重點是讀者願意讀完、語言自然、資訊密度足、文章節奏符合目標市場。

### 流程

1. n8n / scheduled runner 建立 run folder、prompt card、candidate skeleton。
2. main-brain 審 prompt card，不清楚就 hold。
3. 在指定 Chrome profile `john.wu0120@gmail.com` 的 `ALTOS Blog QA` Gemini tab 產出 zh-Hant source-of-truth。
4. main-brain 檢查標題、副標、lead、source claims、knowledge density、language-native rhythm、SEO fit、public wording。
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

## Public Blog Performance Gate

Blog 點進文章慢時，先查 public read path，不先重寫內容或圖片。

必跑：

```bash
npm run blog:performance-smoke -- --base-url https://altoslab-ai.cc
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

Release 前後都要看：

- `/api/blog?language=zh-Hant&limit=12&fields=inventory` TTFB；
- `/blog` TTFB 與 bytes；
- 最新 article detail TTFB；
- `/feed.xml` 與 `/llms.txt`；
- Chrome extension 從 `/blog` 點進文章的實際體感。

若 `/api/health` 快但 `/api/blog` / article detail 慢，根因通常是 CMS/S3 public projection 或 detail cache，而不是整個 AWS service 慢。

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

- 三組完整 9 語 column group
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

AWS production：

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
npm run blog:performance-smoke -- --base-url https://altoslab-ai.cc
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
- `daily columns are below target`：當日 3 組 column 未真正進 public inventory。
- `market-news lane did not publish...`：先核對同日 source scan；有 qualified source 或 ready/held actionable market candidate 才是必修復，沒有合格來源則記錄 no-qualified-source evidence。
- `S3 read path slow`：不要回舊 Cloudflare KV/D1 mental model；先看 AWS S3 CMS public projection、memory cache TTL、release 後 cache invalidation 與 `blog:performance-smoke`。
- Blog UI 變動需求：不屬於自動發文修復，必須走 designer-approved UI change gate。

## 接手者第一天檢查清單

1. 確認 `git status --short` 乾淨。
2. 跑 `npm test`。
3. 跑 `npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3`。
4. 跑 `npm run n8n:verify-local`。
5. 確認 n8n workflows 已 import 且 active。
6. 手動打 `/run/health`，確認 bridge token 與 local bridge 正常。
7. 找最新 `data/blog-worker-runs/*/prepared-candidate.json`，確認狀態與 release gate reason。
8. 找最新 `data/n8n-local-runs/*.json`，確認是否有 failed execution 需要處理。
9. 檢查今日 public inventory 是否已有三組 9 語 column；market-news 則核對同日 source scan，有 qualified source 才要求 9 語 group，沒有則要求 no-qualified-source / held-source evidence。
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
- market-news lane、column lane、candidate manifest、release gate、daily closeout、AWS verification 都有明確命令。
- 文件明確寫出 n8n 不能改 UI、不能 fabricate Gemini/GPT evidence、不能把 held gate 視為成功。
- `npm test` 通過。
- `npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3` 通過。

## 2026-06-22 Style Corpus And Image Gate Evidence

- `npm run blog:nine-language-style-corpus -- --max-per-site 50 --concurrency 4 --discover-only` found 1340 candidate articles across 36 seed sites. This is candidate discovery, not proof that 50 articles per site were absorbed.
- `npm run blog:nine-language-style-corpus -- --max-per-site 8 --concurrency 4` absorbed 261/288 bounded article samples. 28/36 sites met the bounded target; incomplete sites are recorded in `data/blog-research/nine-language-style-corpus/latest-summary.json`.
- `npm run blog:media-style-corpus -- --target 400` completed 400 metadata samples with 0 failures.
- Foresight direct HTML/RSS/API can return Tencent EdgeOne 567 from this machine. Do not leave the style-training task blocked on that. Use the existing public markdown/corpus evidence in `data/blog-research/foresight-image-style-2026-06-22/foresight-500-style-signals.*`: 500/500 articles, failures 0, no persistent image download.
- Training/handoff should learn compact style signals from `latest-summary.json`, `latest-report.md`, and `media-style-corpus.md`; do not store large raw excerpts or copy source passages.
