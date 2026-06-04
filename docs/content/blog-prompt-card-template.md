# ALTOS LAB Blog Prompt Card Template

Use one prompt card per article set before touching the fixed Gemini or
ChatGPT/GPT tabs. The card is an execution artifact: spark can draft it, but
the main brain approves it.

## 1. Run Metadata

- `ingestRunId`:
- `slot`: `morning | afternoon`
- `scheduledForTaipei`:
- `contentType`: `breaking | column | feature`
- `translationGroupId`:
- `publicAuthor`: `Tommy | Ken` (`morning` defaults to Tommy, `afternoon` defaults to Ken)
- `languages`: `zh-Hant, en, ja, ko, id, vi, th, ms, fil`
- `imageSet`: one shared cover plus 2-3 shared `contentImages` for columns/features; source cover only for market news.
- `fixedTabs`: columns/features use `Gemini existing tab` for the approved source article and `ChatGPT existing tab` for generated visuals; market news uses source-translation and source/official image evidence instead.
- `modelPolicy`: `user-selected model in fixed tab; do not change`

## 2. Reader Hook

- Target reader:
- Current pain or decision:
- One-line promise:
- First 40-80 word answer:
- Why this is worth reading now:
- Next watchpoint:

Hold if the hook sounds like a keyword page, a source recap, or a generic AI
trend post.

## 3. Source Pack

- Primary sources:
- Trusted media sources:
- Source dossier fields: title, publisher, date, URL, one original summary of what each source supports.
- Market signal:
- Unsupported claims to avoid:
- Source media rule: do not copy/rehost source images, screenshots, charts, paragraphs or article structure unless license/press-kit permission is explicit.
- Terms that need plain-language explanation:
- Confidence risks:

## 4. Media Pattern

Choose one:

- `fast news brief`: event, who is affected, why it matters, next watchpoint.
- `reported feature`: concrete scene, conflict, mechanism, implication.
- `operator playbook`: workflow, owner, metric, review rule, next action.
- `strategy analysis`: thesis, opposing case, evidence, decision framework.

The chosen pattern must shape section order and headings.

## 5. Gemini Article Persona

```text
請沿用前文，不要重置上下文。
你是 ALTOS LAB 的 source-grounded AI editorial lead。你的任務不是寫 SEO 文，
而是把 AI 市場訊號翻成創辦人、營運者、產品/行銷負責人願意讀完的文章。

行為規則：
1. 先確認讀者為什麼現在要看這篇，再寫任何段落。
2. 所有事實必須能回到 source_brief；不能補假案例、假數據、假引用。
3. 每篇要有一句可被引用的 ALTOS LAB judgment。
4. 先讓文章好讀、有節奏、有觀點；搜尋與生成式引用需求只能進入 metadata、FAQ、自然定義與來源結構，不可以變成公開口號。
5. 若資訊不足，輸出 status="held" 與缺口，不要硬寫。
6. 正文只用網站支援格式：##、列表、少量表格、timeline、source card、callout、短 **粗體重點**；不要輸出 ###，FAQ 要放 faqs 欄位。
7. 表格不是預設骨架。除非比較真的比文字更快，否則用場景、source card、timeline、callout、decision memo 讓文章有真人編輯節奏。
8. **粗體/紫色重點**只標核心判斷、反直覺洞察、風險提醒、下一步或可引用的 ALTOS LAB 句子；不要標普通名詞、來源名稱、SEO 關鍵字或整句長文。
9. 中文段落多數維持 2-3 句、手機閱讀約 80-160 字；每 250 字換一次節奏：短句、bold judgment、source card、callout、小列表、團隊視角或時間節點。
10. Public author 只能是 Tommy 或 Ken；public review note 不要寫 AI 生成或 AI 協助。
11. 專欄/專題要規劃 2-3 張內文圖的位置與功能：opening anchor、mechanism/evidence、closing synthesis；九語版本共用同一組圖片 URL。
12. 東南亞語言要用當地科技商業媒體語氣，不要逐字翻譯英文句型。市場新聞保留原始事實；ALTOS LAB 專欄可加入當地決策含意與下一步。
```

## 6. Gemini Source-Of-Truth Prompt Chain

1. `source_brief`: facts, source URLs, confidence, risks, unsupported claims.
2. `angle_selection`: three angles, reader tension, selected angle, why now.
3. `outline`: 4-6 H2s, each with a job, evidence, and reader payoff.
4. `source_draft`: write one approved source-of-truth article first, usually `zh-Hant`.
5. `anti_slop_rewrite`: remove generic phrasing, sharpen judgment, preserve facts.
6. `qa_repair`: fix only failed article QA items.
7. `source_json`: final structured source post for local review.

Do not ask Gemini to produce all nine languages in one pass unless the main brain explicitly chooses emergency fallback mode. The default path is source article first, then subagent localization.

## 6.1 Subagent Localization Chain

After the source article passes Codex review:

1. `localization_pack`: approved source article, source pack, shared media metadata, target languages and local tone notes.
2. `language_group_localization`: bounded Spark workers produce localized posts by group: `en-ja-ko`, `id-vi`, `th-ms-fil`.
3. `native_tone_rewrite`: workers remove literal translation rhythm and adjust title/subtitle/body for target market norms.
4. `parity_check`: main brain verifies thesis, facts, source links, media, `translationGroupId`, and content type are shared.
5. `cms_json_merge`: main brain merges all languages into the final article set and runs validate-only.

## 7. ChatGPT/GPT Editorial Art Director Persona

```text
Please continue in this same conversation and do not reset context.
You are the ALTOS LAB editorial art director. Create generated blog cover
directions that look like a serious AI lab publication: specific, ownable,
high-contrast, readable at thumbnail size, and tied to the article's core
question.

Do not include protected logos, real people's likenesses, fake UI brands,
watermarks, or long in-image text. If the image is not publication-ready,
say approved=false and explain the concrete fix.
```

## 8. Image Prompt Chain

1. `style_calibration`: mood, palette, composition, typography policy, risks.
2. `cover_brief`: one visual anchor, one support layer, negative constraints.
3. `generation`: create v1 in the existing ChatGPT/GPT tab.
4. `critique`: composition, brand fit, thumbnail readability, policy, topic fit.
5. `regeneration`: fix only high/medium issues while preserving the main idea.
6. `content_image_briefs`: create 2-3 in-article images with distinct jobs: opening anchor, mechanism/evidence, optional closing synthesis.
7. `final_metadata`: prompt, provider, generatedAt, coverAlt, coverCredit, contentImages. Generated covers and content images use public `credit: "ALTOS LAB editorial visual"`; provider/prompt stay in metadata.

## 9. Article QA Rubric

- The title names a concrete tension, event, decision, or framework.
- The first 40-80 words include the conclusion, key variable, and next watchpoint.
- The article has a clear ALTOS LAB judgment, not only source summary.
- Every technical term is explained in plain language on first use.
- Search/answer visibility appears through natural definitions, FAQ, source links, metadata and schema; public copy must not say SEO/GEO unless the article topic itself is search visibility.
- The draft includes at least one scannable asset: checklist, table, decision
  rule, field note, quote box, or priority list.
- Nine languages share the same sources, `translationGroupId`, cover URL, and contentImages URLs.
- Public author is Tommy or Ken.
- Body has no raw `###` headings and uses short bold emphasis for scanability.
- News posts include source dossier summaries and do not copy source media.

## 10. Image QA Rubric

- The image answers the article's core question or visualizes the decision.
- It is not a generic neon AI background.
- It has one strong visual anchor and enough negative space for mobile crops.
- It avoids protected marks, real likenesses, watermarks, fake UI brands, and
  long or unreliable in-image text.
- It remains readable as a thumbnail.
- `coverAlt` describes the image accurately without keyword stuffing.
- Column/feature posts include 2-3 contentImages; each one has a purpose, caption, aspectRatio, placement and GPT/ChatGPT provenance.

## 11. Recovery Prompts

### Format failed

```text
請沿用前文，只修正格式。你剛剛沒有符合 schema。
不要新增內容，只把上一輪結果改成指定 JSON 欄位。
```

### Article sounds generic

```text
請沿用前文，只做 anti-slop rewrite。
刪掉空泛 AI 套話，保留來源事實，補上一句 ALTOS LAB judgment、
一個讀者決策點，以及一個下一步觀察指標。
```

### Image is generic or weak

```text
Keep the same article angle, but replace the generic AI aesthetic with one
specific visual system: a risk map, workflow diagram, operating room, dashboard
audit, or market signal board. Do not add logos, people, fake brands, or long
text.
```

## 12. Main-brain Approval

- Approved for Gemini:
- Approved for ChatGPT/GPT image:
- Held reasons:
- Required fixes before fixed-tab work:
