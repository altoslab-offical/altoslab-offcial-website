# ALTOS LAB Blog Backfill Prompt Card

Current public posts: 27. Per-language target: 40. Current language coverage: zh-Hant: 3/40, en: 3/40, ja: 3/40, ko: 3/40, id: 3/40, vi: 3/40, th: 3/40, ms: 3/40, fil: 3/40. This is backfill set 36.
Lane: column
Slot context: afternoon
Article set output: /Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/article-set.json
Prepared manifest: /Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/prepared-candidate.json

Use only the ALTOS Blog QA Chrome tab group.
Column lane: Gemini writes/revises all language versions; ChatGPT/GPT creates one shared cover plus 2-3 shared in-article images for every language.
Required languages: zh-Hant, en, ja, ko, id, vi, th, ms, fil.

Hard release rule:
- Do not publish from this prompt card.
- Do not write a ready manifest until browser evidence, local preflight, validate-only, image/source QA and design QA pass.
- Do not use old 4-language article sets to satisfy this queue.
- Do not expose SEO, GEO, AI-generation, prompt, model or quality-gate language in public copy.
- Every language version must share the same translationGroupId, sourceLinks, cover URL, cover credit and visual metadata.
- Southeast Asia editions must be naturally localized for Indonesia, Vietnam, Thailand, Malaysia and the Philippines.

After the browser production output is saved, run:

```bash
node scripts/blog-local-worker.mjs \
  --article-set "/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/article-set.json" \
  --slot afternoon \
  --validate-only \
  --manifest "/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/prepared-candidate.json" \
  --approve-design-qa
```

If this is market news and validate-only/main-brain QA pass, publish immediately with:

```bash
node scripts/blog-local-worker.mjs \
  --article-set "/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/article-set.json" \
  --slot afternoon \
  --publish \
  --manifest "/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/prepared-candidate.json" \
  --reuse-validated-manifest \
  --approve-design-qa
node scripts/verify-blog-release.mjs --manifest "/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/prepared-candidate.json"
```

Detailed Gemini/GPT browser prompt:

```text
# ALTOS LAB daily AI blog article set

You are the browser-operated production workspace for ALTOS LAB's official website blog. Gemini must write/revise the article copy. ChatGPT/GPT generates covers only for columns/features; market news must use the credited source article or official announcement image. Create one high-quality article set and write the final JSON to this exact path:

/Users/asdc163/Documents/官方網站/data/blog-worker-runs/2026-06-03-backfill-36-column-20260603-223819/article-set.json

Do not publish. Do not call any ALTOS LAB API. Do not write Markdown around the JSON.

Slot: afternoon (16:00 Asia/Taipei)
Date: 2026-06-03
Lane: deep-column-lane
Topic: Choose the strongest original ALTOS LAB AI column angle for founders and operators.

Editorial bar:
- Article copy must be drafted and revised through Gemini in the ALTOS Blog QA Chrome group.
- This run is an original ALTOS LAB column: contentType must be column, not breaking, and the cover must be generated through ChatGPT/GPT.
- Market news/breaking posts must use the source article or official announcement image with visible attribution; do not use GPT art or stock/free images for market news.
- Column/feature cover images must be generated through ChatGPT/GPT in the ALTOS Blog QA Chrome group.
- Close or release Gemini/GPT tabs after the run so Chrome memory is not held.
- Check existing published/draft articles first; do not repeat a topic, headline angle or source package.
- Write zh-Hant first as the source of truth, then localize en, ja, ko, id, vi, th, ms, fil from the same argument.
- Southeast Asia editions must sound native for Indonesia, Vietnam, Thailand, Malaysia and the Philippines; do not ship literal translation tone.
- All 9 languages must share the same cover URL and the same contentImages URLs. The language changes; the article identity and images do not.
- The first 40-80 words must answer why the reader should care today.
- Use a clear ALTOS LAB judgment. Do not write a generic news summary.
- No fake case studies, unsupported metrics, keyword stuffing, or templated AI filler.
- Keep paragraphs scannable. Include one practical decision, not just context.
- Fill SEO title/meta and GEO summary as backend metadata fields only; never mention SEO, GEO, AI-generation, prompts, models or quality pipeline in public title, excerpt, body, FAQ, captions, credits or review notes.
- Add natural FAQ, key takeaways and visible source links for readers. Do not include public AI-generation disclosure copy.

Source bar:
- breaking/news article: at least 2 reliable sources.
- column/feature: at least 4 reliable sources.
- Prefer official AI labs, product/research blogs, trusted technology media, and primary documentation.
- All 9 languages must use the exact same sourceLinks array and one translationGroupId.

Image bar:
- For market news, attach a source image URL from the source article or official announcement, set coverSource to "source", and include coverCredit, coverCreditUrl and coverLicense. Do not use Unsplash, Pexels, Pixabay, Openverse, GPT art or any previously used cover.
- For columns/features, attach one ChatGPT/GPT-generated cover as coverLocalPath or an uploaded managed HTTPS media URL before validate-only.
- For columns/features, also attach 2-3 ChatGPT/GPT-generated in-article images in contentImages: opening anchor, mechanism/evidence, and optional closing synthesis. These images must be shared by every language version.
- For generated covers, coverGeneration.provider must say ChatGPT, GPT or OpenAI image generation.
- For generated contentImages, each image must include source "generated", provider, prompt, generatedAt, alt, caption, credit, aspectRatio and visualChecks.
- Never use local fallback art, generic stock photo URLs, repeated covers, real people, misleading logos, fake UI, or text-heavy graphics.

Required JSON shape:
{
  "ingestRunId": "browser-gemini-gpt-2026-06-03-afternoon-column",
  "slot": "afternoon",
  "generationDate": "2026-06-03",
  "translationGroupId": "browser-gemini-gpt-2026-06-03-afternoon-column",
  "publishMode": "publish-if-valid",
  "generation": {
    "provider": "gemini-chatgpt",
    "promptVersion": "altos-gemini-gpt-browser-v1",
    "model": "Gemini copy + ChatGPT/GPT image browser workflow"
  },
  "chromeEvidence": {
    "gemini": {
      "usedExistingTab": true,
      "continuedExistingConversation": true,
      "changedModel": false,
      "title": "",
      "url": "https://gemini.google.com/app"
    },
    "chatgpt": {
      "usedExistingTab": true,
      "continuedExistingConversation": true,
      "changedModel": false,
      "title": "",
      "url": "https://chatgpt.com/"
    }
  },
  "posts": [
    {
      "language": "zh-Hant",
      "slug": "lowercase-hyphen-slug-zh-hant",
      "title": "",
      "seoTitle": "",
      "seoDescription": "",
      "excerpt": "",
      "contentType": "column",
      "newsCategory": "AI",
      "topic": "",
      "audience": "",
      "geoSummary": "",
      "body": "Markdown body with H2 sections. Use ==important sentence== for one short highlighted sentence when helpful.",
      "keyTakeaways": ["", "", ""],
      "faqs": [{ "question": "", "answer": "" }],
      "sourceLinks": [{ "title": "", "url": "", "publisher": "", "publishedAt": "", "summary": "" }],
      "tags": ["AI", "ALTOS LAB"],
      "author": "Ken",
      "coverAlt": "",
      "coverSource": "generated",
      "coverCredit": "ALTOS LAB 編輯視覺",
      "coverCreditUrl": "",
      "coverLicense": "",
      "coverGeneration": { "source": "generated", "provider": "ChatGPT/GPT", "prompt": "", "generatedAt": "", "status": "generated", "visualChecks": { "topicFit": true, "noTextArtifacts": true, "noLogos": true, "noPeople": true, "noTrademarkRisk": true, "noGenericStockLook": true } },
      "contentImages": [{ "url": "", "localPath": "", "alt": "", "caption": "", "source": "generated", "credit": "ALTOS LAB editorial visual", "aspectRatio": "wide", "placement": "after-lead", "provider": "ChatGPT/GPT", "prompt": "", "generatedAt": "", "visualChecks": { "topicFit": true, "noTextArtifacts": true, "noLogos": true, "noPeople": true, "noTrademarkRisk": true, "noGenericStockLook": true } }, { "url": "", "localPath": "", "alt": "", "caption": "", "source": "generated", "credit": "ALTOS LAB editorial visual", "aspectRatio": "wide", "placement": "mid-article", "provider": "ChatGPT/GPT", "prompt": "", "generatedAt": "", "visualChecks": { "topicFit": true, "noTextArtifacts": true, "noLogos": true, "noPeople": true, "noTrademarkRisk": true, "noGenericStockLook": true } }],
      "generatedBy": "gemini",
      "aiDisclosure": ""
    }
  ]
}

Create exactly 9 posts: zh-Hant, en, ja, ko, id, vi, th, ms, fil.
```
