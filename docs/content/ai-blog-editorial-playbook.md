# ALTOS LAB AI Blog Editorial Playbook

## Positioning

ALTOS LAB is an AI implementation lab and product studio. The blog should make
the lab look sharp, current and useful: not a pure SEO/GEO tool site, and not a
self-introduction archive.

Every article should start from a market signal and decide what job the post is
doing. Some posts translate the signal into an operator decision. Some simply
help the reader understand the market faster. Both are valid, as long as the
piece is readable, evidence-backed, language-native and useful enough that a
human would keep reading.

- What changed in AI, search, agents, products, infrastructure or governance?
- Why does it matter to a founder, operator, marketing lead or executive?
- What would a smart reader understand faster after this piece?
- Add ALTOS LAB's own read only when it makes the article sharper; do not force
  a fixed "judgment / limits / next step" template.
- Which sources make the claim traceable?

## Market Writing Patterns To Learn From

- Medium / independent technical writers: start from a concrete scene or
  failure, then earn the framework. Strong posts often use a TL;DR, an
  "honest take", evaluation questions, and a specific example before the
  abstract lesson.
- OpenAI: clear product/research/company separation, direct launch framing,
  concrete capability implications and credible examples.
- Google DeepMind: lab tone, mechanism-first explanation, research context,
  constraints and responsibility.
- Anthropic: safety, evals, enterprise readiness, uncertainty and trust.
- NVIDIA: enterprise use cases, infrastructure, acceleration and industry
  workflows.
- Hugging Face: open-source developer energy, benchmarks, practical tutorials
  and community proof.
- MIT Technology Review / The Batch: market context, implications, a real
  editorial voice and useful restraint around uncertainty.
- Vercel / Stripe / Linear / Notion: precise titles, crisp subtitles, product
  craft, operator language and visible implementation detail.

## Title And Subtitle Rules

Bad titles sound generic:

- AI platform trends businesses must know
- AI search visibility and executive decisions
- 2026 AI transformation guide

Good titles name the object, the market movement and either the decision or the
editorial frame:

- AI agent pilots are becoming workflow audits: a 5-check scorecard
- AI Overviews changed the content brief: build pages answer engines can cite
- Shadow AI is an operating risk: turn employee experiments into governed tools
- Model switching is now an operating question: source, cost and rollback map
- AI search visibility signal map: four pressures content teams should watch

Subtitle formula:

`market signal + operator consequence + what the reader can decide after reading`

Subtitle / standfirst gate:

- It is visible front-of-page copy, not a CMS summary field.
- It must add a second angle that the title does not already say.
- It should contain one of: a named source/event, a concrete operator scene, a
  tradeoff, a risk, or a practical promise.
- It should make the next paragraph feel necessary.
- It must not start with "本文整理", "這篇文章", "This article", "learn how",
  "explore", or equivalent template language.

Foresight-style subtitle lessons from the 2026-06-22 500-article sample:

- The subtitle is usually one compact second beat, not a paragraph summary.
- It should add tension, consequence or a concrete number that the title does
  not already carry.
- Good subtitles often combine `named entity + what changed + why the reader
  should care`, then stop.
- Do not use internal process words such as SEO/GEO, quality gate, prompt,
  pipeline, language parity or Hermes in public subtitles.
- For market news, the subtitle may simply state the news consequence; it does
  not need to force an ALTOS LAB judgment section.
- For columns, the subtitle should make the piece feel worth reading by naming
  the conflict, surprise, practical promise or reader decision.

Multilingual subtitle rule:

- `zh-Hant`: one natural sentence or two short clauses; avoid translated
  Mainland phrasing and avoid "本文".
- `en`: magazine standfirst, 12-24 words; concrete noun first, no "This
  article explores".
- `ja`: concise editorial lead; avoid literal Chinese order and overusing
  「〜について解説」.
- `ko`: one clear consequence or tension; avoid mechanical 「이 글에서는」.
- `id`: conversational but specific; name the actor/event and the practical
  implication.
- `vi`: direct, active, and concrete; avoid broad "bài viết này".
- `th`: short readable setup; do not overload one sentence with imported
  English nouns.
- `ms`: simple, news-like sentence with one consequence; avoid generic
  "artikel ini".
- `fil`: natural Taglish only when the market would say it; otherwise use a
  clean Filipino sentence with one concrete point.

Section heading gate:

- When Tommy says `sub-title` during article review, first check whether he
  means section headings (`H2/H3`) rather than the public excerpt/standfirst.
- Section headings are mini headlines. They should tell the reader what the
  next paragraph will prove, not expose the production scaffold.
- Avoid reusable skeleton labels such as `ALTOS LAB view`, `What to watch`,
  `Scope before scale`, `先看範圍`, `接下來看什麼`, `FAQ` as main article
  section headings unless they are made specific to the story.
- Strong section headings usually include one of: the named actor, what changed,
  the operational tension, the mechanism, the risk, or the concrete decision.
- Localized versions should not translate the zh-Hant heading literally when
  the target language would sound like a report outline.

Inline image gate:

- Column and feature articles need 2-3 in-article visuals, shared across all
  language versions for the same article set.
- Within one article, two in-article images must not reuse the same URL,
  localPath, or prompt. If the second visual cannot explain a different job,
  remove it or regenerate it.
- Market news keeps the source/official image when rights and quality are
  acceptable; generated ALTOS LAB visuals are a fallback, not the default.

Weak:

- This article explains AI agent pilots and why they matter for companies.
- AI agent pilots are changing workflows, and businesses should pay attention.
- Learn how enterprises can use AI agents to improve operations.

Better:

- Do not hand the first AI-agent pilot to the messiest workflow. OpenAI's
  tax-agent case and Hugging Face's agent framing both point to the same rule:
  start where operation logs, human review and rollback are possible.
- Google is pushing search toward AI Mode while AI Magazine frames Anthropic
  as an enterprise platform signal. Brand teams now need to monitor how answer
  engines describe them, not only where they rank.

SEO description formulas:

- Market brief: `source-backed signal + why it matters + what to watch next`
- Column: `specific tension + reader value + optional ALTOS LAB editorial read`
- Feature: `mechanism + evidence + framework/table/chart + practical next step`

## Content Mix

Use three content types and six writing archetypes:

- `breaking`: fast market brief. One sentence answer, what happened, why it
  matters, what remains uncertain, source links.
- `column`: operator opinion or explainer. One concrete question, tradeoffs,
  examples and readable knowledge density. ALTOS LAB point of view and next
  steps are optional tools, not mandatory sections.
- `feature`: durable asset. Background, mechanism, comparison table, framework,
  risk, source evidence and implementation path.

Archetypes:

- `market brief`: fast, factual, source-led. Useful when the market is moving
  but ALTOS LAB should not force a solution angle.
- `research explainer`: mechanism, limits, evidence and what would change the
  recommendation.
- `operator playbook`: workflow, owner, metric, review rule and next step.
- `contrarian column`: one sharper point of view, with the best opposing
  evidence acknowledged.
- `signal chart`: a visual comparison of source confidence, market heat,
  workflow impact and execution difficulty.
- `field note`: a scene from product, marketing or operations work that makes a
  trend concrete without inventing fake clients.

Narrative modes the generator may choose:

- Scene hook: begin with a founder/operator situation and use it to reveal the
  mechanism.
- Market route comparison: map two or three possible paths and show the tradeoff
  behind each path.
- Company signal: use one company move, valuation, product launch or platform
  decision as a lens for the broader market.
- Lab notebook: explain what changed, what we would test, what would falsify the
  idea, and what remains unknown.
- Contrarian operator column: name the tempting mistake, steelman it briefly,
  then give the better rule.

Use six recurring content pillars:

- AI agents and workflow automation
- AI search, GEO and content operations
- Enterprise AI governance and risk
- AI product UX, evals and trust
- AI infrastructure, open source and model operations
- Industry workflows, customer operations and sales operations

## SEO / GEO Requirements

Each published article needs:

- crawlable body text with 4-6 useful H2 sections
- direct answer in the first 40-50 words
- readable, knowledge-dense editorial value, not only source summary
- SEO title, description, excerpt/subtitle and GEO summary
- visible source links from credible domains
- key takeaways and FAQ that are visible on the page
- topic-matched cover image, alt text, credit and license when external
- table or chart when it makes the reader faster at judging the signal
- canonical and hreflang handled by the site routing
- structured data aligned with visible content

## Plain-Language Source Translation

Foreign news should never be imported as a pile of impressive terms. Translate
the source into a decision the reader can use.

On the website, the source-translation note is rendered as a compact footnote
near the source list. It should never compete with the main article as a large
H2 section. Keep it to one small paragraph.

Every source-translation section must answer four questions:

1. What did the source actually say?
2. What does it change in a workflow, product decision or operating risk?
3. What should we avoid overclaiming?
4. What should the reader check or do next?

If the article uses terms like `trace`, `eval`, `rollback`, `orchestration`,
`retrieval`, `routing`, `plugin` or `observability`, explain them in the
article language the first time they appear. In Traditional Chinese, prefer
plain terms such as `操作紀錄`, `固定測試題/評測`, `回滾/退回舊流程`,
`工作流編排`, `檢索`, `路由` and `可觀測性`.

Use bold only when it helps scanning: the core judgment, the three operator
questions, or a checklist phrase. Do not bold entire paragraphs and do not use
bold as visual decoration.

## Quality Gate

Publish only when the article can pass:

- Production generation contract: Gemini is the required writing/revision
  workspace. Market-news covers must use credited, non-reused source images;
  ChatGPT/GPT is the required generated-cover workspace for columns/features.
  Codex can orchestrate, QA and publish, but should not replace those tools
  with local fallback copy or local fallback art.
- Duplicate gate: before drafting, compare the candidate against published and
  draft posts. Hold the run if the topic, headline angle, source package or
  practical takeaway substantially repeats an existing article.
- Browser hygiene: use the ALTOS Blog QA Chrome group only while a run needs
  Gemini or ChatGPT/GPT. Close or release those tabs after the run so Chrome
  memory is not held open.
- Performance loop: publishing is not success. After release, check GA/GTM,
  Search Console and live URL evidence over time, then feed repeated errors,
  low engagement or AI-search misreadings back into the next content brief.
- Accuracy and source trust
- ALTOS LAB point of view
- SEO/GEO structure
- Readability, title, hook and rhythm
- Image-topic fit
- Multilingual parity

The goal is not volume alone. The goal is a searchable, citable knowledge base
that makes ALTOS LAB look like a serious AI lab.
