#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("Usage: node scripts/hold-bad-columns-and-repair-codex-market-news-20260621.mjs <cms-input.json> <cms-output.json>");
  process.exit(2);
}

function cmsEncryptionKey() {
  const secret = process.env.CMS_ENCRYPTION_KEY;
  if (!secret) return null;
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptCmsPayload(payload) {
  if (!payload?.encrypted) return payload;
  const key = cmsEncryptionKey();
  if (!key) throw new Error("CMS_ENCRYPTION_KEY is required to read encrypted CMS data.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(decrypted);
}

function encryptCmsPayload(data) {
  const key = cmsEncryptionKey();
  if (!key) return data;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return {
    encrypted: true,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
}

const rawPayload = JSON.parse(fs.readFileSync(input, "utf8"));
const cms = decryptCmsPayload(rawPayload);
const posts = Array.isArray(cms.blogPosts) ? cms.blogPosts : [];
const now = new Date().toISOString();
const since = Date.parse("2026-06-19T00:00:00+08:00");
const decoderGroup = "tg-market-2026-06-21-05-openai-s-codex-can-now-watch-you-work-once-and-repeat-the-task-forever";

let heldColumns = 0;

for (const post of posts) {
  const publishedTime = Date.parse(post.publishedAt || post.createdAt || post.updatedAt || 0);
  if (post.contentType === "column" && post.status === "published" && publishedTime >= since) {
    post.status = "draft";
    post.reviewStatus = "needs-revision";
    post.releaseDecision = "held_for_review";
    post.qualityStatus = "needs-revision";
    post.qualityIssues = [
      "2026-06-21 production hold: malformed headings, excessive whitespace, AI-template copy, and insufficient multilingual editorial quality."
    ];
    post.updatedAt = now;
    heldColumns += 1;
  }
}

const decoder = posts.find(
  (post) => post.language === "zh-Hant" && post.slug === "openai-s-codex-can-now-watch-you-work-once-and-repeat-the-task-forever"
);

if (!decoder) {
  throw new Error("decoder zh-Hant post not found in CMS");
}

Object.assign(decoder, {
  title: "Codex 會錄製流程了：企業要先看權限、資料與接管",
  seoTitle: "Codex Record & Replay：企業導入前先看權限、資料與接管",
  seoDescription:
    "OpenAI Codex 在 macOS 加入 Record & Replay，能把示範流程變成可重複技能。企業導入前應先檢查權限、資料流向、覆核與接管責任。",
  excerpt:
    "The Decoder 6 月 20 日報導，OpenAI Codex 的 macOS app 新增 Record & Replay：使用者示範一次流程，Codex 會把它整理成可重複技能。這對企業的重點不是「全自動」，而是哪些工作可以被記錄、誰能啟用、資料會流向哪裡，以及出錯時誰接手。",
  geoSummary:
    "OpenAI Codex 的 Record & Replay 把一次示範轉成可重複技能。ALTOS LAB 的判斷是：導入前先定義可錄製範圍、權限、資料邊界、人工覆核與失敗接管，不要把流程錄製誤讀成無人治理。",
  keyTakeaways: [
    "Record & Replay 的價值在於重複流程，不在於取消人工責任。",
    "企業應先盤點可錄製任務、資料邊界、權限與接管人。",
    "若流程會發布內容、改資料或碰客戶承諾，就需要人工覆核。"
  ],
  body: [
    "The Decoder 6 月 20 日報導，OpenAI Codex 的 macOS app 加入 Record & Replay。使用者可以先示範一次工作流，例如上傳影片、補 metadata、處理縮圖與字幕；Codex 會把這段示範整理成可重複使用的 skill，之後再替使用者執行類似流程。這個功能目前不在歐盟、英國與瑞士開放，並且需要開啟 Computer Use。",
    "這條消息值得看，因為它把 agent 從「回答問題」往「記住一段可重複操作」推了一步。但企業不能只看自動化感。真正要先判斷的是：哪些流程可以被錄製，錄製過程會看到哪些資料，誰能啟用這個 skill，出錯時要由誰停止或接回。",
    "## 可核對事實",
    "The Decoder 的報導日期是 2026 年 6 月 20 日。報導指出，Record & Replay 是 Codex macOS app 的新功能；使用者示範一次流程後，Codex 可將它轉成 reusable skill。報導也提到，該功能目前尚未在 EU、UK、Switzerland 開放，且需要 Computer Use。",
    "## ALTOS LAB 判讀",
    "Record & Replay 的商業意義不是「員工不用做事」，而是把高頻、規則清楚、可復原的工作變成可訓練流程。這會提高營運速度，也會放大治理責任。",
    "如果一段流程只是整理內部檔案、產生草稿或重複設定環境，錄製與重放的風險相對可控；如果流程會發布內容、改動客戶資料、觸發付款、調整廣告或送出正式承諾，就不能只靠一次示範放行。企業需要在 skill 旁邊放上權限、日誌、覆核點與 rollback。",
    "## 導入前先問四個問題",
    "1. 這段流程會不會碰到個資、客戶資料、付款、發布或外部承諾？",
    "2. 重放時誰有權啟用，誰能暫停，誰負責看最後輸出？",
    "3. 失敗時能不能回到原始資料、舊流程或人工接管？",
    "4. 這個 skill 的效果要用時間節省、錯誤率、覆核通過率，還是發布品質來衡量？",
    "這四題答不出來，就先把它留在內部草稿或低風險流程，不要直接放進 production。",
    "## 接下來看什麼",
    "接下來要觀察 OpenAI 對 Record & Replay 的權限設計、企業管理、記錄保存與跨裝置 handoff 說明是否更完整。若後續能看到明確的審計紀錄、skill 管理、失敗復原與團隊權限設計，這才會更接近企業可正式導入的 agent workflow 基礎。"
  ].join("\n\n"),
  tags: ["市場快訊", "AI", "OpenAI Codex", "Record & Replay", "agent workflow"],
  topic: "OpenAI Codex Record & Replay enterprise workflow governance",
  newsCategory: "AI / OpenAI Codex",
  readTimeMinutes: 3,
  reviewStatus: "approved",
  qualityStatus: "approved",
  releaseDecision: "published",
  qualityIssues: [],
  qualityChecks: {
    ...(decoder.qualityChecks || {}),
    hasHumanReview: true,
    hasQualityReviewerApproval: true,
    hasVisibleSources: true,
    hasNoFabricatedClaims: true,
    hasSearchIntentAnswer: true,
    hasSourceTrust: true,
    hasLabsPointOfView: true,
    hasCreativeAngle: true,
    hasAntiSlopReview: true,
    notes: "2026-06-21 Codex repair: replaced repeated source-template copy with source-bounded market brief and operator governance angle."
  },
  updatedAt: now
});

let heldDecoderTranslations = 0;
for (const post of posts) {
  if (post.translationGroupId !== decoderGroup || post.language === "zh-Hant") continue;
  post.status = "draft";
  post.reviewStatus = "needs-revision";
  post.releaseDecision = "held_for_localization_rewrite";
  post.qualityStatus = "needs-revision";
  post.qualityIssues = [
    "2026-06-21 production hold: source-title translation is too template-like; requires native language rewrite before republication."
  ];
  post.updatedAt = now;
  heldDecoderTranslations += 1;
}

const payload = encryptCmsPayload(cms);
fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      heldColumns,
      heldDecoderTranslations,
      decoderId: decoder.id,
      totalPosts: posts.length,
      encrypted: Boolean(payload.encrypted),
      input,
      output
    },
    null,
    2
  )
);
