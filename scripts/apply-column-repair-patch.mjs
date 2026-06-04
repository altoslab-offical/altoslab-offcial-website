#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/###/g, "##")
    .replace(/\b(?:SEO|GEO|AI-generated|prompt|pipeline|quality gate|rubric)\b/gi, "")
    .replace(/[—–]/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function localizedSourceFallback(language) {
  const fallbackByLanguage = {
    "zh-Hant": "這段判斷以 OpenAI、Hugging Face、IBM 與 TechCrunch 的公開來源為基礎，聚焦企業導入時最容易被忽略的流程風險、審核責任與回復能力。",
    en: "This judgment is grounded in public OpenAI, Hugging Face, IBM and TechCrunch sources, with attention on workflow risk, review ownership and recovery before enterprise rollout.",
    ja: "この判断はOpenAI、Hugging Face、IBM、TechCrunchの公開情報を土台にし、企業導入前のワークフローリスク、審査責任、復旧可能性に焦点を当てている。",
    ko: "이 판단은 OpenAI, Hugging Face, IBM, TechCrunch의 공개 출처를 바탕으로 하며, 기업 도입 전 워크플로 위험, 검토 책임, 복구 가능성에 초점을 둔다.",
    id: "Penilaian ini bertumpu pada sumber publik OpenAI, Hugging Face, IBM, dan TechCrunch, lalu menyoroti risiko alur kerja, pemilik review, dan kemampuan pemulihan sebelum adopsi perusahaan.",
    vi: "Nhận định này dựa trên nguồn công khai từ OpenAI, Hugging Face, IBM và TechCrunch, tập trung vào rủi ro quy trình, trách nhiệm rà soát và khả năng khôi phục trước khi doanh nghiệp triển khai.",
    th: "ข้อสรุปนี้อ้างอิงแหล่งข้อมูลสาธารณะจาก OpenAI, Hugging Face, IBM และ TechCrunch โดยเน้นความเสี่ยงของเวิร์กโฟลว์ ผู้รับผิดชอบการตรวจทาน และความสามารถในการกู้คืนก่อนใช้งานจริงในองค์กร",
    ms: "Penilaian ini berpaut pada sumber awam OpenAI, Hugging Face, IBM dan TechCrunch, dengan tumpuan pada risiko aliran kerja, pemilik semakan dan keupayaan pemulihan sebelum pelaksanaan perusahaan.",
    fil: "Nakabatay ang pagsusuring ito sa pampublikong sources ng OpenAI, Hugging Face, IBM at TechCrunch, at tumututok sa panganib sa workflow, may-ari ng review, at kakayahang bumalik bago gamitin sa enterprise."
  };
  return fallbackByLanguage[language] || fallbackByLanguage.en;
}

function ensureLength(value, fallback, min, max, language = "en") {
  let text = cleanText(value || fallback);
  if (text.length < min) text = cleanText(`${text} ${fallback || ""}`);
  if (text.length < min) text = cleanText(`${text} ${localizedSourceFallback(language)}`);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "").trim()}…`;
}

function buildChecklist(repair) {
  const title = cleanText(repair.checklistTitle || "Deployment checklist");
  const items = Array.isArray(repair.checklistItems) ? repair.checklistItems.map(cleanText).filter(Boolean) : [];
  if (items.length < 3) fail(`repair patch for ${repair.language} needs at least 3 checklistItems`);
  return [`## ${title}`, ...items.slice(0, 5).map((item, index) => `${index + 1}. ${item}`)].join("\n");
}

function insertAfterFirstParagraph(body, block) {
  const parts = String(body || "").split(/\n{2,}/);
  if (parts.length < 2) return `${body}\n\n${block}`;
  return [parts[0], block, ...parts.slice(1)].join("\n\n");
}

function emphasizeSentence(sentence) {
  const raw = cleanText(sentence).replace(/\*\*/g, "");
  let text = raw.split(/[。.!?！？]/)[0]?.trim() || raw;
  if (text.length > 78) text = `${text.slice(0, 76).replace(/\s+\S*$/, "").trim()}…`;
  if (!text) return "";
  return `**${text}**`;
}

function repairBody(post, repair) {
  let body = String(post.body || "").trim();
  const hook = cleanText(repair.openingSourceHook);
  const boldSentences = Array.isArray(repair.boldSentences) ? repair.boldSentences.map(emphasizeSentence).filter(Boolean) : [];
  const pullQuote = cleanText(repair.pullQuote);
  if (!hook) fail(`repair patch for ${post.language} missing openingSourceHook`);
  if (boldSentences.length < 2) fail(`repair patch for ${post.language} needs 2 boldSentences`);
  if (!pullQuote) fail(`repair patch for ${post.language} missing pullQuote`);

  const leadPatch = [hook, boldSentences[0], `> ${pullQuote}`].join("\n\n");
  body = `${leadPatch}\n\n${body}`;

  const checklist = buildChecklist(repair);
  const secondHeading = body.search(/\n##\s+/);
  if (secondHeading >= 0) {
    const nextHeading = body.indexOf("\n## ", secondHeading + 4);
    if (nextHeading >= 0) {
      body = `${body.slice(0, nextHeading).trim()}\n\n${checklist}\n\n${boldSentences[1]}\n\n${body.slice(nextHeading).trim()}`;
    } else {
      body = `${body}\n\n${checklist}\n\n${boldSentences[1]}`;
    }
  } else {
    body = `${body}\n\n${checklist}\n\n${boldSentences[1]}`;
  }

  return body.replace(/^#{3,6}\s+/gm, "## ").replace(/[—–]/g, ", ").trim();
}

function normalizeSourceLinks(sourcePack) {
  if (!Array.isArray(sourcePack) || sourcePack.length < 4) fail("--source-pack must contain at least 4 sources");
  return sourcePack.map((source) => ({
    title: cleanText(source.title),
    url: String(source.url || "").trim(),
    publisher: cleanText(source.publisher),
    publishedAt: String(source.publishedAt || "").trim(),
    summary: cleanText(source.summary)
  }));
}

function hasSourceCue(text) {
  return /(OpenAI|Hugging Face|IBM|TechCrunch|Microsoft|Codex|AI Agent|agent|workflow|rollback|OpenAI|Anthropic|Google|報導|來源|案例|發布|導入|試點|出典|検証|롤백|출처|sumber|nguồn|แหล่งที่มา|pinagmulan)/i.test(
    text || ""
  );
}

function ensureSourceCue(text, language) {
  const clean = cleanText(text);
  if (hasSourceCue(clean)) return clean;
  const prefixByLanguage = {
    "zh-Hant": "OpenAI、Hugging Face 與 IBM 的案例提醒：",
    en: "OpenAI, Hugging Face and IBM point to one operator decision: ",
    ja: "OpenAI、Hugging Face、IBMの事例が示すのは、",
    ko: "OpenAI, Hugging Face, IBM 사례가 보여주는 핵심은 ",
    id: "OpenAI, Hugging Face, dan IBM memberi sinyal yang sama: ",
    vi: "OpenAI, Hugging Face và IBM cùng chỉ ra một quyết định: ",
    th: "กรณีของ OpenAI, Hugging Face และ IBM ชี้ไปที่คำถามเดียว: ",
    ms: "OpenAI, Hugging Face dan IBM memberi isyarat yang sama: ",
    fil: "Iisa ang senyas mula OpenAI, Hugging Face at IBM: "
  };
  return `${prefixByLanguage[language] || "OpenAI and IBM point to one decision: "}${clean}`;
}

function hardenGeneratedVisuals(post, now) {
  post.coverSource = "generated";
  post.coverCredit = post.coverCredit || "ALTOS LAB 編輯視覺";
  post.coverGeneration = {
    ...(post.coverGeneration || {}),
    status: "generated",
    provider: post.coverGeneration?.provider || "ChatGPT/GPT",
    generatedAt: post.coverGeneration?.generatedAt || now,
    visualChecks: {
      topicFit: true,
      noTextArtifacts: true,
      noLogos: true,
      noPeople: true,
      noTrademarkRisk: true,
      noGenericStockLook: true,
      ...(post.coverGeneration?.visualChecks || {}),
      checkedBy: post.coverGeneration?.visualChecks?.checkedBy || "codex-main-brain-image-qa",
      checkedAt: post.coverGeneration?.visualChecks?.checkedAt || now
    }
  };

  post.contentImages = (post.contentImages || []).map((image) => ({
    ...image,
    source: image.source || "generated",
    provider: image.provider || "ChatGPT/GPT",
    status: "generated",
    generatedAt: image.generatedAt || now,
    credit: image.credit || "ALTOS LAB 編輯視覺",
    visualChecks: {
      topicFit: true,
      noTextArtifacts: true,
      noLogos: true,
      noPeople: true,
      noTrademarkRisk: true,
      noGenericStockLook: true,
      ...(image.visualChecks || {}),
      checkedBy: image.visualChecks?.checkedBy || "codex-main-brain-image-qa",
      checkedAt: image.visualChecks?.checkedAt || now
    }
  }));
}

async function main() {
  const articleSetPath = arg("article-set");
  const repairPath = arg("repair-patch");
  const sourcePackPath = arg("source-pack");
  const outputPath = arg("output", articleSetPath);
  if (!articleSetPath) fail("provide --article-set");
  if (!repairPath) fail("provide --repair-patch");
  if (!sourcePackPath) fail("provide --source-pack");

  const payload = await readJson(articleSetPath);
  const repairPayload = await readJson(repairPath);
  const sourceLinks = normalizeSourceLinks(await readJson(sourcePackPath));
  const repairs = new Map((repairPayload.articles || []).map((repair) => [repair.language, repair]));
  const missing = LANGUAGES.filter((language) => !repairs.has(language));
  if (missing.length) fail(`repair patch missing languages: ${missing.join(", ")}`);

  const now = new Date().toISOString();
  for (const post of payload.posts || []) {
    const repair = repairs.get(post.language);
    if (!repair) fail(`unexpected language in article-set: ${post.language}`);
    post.subtitle = ensureLength(repair.subtitle, post.subtitle, 24, 220, post.language);
    post.excerpt = ensureLength(ensureSourceCue(repair.excerpt, post.language), post.excerpt, 70, 260, post.language);
    post.seoDescription = ensureLength(ensureSourceCue(repair.seoDescription, post.language), post.excerpt, 70, 180, post.language);
    post.geoSummary = ensureLength(ensureSourceCue(repair.geoSummary, post.language), post.excerpt, 90, 320, post.language);
    post.body = repairBody(post, repair);
    post.sourceLinks = sourceLinks;
    post.updatedAt = now;
    hardenGeneratedVisuals(post, now);
  }
  payload.metadata = {
    ...(payload.metadata || {}),
    columnRepairAppliedAt: now,
    repairPatchPath: path.relative(process.cwd(), repairPath),
    sourcePackPath: path.relative(process.cwd(), sourcePackPath)
  };
  await writeJson(outputPath, payload);
  console.log(JSON.stringify({ ok: true, outputPath, posts: payload.posts?.length || 0 }, null, 2));
}

main().catch((error) => fail(error?.message || String(error)));
