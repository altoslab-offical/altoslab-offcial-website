import { NextResponse } from "next/server";

type Params = { params: Promise<{ path?: string[] }> | { path?: string[] } };

const UPSTREAM_WONDA_API = "https://wonda-api-free.vercel.app/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store"
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init.headers || {})
    }
  });
}

function detectVisitorLanguage(input: string) {
  const text = input.trim();
  if (/[\u0e00-\u0e7f]/.test(text)) return "th";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/\b(makakatulong|maglagay|namin|ninyo|puwede|kayo|tanong)\b/i.test(text)) return "fil";
  if (/\b(bolehkah|boleh|laman web|sokongan|perkhidmatan|pasukan manusia)\b/i.test(text)) return "ms";
  if (/\b(xin chào|có thể|hỗ trợ|chúng tôi|trang web|khách hàng)\b/i.test(text)) return "vi";
  if (/\b(apakah|bisa|memasang|kami|pelanggan)\b/i.test(text)) return "id";
  if (/[\u3400-\u9fff]/.test(text)) return "zh-Hant";
  return "en";
}

const forbiddenAnswerPattern =
  /Recommended first-wave|Webhook URL|Channel access|Channel secret|BotFather|Phone Number ID|Meta Cloud API|App Review|permanent access token|subscribe the `?messages`? webhook|LINE \/ Telegram/i;
const cjkPattern = /[\u3400-\u9fff]/;
const nonEnglishScriptPattern = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/;
const nonEnglishLatinPattern =
  /\b(bisa|dapat|kami|anda|biasanya|membantu|boleh|laman|sokongan|chúng tôi|hỗ trợ|makakatulong|namin|ninyo|puwede|mga)\b/i;

function answerLooksWrongForLanguage(answer: string, language: string) {
  if (!answer.trim()) return true;
  if (forbiddenAnswerPattern.test(answer)) return true;
  if (["en", "id", "vi", "ms", "fil"].includes(language) && nonEnglishScriptPattern.test(answer)) return true;
  if (language === "en" && nonEnglishLatinPattern.test(answer)) return true;
  if (language === "ms" && /\b(bisa|situs anda|layanan pelanggan)\b/i.test(answer)) return true;
  if (language === "fil" && !/\b(oo|makakatulong|namin|ninyo|puwede|inyong|kayo|mga)\b/i.test(answer)) {
    return true;
  }
  if (language === "ja" && !/[\u3040-\u30ff]/.test(answer)) return true;
  if (language === "ko" && (!/[\uac00-\ud7af]/.test(answer) || cjkPattern.test(answer))) return true;
  if (language === "th" && (!/[\u0e00-\u0e7f]/.test(answer) || cjkPattern.test(answer))) return true;
  return false;
}

function guardedAnswer(language: string) {
  switch (language) {
    case "en":
      return [
        "Yes, ALTOS LAB can help you add an AI customer service assistant to your website.",
        "",
        "We usually start by:",
        "1. Organizing your FAQ, service pages, and support records.",
        "2. Defining what the AI can answer and when it should hand off to a human.",
        "3. Adding the website support entry and testing the full visitor flow.",
        "",
        "To scope it properly, please share your website, the main support questions, and whether you already have FAQ or support records."
      ].join("\n");
    case "ja":
      return [
        "はい、ALTOS LAB は Web サイト向けの AI カスタマーサポート導入をお手伝いできます。",
        "",
        "まずは FAQ、サービス内容、過去のお問い合わせを整理し、AI が回答できる範囲と人が引き継ぐ条件を設計します。",
        "よろしければ、対象サイト、よくある問い合わせ、既存の FAQ やサポート記録の有無を教えてください。"
      ].join("\n");
    case "ko":
      return [
        "네, ALTOS LAB는 웹사이트용 AI 고객지원 도입을 도와드릴 수 있습니다.",
        "",
        "보통 FAQ, 서비스 페이지, 기존 고객 문의를 먼저 정리하고, AI가 답할 수 있는 범위와 사람이 이어받아야 하는 조건을 설계합니다.",
        "현재 웹사이트와 자주 들어오는 문의, 기존 FAQ 또는 상담 기록이 있는지 알려주시면 다음 단계를 잡아드릴 수 있습니다."
      ].join("\n");
    case "id":
      return [
        "Bisa. ALTOS LAB dapat membantu memasang AI customer support di website Anda.",
        "",
        "Biasanya kami mulai dengan merapikan FAQ, halaman layanan, dan riwayat pertanyaan pelanggan. Setelah itu, kami menentukan batas jawaban AI dan kapan percakapan perlu diteruskan ke tim manusia.",
        "",
        "Untuk menilai kebutuhan awal, kirimkan website Anda, pertanyaan pelanggan yang paling sering muncul, dan apakah sudah ada FAQ atau catatan support."
      ].join("\n");
    case "vi":
      return [
        "Có. ALTOS LAB có thể hỗ trợ gắn chatbot AI hoặc điểm vào chăm sóc khách hàng AI lên website của bạn.",
        "",
        "Chúng tôi thường bắt đầu bằng cách sắp xếp FAQ, trang dịch vụ và lịch sử câu hỏi của khách hàng, sau đó thiết lập phạm vi trả lời của AI và quy trình chuyển tiếp cho người phụ trách.",
        "",
        "Bạn có thể gửi website, các câu hỏi khách hàng thường gặp và cho biết hiện đã có FAQ hoặc dữ liệu hỗ trợ chưa?"
      ].join("\n");
    case "th":
      return [
        "ได้ครับ ALTOS LAB ช่วยวางระบบ AI customer support บนเว็บไซต์ของคุณได้",
        "",
        "เรามักเริ่มจากการจัดระเบียบ FAQ หน้าอธิบายบริการ และคำถามที่ลูกค้าถามบ่อย จากนั้นกำหนดขอบเขตที่ AI ตอบได้ และเงื่อนไขที่ต้องส่งต่อให้ทีมงาน",
        "",
        "ถ้าสะดวก ส่งเว็บไซต์ คำถามที่พบบ่อย และข้อมูล FAQ หรือประวัติการซัพพอร์ตที่มีอยู่มาได้ครับ"
      ].join("\n");
    case "ms":
      return [
        "Boleh. ALTOS LAB boleh membantu memasang chatbot AI atau pintu masuk sokongan AI di laman web anda.",
        "",
        "Biasanya kami mula dengan menyusun FAQ, halaman perkhidmatan, dan rekod soalan pelanggan. Kemudian kami tetapkan soalan yang boleh dijawab oleh AI dan bila perlu diserahkan kepada pasukan manusia.",
        "",
        "Untuk menilai keperluan awal, kongsikan laman web anda, soalan pelanggan yang paling kerap muncul, dan sama ada anda sudah mempunyai FAQ atau rekod sokongan."
      ].join("\n");
    case "fil":
      return [
        "Oo, makakatulong ang ALTOS LAB na maglagay ng AI customer support entry sa website ninyo.",
        "",
        "Karaniwan, inaayos muna namin ang FAQ, service pages, at mga dating tanong ng customers. Pagkatapos, itinatakda kung ano ang puwedeng sagutin ng AI at kailan dapat ipasa sa tao.",
        "",
        "Para ma-scope nang maayos, puwede mong ibahagi ang website ninyo, pinakamadalas na customer questions, at kung may existing FAQ o support records na kayo."
      ].join("\n");
    default:
      return [
        "可以，ALTOS LAB 可以協助你把 AI 客服入口接到網站上。",
        "",
        "我們通常會先整理 FAQ、服務頁與客服紀錄，再設定 AI 可以回答與需要人工接手的邊界，最後測試完整訪客流程。",
        "",
        "如果方便，可以先告訴我你們的網站、主要客服問題，以及目前是否已有 FAQ 或客服紀錄。"
      ].join("\n");
  }
}

function guardedWidgetMessageResponse(body: any, requestBody: any) {
  const userMessage = String(requestBody?.content || "");
  const answer = String(body?.message?.content || "");
  const language = detectVisitorLanguage(userMessage);
  if (!body?.message || !answerLooksWrongForLanguage(answer, language)) return body;
  return {
    ...body,
    message: {
      ...body.message,
      content: guardedAnswer(language),
      metadata: {
        ...(body.message.metadata || {}),
        altosGuarded: true,
        visitorLanguage: language
      }
    }
  };
}

async function proxy(request: Request, context: Params) {
  const { path = [] } = await context.params;
  const upstreamUrl = new URL(`${UPSTREAM_WONDA_API}/${path.map(encodeURIComponent).join("/")}`);
  const requestUrl = new URL(request.url);
  upstreamUrl.search = requestUrl.search;

  let requestBody: any = undefined;
  let bodyText: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyText = await request.text();
    requestBody = bodyText ? JSON.parse(bodyText) : undefined;
  }

  const upstream = await fetch(upstreamUrl, {
    body: bodyText,
    headers: {
      "content-type": request.headers.get("content-type") || "application/json"
    },
    method: request.method
  });
  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new NextResponse(upstream.body, {
      headers: {
        ...corsHeaders,
        "content-type": contentType || "text/plain"
      },
      status: upstream.status
    });
  }

  const body = await upstream.json().catch(() => ({}));
  const isWidgetMessage =
    request.method === "POST" && path.length >= 3 && path[0] === "widget" && path[path.length - 1] === "message";
  const guarded = isWidgetMessage ? guardedWidgetMessageResponse(body, requestBody) : body;
  return jsonResponse(guarded, { status: upstream.status });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders, status: 204 });
}

export async function GET(request: Request, context: Params) {
  return proxy(request, context);
}

export async function POST(request: Request, context: Params) {
  return proxy(request, context);
}
