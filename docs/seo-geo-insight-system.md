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
ALTOS LAB production runtime is AWS/local runner; Google Cloud is not a website runtime dependency. GA/GSC readback uses Google API credentials only.

Preferred local/AWS operator setup:

```txt
GOOGLE_AUTH_MODE=user
GOOGLE_AUTH_ACCOUNT=altoslab.offical@gmail.com
GA4_GOOGLE_OAUTH_CREDENTIALS=/Users/asdc163/.altoslab-google/altoslab-ga-readback-user.json
GOOGLE_OAUTH_CREDENTIALS=/Users/asdc163/.altoslab-google/altoslab-ga-readback-user.json
SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON=/Users/asdc163/.altoslab-google/altoslab-ga-gsc-reader.json
```

Use `npm run google:oauth-user -- --client <oauth-client-json> --output <authorized-user-json>` to create or refresh the GA readback `authorized_user` credential. Request only the scopes needed by the report, normally `analytics.readonly` and `webmasters.readonly`.

Current production state:

- GA4 Data API is readable through `altoslab.offical@gmail.com` user OAuth (`GA4_GOOGLE_OAUTH_CREDENTIALS`).
- Search Console URL-prefix `https://altoslab-ai.cc/` is verified and readable through the existing service account (`SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`).
- GA/GTM tags are installed on the live homepage through `GTM-WJ96VR7V` and `G-5VSLFNVD28`.
- Do not route official-site readback through Cloud Run metadata or unmanaged GCP service-account projects. If GA and Search Console require different Google identities, keep their credential paths separate rather than forcing one identity to satisfy both products.

The report can try local `gcloud` tokens only as diagnostics. Do not use Cloud SDK's default OAuth client as the durable GA path: Google rejects unregistered Analytics/Search Console scopes or requires over-broad `cloud-platform` consent. Use the ALTOS desktop OAuth client plus read-only scopes instead.

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
For durable server-to-server auth, a service account may still be used when the Google product accepts it and the account has been granted access. If access is missing or GA rejects the service-account identity, keep GA on user OAuth and keep Search Console on its verified service-account path. If either source is missing, the report remains valid but marks that live metric unavailable. The domain-property form (`sc-domain:altoslab-ai.cc`) requires DNS-token ownership and is not the default local runner path.

If no qualified public posts are published, the report calls that out as a content-inventory gap instead of pretending
individual posts are missing SEO or GEO fields. This is expected immediately after fail-closed removal of incomplete
legacy language groups.

## Email Rule

Daily status email should be sent:

- From: `altoslab.offical@gmail.com`
- To: `altoslab.offical@gmail.com`

The production send path is Gmail web UI in Chrome, not the Gmail connector. The connector may be used only for read/search diagnostics when explicitly needed. Before pressing send, the operator must verify the active Gmail account is exactly `altoslab.offical@gmail.com`; if the account cannot be verified, hold the send and report the mismatch instead of sending from a personal or wrong account.
