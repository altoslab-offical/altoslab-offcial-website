# Blog Market News Fast Lane

ALTOS LAB market news is source-translation, not a column. The job is to bring a verified source story into every configured language with the same source links, cover image, credit, and article identity.

## Required Flow

1. Collect article metadata and style signals:
   `npm run blog:media-style-corpus -- --target 1000 --per-source-limit 250 --out-dir data/blog-research`
2. Pick only source-verifiable AI or technology stories with a credited article or official image.
3. Translate and adapt the source facts into `zh-Hant`, `en`, `ja`, `ko`, `id`, `vi`, `th`, `ms`, and `fil`.
4. Keep the public subtitle as a news standfirst:
   publisher plus named entity plus concrete event plus one number, date, or consequence.
5. Run public QA before calling the article ready:
   `npm run blog:market-public-qa -- --slug <slug> --must <entity> --must <publisher>`

## Subtitle Rules

- Good: `TechCrunch 報導，AethexAI 完成 300 萬美元 pre-seed 融資，正把自建語音 AI 系統推向非洲與中東；公司稱目前每天處理超過 17,000 通電話。`
- Bad: `這則消息可以拿來企業檢查 voice AI startups 是否能進入日常流程的訊號。`

Market-news subtitles should not begin with ALTOS LAB process advice, SEO/GEO terms, workflow diagnosis, or generic utility framing. If ALTOS LAB has a judgment, put it near the end of the article after the source facts are clear.

## Hard Bans

- No Gemini or GPT art for ordinary market-news covers.
- No Unsplash, Pexels, Pixabay, Openverse, local fallback art, repeated covers, or generic stock images.
- No public copy containing `Source:`, `Event:`, `Evidence:`, `Next action`, `Decision cue`, `source-attributed official announcement image`, `這則消息可以拿來`, `企業檢查`, `卡在哪個流程`, or backend QA terms.
- No changing the source story into a consulting template.

## Current Corpus Note

The corpus tool records blocked or unparseable sources as failures. On 2026-06-04, ABMedia, Blockcast, TechCrunch AI, MIT Technology Review, and VentureBeat AI contributed metadata; Foresight returned unparseable or 404 responses from this machine and must be retried through a different route before being treated as covered.
