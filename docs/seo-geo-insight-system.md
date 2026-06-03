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

- From: `Altoslab447@gmail.com`
- To: `Altoslab.offical@gmail.com`

The production send path is Gmail web UI in Chrome, not the Gmail connector. The connector may be used only for read/search diagnostics when explicitly needed. Before pressing send, the operator must verify the active Gmail account is exactly `Altoslab447@gmail.com`; if the account cannot be verified, hold the send and report the mismatch instead of sending from a personal or wrong account.
