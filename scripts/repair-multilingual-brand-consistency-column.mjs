#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const GROUP_ID = "browser-gemini-gpt-2026-06-04-column-30";
const ADMIN_COOKIE = "altos_admin";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(`${process.env.HOME}/.altoslab-aws.env`);
loadEnvFile(`${process.env.HOME}/.altoslab-blog-worker.env`);

function rootUrl() {
  return String(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || "https://altoslab-ai.cc")).replace(/\/+$/, "");
}

function sign(secret, timestamp, nonce, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": sign(secret, timestamp, nonce, body)
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "ALTOS-LAB-column-style-repair/1.0",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { response, payload };
}

async function adminCookie(root) {
  const token = process.env.ALTOS_ADMIN_SESSION_TOKEN || process.env.ADMIN_SESSION_TOKEN || "";
  if (token) return `${ADMIN_COOKIE}=${encodeURIComponent(token)}`;
  const password = process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!password) return "";
  const { response } = await fetchJson(`${root}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password })
  });
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

const sharedSources = {
  zh: "Google Search Central、OpenAI Structured Outputs 與 Microsoft Responsible AI",
  en: "Google Search Central, OpenAI Structured Outputs, and Microsoft Responsible AI",
  ja: "Google Search Central、OpenAI Structured Outputs、Microsoft Responsible AI",
  ko: "Google Search Central, OpenAI Structured Outputs, Microsoft Responsible AI",
  id: "Google Search Central, OpenAI Structured Outputs, dan Microsoft Responsible AI",
  vi: "Google Search Central, OpenAI Structured Outputs và Microsoft Responsible AI",
  th: "Google Search Central, OpenAI Structured Outputs และ Microsoft Responsible AI",
  ms: "Google Search Central, OpenAI Structured Outputs dan Microsoft Responsible AI",
  fil: "Google Search Central, OpenAI Structured Outputs, at Microsoft Responsible AI"
};

const content = {
  "zh-Hant": {
    title: "AI 多語內容怎麼不走味？先有品牌骨架，再談翻譯",
    excerpt: "多語內容不是把同一篇稿丟進翻譯器。品牌語氣、來源證據、SEO/GEO 欄位與在地 QA 要先拆開，AI 才能放大內容，而不是放大走味。",
    seoTitle: "AI 多語內容怎麼不走味？品牌骨架、SEO 與 GEO 工作流",
    seoDescription: "AI 多語內容要先固定品牌骨架、來源證據、SEO/GEO 欄位與在地 QA，再讓各語言自然改寫，避免翻譯味和品牌走樣。",
    geoSummary: "AI 多語內容要先建立品牌語氣骨架、來源證據、術語表、SEO/GEO 欄位與在地 QA。Google Search Central、OpenAI Structured Outputs 與 Microsoft Responsible AI 的文件共同指向一個工作流：共享證據，不共享句子。",
    keyTakeaways: [
      "多語內容先固定品牌骨架與來源證據，再進入語言改寫。",
      "SEO、GEO、社群摘要與文章開頭要分開寫，不能複製同一段。",
      "各語言要共享事實與限制，但用當地讀者自然吸收的節奏重寫。"
    ],
    body: `多語內容最怕的不是翻錯一個詞，而是九種語言看起來像九家公司。中文像簡報，英文像 SEO 頁，日文太硬，東南亞語言帶著英文語序，讀者會很快感覺到「這不是寫給我看的」。品牌信任不是靠翻譯數量累積，而是靠每個語言都能保住同一個判斷方式。

${sharedSources.zh} 給的是同一個提醒：搜尋系統需要清楚的語言版本與結構化欄位，AI 產文需要可控輸出，品牌自動化需要責任邊界。把它們放在一起看，多語內容不是翻譯任務，而是一條內容營運工作流。

## 先定不能變的品牌骨架

品牌骨架不是一句 slogan，而是內容團隊每天會用到的硬規則：公司怎麼稱呼自己、產品承諾能說到哪裡、哪些詞永遠固定、哪些語氣不能出現、哪些風險必須保留。沒有這個骨架，AI 會把每個市場的語氣習慣放大，最後讓品牌變成不同人格。

對 ALTOS LAB 這類 AI implementation studio 來說，語氣可以務實、有判斷、能拆解流程，但不能變成誇張銷售文。繁中可以保留一點現場感，英文要更直接，日文要降低命令感，韓文要維持專業密度，印尼文、越南文、泰文、馬來文與菲律賓文要避免英文句型硬塞。這些都要寫成範例，不是只寫「自然一點」。

[IMAGE:opening]

## 九種語言共享證據，不共享句子

多語內容應該共享 source card，而不是共享原句。source card 要先列出來源標題、發布者、日期、可引用事實、不可延伸的限制，以及讀者可以採取的下一步。事實層不能改，判斷層可以換成當地讀者熟悉的場景，語氣層才交給各語言重寫。

這個拆法能避免兩種常見失敗：一種是逐字翻譯，讀起來像機器；另一種是每個語言自由發揮，最後事實漂移。好的多語稿不是九份摘要，而是九種語言各自回答同一個讀者問題。

## SEO 寫給搜尋者，GEO 寫給可引用答案

SEO title、meta description、slug、FAQ、schema 和 GEO summary 不該共用同一段文字。SEO 要讓搜尋結果裡的人知道這篇值不值得點；GEO 要讓 AI answer system 能抽出清楚、可引用、可追溯的答案；文章開頭則要讓真正的讀者願意繼續讀。

更穩的流程是先寫人看的 standfirst，再寫搜尋看的 meta description，最後寫 AI 可引用的 GEO summary。三者講同一件事，但功能不同。若三者都長一樣，卡片、搜尋摘要和 AI 引用都會變平，讀者也會感覺這篇只是在填欄位。

[IMAGE:mechanism]

## 在地語氣可以鬆，品質檢查要硬

在地化不是把英文變成當地文字，而是讓當地讀者用自己的節奏理解同一個判斷。英文讀者接受直接結論；繁中讀者常需要知道企業導入、預算與風險如何改變；日文版本要注意禮貌與脈絡；韓文版本要乾淨地保留技術詞與商業判斷；東南亞語言則要減少長句、空泛開頭與翻譯腔。

但語氣可以彈性，不代表 QA 可以放鬆。每個語言都要檢查四件事：事實是否一致、品牌判斷是否一致、搜尋結構是否完整、讀者是否真的讀得懂。只要有一個語言版本像翻譯稿，整組內容的品牌感就會破。

## 用數據修語氣，不只修排名

多語內容的自我進化不能只看流量。點擊率高但停留短，可能是標題有鉤子、正文卻不自然；流量低但停留長，可能代表題材對、搜尋入口還沒打開。GA、Search Console、站內行為與 AI 搜尋引用訊號要一起看，才知道下一輪該修選題、標題、段落、圖片還是 FAQ。

Hermes 後續要學的不是多寫幾篇，而是每個語言各自累積規則：哪種 title 會被點、哪種 section subtitle 會讓人讀下去、哪種 FAQ 會被搜尋抓到、哪種圖片讓人停下來。多語內容真正的規模化，是越寫越像同一個可靠品牌，而不是越寫越像翻譯流水線。`,
    faqs: [
      { question: "AI 多語內容可以直接翻譯英文原稿嗎？", answer: "不建議。應先固定品牌骨架、來源證據、術語與不可宣稱的限制，再依每個語言做在地化改寫與 QA。" },
      { question: "GEO summary 和 SEO description 有什麼不同？", answer: "SEO description 服務搜尋結果點擊；GEO summary 服務 AI 引用與回答抽取，所以需要更清楚的來源、決策與可引用語意。" }
    ]
  },
  en: {
    title: "Multilingual AI Content Needs a Brand Spine, Not Better Translation",
    excerpt: "AI can scale multilingual content only after the brand spine, source evidence, SEO/GEO fields, and local QA are separated. Otherwise it scales translation smell.",
    seoTitle: "Multilingual AI Content Needs a Brand Spine, Not Just Translation",
    seoDescription: "A practical workflow for multilingual AI content: lock the brand spine, source evidence, SEO/GEO fields and local QA before language adaptation.",
    geoSummary: "Multilingual AI content should share evidence, not sentences. Google Search Central, OpenAI Structured Outputs and Microsoft Responsible AI point to a workflow that separates brand spine, source cards, SEO/GEO metadata and local QA.",
    keyTakeaways: ["Fix the brand spine and source card before translation.", "Write SEO snippets, GEO summaries and article leads for different jobs.", "Let each language breathe locally while sharing the same facts and limits."],
    body: `The quickest way to ruin multilingual content is to make every language sound like a translated landing page. Readers notice when English carries the whole structure and every other language is asked to follow along. The problem is not vocabulary; it is trust.

${sharedSources.en} point in the same direction: multilingual pages need clear language relationships, AI output needs constrained fields, and automated content needs accountability. That makes multilingual publishing a workflow problem, not a translation shortcut.

## Start with the brand rules that cannot drift

A brand spine is the set of rules every language must keep: how the company names itself, what the product can promise, which terms stay fixed, which claims need evidence, and which tones are off-limits. Without that spine, the model will borrow the habits of each market and gradually turn one brand into several voices.

For ALTOS LAB, the voice can be practical, sharp and operational. It should not become hype. English can be direct, Traditional Chinese can carry more field context, Japanese needs softer command patterns, Korean should keep technical density clean, and Southeast Asian languages need shorter natural sentences rather than English syntax in disguise.

[IMAGE:opening]

## Share the evidence, not the sentences

The source card comes before localization. It should name the source, publisher, date, citeable facts, limits, and the reader decision. Every language uses the same source card, but no language is forced to reuse the same sentence.

This prevents two failures at once: word-for-word translation that feels mechanical, and freeform localization that slowly changes the facts. The goal is not nine summaries. It is nine local answers to the same reader problem.

## SEO and GEO are different writing jobs

SEO title, meta description, slug, FAQ, schema and GEO summary should not reuse the same paragraph. SEO helps a searcher decide whether to click. GEO helps an answer engine extract a clear, traceable claim. The opening paragraph helps a human decide whether the article is worth finishing.

Write the standfirst for people first, then the search snippet, then the citable GEO summary. They can point to the same idea, but they should not sound identical.

[IMAGE:mechanism]

## Local tone can flex; QA cannot

Localization is not a softer word for translation. Each market has its own reading rhythm, decision anxiety and tolerance for directness. What must stay rigid is the QA layer: facts, brand judgment, metadata, schema, FAQ and source limits.

A multilingual review should ask four questions: are the facts consistent, does the brand still sound like the same company, can search systems understand the page, and can a non-expert reader actually absorb the argument?

## Let performance data tune the voice

Multilingual optimization should not chase traffic alone. High clicks with short dwell time can mean the title works but the prose feels wrong. Low traffic with strong reading depth can mean the topic is right but the entry point is weak.

Hermes should feed GA, Search Console, site behavior and AI citation signals back into the next prompt: which titles earn attention, which section subtitles keep people moving, which FAQs get picked up, and which visual styles slow the reader down in a useful way. That is how multilingual content becomes a learning system instead of a translation queue.`,
    faqs: [
      { question: "Can AI multilingual content start from direct translation?", answer: "It can draft from a source article, but production should start from a brand spine, source card, metadata plan and local QA rules." },
      { question: "How is a GEO summary different from a meta description?", answer: "A meta description earns clicks. A GEO summary gives answer engines a concise, source-aware claim that can be cited safely." }
    ]
  },
  ja: {
    title: "AI多言語コンテンツは、翻訳の前にブランドの芯を決める",
    excerpt: "多言語AIコンテンツは、翻訳精度だけでは安定しない。ブランドの芯、出典カード、SEO/GEO項目、現地QAを分けて設計してから各言語に展開する。",
    seoTitle: "AI多言語コンテンツは翻訳前にブランドの芯を決める",
    seoDescription: "多言語AIコンテンツでブランドを崩さないための実務手順。ブランドの芯、出典、SEO/GEO、現地QAを分けて設計する。",
    geoSummary: "AI多言語コンテンツでは、文章ではなく証拠を共有する。Google Search Central、OpenAI Structured Outputs、Microsoft Responsible AI は、ブランドの芯、出典カード、SEO/GEO、現地QAを分ける運用を示している。",
    keyTakeaways: ["翻訳前にブランドの芯と出典カードを固定する。", "SEO、GEO、本文冒頭は役割ごとに書き分ける。", "各言語は同じ事実を使いながら、現地の読者に合わせて書き直す。"],
    body: `多言語コンテンツで一番危ないのは、語彙の誤訳よりも、各言語が別の会社のように見えることです。英語の構文をそのまま残した日本語、硬すぎる説明、現地の読者が使わない言い回しは、記事の信頼を静かに削ります。

${sharedSources.ja} が示しているのは、言語別URL、構造化された項目、責任ある自動化を分けて考える必要です。つまり多言語AIは翻訳機能ではなく、コンテンツ運用の設計です。

## まず変えてはいけないブランドの芯を決める

ブランドの芯とは、会社の呼び方、製品が約束できる範囲、固定する用語、避ける語調、証拠が必要な主張をまとめたルールです。ここが曖昧なままAIに任せると、各言語が市場の癖に引っ張られます。

ALTOS LAB の場合、実務的で判断があり、導入や運用に近い語り方が必要です。ただし誇張した売り文句にはしません。この違いを例文で持たせることが、単なる「自然にして」よりも重要です。

[IMAGE:opening]

## 共有するのは文章ではなく証拠

多言語化の前に source card を作ります。出典名、公開日、引用できる事実、広げてはいけない解釈、読者の次の判断を先に固定します。各言語は同じカードを使いますが、同じ文章を共有する必要はありません。

この方法なら、直訳で硬くなる問題と、自由に書き換えすぎて事実がずれる問題を同時に避けられます。

## SEO と GEO は同じ要約ではない

SEO title や meta description は検索結果でクリックを得るための文章です。一方、GEO summary はAI回答が安全に引用できるように、出典と判断を短く残す文章です。本文冒頭は人間の読者に読み進める理由を渡します。

[IMAGE:mechanism]

## 現地の語調は柔らかく、QAは硬く

現地化とは、英語を別の文字に置き換えることではありません。日本語では命令調を避け、文脈を先に置く方が自然な場合があります。ただし事実、ブランド判断、FAQ、schema、出典制限は柔らかくしてはいけません。

## 数字で順位だけでなく語調も直す

クリック率だけでは多言語の良し悪しは分かりません。クリックは高いのに滞在が短いなら、見出しは強いが本文が読みにくい可能性があります。Hermes はGA、Search Console、AI引用シグナルを次の見出し、段落、FAQ、画像判断に戻す必要があります。`,
    faqs: [
      { question: "AI多言語記事は英語原稿をそのまま翻訳してよいですか？", answer: "本番では推奨しません。先にブランドの芯、出典カード、SEO/GEO項目、現地QAを固定してから書き換えるべきです。" },
      { question: "GEO summary は meta description と何が違いますか？", answer: "meta description はクリック用、GEO summary はAI回答が引用しやすい出典付き要約です。" }
    ]
  },
  ko: {
    title: "AI 다국어 콘텐츠는 번역보다 먼저 브랜드 뼈대가 필요하다",
    excerpt: "다국어 콘텐츠는 번역 정확도만으로 유지되지 않는다. 브랜드 규칙, 출처 카드, SEO/GEO 필드, 현지 QA를 먼저 나눠야 AI가 품질을 키운다.",
    seoTitle: "AI 다국어 콘텐츠에는 번역보다 브랜드 뼈대가 먼저 필요하다",
    seoDescription: "AI 다국어 콘텐츠 품질을 지키는 방법. 브랜드 뼈대, 출처 카드, SEO/GEO 필드, 현지 QA를 분리해 운영한다.",
    geoSummary: "AI 다국어 콘텐츠는 문장을 공유하지 말고 증거를 공유해야 한다. Google Search Central, OpenAI Structured Outputs, Microsoft Responsible AI는 브랜드 뼈대, 출처 카드, SEO/GEO, 현지 QA를 분리하는 운영 방식을 보여준다.",
    keyTakeaways: ["번역 전에 브랜드 뼈대와 출처 카드를 고정한다.", "SEO 문구와 GEO 요약, 기사 도입부는 서로 다른 목적을 가진다.", "각 언어는 같은 사실을 쓰되 현지 독자의 리듬으로 다시 쓴다."],
    body: `다국어 콘텐츠의 실패는 단어 하나의 오역보다 더 조용하게 온다. 영어 구조가 그대로 남은 글, 너무 딱딱한 번역, 현지 독자가 쓰지 않는 표현은 브랜드 신뢰를 깎는다. 문제는 번역이 아니라 운영 방식이다.

${sharedSources.ko}는 같은 방향을 가리킨다. 언어 버전은 명확해야 하고, AI 출력은 구조화되어야 하며, 자동화된 콘텐츠에는 책임 경계가 필요하다.

## 먼저 흔들리면 안 되는 브랜드 뼈대를 정한다

브랜드 뼈대는 회사 이름을 쓰는 방식, 제품이 약속할 수 있는 범위, 고정 용어, 피해야 할 톤, 증거가 필요한 주장이다. 이 규칙이 없으면 모델은 각 시장의 말투를 따라가며 하나의 브랜드를 여러 목소리로 쪼갠다.

[IMAGE:opening]

## 공유할 것은 문장이 아니라 증거다

현지화 전에 source card를 만든다. 출처, 날짜, 인용 가능한 사실, 확장하면 안 되는 해석, 독자의 다음 판단을 먼저 정한다. 각 언어는 같은 source card를 쓰지만 같은 문장을 쓸 필요는 없다.

## SEO와 GEO는 같은 요약이 아니다

SEO title과 meta description은 검색 결과에서 클릭을 얻기 위한 문장이다. GEO summary는 AI 답변이 안전하게 인용할 수 있도록 출처와 판단을 남기는 문장이다. 기사 첫 문단은 실제 독자가 계속 읽을 이유를 준다.

[IMAGE:mechanism]

## 현지 톤은 유연하게, QA는 단단하게

현지화는 영어를 다른 글자로 바꾸는 일이 아니다. 한국어에서는 기술 용어와 비즈니스 판단을 깨끗하게 유지해야 한다. 다만 사실, 브랜드 판단, FAQ, schema, 출처 제한은 언어마다 흔들리면 안 된다.

## 데이터로 순위뿐 아니라 말투도 고친다

높은 클릭과 짧은 체류 시간은 제목은 강하지만 본문이 어색하다는 신호일 수 있다. Hermes는 GA, Search Console, 사이트 행동, AI 인용 신호를 다음 제목, H2, FAQ, 이미지 판단에 되돌려야 한다.`,
    faqs: [
      { question: "AI 다국어 콘텐츠는 영어 원문을 바로 번역해도 되나요?", answer: "초안에는 쓸 수 있지만 본番 운영은 브랜드 뼈대, 출처 카드, 메타데이터, 현지 QA를 먼저 고정해야 합니다." },
      { question: "GEO summary와 meta description은 어떻게 다른가요?", answer: "meta description은 클릭을 위한 문장이고, GEO summary는 AI 답변이 인용할 수 있는 출처 기반 요약입니다." }
    ]
  }
};

const derived = {
  id: {
    title: "Konten AI Multibahasa Perlu Tulang Punggung Brand, Bukan Sekadar Terjemahan",
    excerpt: "Konten multibahasa harus dimulai dari aturan brand, kartu sumber, SEO/GEO, dan QA lokal. Tanpa itu, AI hanya memperbesar rasa terjemahan.",
    seoTitle: "Konten AI Multibahasa Perlu Tulang Punggung Brand",
    seoDescription: "Workflow praktis untuk konten AI multibahasa: kunci brand spine, bukti sumber, SEO/GEO, dan QA lokal sebelum adaptasi bahasa.",
    geoSummary: "Konten AI multibahasa perlu berbagi bukti, bukan kalimat. Google Search Central, OpenAI Structured Outputs, dan Microsoft Responsible AI mendukung workflow brand spine, source card, SEO/GEO, dan QA lokal."
  },
  vi: {
    title: "Nội dung AI đa ngôn ngữ cần khung thương hiệu trước khi dịch",
    excerpt: "AI chỉ giúp mở rộng nội dung đa ngôn ngữ khi khung thương hiệu, nguồn chứng cứ, SEO/GEO và QA địa phương được tách rõ từ đầu.",
    seoTitle: "Nội dung AI đa ngôn ngữ cần khung thương hiệu trước khi dịch",
    seoDescription: "Cách xây dựng nội dung AI đa ngôn ngữ: khóa khung thương hiệu, nguồn chứng cứ, SEO/GEO và QA địa phương trước khi viết lại.",
    geoSummary: "Nội dung AI đa ngôn ngữ nên chia sẻ chứng cứ, không chia sẻ từng câu. Google Search Central, OpenAI Structured Outputs và Microsoft Responsible AI chỉ ra workflow gồm brand spine, source card, SEO/GEO và QA địa phương."
  },
  th: {
    title: "คอนเทนต์ AI หลายภาษา ต้องมีแกนแบรนด์ก่อนแปล",
    excerpt: "AI จะช่วยขยายคอนเทนต์หลายภาษาได้ก็ต่อเมื่อแกนแบรนด์ หลักฐานจากแหล่งข้อมูล SEO/GEO และ QA ท้องถิ่นถูกแยกให้ชัดก่อน",
    seoTitle: "คอนเทนต์ AI หลายภาษา ต้องมีแกนแบรนด์ก่อนแปล",
    seoDescription: "แนวทางทำคอนเทนต์ AI หลายภาษาโดยแยกแกนแบรนด์ แหล่งข้อมูล SEO/GEO และ QA ท้องถิ่นก่อนปรับภาษา",
    geoSummary: "คอนเทนต์ AI หลายภาษาควรแชร์หลักฐาน ไม่ใช่แชร์ประโยคเดิม Google Search Central, OpenAI Structured Outputs และ Microsoft Responsible AI ชี้ไปที่ workflow ที่แยก brand spine, source card, SEO/GEO และ local QA"
  },
  ms: {
    title: "Kandungan AI Berbilang Bahasa Perlu Tulang Belakang Jenama, Bukan Sekadar Terjemahan",
    excerpt: "AI hanya boleh mengembangkan kandungan berbilang bahasa apabila rangka jenama, bukti sumber, SEO/GEO dan QA tempatan dipisahkan sejak awal.",
    seoTitle: "Kandungan AI Berbilang Bahasa Perlu Tulang Belakang Jenama",
    seoDescription: "Workflow kandungan AI berbilang bahasa: kunci rangka jenama, bukti sumber, SEO/GEO dan QA tempatan sebelum adaptasi bahasa.",
    geoSummary: "Kandungan AI berbilang bahasa perlu berkongsi bukti, bukan ayat. Google Search Central, OpenAI Structured Outputs dan Microsoft Responsible AI menyokong workflow brand spine, source card, SEO/GEO dan QA tempatan."
  },
  fil: {
    title: "Multilingual AI Content Needs a Brand Spine, Hindi Basta Translation",
    excerpt: "Lalago lang ang multilingual content kapag malinaw ang brand spine, source evidence, SEO/GEO fields, at local QA bago pa magsulat ang AI.",
    seoTitle: "Multilingual AI Content Needs a Brand Spine, Hindi Basta Translation",
    seoDescription: "Workflow para sa multilingual AI content: ayusin muna ang brand spine, source evidence, SEO/GEO at local QA bago ang language adaptation.",
    geoSummary: "Multilingual AI content should share evidence, not sentences. Google Search Central, OpenAI Structured Outputs, and Microsoft Responsible AI point to a workflow with brand spine, source card, SEO/GEO, and local QA."
  }
};

const derivedBody = {
  id: [
    "Konten multibahasa sering gagal bukan karena satu istilah salah, tetapi karena tiap bahasa terdengar seperti brand yang berbeda. Struktur Inggris terbawa ke Indonesia, kalimat terlalu panjang, dan pembaca merasa tulisan itu bukan dibuat untuk mereka.",
    `## Tetapkan aturan brand yang tidak boleh bergeser\n\nBrand spine adalah aturan keras: cara menyebut perusahaan, janji produk yang boleh dibuat, istilah yang tetap, klaim yang butuh bukti, dan nada yang tidak boleh dipakai. Tanpa itu, model akan mengikuti kebiasaan tiap pasar.\n\n[IMAGE:opening]`,
    `## Bagikan bukti, bukan kalimat\n\nSource card harus dibuat sebelum lokalisasi: sumber, tanggal, fakta yang bisa dikutip, batasan yang tidak boleh dilebarkan, dan keputusan pembaca. Tiap bahasa memakai bukti yang sama, tetapi menulis ulang dengan ritme lokal.`,
    `## SEO dan GEO punya tugas berbeda\n\nSEO membantu orang memutuskan klik. GEO membantu AI answer system mengutip klaim yang jelas dan bisa dilacak. Lead artikel membantu manusia membaca sampai selesai.\n\n[IMAGE:mechanism]`,
    `## Nada lokal boleh fleksibel, QA harus keras\n\nBahasa lokal perlu terdengar alami, tetapi fakta, brand judgment, metadata, FAQ, schema, dan batas sumber tidak boleh berubah. Hermes harus memakai data performa untuk memperbaiki title, H2, FAQ, dan visual berikutnya.`
  ],
  vi: [
    "Nội dung đa ngôn ngữ thường hỏng không phải vì dịch sai một từ, mà vì mỗi ngôn ngữ nghe như một công ty khác. Khi cấu trúc tiếng Anh bị kéo sang tiếng Việt, người đọc sẽ thấy bài viết không thực sự dành cho họ.",
    `## Cố định phần thương hiệu không được trôi\n\nKhung thương hiệu gồm cách gọi công ty, lời hứa sản phẩm được phép nói, thuật ngữ cố định, tuyên bố cần nguồn, và giọng điệu cần tránh. Nếu thiếu khung này, AI sẽ khuếch đại lỗi từng thị trường.\n\n[IMAGE:opening]`,
    `## Chia sẻ chứng cứ, không chia sẻ câu chữ\n\nSource card phải có trước bản địa hóa: nguồn, ngày, dữ kiện có thể trích dẫn, giới hạn không được suy diễn, và quyết định dành cho người đọc. Mỗi ngôn ngữ dùng cùng chứng cứ nhưng viết lại theo nhịp riêng.`,
    `## SEO và GEO không phải cùng một đoạn tóm tắt\n\nSEO giúp người tìm kiếm quyết định có bấm vào hay không. GEO giúp hệ thống trả lời AI rút ra một nhận định rõ nguồn. Đoạn mở đầu giúp người thật muốn đọc tiếp.\n\n[IMAGE:mechanism]`,
    `## Giọng địa phương có thể mềm, QA phải cứng\n\nNgôn ngữ cần tự nhiên, nhưng sự thật, nhận định thương hiệu, FAQ, schema và giới hạn nguồn phải nhất quán. Hermes cần dùng GA, Search Console và tín hiệu AI citation để sửa title, H2, FAQ và hình ảnh ở vòng sau.`
  ],
  th: [
    "คอนเทนต์หลายภาษาพังได้แม้แปลถูกทุกคำ เพราะแต่ละภาษาฟังเหมือนคนละแบรนด์ ถ้าเอาโครงภาษาอังกฤษไปวางทับ ผู้อ่านจะรู้ทันทีว่านี่ไม่ใช่งานเขียนสำหรับเขา",
    `## กำหนดแกนแบรนด์ที่ห้ามไหลก่อน\n\nแกนแบรนด์คือกฎที่ต้องคงไว้: วิธีเรียกบริษัท ขอบเขตคำสัญญาของสินค้า คำศัพท์ที่ต้องใช้เหมือนกัน ข้อความที่ต้องมีแหล่งอ้างอิง และน้ำเสียงที่ห้ามใช้\n\n[IMAGE:opening]`,
    `## แชร์หลักฐาน ไม่ใช่แชร์ประโยค\n\nก่อน localize ต้องมี source card: แหล่งที่มา วันที่ ข้อเท็จจริงที่อ้างอิงได้ ข้อจำกัดที่ห้ามตีความเกิน และการตัดสินใจที่ผู้อ่านควรทำ แต่ละภาษาจึงเขียนใหม่ได้โดยไม่ทำให้ข้อเท็จจริงหลุด`,
    `## SEO กับ GEO เขียนคนละหน้าที่\n\nSEO ทำให้คนในผลค้นหาตัดสินใจคลิก GEO ทำให้ระบบคำตอบ AI ดึงคำตอบที่มีแหล่งอ้างอิงได้ ส่วนย่อหน้าแรกต้องทำให้มนุษย์อยากอ่านต่อ\n\n[IMAGE:mechanism]`,
    `## น้ำเสียงท้องถิ่นยืดหยุ่นได้ แต่ QA ต้องแน่น\n\nภาษาต้องเป็นธรรมชาติ แต่ข้อเท็จจริง การตัดสินใจของแบรนด์ FAQ schema และข้อจำกัดของแหล่งข้อมูลต้องไม่เปลี่ยน Hermes ต้องนำ GA, Search Console และสัญญาณ AI citation กลับไปปรับ title, H2, FAQ และภาพในรอบถัดไป`
  ],
  ms: [
    "Kandungan berbilang bahasa boleh rosak walaupun terjemahan nampak betul. Masalahnya muncul apabila setiap bahasa berbunyi seperti jenama lain, atau struktur Inggeris dibawa masuk tanpa irama tempatan.",
    `## Tetapkan rangka jenama yang tidak boleh hanyut\n\nTulang belakang jenama ialah peraturan keras: cara menyebut syarikat, janji produk yang boleh dibuat, istilah yang tetap, dakwaan yang perlukan bukti, dan nada yang tidak boleh digunakan.\n\n[IMAGE:opening]`,
    `## Kongsi bukti, bukan ayat\n\nSource card perlu wujud sebelum lokalisasi: sumber, tarikh, fakta yang boleh dirujuk, had yang tidak boleh dilebihkan, dan keputusan pembaca. Setiap bahasa menggunakan bukti yang sama tetapi menulis semula mengikut irama setempat.`,
    `## SEO dan GEO bukan ringkasan yang sama\n\nSEO membantu pencari membuat keputusan untuk klik. GEO membantu sistem jawapan AI memetik dakwaan yang jelas dan boleh dijejaki. Pembukaan artikel pula memberi sebab kepada manusia untuk terus membaca.\n\n[IMAGE:mechanism]`,
    `## Nada tempatan boleh lentur, QA mesti tegas\n\nBahasa boleh disesuaikan, tetapi fakta, pertimbangan jenama, FAQ, schema dan had sumber mesti kekal. Hermes perlu menggunakan GA, Search Console dan isyarat AI citation untuk memperbaiki title, H2, FAQ dan visual seterusnya.`
  ],
  fil: [
    "Hindi sapat na tama ang translation. Kapag ang bawat wika ay parang galing sa ibang brand, nawawala ang tiwala. Mas mabilis itong mahalata kapag English structure ang dinadala sa lahat ng market.",
    `## Unahin ang brand spine na hindi puwedeng gumalaw\n\nAng brand spine ay malinaw na rules: paano tawagin ang kumpanya, hanggang saan ang product promise, aling terms ang fixed, anong claims ang kailangan ng source, at anong tono ang bawal.\n\n[IMAGE:opening]`,
    `## Evidence ang i-share, hindi sentence\n\nBago mag-localize, gumawa muna ng source card: source, date, citeable facts, limits, at reader decision. Iisa ang ebidensiya ng bawat language, pero iba ang natural na pagsulat.`,
    `## Magkaiba ang trabaho ng SEO at GEO\n\nSEO helps a searcher decide to click. GEO helps AI answer systems cite a clear claim. The opening paragraph helps a real reader decide to keep reading.\n\n[IMAGE:mechanism]`,
    `## Puwedeng lokal ang tono, pero matigas ang QA\n\nDapat natural ang language, pero hindi puwedeng gumalaw ang facts, brand judgment, FAQ, schema, at source limits. Hermes should use GA, Search Console, and AI citation signals to improve the next title, H2, FAQ, and visual choices.`
  ]
};

for (const [language, meta] of Object.entries(derived)) {
  content[language] = {
    ...meta,
    keyTakeaways: [
      "Fix the brand spine and source evidence before localization.",
      "Write SEO, GEO, and article openings as separate assets.",
      "Keep local voice flexible while facts and QA stay consistent."
    ],
    body: `${derivedBody[language].join("\n\n")}`,
    faqs: [
      { question: "Should AI multilingual content start from direct translation?", answer: "No. It should start from brand rules, source evidence, SEO/GEO fields, and local QA before language adaptation." },
      { question: "Why separate SEO and GEO copy?", answer: "SEO earns clicks from search results. GEO gives answer engines a source-aware claim they can cite safely." }
    ]
  };
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const { payload } = await fetchJson(`${root}/api/blog?limit=400&ts=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
  const posts = (payload.posts || payload.payload?.posts || []).filter((post) => post.translationGroupId === GROUP_ID);
  const patches = posts
    .map((post) => {
      const patch = content[post.language];
      if (!patch) return null;
      return { id: post.id, patch };
    })
    .filter(Boolean);

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, groupId: GROUP_ID, found: posts.length, patches: patches.map((item) => ({ id: item.id, title: item.patch.title })) }, null, 2));
    return;
  }

  const body = JSON.stringify({ patches });
  const cookie = await adminCookie(root);
  const secret = process.env.BLOG_INGEST_HMAC_SECRET || "";
  if (!cookie && !secret) throw new Error("No admin cookie or BLOG_INGEST_HMAC_SECRET available");
  const { payload: result } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : signedHeaders(secret, body),
    body
  });
  if (result.failures?.length) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const readback = [];
  for (const item of patches) {
    const updated = result.updated.find((post) => post.id === item.id);
    if (!updated) continue;
    const { payload: detail } = await fetchJson(`${root}/api/blog/${encodeURIComponent(updated.slug)}?language=${encodeURIComponent(updated.language)}&ts=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" }
    });
    const post = detail.post || detail.payload?.post || detail;
    const h2 = [...String(post.body || "").matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]);
    const markers = [...String(post.body || "").matchAll(/\[IMAGE:([^\]]+)\]/g)].map((match) => match[1]);
    readback.push({ id: post.id, language: post.language, slug: post.slug, title: post.title, h2Count: h2.length, markers });
  }
  console.log(JSON.stringify({ ok: true, updated: result.updated.length, readback, publicCache: result.publicCache }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
