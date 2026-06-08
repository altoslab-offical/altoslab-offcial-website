# ALTOS LAB SEO/GEO Insight System

## Measurement Model

The daily report measures two layers:

- SEO readiness: GA/GTM availability, Search Console verification, sitemap, feed, robots, hreflang, language index reachability, metadata and cover-alt coverage.
- GEO readiness: `llms.txt`, AI referral event tracking, source-backed article structure, `geoSummary`, source summaries, FAQ/key-takeaway coverage, and multilingual translation-group completeness.

The report intentionally separates readiness from live performance. If GA4 Data API or Search Console credentials are missing, the script reports the gap instead of fabricating traffic or visibility numbers.

## Market Practice Applied

- Google Analytics supports custom channel groups for AI chatbots. ALTOS LAB tracks AI referral landing events and reports AI source patterns such as ChatGPT, OpenAI, Perplexity, Gemini, Claude, Copilot, You.com and related AI discovery surfaces.
- Google Search Console remains the baseline for clicks, impressions and CTR. Google AI Overviews and AI Mode clicks are still evaluated through Search visibility and linked-page reporting rather than a separate public GEO metric.
- GEO tools and current research treat AI visibility as a sampled answer-surface problem: repeated prompts, citation presence, cited-domain share, answer accuracy and source freshness matter more than a one-time screenshot.

## Daily Command

```bash
npm run seo:geo-report -- --base-url https://altoslab-ai.cc --format text
```

腳本輸出會分 3 層判讀：
- `GA / GTM`：是否有把 `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_GTM_ID` 安裝上。
- `GA4 Data API`：是否設定 `GA4_PROPERTY_ID`，以及 `runReport` 能否成功讀回近 7 天資料。
- `Search Console API`：是否設定 `SEARCH_CONSOLE_SITE_URL`，以及是否能用 Google 的 Search Console API 讀回曝光、點擊。

如果某一層沒有通過，報告的「2. GA / GTM / 搜尋資料」會直接列出下一步行動，不會拿假數字或猜測值。`GA4` 或 `Search Console` 未讀到資料時，預設會把警告標為「尚未可讀」，並要求先補齊授權與環境設定。

Optional machine-readable report:

```bash
npm run seo:geo-report -- --base-url https://altoslab-ai.cc --format json --output data/reports/seo-geo-latest.json
```

## Credentials

The script loads `~/.altoslab-blog-worker.env`, `.env.local`, and `.env` without printing secrets.
When no service-account JSON is configured, it tries the local `gcloud auth application-default print-access-token`
and `gcloud auth print-access-token` fallbacks. Those fallbacks are useful for diagnostics, but they may still be
rejected by GA4 or Search Console when the active Google login lacks the required Analytics/Webmaster scopes.

Optional GA4 fields:

```txt
GA4_PROPERTY_ID=<numeric-ga4-property-id>
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Optional Search Console fields:

```txt
SEARCH_CONSOLE_SITE_URL=https://altoslab-ai.cc/
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

If `SEARCH_CONSOLE_SITE_URL` is omitted, the report uses the current `--base-url` as the Search Console site URL.
The service account must be granted access to the GA4 property or Search Console property. If access is missing, the report remains valid but marks the live metrics as unavailable.

If no qualified public posts are published, the report calls that out as a content-inventory gap instead of pretending
individual posts are missing SEO or GEO fields. This is expected immediately after fail-closed removal of incomplete
legacy language groups.

## Email Rule

Daily status email should be sent:

- From: `altoslab768@gmail.com`
- To: `Altoslab.offical@gmail.com`

The production send path is Gmail web UI in Chrome, not the Gmail connector. The connector may be used only for read/search diagnostics when explicitly needed. Before pressing send, the operator must verify the active Gmail account is exactly `altoslab768@gmail.com`; if the account cannot be verified, hold the send and report the mismatch instead of sending from a personal or wrong account.
