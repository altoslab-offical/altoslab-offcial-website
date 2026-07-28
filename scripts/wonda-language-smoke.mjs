const DEFAULT_API = "https://altoslab-ai.cc/api/wonda";
const DEFAULT_CHANNEL = "cms4snnn50001l5045li1fd5h";

const api = process.env.WONDA_WIDGET_API || DEFAULT_API;
const channel = process.env.WONDA_WIDGET_CHANNEL_ID || DEFAULT_CHANNEL;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const forbiddenPattern =
  /channelId|widget script|data-channel-id|API base|backend|Cloudflare|GCP|GitHub|n8n|Chrome profile|WonDa 後台|管理後台|登入憑證|token|secret/i;
const nonLatinPattern = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/;
const koWrongScriptPattern = /[\u3040-\u30ff\u3400-\u9fff\u0e00-\u0e7f]/;
const thWrongScriptPattern = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
const nonEnglishLatinPattern =
  /\b(bisa|dapat|kami|anda|biasanya|membantu|boleh|laman|sokongan|chúng tôi|hỗ trợ|makakatulong|namin|ninyo|puwede|mga)\b/i;

const cases = [
  {
    id: "zh-Hant",
    question: "你好，我想知道 ALTOS LAB 可以幫我們做網站 AI 客服嗎？",
    languageSignal: /[\u4e00-\u9fff]/,
    antiSignal: /请|创建|登录|设置|后台/,
  },
  {
    id: "en",
    question: "Hello, we want an AI customer service assistant on our company website. Can ALTOS LAB help?",
    languageSignal: /\b(yes|can|help|we|you|your)\b/i,
    antiSignal: new RegExp(`${nonLatinPattern.source}|${nonEnglishLatinPattern.source}`, "i"),
  },
  {
    id: "ja",
    question: "こんにちは。ALTOS LAB は日本語で AI カスタマーサポート導入について相談できますか？",
    languageSignal: /[\u3040-\u30ff]/,
    antiSignal: /您好|可以協助|可以帮助/,
  },
  {
    id: "ko",
    question: "안녕하세요. ALTOS LAB에서 웹사이트 AI 고객지원 도입을 도와줄 수 있나요?",
    languageSignal: /[\uac00-\ud7af]/,
    antiSignal: koWrongScriptPattern,
  },
  {
    id: "id",
    question: "Halo, apakah ALTOS LAB bisa membantu memasang chatbot AI untuk website kami?",
    languageSignal: /\b(bisa|membantu|website|kami|chatbot|FAQ)\b/i,
    antiSignal: nonLatinPattern,
  },
  {
    id: "vi",
    question: "Xin chào, ALTOS LAB có thể hỗ trợ gắn chatbot AI lên website của chúng tôi không?",
    languageSignal: /\b(có thể|hỗ trợ|website|chúng tôi|chatbot|FAQ)\b/i,
    antiSignal: nonLatinPattern,
  },
  {
    id: "th",
    question: "สวัสดีครับ ALTOS LAB ช่วยติดตั้ง AI chatbot บนเว็บไซต์ของเราได้ไหม?",
    languageSignal: /[\u0e00-\u0e7f]/,
    antiSignal: thWrongScriptPattern,
  },
  {
    id: "ms",
    question: "Hai, bolehkah ALTOS LAB membantu memasang chatbot AI di laman web kami?",
    languageSignal: /\b(boleh|membantu|laman web|kami|chatbot|sokongan)\b/i,
    antiSignal: nonLatinPattern,
  },
  {
    id: "fil",
    question: "Hello, makakatulong ba ang ALTOS LAB na maglagay ng AI support widget sa website namin?",
    languageSignal: /\b(oo|makakatulong|namin|ninyo|puwede|inyong|kayo|mga)\b/i,
    antiSignal: nonLatinPattern,
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function post(path, payload) {
  const response = await fetch(`${api}/widget/${channel}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response;
}

async function sendMessage(sessionId, content) {
  const response = await fetch(`${api}/widget/${channel}/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, content }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`/message returned ${response.status}`);
  }
  return body;
}

for (const item of cases) {
  const sessionId = `ws_${Date.now()}_${runId}_${item.id}`.replace(/[^a-zA-Z0-9_]/g, "_");
  await post("/init", { sessionId });
  const body = await sendMessage(sessionId, item.question);
  const answer = body?.message?.content || "";
  const compact = answer.replace(/\s+/g, " ").trim();

  assert(compact.includes("ALTOS LAB"), `${item.id}: response should mention ALTOS LAB`);
  assert(item.languageSignal.test(compact), `${item.id}: response does not match the visitor language`);
  assert(!item.antiSignal.test(compact), `${item.id}: response appears to be in the wrong language`);
  assert(!forbiddenPattern.test(compact), `${item.id}: response exposed internal/backend implementation guidance`);

  console.log(
    JSON.stringify({
      id: item.id,
      ok: true,
      preview: compact.slice(0, 160),
    })
  );
}

console.log("PASS WonDa multilingual live smoke checks");
