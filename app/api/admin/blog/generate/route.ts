import { NextResponse } from "next/server";
import { normalizeBlogPostInput, slugify, nowIso } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type GenerateInput = {
  topic?: string;
  audience?: string;
  keyword?: string;
  intent?: string;
};

function fallbackDraft(input: GenerateInput): BlogPost {
  const topic = input.topic?.trim() || "企業導入 AI Agent";
  const keyword = input.keyword?.trim() || topic;
  const audience = input.audience?.trim() || "台灣中小企業主、營運主管與行銷負責人";
  const title = `${topic}完整指南：從需求盤點到可落地的 AI 工作流`;

  return normalizeBlogPostInput({
    title,
    slug: slugify(`${topic} ${keyword}`),
    status: "draft",
    seoTitle: `${topic}怎麼做？AI 導入、SEO 與 GEO 實作指南`,
    seoDescription: `給${audience}的${topic}指南，說明導入流程、常見風險、內容架構與 GEO 可見度做法。`,
    excerpt: `這篇文章用企業實作角度拆解 ${topic}，協助團隊判斷從哪個流程開始、如何設定驗收指標，以及如何讓內容更容易被搜尋與 AI 回答引用。`,
    topic,
    audience,
    geoSummary: `${topic}應該以可索引的服務頁、案例、FAQ、結構化資料與內部連結支撐，並用具體流程、指標與限制條件回答使用者問題。`,
    body: `## 為什麼現在要處理 ${topic}
企業導入 AI 的關鍵不是模型名稱，而是把日常流程拆成可被 AI 協助的任務。${topic} 如果只停留在展示，很快會遇到資料來源不清、權限不明、輸出無法驗收的問題。

## 從一個高頻流程開始
建議先選擇重複性高、資料來源穩定、結果容易檢查的流程，例如客服問答、表單分類、銷售摘要、內部知識查詢或內容草稿。這類流程能快速驗證 AI 是否真的節省工時。

## GEO 內容要回答真實問題
如果目標是讓搜尋引擎與 AI 回答系統理解你的服務，文章需要直接回答使用者會問的問題：適合誰、需要哪些資料、導入多久、風險是什麼、如何衡量成效。這些答案應該放在頁面可見文字中，而不是只藏在圖片或簡報裡。

## 後台與審稿流程同樣重要
AI 產生的文章應該先進入草稿，由團隊審稿、補上案例與實際觀點，再發布。後台要保留狀態、SEO 摘要、FAQ、標籤與更新時間，讓內容能持續迭代。

## ALTOS LAB 的建議
先用兩週做 MVP：定義一個流程、整理資料、建立 AI 工作流、接上後台與追蹤指標。確認有效後，再擴展到更多部門與內容主題。`,
    keyTakeaways: [
      "AI 導入要從高頻、可驗收、資料穩定的流程開始。",
      "GEO 內容需要用可見文字回答真實問題，並搭配清楚的 FAQ 與結構化資料。",
      "AI 草稿不應直接發布，後台審稿與版本更新是長期成效的關鍵。"
    ],
    faqs: [
      {
        question: `${topic}適合哪些企業先做？`,
        answer:
          "適合已經有固定客服、銷售、營運或內容流程，而且能提供 SOP、FAQ、產品資料或歷史案例的企業。資料越清楚，AI 工作流越容易驗收。"
      },
      {
        question: "AI 產生的部落格可以直接發布嗎？",
        answer:
          "不建議。AI 草稿應該由團隊補上品牌觀點、案例、數據與限制條件，確認內容正確後再發布，避免產生空泛或不可信的文章。"
      },
      {
        question: "GEO 是否需要和 SEO 分開做？",
        answer:
          "不需要完全分開。GEO 應建立在 SEO 基礎上，重點是讓內容可爬取、可索引、可引用，並用結構清楚的頁面回答使用者問題。"
      }
    ],
    tags: ["AI 導入", "GEO", "SEO", "AI Agent", keyword].filter(Boolean),
    author: "ALTOS LAB",
    cover: "/geo-cover.png",
    generatedAt: nowIso(),
    generatedBy: "local-geo-template"
  });
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found");
  return JSON.parse(match[0]);
}

async function generateWithOpenAI(input: GenerateInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.2";
  const prompt = `Create a Traditional Chinese B2B blog draft for ALTOS LAB.

Topic: ${input.topic || "AI transformation"}
Primary keyword: ${input.keyword || input.topic || "AI"}
Audience: ${input.audience || "Taiwan business owners and operators"}
Search intent: ${input.intent || "learn and evaluate an AI implementation partner"}

Return only valid JSON with:
title, seoTitle, seoDescription, excerpt, topic, audience, geoSummary, body, keyTakeaways array, faqs array of {question, answer}, tags array.

Rules:
- Write for people first, not keyword stuffing.
- Explain concrete AI implementation decisions, constraints, metrics and next steps.
- Include clear answer-style paragraphs for generative search.
- Include 3-5 FAQs that match visible article content.
- Do not invent client names or unverifiable numbers.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 2200
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed: ${response.status}`);
  }

  const data = await response.json();
  const outputText =
    data.output_text ||
    data.output?.flatMap((item: any) => item.content || [])?.map((part: any) => part.text || "").join("") ||
    "";
  const generated = extractJson(outputText);

  return normalizeBlogPostInput({
    ...generated,
    slug: slugify(generated.title || input.topic || "ai-blog"),
    status: "draft",
    author: "ALTOS LAB",
    cover: "/geo-cover.png",
    generatedAt: nowIso(),
    generatedBy: model
  });
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as GenerateInput;

  try {
    const generated = (await generateWithOpenAI(input)) ?? fallbackDraft(input);
    return NextResponse.json({ post: generated });
  } catch (error) {
    const generated = fallbackDraft(input);
    return NextResponse.json({
      post: generated,
      warning: error instanceof Error ? error.message : "AI provider failed; used local template"
    });
  }
}
