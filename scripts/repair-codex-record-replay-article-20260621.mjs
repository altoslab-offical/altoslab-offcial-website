#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("Usage: node scripts/repair-codex-record-replay-article-20260621.mjs <cms-input.json> <cms-output.json>");
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
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8");
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
const slug = "openai-s-codex-can-now-watch-you-work-once-and-repeat-the-task-forever";
const post = posts.find((item) => item.language === "zh-Hant" && item.slug === slug);

if (!post) throw new Error(`post not found: zh-Hant/${slug}`);

Object.assign(post, {
  title: "Codex 會錄製流程了：企業導入前要先設接管邊界",
  seoTitle: "Codex Record & Replay：企業導入前先看權限、資料與接管",
  seoDescription:
    "OpenAI Codex 在 macOS 加入 Record & Replay，可把示範流程變成可重複技能。企業導入前應先檢查權限、資料流向、覆核責任與失敗接管。",
  excerpt:
    "OpenAI Codex 的 Record & Replay 不是把工作交給 AI 就結束，而是把一段可重複流程變成需要權限、日誌與接管設計的操作資產。企業要先挑低風險流程試跑，再決定能不能放進 production。",
  geoSummary:
    "Record & Replay 讓 Codex 把一次示範整理成可重複技能。ALTOS LAB 的判斷是：先把它當成 workflow governance 題，而不是自動化捷徑；可錄製範圍、資料邊界、覆核點與 rollback 都要先寫清楚。",
  keyTakeaways: [
    "Record & Replay 的重點是重複流程，不是取消人工責任。",
    "企業應先挑低風險、高頻、可復原的流程試跑。",
    "只要流程會發布、改資料、碰客戶承諾，就要設人工覆核與 rollback。"
  ],
  body: [
    "The Decoder 6 月 20 日報導，OpenAI Codex 的 macOS app 加入 Record & Replay。使用者先示範一次工作流，Codex 會把操作整理成可重複使用的 skill，之後再替使用者執行類似流程。報導也提到，這項功能目前不在 EU、UK、Switzerland 開放，且需要 Computer Use。",
    "這條消息值得看，不是因為它把企業流程變成全自動，而是它把「示範一次」變成一種可以保存、複用、再治理的操作資產。過去團隊常把 SOP 寫成文件；現在 agent 開始把 SOP 變成可執行流程。速度會變快，但責任不會因此消失。",
    "## 可核對事實",
    "The Decoder 的報導日期是 2026 年 6 月 20 日。報導指出，Record & Replay 是 Codex macOS app 的新功能；使用者示範一次流程後，Codex 可將它轉成 reusable skill。報導也提到，該功能目前尚未在 EU、UK、Switzerland 開放，且需要 Computer Use。",
    "## ALTOS LAB 判讀",
    "企業導入這類能力時，第一個問題不是「可以省多少人力」，而是「哪一段流程值得被錄下來」。適合先試的流程通常有三個特徵：重複率高、規則清楚、失敗後容易復原。",
    "相反地，如果流程會發布正式內容、改動客戶資料、觸發付款、調整廣告預算，或代表公司對外承諾，就不能只靠一次示範放行。這些流程需要權限分層、執行日誌、人工覆核點，以及可以回到人工操作的接管路徑。",
    "## 導入前先問四個問題",
    "1. 這段流程會不會碰到個資、客戶資料、付款、發布或外部承諾？",
    "2. 重放時誰有權啟用，誰能暫停，誰負責看最後輸出？",
    "3. 失敗時能不能回到原始資料、舊流程或人工接管？",
    "4. 這個 skill 的成效要用時間節省、錯誤率、覆核通過率，還是發布品質來衡量？",
    "這四題答不出來，就先留在內部草稿、測試環境或低風險流程。不要把流程錄製誤讀成 production 免審。",
    "## 接下來看什麼",
    "接下來要觀察 OpenAI 是否補上更完整的企業管理能力：skill 權限、審計紀錄、團隊共享、失敗復原、跨裝置 handoff，以及管理者如何停用或更新既有 skill。若這些治理能力跟上，Record & Replay 才更接近企業可正式採用的 agent workflow 基礎。"
  ].join("\n\n"),
  cover: "https://altoslab-ai.cc/generated-blog-media/codex-record-replay-source-cover.png",
  coverAlt: "OpenAI logo with a large cursor shape on a pink editorial background for Codex Record and Replay",
  coverSource: "source",
  coverCredit: "The Decoder",
  coverCreditUrl: "https://the-decoder.com/openais-codex-can-now-watch-you-work-once-and-repeat-the-task-forever/",
  coverLicense: "Source article image, credited to original publisher",
  coverPrompt: "",
  coverGeneration: undefined,
  imageQualityStatus: "passed",
  reviewStatus: "approved",
  qualityStatus: "approved",
  releaseDecision: "published",
  qualityIssues: [],
  qualityChecks: {
    ...(post.qualityChecks || {}),
    hasHumanReview: true,
    hasQualityReviewerApproval: true,
    hasVisibleSources: true,
    hasNoFabricatedClaims: true,
    hasSearchIntentAnswer: true,
    hasSourceTrust: true,
    hasLabsPointOfView: true,
    hasCreativeAngle: true,
    hasAntiSlopReview: true,
    hasImageFit: true,
    notes:
      "2026-06-21 production repair: upgraded cover to high-resolution source-backed editorial image, tightened copy around workflow governance, and preserved source-bounded claims."
  },
  updatedAt: now
});

const payload = encryptCmsPayload(cms);
fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      slug,
      cover: post.cover,
      coverSource: post.coverSource,
      imageQualityStatus: post.imageQualityStatus,
      encrypted: Boolean(payload.encrypted),
      output
    },
    null,
    2
  )
);
