import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let cachedToken = "";
let cachedTokenAt = 0;

const TARGET_LANGUAGES = {
  "zh-Hant": "zh-TW",
  ja: "ja",
  ko: "ko",
  id: "id",
  vi: "vi",
  th: "th",
  ms: "ms",
  fil: "tl"
};

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanTranslatedText(value = "", language = "") {
  let text = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  if (language === "zh-Hant") {
    text = text
      .replace(/優步/g, "Uber")
      .replace(/亞馬遜/g, "Amazon")
      .replace(/谷歌/g, "Google")
      .replace(/擁抱臉部|擁抱臉|擁抱面孔|擁抱臉孔/g, "Hugging Face")
      .replace(/人工智慧/g, "AI")
      .replace(/AI\s*代理商/g, "AI agent")
      .replace(/Google雲端/g, "Google Cloud")
      .replace(/Google Cloud/g, "Google Cloud")
      .replace(/Anthropic克勞德/g, "Anthropic Claude")
      .replace(/克勞德/g, "Claude")
      .replace(/200\s*美元/g, "2 億美元")
      .replace(/出於某種原因，?/g, "")
      .replace(/據報道，?/g, "報導指出，")
      .replace(/據\s*TechCrunch\s*報導[:：，]?/g, "TechCrunch 報導，")
      .replace(/TechCrunch\s*報導[:：]/g, "TechCrunch 報導，")
      .replace(/據報道，Uber此次裁員是在該公司鼓勵員工盡可能使用 AI 之後發生的。?/g, "報導指出，Uber 先前鼓勵員工盡可能使用 AI，隨後因相關支出超出預算而設定使用上限。")
      .replace(/報導指出，Uber\s*這次支出限制是在該公司鼓勵員工盡可能使用 AI 之後發生的。?/g, "報導指出，Uber 先前鼓勵員工盡可能使用 AI，隨後因相關支出超出預算而設定使用上限。")
      .replace(/Uber此次裁員/g, "Uber 這次支出限制")
      .replace(/此次裁員/g, "這次支出限制")
      .replace(/TechCrunch\s*通報[:：]/g, "TechCrunch 報導，")
      .replace(/TechCrunch\s*reported[:：]/gi, "TechCrunch 報導，")
      .replace(/資料來源包含以下具體數字[:：]/g, "文中提到的主要數字包括")
      .replace(/消息來源包含以下具體數字[:：]/g, "文中提到的主要數字包括")
      .replace(/存取權限/g, "使用權")
      .replace(/資源佔用規模/g, "用量")
      .replace(/資源佔用量/g, "用量")
      .replace(/規模擴大/g, "用量擴大")
      .replace(/該協議涉及/g, "協議內容包括")
      .replace(/氛圍編碼/g, "vibe coding")
      .replace(/更能找到/g, "更容易找到")
      .replace(/根據新協議，它將是一個規模更大的項目。?/g, "新協議會讓 Lovable 在 Google Cloud 上的使用規模明顯擴大。")
      .replace(/報告指出[:：]\s*/g, "")
      .replace(/剛剛對\s*Google\s*的\s*AI\s*搜尋攻勢施加了法律限制。?/g, "這讓出版商在 AI Search 內容使用上取得新的選擇權。")
      .replace(/網站發布商/g, "網站出版商")
      .replace(/部落格文章《Hugging Face》/g, "Hugging Face 部落格")
      .replace(/程式碼庫/g, "Codex")
      .replace(/您的/g, "使用者的")
      .replace(/向您展示/g, "向使用者展示")
      .replace(/向使用者的展示/g, "向使用者展示")
      .replace(/向使用者展示與使用者的搜尋查詢/g, "向使用者展示與搜尋查詢")
      .replace(/用戶/g, "使用者")
      .replace(/([A-Za-z0-9])(?=[\u4e00-\u9fff])/g, "$1 ")
      .replace(/([\u4e00-\u9fff])(?=[A-Za-z0-9])/g, "$1 ")
      .replace(/\s+([，。；：！？])/g, "$1")
      .replace(/([（「])\s+/g, "$1")
      .replace(/\s+([）」])/g, "$1");
  }
  return text;
}

function cleanTranslatedTitle(value = "", language = "") {
  return cleanTranslatedText(value, language).replace(/[.。]\s*$/, "").trim();
}

function genericSourceSummary(value = "") {
  return /^A Blog post by .* on Hugging Face\b/i.test(String(value || "").trim());
}

async function gcloudAccessToken() {
  if (cachedToken && Date.now() - cachedTokenAt < 45 * 60 * 1000) return cachedToken;
  const attempts = [
    ["auth", "print-access-token"],
    ["auth", "application-default", "print-access-token"]
  ];
  const failures = [];
  for (const args of attempts) {
    try {
      const { stdout } = await execFileAsync("gcloud", args, { timeout: 12_000 });
      const token = stdout.trim();
      if (token) {
        cachedToken = token;
        cachedTokenAt = Date.now();
        return token;
      }
    } catch (error) {
      failures.push(`${args.join(" ")}: ${error?.message || error}`);
    }
  }
  throw new Error(`gcloud token fallback failed: ${failures.join(" | ")}`);
}

async function translateTexts(texts, { target, projectId }) {
  const token = await gcloudAccessToken();
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId
    },
    body: JSON.stringify({
      q: texts,
      source: "en",
      target,
      format: "text"
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `Cloud Translation failed with HTTP ${response.status}`);
  }
  const translated = json?.data?.translations || [];
  if (translated.length !== texts.length) throw new Error(`Cloud Translation returned ${translated.length}/${texts.length} translations`);
  return translated.map((item) => item.translatedText || "");
}

export async function localizeSourcePack(pack, { projectId = "", required = true } = {}) {
  const provider = process.env.BLOG_MARKET_TRANSLATION_PROVIDER || "google";
  if (provider === "off") {
    if (required) throw new Error("market translation provider is off");
    return {};
  }
  const gcpProject = projectId || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "project-e688c018-aec3-4815-891";
  const article = pack.sourceArticle || {};
  const source = pack.sourceLinks?.[0] || {};
  const headline = article.headline || source.title || pack.topic || "";
  const factBullets = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean).slice(0, 6) : [];
  const rawStandfirst = article.standfirst || source.summary || "";
  const standfirst = genericSourceSummary(rawStandfirst) ? factBullets[0] || headline : rawStandfirst;
  const texts = [headline, standfirst, ...factBullets].map((text) => String(text || "").trim());
  if (!headline || !standfirst || factBullets.length < 2) {
    throw new Error("sourceArticle must include headline, standfirst and at least two fact bullets before localization");
  }

  const localized = {
    en: {
      headline: cleanTranslatedTitle(headline, "en"),
      standfirst: cleanTranslatedText(standfirst, "en"),
      factBullets: factBullets.map((fact) => cleanTranslatedText(fact, "en"))
    }
  };

  for (const [language, target] of Object.entries(TARGET_LANGUAGES)) {
    const result = await translateTexts(texts, { target, projectId: gcpProject });
    localized[language] = {
      headline: cleanTranslatedTitle(result[0], language),
      standfirst: cleanTranslatedText(result[1], language),
      factBullets: result.slice(2).map((fact) => cleanTranslatedText(fact, language)).filter(Boolean)
    };
  }

  return localized;
}

export function packForLanguage(pack, language, localized = {}) {
  const translation = localized[language];
  if (!translation) return pack;
  const sourceArticle = {
    ...(pack.sourceArticle || {}),
    headline: translation.headline || pack.sourceArticle?.headline,
    standfirst: translation.standfirst || pack.sourceArticle?.standfirst,
    factBullets: translation.factBullets?.length ? translation.factBullets : pack.sourceArticle?.factBullets,
    localizedLanguage: language
  };
  return {
    ...pack,
    sourceArticle
  };
}
