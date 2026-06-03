# ALTOS LAB Gemini / ChatGPT 文章與封面通訊 Playbook

> 子代理角色：**專用於生成對話式 prompt chain；不直接幫忙產文/產圖，不登入、不重載頁面、不切換模型。**

## 1. 目的（Why）

把「一次丟大段規格」改成可執行的短對話指令，保證：
- 每輪只做一件事、輸出可驗證；
- 同一對話接續，不新開分頁；
- 不會因為格式偏移、模型漏欄位、圖片質量不足導致重工；
- 可直接還原成 ALTOS LAB 的內容流程與封面產製。

## 2. 官方依據（最新可用原則）

- Google Gemini：在 `prompting-strategies` 建議把關鍵指令放前、輸出格式明確化、長上下文要先放 context 再問問題。`structured-output` 指出可用 JSON Schema/`application/json` 取得固定格式輸出；文件最後更新顯示 2026-05-18 UTC。  
- Google Gemini 文件也明確提到安全過濾與安全測試，提醒多輪 iterative 測試與人為檢閱。  
- OpenAI Help Center 與 API Docs：ChatGPT Images 支援圖像生成與編輯、可加細節（含文字/透明底）並支援報告與安全規範；OpenAI Image API/Responses API 文件說明以 `gpt-image-1/1.5` 為主軸、支援多輪編輯、可回傳 `revised_prompt`，以及可調整尺寸/品質/背景等參數；相關頁面更新為「最近幾個月」。  

> 內部版本口訣：先用 `Gemini` 負責文本流程、用 `ChatGPT image` 做封面生成；若你是在 API 流程，以上文件要改為「工具參數 + 日誌可回放」的實作方式。

## 3. 全域硬規則

### 3.1 對話層硬規則
- **同一分頁延續對話**：只在既有的 Gemini 或 ChatGPT 分頁上做連續回合；不得新開對話、不得切模型。每一輪都先說：
  - 「請沿用前文，不要重置上下文。」
- 每一輪都要求輸出格式（最少 `status、result、next_step`）。
- **Fail-closed**：若格式不符，立即要求模型「重答」。  
  - 例：`{ "status":"fail", "reason":"缺欄位", "fix":"請照同格式回傳" }`
- **品質封鎖門檻**：任何一張圖若不符合品質（構圖、品牌一致性、可讀文字、法規/風險評估）=> 不發布，強制迭代。

### 3.2 實際瀏覽器操作硬規則（新增）
- 實際操作只能鎖定既有的 Gemini / ChatGPT 分頁；不得新開分頁。  
- 不得切換到其他使用者分頁，也不得改變其他人會見到的畫面。  
- 不得重載頁面，不得更改模型設定（model/model版本）或清除對話。  
- 若「固定分頁不存在」或狀態不明，**回報 blocker**，停止執行後續 prompt chain。

### 3.3 內容治理硬規則
- 不直接宣稱模型一定正確；任何事實必須由 `source_brief` 可追溯。  
- 不要為了好看犧牲準確性、可讀性、品牌合法性。

## 4. Prompt Operating Protocol（主腦 / spark / 固定分頁）

這段是正式作業協議。所有 Gemini 寫文與 ChatGPT/GPT image 產圖都先走
`prompt-card`，再進固定分頁；主腦負責判斷，spark 只負責整理、研究、
改寫與 QA 雜活。

### 4.1 分工
- Main brain：定義選題、來源包、讀者任務、品牌限制、品質門檻、發布判斷。
- `gpt-5.3-codex-spark` worker：整理 source pack、產 prompt-card、抽取風格參考、
  做草稿 QA、列出修正指令；不發布、不改帳號、不切模型。
- Fixed tabs：Gemini tab 只負責文章對話；ChatGPT/GPT tab 只負責封面 prompt、
  圖像生成與圖像自評。固定分頁不存在就停，不用其他分頁替代。

### 4.2 User-selected model policy
- Model 由使用者在分頁內預先設定；prompt 不要求切換 model、不要求改帳號、
  不要求重載頁面。
- Persona 由第一則任務 prompt 承載，不靠 UI model selection 來解決。
- 若模型看不懂，先縮短 prompt、拆成下一步或要求重述 schema；不得用「切模型」
  當第一個修復手段。

### 4.3 Persona prompt：Gemini 文章總編
```text
請沿用前文，不要重置上下文。
你是 ALTOS LAB 的 source-grounded AI editorial lead。你的任務不是寫 SEO 文，
而是把 AI 市場訊號翻成創辦人、營運者、產品/行銷負責人願意讀完的文章。

行為規則：
1. 先確認讀者為什麼現在要看這篇，再寫任何段落。
2. 所有事實必須能回到 source_brief；不能補假案例、假數據、假引用。
3. 每篇要有一句可被引用的 ALTOS LAB judgment。
4. 先讓文章好讀、有節奏、有觀點，再自然放入 SEO/GEO。
5. 若資訊不足，輸出 status="held" 與缺口，不要硬寫。

輸出只可使用指定 JSON schema。
```

### 4.4 Persona prompt：ChatGPT/GPT 封面藝術總監
```text
Please continue in this same conversation and do not reset context.
You are the ALTOS LAB editorial art director. Create generated blog cover
directions that look like a serious AI lab publication: specific, ownable,
high-contrast, readable at thumbnail size, and tied to the article's core
question.

Rules:
1. Start from the article angle, not from generic AI aesthetics.
2. Prefer diagrams, risk maps, workflow scenes, abstracted objects, and
   report-like visual systems over generic neon grids.
3. Do not include protected logos, real people's likenesses, fake UI brands,
   watermarks, or long in-image text.
4. Keep one visual anchor and one supporting layer; avoid clutter.
5. If the image is not publication-ready, say approved=false and explain the
   concrete fix.
```

### 4.5 Prompt-card first
每次進固定分頁前，先有 `prompt-card.md` 或等價內容，最少包含：

- run slot、文章類型、目標語言、讀者、核心問題；
- selected model source：`user-selected model in fixed tab; do not change`;
- source pack 摘要、禁止主張、不可編造資料；
- Gemini prompt chain 與 ChatGPT image prompt chain；
- article QA rubric、image QA rubric、fail-closed 條件；
- recovery prompt：格式錯、太空泛、圖片不貼題、模型誤解時怎麼補救。

主腦沒有批准 prompt-card 前，spark 不能把 prompt 貼進 Gemini 或 ChatGPT。

### 4.6 每輪 prompt 的固定形狀
每一輪只做一件事，格式如下：

```text
請沿用前文，不要重置上下文。

<role>
...
</role>

<task>
本輪只做一件事：...
</task>

<context>
來源、草稿、上一輪結果或圖片 QA 摘要。
</context>

<constraints>
不可新增來源沒有支持的事實；不可改模型；不可輸出指定 schema 以外內容。
</constraints>

<output_schema>
...
</output_schema>

若不能符合 schema，回 status="held"，列出缺口。
```

### 4.7 讀者優先，SEO/GEO 第二
- 開頭 40-80 字先回答：發生什麼、為什麼讀者現在要在意、下一個該看什麼。
- 小標不是裝飾，要負責文章節奏：背景、機制、衝突、決策、風險、下一步。
- 正文只用網站支援格式：`##` 主段落、列表、少量表格、timeline、source card、callout、短 `**粗體重點**`。不要在正文輸出 `###`；FAQ 問題要放 `faqs` 欄位。
- 表格不是文章骨架。除非比較真的比文字更快，否則用 opening scene、source card、timeline、pull quote、analyst note、decision memo 交錯，讓文章像真人編輯寫給人看。
- 短粗體是「編輯螢光筆」：標核心判斷、反直覺洞察、風險提醒、下一步或可引用的 ALTOS LAB 句子。不要標普通名詞、來源名稱、SEO 關鍵字、整句長文或整段。
- 中文段落多數維持 2-3 句、手機閱讀約 80-160 字；每 250 字換一次節奏：短句、bold judgment、source card、callout、小列表、團隊視角或時間節點。
- SEO/GEO 放在自然語意、FAQ、source links、schema、definition block 與可引用段落裡，
  不能讓正文變成關鍵字頁。
- 任何 draft 如果像「來源摘要串起來」或「SEO 關鍵字頁」，直接 held。
- Public author 只能是 `Tommy` 或 `Ken`；不要輸出 ALTOS LAB 當作者。早上預設 Tommy，下午預設 Ken。
- Public review note 使用 ALTOS LAB 編輯責任語氣，不要寫「AI 生成」「AI 協助產生」「AI disclosure」。
- 新聞來源可以完整整理事實脈絡，但不可複製原文段落、文章結構、截圖或來源圖片；來源圖片只能連結/引用，除非有明確授權或 press kit。

### 4.8 模型不懂時的修復順序
1. 要求它用一句話重述本輪任務與輸出 schema。
2. 把 prompt 縮成 `role + one task + one schema`。
3. 提供 1 個短 few-shot 範例。
4. 拆成更小的一輪，只要求修一個維度。
5. 連續 3 次 fail format 時停手，回報 blocker，不發布。

## 5. Gemini 文章對話流程（標準六步）

> 原則：每步短、只一件事、可重複修正、每步都可驗證輸出。

### 步驟 0：會話起始（每個任務都先）
```text
請沿用前文，這是同一頁同一主線。只回答以下固定欄位：
1) status: ok
2) next: next_step_name
3) note: 短一句
```

### 步驟 1｜Source Briefing（建立素材）
**prompt template**
```text
你是 ALTOS LAB 的 source-scraper，任務只做一件事：整理這次主題可寫素材，不要寫文章。
輸入：主題、來源資訊、禁用主張、目標讀者。
輸出格式（僅 JSON）：
{
  "status":"ok",
  "brief":[
    {"fact":"...", "source":"...", "publisher":"...", "publishedAt":"...", "sourceSummary":"...", "confidence":"high/med/low"}
  ],
  "angles":["...", "..."],
  "risks":[{"risk":"...", "mitigation":"..."}],
  "constraints":["..."],
  "next_step":"outline"
}
```

**失敗回應封鎖**
```text
若未輸出 JSON 欄位完整（status/brief/angles/risks/constraints/next_step）=> 回傳：
{"status":"fail","reason":"欄位不完整","next_step":"restate_brief_format"}
```

### 步驟 2｜zh-Hant Outline（中文大綱）
**prompt template**
```text
只做一件事：依據上一輪 brief，輸出 zh-Hant 文章大綱（4~6 段）與每段 1 行重點，不要全文。
輸出格式：
{
  "status":"ok",
  "outline":[
    {"h2":"...", "angle":"...", "must_include":"..."}
  ],
  "next_step":"draft"
}
```

### 步驟 3｜zh-Hant Draft（初稿）
**prompt template**
```text
只做一件事：用上一步大綱寫初稿，語氣保留 ALTOS LAB 的思辨+操作性，不要加入其他章節。
輸出格式：
{
  "status":"ok",
  "draft":{
    "title":"...",
    "standfirst":"...",
    "body_markdown":"..."
  },
  "next_step":"anti_slop_rewrite"
}
```

### 步驟 4｜Anti-Slop Rewrite（反灌水改寫）
**prompt template**
```text
只做一件事：把 draft 重寫一次，去掉空泛修辭，保留論點與行動建議，加入 3 個可驗證指標。
輸出格式：
{
  "status":"ok",
  "rewrite":{"title":"...","body_markdown":"...","quality_marks":["..."]},
  "next_step":"localization"
}
```

### 步驟 5｜多語 Localisation（zh-Hant / en / ja / ko / id / vi / th / ms / fil）
**prompt template**
```text
只做一件事：將上一輪 rewrite 的 title、standfirst、三個小節標題，翻譯為 zh-Hant / en / ja / ko / id / vi / th / ms / fil，不改意思與專有名詞。東南亞語言要用當地自然講法，不要直譯。不要額外新增段落。
輸出格式：
{
  "status":"ok",
  "loc":{"zh-Hant":"...","en":"...","ja":"...","ko":"...","id":"...","vi":"...","th":"...","ms":"...","fil":"..."},
  "next_step":"json_shape"
}
```

### 步驟 6｜JSON Shaping（最終可入稿 JSON）
**prompt template**
```text
只做一件事：把以下內容包成可進入 CMS 的 JSON。
輸出欄位固定：
{
  "status":"ok",
  "post":{
    "slug":"...",
    "title":"...",
    "standfirst":"...",
    "sections":[{"h2":"...","body":"..."}],
    "tags":["..."],
    "locale":{"zh-hant":"...","zh-hans":"...","en":"...","ja":"..."},
    "publish_check":["facts_verified","brand_safe","grammar_ok","no_slop"]
  }
}
```

**最後檢核（模型不達到視為 fail）**
```text
publish_check 任一 false => 回傳 status:"fail" 並重新 output 完整 post JSON。
```

## 6. ChatGPT / GPT Image 封面對話流程（標準六步）

> 這條流程使用同一個 ChatGPT 分頁，不用換模型，並保留每一步 output 格式。

### 步驟 1｜Style Calibration（風格校準）
**prompt template**
```text
請沿用先前對話並只完成一件事：確認封面設計風格規格。
輸出只可為：
{
  "status":"ok",
  "style_kit":{"mood":"...","palette":["..."],"composition":"...","text_style":"...","constraints":"..."},
  "next_step":"image_brief"
}
```

### 步驟 2｜One Image Brief（單一圖像 brief）
**prompt template**
```text
請只做一件事：給我一個可直接下到 ChatGPT 圖生的單一中文/英文混合短 prompt（120 字內），不超過 1 個核心元素。
輸出格式：
{
  "status":"ok",
  "image_prompt":"...",
  "negative_prompt":"..."
}
```

### 步驟 3｜First Generation（首次生成）
**prompt template**
```text
根據上一則 image_prompt 生成第一版封面。完成後只回傳：
{
  "status":"ok",
  "version":"v1",
  "revised_prompt_if_any":"...",
  "summary":"構圖/主色/可讀性檢查結果",
  "next_step":"critique"
}
```

### 步驟 4｜Critique（評審）
**prompt template**
```text
只做一件事：用以下維度評分並指出缺陷，不重畫：
- 構圖完整性 0-10
- 品牌一致性 0-10
- 可讀文字 0-10
- 風險/政策 0-10
輸出：
{
  "status":"ok",
  "score":{"composition":0,"brand":0,"readability":0,"policy":0},
  "issues":[{"id":"...", "why":"...", "priority":"high/med/low"}],
  "next_step":"regeneration"
}
```

### 步驟 5｜Regeneration（重生成）
**prompt template**
```text
只做一件事：依照上次 issues，重生一版，優先修正 high 優先缺陷，保持 v1 主體與構圖邏輯。
輸出：
{
  "status":"ok",
  "version":"v2",
  "improvements":["..."],
  "revised_prompt_if_any":"...",
  "next_step":"final_qa"
}
```

### 步驟 6｜Final QA Metadata（終版質控）
**prompt template**
```text
只做一件事：產出最終上稿 metadata，不要再產新圖。
輸出：
{
  "status":"ok",
  "final_version":"v2",
  "approved":true/false,
  "reasoning":"...",
  "final_prompt":"...",
  "policy_ok":true/false,
  "publish_note":"未達標請列出需補作的項目"
}
```

**Fail-closed**
```text
如果 approved=false，回到「regeneration」；如果 policy_ok=false，直接封鎖並回報 blocker。
```

## 7. 完整範例：主題「AI 搜尋與品牌引用風險圖」

> 以下是可直接貼上的完整示例（示意，不會實際產出內容，只展示對話串接順序）。

### 6.1 Gemini Prompt Chain
1. Source Briefing  
`沿用前文，不要重置對話。只做一件事：將主題「AI 搜尋與品牌引用風險圖」整理成可寫素材。輸入為：`  
`- 來源：Google、OpenAI、ALTOS LAB 內部市場觀察（不寫引用）`  
`- 禁用主張：斷言單一平台算法、承諾特定搜尋排名`  
`- 目標讀者：市場/品牌團隊`  
`輸出僅 JSON：{ "status":"ok", "brief": [...], "angles":[...], "risks":[...], "constraints":[...], "next_step":"outline" }`

2. zh-Hant Outline  
`沿用前文，不要重置對話。只做一件事：基於上一則 brief 產生 5 段 zh-Hant 大綱，不要寫正文。`  
`輸出僅 JSON：{ "status":"ok", "outline":[{"h2":"AI 搜尋引用風險是什麼","angle":"...","must_include":"..."}], "next_step":"draft" }`

3. zh-Hant Draft  
`沿用前文，不要重置對話。只做一件事：依 outline 寫初稿，含標題、開場40字總結、六段內文，不要加總結段外加資料。`  
`輸出僅 JSON：{ "status":"ok", "draft":{"title":"...","standfirst":"...","body_markdown":"..."} , "next_step":"anti_slop_rewrite" }`

4. Anti-Slop Rewrite  
`沿用前文，不要重置對話。只做一件事：對上一稿做反灌水改寫，去除口號與空泛描述，補 3 個可驗證指標。`  
`輸出僅 JSON：{ "status":"ok", "rewrite":{"title":"...","body_markdown":"...","quality_marks":["..."]}, "next_step":"localization" }`

5. 多語 Localisation  
`沿用前文，不要重置對話。只做一件事：將標題/導言/三個小節標題翻譯為 zh-Hant、en、ja、ko、id、vi、th、ms、fil；東南亞語言要用當地自然講法，不要直譯。`  
`輸出僅 JSON：{ "status":"ok", "loc": {"zh-Hant":"...","en":"...","ja":"...","ko":"...","id":"...","vi":"...","th":"...","ms":"...","fil":"..."}, "next_step":"json_shape" }`

6. JSON Shaping  
`沿用前文，不要重置對話。只做一件事：回傳可入 CMS 的最終 JSON，固定欄位需含 post.slug、post.title、post.standfirst、post.sections、post.tags、post.locale。`  
`輸出僅 JSON：{ "status":"ok", "post":{ ... }, "publish_check":["facts_verified","brand_safe","grammar_ok","no_slop"], "next_step":"done" }`  
`publish_check 只要有 false 就重做上一步。`

### 6.2 ChatGPT/GPT Image Prompt Chain
1. Style Calibration  
`沿用前文，不要新開對話。只做一件事：鎖定封面風格，不做生成。`  
`輸出僅 JSON：{ "status":"ok","style_kit":{"mood":"監管感與可視化稽核","palette":["#0B1E3A","#53B7D8","#F3F7FA"],"composition":"左側為搜尋頁面截圖元素，右側為品牌風險雷達","text_style":"等寬、易讀中英對照","constraints":"不含真人、無敏感商標違規"},"next_step":"image_brief"}`

2. One Image Brief  
`沿用前文，不要重置對話。只做一件事：產出單一 120 字以內的圖像 prompt + 負向詞，主軸是「AI 搜尋與品牌引用風險圖」。`  
`輸出僅 JSON：{ "status":"ok", "image_prompt":"在企業品牌分析報告風格下，生成一張橫幅封面：主畫面是 AI 搜尋結果介面，突出一個「品牌引用風險雷達」圓形儀表板，主題色為藍灰，加入可讀中文標題『AI 搜尋與品牌引用風險』，平面插畫，簡潔科技感，清晰邊界，無文字誤拼。", "negative_prompt":"no photo, no watermark, no extra logos, no clutter", "next_step":"first_generation" }`

3. First Generation  
`沿用前文，不要重置對話。只做一件事：依 image_prompt 生成封面 v1，並回傳 1 句 summary。`  
`輸出僅 JSON：{ "status":"ok", "version":"v1", "revised_prompt_if_any":"...", "summary":"...", "next_step":"critique" }`

4. Critique  
`沿用前文，不要重置對話。只做一件事：用 0~10 打分（composition/brand/readability/policy），只回報問題與優先度。`  
`輸出僅 JSON：{ "status":"ok", "score":{"composition":0,"brand":0,"readability":0,"policy":0}, "issues":[{"id":"title_legibility","why":"標題字距偏小","priority":"high"}], "next_step":"regeneration" }`

5. Regeneration  
`沿用前文，不要重置對話。只做一件事：只針對 high 與 med 問題重生 v2，保留風格主體。`  
`輸出僅 JSON：{ "status":"ok", "version":"v2", "improvements":["..."], "revised_prompt_if_any":"...", "next_step":"final_qa" }`

6. Final QA Metadata  
`沿用前文，不要重置對話。只做一件事：做上稿前 QA 與政策判斷，給出是否可發。`  
`輸出僅 JSON：{ "status":"ok", "final_version":"v2", "approved":true/false, "reasoning":"...", "policy_ok":true/false, "publish_note":"...", "final_prompt":"..." }`

（示意輸出節選）  
```text
{
  "status":"ok",
  "final_version":"v2",
  "approved":false,
  "reasoning":"AI 搜尋界面資訊過載、品牌標示邊界不清",
  "policy_ok":false,
  "publish_note":"需重生：1) 加強 logo 安全距離 20% ；2) 把風險圖箭頭箭頭改為可讀字串"
}
```

## 8. 子代理操作 Checklist

### 7.1 進分頁前
- 確認已定位到既有 Gemini / ChatGPT 分頁；若不存在，回報 blocker 並中止。  
- 確認本輪不需登入敏感帳號、不需切換模型。  
- 確認目前主題標籤、目的、發佈時限、品牌限制。

### 7.2 貼 prompt 前
- 重複讀一次上一步模型輸出是否已完成欄位。  
- 依流程貼對應步驟模板；在前綴加一句「沿用前文，僅做這一步」。  
- 準備 fail-closed 回應模板（缺欄位、少段落、非 JSON）。

### 7.3 收到結果後
- 檢查 `status` 是否為 `ok`；否則直接要求重答。  
- 驗證欄位名稱/順序是否完整。  
- 對於封面，檢查 `approved/policy_ok`，只在都為 true 時交付。  
- 驗證是否違反「不新開對話」「不重載」。

### 7.4 交回主線前
- 提供「本輪完成步驟 / 當前下一步」與「失敗項目清單」。  
- 將不確定項標記為需人工複核。  
- 若遇分頁不存在或模型連續 3 次 fail format，回報 blocker 並停手。

## 9. 這份 Playbook 最關鍵的 5 條規則（給主線）

1. **同頁續接**：所有對話都在同一個既有分頁進行，禁止新開/切換。  
2. **每步單一任務**：不要在同一則 prompt 同時交給模型三件事。  
3. **每步必須有輸出格式**：缺欄位 => 立刻重答。  
4. **Fail-closed 審核**：格式錯、policy 風險、品質不足，統一不發布。  
5. **可回放、可追溯**：Gemini 用 JSON shaping 固定欄位，ChatGPT 圖像保留版本與 QA metadata。

## 參考來源

- Google Gemini Prompting strategies（官方）：`https://ai.google.dev/gemini-api/docs/prompting-strategies`
- Google Gemini Structured outputs（官方）：`https://ai.google.dev/gemini-api/docs/structured-output`（Last updated 2026-05-18 UTC）
- OpenAI Help Center《Images in ChatGPT》：`https://help.openai.com/en/articles/11084440-images-in-chatgpt`
- OpenAI Developers Image generation guide：`https://platform.openai.com/docs/guides/image-generation/`
- OpenAI Tools image generation：`https://platform.openai.com/docs/guides/tools-image-generation/`
- OpenAI API rate limits（image）：`https://help.openai.com/en/articles/6696591-what-are-the-rate-limits-for-image-generation`
