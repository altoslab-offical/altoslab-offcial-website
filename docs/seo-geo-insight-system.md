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
For the local Cloudflare+n8n runner, use the project-owned service-account JSON when Google products accept it:

```txt
GOOGLE_AUTH_MODE=service_account
GOOGLE_AUTH_ACCOUNT=altoslab.offical@gmail.com
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
GA4_SERVICE_ACCOUNT_JSON=/absolute/path/to/service-account.json
```

Current production state:

- Search Console URL-prefix `https://altoslab-ai.cc/` is verified and readable through the service account.
- GA/GTM tags are installed on the live homepage through `GTM-WJ96VR7V` and `G-5VSLFNVD28`.
- GA4 Data API is configured but still returns insufficient property permission until the GA4 property grants a usable reader to either the service account or an approved OAuth client. Do not report fake GA4 traffic while this remains blocked.

When no service-account JSON is configured, the report can try the local `gcloud auth application-default print-access-token`
and `gcloud auth print-access-token --account "$GOOGLE_AUTH_ACCOUNT"` fallbacks. Those fallbacks are useful for diagnostics,
but they may still be rejected by GA4 or Search Console when the local Google login lacks Analytics/Webmaster scopes.
Do not keep retrying Cloud SDK's default OAuth client for those scopes if Google returns `系統已封鎖這個應用程式`
or `Request had insufficient authentication scopes`; the active operator account is already
`altoslab.offical@gmail.com`, and the remaining fix is to use a project-owned OAuth desktop client or a
service account that GA4 and Search Console both accept as a verified reader/owner.

Optional GA4 fields:

```txt
GA4_PROPERTY_ID=<numeric-ga4-property-id>
GOOGLE_AUTH_MODE=service_account
GOOGLE_AUTH_ACCOUNT=altoslab.offical@gmail.com
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Optional Search Console fields:

```txt
SEARCH_CONSOLE_SITE_URL=https://altoslab-ai.cc/
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://altoslab-ai.cc/
GOOGLE_AUTH_MODE=service_account
GOOGLE_AUTH_ACCOUNT=altoslab.offical@gmail.com
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

If `SEARCH_CONSOLE_SITE_URL` is omitted, the report uses the current `--base-url` as the Search Console site URL.
For durable server-to-server auth, use `GOOGLE_APPLICATION_CREDENTIALS` or `GA4_SERVICE_ACCOUNT_JSON` and grant that service account access to the GA4 property and Search Console URL-prefix property. If access is missing, the report remains valid but marks the live metrics as unavailable. The domain-property form (`sc-domain:altoslab-ai.cc`) requires DNS-token ownership and is not the default local runner path.

If no qualified public posts are published, the report calls that out as a content-inventory gap instead of pretending
individual posts are missing SEO or GEO fields. This is expected immediately after fail-closed removal of incomplete
legacy language groups.

## Email Rule

Daily status email should be sent:

- From: `altoslab.offical@gmail.com`
- To: `altoslab.offical@gmail.com`

The production send path is Gmail web UI in Chrome, not the Gmail connector. The connector may be used only for read/search diagnostics when explicitly needed. Before pressing send, the operator must verify the active Gmail account is exactly `altoslab.offical@gmail.com`; if the account cannot be verified, hold the send and report the mismatch instead of sending from a personal or wrong account.
