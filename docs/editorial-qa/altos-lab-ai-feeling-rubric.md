# ALTOS LAB Anti-AI-Feeling Editorial Rubric

This is an internal editorial standard for deciding whether a column still feels machine-written. Do not copy these labels into public articles.

## Release Rule

- `column` and `feature`: pass at `85/100` or higher, hold at `72-84`, fail below `72`.
- `breaking`: pass at `90/100` or higher, hold at `78-89`, fail below `78`.
- Any article with a public pipeline phrase, raw prompt wording, backend scoring language, or visible "translation/source-conversion" template fails even if the numeric score is high.
- Market news should stay source-faithful and fast. The anti-AI-feeling review checks clarity, source fidelity and headline naturalness, not literary ambition.
- Columns should feel like a human editor made a decision under constraints: concrete opening, visible judgment, source-backed claims, local operating detail and a useful next move.

## Scoring Dimensions

Start at `100` and subtract the listed weights when a symptom appears.

| Symptom | Weight | What To Check |
| --- | ---: | --- |
| Throat-clearing opener | 8 | Opens with "AI is rapidly changing..." or explains the topic before saying anything concrete. |
| Generic conclusion | 7 | Ends with "companies must embrace change" instead of a specific action or unresolved tension. |
| Mechanical three-part structure | 7 | Every article uses the same "why it matters / what changed / what to do" rhythm. |
| Over-positive hype language | 6 | Uses "revolutionary", "critical", "game-changing", "transformative" without proof. |
| Vague modifier stack | 5 | Too many words like "increasingly", "significant", "potentially", "rapidly". |
| Actorless claims | 6 | Sentences hide who decided, paid, reviewed, shipped, blocked or changed the work. |
| No timeline | 5 | Events float without dates, sequence, before/after or operating window. |
| Fact and opinion blurred | 8 | Source fact, inference and ALTOS LAB judgment are not separated. |
| Transition filler | 4 | Uses empty bridges such as "from this perspective" or "in summary" too often. |
| Long abstract sentences | 6 | Sentences run long while avoiding concrete nouns, tools, teams or numbers. |
| Synonym repetition | 5 | Repeats the same idea with different words to make the article look fuller. |
| No counter-scenario | 5 | Does not mention when the advice fails, what tradeoff exists or who should wait. |
| No local context | 7 | Taiwan/SEA editions do not sound grounded in local work habits, budgets or decision flow. |
| No author voice | 6 | Tommy and Ken sound identical, with no point of view or taste. |
| No practical detail | 8 | No checklist, operating example, source trail, budget/role implication or decision path. |
| No reader action | 5 | Reader cannot tell what to inspect this week. |
| Identical sentence rhythm | 4 | Paragraphs have the same length, same cadence and same "not X but Y" contrast. |
| Undefined jargon | 5 | Terms like trace, eval, rollback, orchestration, retrieval or observability appear without human meaning. |

## Pass Criteria

An article can pass only when all of these are true:

- The first 40-80 words begin with a specific event, decision, scene, data point, question or operating tension.
- The title promises one concrete reader benefit or decision, not a broad topic.
- The subtitle answers "why now" without saying "this article".
- At least one section contains a real tradeoff, caveat or "do not do this first" warning.
- The ALTOS LAB judgment is quotable, but not grandiose.
- Source facts are traceable and distinct from editorial interpretation.
- Every technical concept is translated into business or operational language once.
- The ending gives one next action, one warning, or one metric to watch.

## Rewrite Moves

- Replace broad openings with a scene: "凌晨三點，值班主管要知道哪一步能退回。"
- Replace moralizing with an operating rule: "沒有來源、審核者與退回版本，就不要讓 Agent 對外送出。"
- Replace generic trend claims with a source-linked sequence: "OpenAI showed X on May 27; IBM frames Y; the practical question is Z."
- Replace formula endings with a test: "本週先拿一條流程問：誰能停下來、回到哪一版、修正記在哪裡？"
- Cut paragraphs that only restate the section title.

## Public Copy Guard

Never expose these internal words in public article body, excerpt, FAQ, tags or captions:

- AI-feeling
- anti-slop
- rubric
- quality gate
- prompt
- pipeline
- source translation
- Gemini/GPT/Codex production process
- SEO/GEO scoring language
