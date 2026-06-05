# ALTOS LAB Blog Source-Of-Truth Localization Model

This is the required multilingual production model after the first backfill recovery.

## Core Rule

Columns/features: Gemini writes one source-of-truth article first. Codex approves or rejects that source article. Only after approval may subagents localize it into the remaining languages.

Market news: Codex/source workers may build the source-of-truth brief directly through source-translation from the verified source article. Gemini is not required for ordinary market-news briefs. The brief must still pass source fidelity, attribution, image and quality gates before localization.

The localization job is not literal translation. Each language version must read as if a local technology/business editor wrote it for that market, while preserving the same article identity, source facts, cover/media set and editorial angle.

## Production Stages

1. `source_draft`
   - For columns/features, Gemini writes the source-of-truth article, usually `zh-Hant`.
   - For market news, Codex/source workers translate and adapt the verified source article into ALTOS LAB's brief format. The source article must stay source-faithful and use the credited official/source image.
   - For columns/features, Gemini writes the argument and ChatGPT/GPT creates the shared cover plus 2-3 shared in-article visuals.

2. `source_quality_gate`
   - Codex checks title, subtitle, lead, source fidelity, reader value, public wording, body format, image policy and quality score.
   - If a column/feature source draft is weak, return to Gemini before any localization begins.
   - If a market-news source draft is weak, repair from the source article and source image; do not invent analysis to cover source gaps.
   - Never localize a source draft that has not passed the gate.

3. `localization_subagents`
   - Subagents localize from the approved source article.
   - Start with `gpt-5.3-codex-spark`; if usage/quota/rate limit is exhausted, continue the same bounded localization job with `gpt-5.4-mini`.
   - They may rewrite sentence order, examples, rhythm and headline shape for the target market.
   - They may not add unsupported facts, change the source angle, change the cover/media set, or create a separate article.

4. `multilingual_consistency_gate`
   - Codex verifies all configured languages are present exactly once: `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, `fil`.
   - All versions must share `translationGroupId`, `sourceLinks`, cover URL, cover credit, cover license, content image URLs and content type.
   - Only localized public copy may differ.

5. `production_release_gate`
   - Run `blog-local-worker` validate-only.
   - Publish only when quality, image, multilingual parity and production verification pass.

## Recommended Localization Groups

- `en-ja-ko`: mature AI/business media tone; concise, precise, source-aware.
- `id-vi`: Southeast Asia business operator tone; avoid Chinese/English sentence order.
- `th-ms-fil`: local reader-first phrasing; keep titles natural and avoid formal machine translation.

Use smaller groups if a language repeatedly fails quality gates.

## Shared Fields

These must remain identical across languages:

- `translationGroupId`
- `contentType`
- `topic`
- `sourceLinks`
- `cover`, `coverUrl`, `coverImage`
- `coverSource`
- `coverCredit`, `coverCreditUrl`, `coverLicense`, `coverLicenseUrl`
- `contentImages` URL set and placements
- publication slot and release policy

These may be localized:

- `slug`
- `title`
- `subtitle`
- `excerpt`
- `seoTitle`
- `seoDescription`
- `geoSummary` value, as a public answer-style summary without using backend wording
- `body`
- `keyTakeaways`
- `faqs`
- `coverAlt`

## Subagent Task Template

```txt
You are gpt-5.3-codex-spark, or gpt-5.4-mini when Spark usage is exhausted.
cwd: /Users/asdc163/Documents/官方網站
Task: Localize the approved ALTOS LAB source-of-truth article into [languages].
Own only: [exact parsed output JSON path(s)].
Read only: [source article JSON], [source pack JSON], [localization model doc].

Model fallback:
- Primary: gpt-5.3-codex-spark.
- Fallback: gpt-5.4-mini when Spark returns usage exhausted, quota exceeded, rate limit, 429, resource_exhausted, capacity or budget-limit errors.
- Fallback does not change scope: same files, same output cap, no publishing, no invented facts and no final quality decision.

Rules:
- This is localization, not literal translation and not a new article.
- Preserve the same source facts, article angle, translationGroupId, sourceLinks, cover and contentImages.
- Rewrite title, subtitle, body rhythm, examples and FAQ so the target language sounds native for its market.
- Do not use public backend words: SEO, GEO, AI-generated, prompt, pipeline, quality gate, rubric.
- Do not add unsupported claims, fake numbers, fake case studies or unverified dates.
- Body uses site-supported markdown only: ##, lists, short callouts, limited tables. No ###.
- If a language sounds translated or weak, mark it held and explain why.

Output JSON only:
{
  "status": "ok" | "held",
  "sequence": <number>,
  "posts": [ ...localized posts... ],
  "localizationNotes": [ ... ]
}
```

## Localization QA Rubric

Block the language version when:

- It reads like literal translation or preserves Chinese/English word order.
- It changes the article thesis or turns market news into a generic column.
- The title sounds like a keyword list or internal task name.
- The subtitle lacks a concrete source event, operator situation or decision hook.
- The first 40-80 words do not tell the reader why the story matters now.
- It exposes backend wording or AI-production disclosure.
- It uses raw `###` headings, fake tables, fake UI names, or unsupported examples.
- It omits the source event, date, company/product, or decision implication that the source-of-truth article used.

Pass only when the target reader would not feel they are reading a machine translation.
