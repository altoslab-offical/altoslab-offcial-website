#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_COLUMN_TARGET = 9;
const MIN_CONTENT_IMAGES = 2;
const MIN_COLUMN_BODY_LENGTH = {
  "zh-Hant": 1800,
  en: 4500,
  ja: 1600,
  ko: 1600,
  id: 4200,
  vi: 3600,
  th: 2600,
  ms: 3800,
  fil: 3800
};

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function maybeReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[-#*_>`~=[\\\]+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publicCopyIssues(post) {
  const body = String(post?.bodyMarkdown || post?.body || "");
  const text = `${post?.title || ""}\n${post?.subtitle || ""}\n${body}`;
  const issues = [];
  if (/^###\s+/m.test(body)) issues.push("body contains ### or deeper headings");
  if (/```/.test(body)) issues.push("body contains code-fence artifacts");
  if (/\b(source-translation|SEO\/GEO|AI-generation|prompt|pipeline|rubric|quality gate|backend)\b/i.test(text)) {
    issues.push("public copy exposes backend/pipeline wording");
  }
  return issues;
}

function postsFromParsed(payload) {
  if (payload?.post && typeof payload.post === "object") return [payload.post];
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.articles)) return payload.articles.flatMap((article) => article.posts || []);
  return [];
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function taiwanDate(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(input);
}

async function latestColumnProductionDate() {
  const root = path.join(process.cwd(), "data/blog-backfill");
  const dates = (await fs.readdir(root).catch(() => []))
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort()
    .reverse();
  for (const date of dates) {
    if (await exists(path.join(root, date, "column-production"))) return date;
  }
  return taiwanDate();
}

async function liveColumnCount(baseUrl) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog?language=zh-Hant&limit=200`, {
    cache: "no-store",
    headers: { "User-Agent": "ALTOS-LAB-column-production-worklist/1.0" }
  });
  const json = await response.json().catch(() => ({}));
  const posts = Array.isArray(json.posts) ? json.posts : [];
  return posts.filter((post) => post.contentType === "column" || post.category === "專欄" || (post.tags || []).includes("市場專欄")).length;
}

async function envKeys() {
  const filePath = path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
      .filter(Boolean)
  );
}

function absoluteFromVisualDir(visualDir, filename) {
  return path.join(visualDir, filename);
}

function imageTemplate(raw, { sequence, kind, localPath }) {
  return {
    localPath,
    source: "generated",
    provider: String(raw?.provider || "OpenAI ChatGPT"),
    prompt: String(raw?.prompt || `Generate a 16:9 editorial visual for ALTOS LAB column sequence ${sequence}, ${kind}.`).trim(),
    generatedAt: String(raw?.generatedAt || ""),
    status: "generated",
    credit: String(raw?.credit || "ALTOS LAB 編輯視覺"),
    aspectRatio: String(raw?.aspectRatio || "16:9"),
    placement: String(raw?.placement || kind),
    alt: String(raw?.alt || `ALTOS LAB column sequence ${sequence} ${kind} visual`).trim(),
    caption: String(raw?.caption || "ALTOS LAB 編輯視覺").trim(),
    visualChecks: {
      topicFit: raw?.visualChecks?.topicFit === true,
      noTextArtifacts: raw?.visualChecks?.noTextArtifacts === true,
      noLogos: raw?.visualChecks?.noLogos === true,
      noPeople: raw?.visualChecks?.noPeople === true,
      noTrademarkRisk: raw?.visualChecks?.noTrademarkRisk === true,
      noGenericStockLook: raw?.visualChecks?.noGenericStockLook ?? true,
      noFakeUI: raw?.visualChecks?.noFakeUI ?? true,
      noBluePurpleAbstract: raw?.visualChecks?.noBluePurpleAbstract ?? true,
      checkedBy: String(raw?.visualChecks?.checkedBy || "codex-main-brain-image-qa"),
      checkedAt: String(raw?.visualChecks?.checkedAt || raw?.generatedAt || "")
    }
  };
}

async function analyzeSequence({ columnDir, visualDir, sequence, scaffoldBySequence }) {
  const sourcePath = path.join(columnDir, `column-seq-${sequence}-source.parsed.json`);
  const sourcePayload = await maybeReadJson(sourcePath);
  const sourcePosts = postsFromParsed(sourcePayload);
  const sourcePost = sourcePosts.find((post) => post.language === "zh-Hant") || sourcePosts[0] || null;
  const languages = new Set(sourcePosts.map((post) => post.language).filter(Boolean));
  const postsByLanguage = new Map(sourcePosts.map((post) => [post.language, post]).filter(([language]) => language));
  const localizedFiles = (await fs.readdir(columnDir)).filter(
    (file) => file.startsWith(`column-seq-${sequence}-localized-`) && file.endsWith(".json")
  );
  for (const file of localizedFiles) {
    const posts = postsFromParsed(await maybeReadJson(path.join(columnDir, file)));
    for (const post of posts) {
      if (post.language) languages.add(post.language);
      if (post.language) postsByLanguage.set(post.language, post);
    }
  }

  const visualFiles = (await fs.readdir(visualDir).catch(() => [])).filter(
    (file) => file.startsWith(`seq${sequence}-`) && /\.(png|jpe?g|webp)$/i.test(file)
  );
  const existingKinds = new Set(
    visualFiles.map((file) => {
      const match = file.match(/^seq\d+-(.+?)\.(png|jpe?g|webp)$/i);
      return match ? match[1] : file;
    })
  );
  const scaffold = scaffoldBySequence.get(sequence) || {};
  const scaffoldImages = Array.isArray(scaffold.contentImages) ? scaffold.contentImages : [];
  const requiredImageTemplates = scaffoldImages.slice(0, MIN_CONTENT_IMAGES);
  const missingAssets = [];
  if (!existingKinds.has("cover")) {
    missingAssets.push({
      kind: "cover",
      expectedLocalPath: absoluteFromVisualDir(visualDir, `seq${sequence}-cover.png`),
      prompt: scaffold.cover?.prompt || "",
      alt: scaffold.cover?.alt || `${sourcePost?.title || `Column ${sequence}`} cover`,
      caption: scaffold.cover?.caption || "ALTOS LAB 編輯視覺"
    });
  }
  for (const image of requiredImageTemplates) {
    const kind = String(image.placement || "content");
    if (!existingKinds.has(kind)) {
      missingAssets.push({
        kind,
        expectedLocalPath: absoluteFromVisualDir(visualDir, `seq${sequence}-${kind}.png`),
        prompt: image.prompt || "",
        alt: image.alt || `${sourcePost?.title || `Column ${sequence}`} ${kind} visual`,
        caption: image.caption || "ALTOS LAB 編輯視覺"
      });
    }
  }

  const contentImageFiles = visualFiles.filter((file) => !/cover/i.test(file));
  const missingLanguages = LANGUAGES.filter((language) => !languages.has(language));
  const bodyLengthIssues = LANGUAGES.flatMap((language) => {
    const post = postsByLanguage.get(language);
    const bodyLength = stripMarkdown(post?.bodyMarkdown || post?.body).length;
    const minLength = MIN_COLUMN_BODY_LENGTH[language] || 1600;
    return bodyLength >= minLength
      ? []
      : [
          {
            language,
            bodyLength,
            minLength,
            deficit: minLength - bodyLength
        }
      ];
  });
  const formattingIssues = LANGUAGES.flatMap((language) => {
    const post = postsByLanguage.get(language);
    return publicCopyIssues(post).map((issue) => ({ language, issue }));
  });
  const sourceBodyLength = stripMarkdown(sourcePost?.bodyMarkdown || sourcePost?.body).length;
  const sourceReady = Boolean(sourcePost?.language === "zh-Hant" && sourcePost?.title && sourceBodyLength >= 1200);
  const localizationReady = missingLanguages.length === 0;
  const visualReady = existingKinds.has("cover") && contentImageFiles.length >= MIN_CONTENT_IMAGES && contentImageFiles.length <= 3;

  return {
    sequence,
    title: sourcePost?.title || "",
    slug: sourcePost?.slug || "",
    sourcePath: path.relative(process.cwd(), sourcePath),
    sourceReady,
    sourceBodyLength,
    localizedFiles: localizedFiles.map((file) => path.relative(process.cwd(), path.join(columnDir, file))).sort(),
    languages: LANGUAGES.filter((language) => languages.has(language)),
    missingLanguages,
    bodyLengthIssues,
    existingVisualFiles: visualFiles.map((file) => path.relative(process.cwd(), path.join(visualDir, file))).sort(),
    coverReady: existingKinds.has("cover"),
    contentImageCount: contentImageFiles.length,
    requiredContentImages: MIN_CONTENT_IMAGES,
    visualReady,
    formattingIssues,
    mergeReady: sourceReady && localizationReady && bodyLengthIssues.length === 0 && formattingIssues.length === 0 && visualReady,
    missingAssets,
    visualsArticle: {
      sequence,
      cover: imageTemplate(scaffold.cover, {
        sequence,
        kind: "cover",
        localPath: absoluteFromVisualDir(visualDir, `seq${sequence}-cover.png`)
      }),
      contentImages: requiredImageTemplates.map((image) =>
        imageTemplate(image, {
          sequence,
          kind: image.placement || "content",
          localPath: absoluteFromVisualDir(visualDir, `seq${sequence}-${image.placement || "content"}.png`)
        })
      )
    }
  };
}

function commandBlock(lines) {
  return lines.join(" \\\n  ");
}

function buildCommands({ date, sequences, visualsFile }) {
  const seqList = sequences.join(",");
  const merge = commandBlock([
    "node scripts/merge-column-gemini-gpt.mjs",
    `--date ${date}`,
    `--sequences ${seqList}`,
    "--gemini-dir data/blog-backfill/2026-06-04/column-production",
    "--column-pack data/blog-backfill/2026-06-04/column-production-queue/column-source-packs-9-reviewed.json",
    `--visuals-file ${visualsFile}`,
    "--out-root data/blog-worker-runs"
  ]);
  const validate = `for s in ${sequences.join(" ")}; do
  seq=$(printf "%02d" "$s")
  slot=$([ $((s%2)) -eq 0 ] && echo afternoon || echo morning)
  dir="data/blog-worker-runs/${date}-backfill-\${seq}-column-manual"
  node scripts/blog-local-worker.mjs --article-set "$dir/article-set.json" --slot "$slot" --manifest "$dir/prepared-candidate.json" --approve-design-qa --validate-only
done`;
  const publish = `for s in ${sequences.join(" ")}; do
  seq=$(printf "%02d" "$s")
  slot=$([ $((s%2)) -eq 0 ] && echo afternoon || echo morning)
  dir="data/blog-worker-runs/${date}-backfill-\${seq}-column-manual"
  node scripts/blog-local-worker.mjs --article-set "$dir/article-set.json" --slot "$slot" --manifest "$dir/prepared-candidate.json" --approve-design-qa --publish --reuse-validated-manifest --allow-production --allow-column-burst
  node scripts/verify-blog-release.mjs --manifest "$dir/prepared-candidate.json"
done`;
  return { merge, validate, publish };
}

function markdownReport(report) {
  const lines = [];
  lines.push("# ALTOS LAB Column Production Worklist");
  lines.push("");
  lines.push(`Checked: ${report.checkedAt}`);
  lines.push(`Column production date: ${report.date}`);
  lines.push(`Live zh-Hant columns: ${report.liveColumnCount}/${report.columnTarget}`);
  lines.push(`Needed columns: ${report.neededColumns}`);
  lines.push("");
  lines.push("## Bottleneck");
  lines.push("");
  lines.push(report.bottleneck);
  lines.push("");
  lines.push("## Selected Sequences");
  lines.push("");
  for (const item of report.selected) {
    lines.push(`### seq${item.sequence} - ${item.title || "untitled"}`);
    lines.push(`- Source ready: ${item.sourceReady ? "yes" : "no"} (${item.sourceBodyLength} chars)`);
    lines.push(`- Languages ready: ${item.missingLanguages.length ? `no, missing ${item.missingLanguages.join(", ")}` : "yes"}`);
    lines.push(
      `- Length gate: ${
        item.bodyLengthIssues.length
          ? `no, short ${item.bodyLengthIssues.map((issue) => `${issue.language} -${issue.deficit}`).join(", ")}`
          : "yes"
      }`
    );
    lines.push(`- Visuals ready: ${item.visualReady ? "yes" : `no, missing ${item.missingAssets.map((asset) => asset.kind).join(", ")}`}`);
    lines.push(
      `- Public formatting: ${
        item.formattingIssues.length
          ? `no, ${item.formattingIssues.map((issue) => `${issue.language}: ${issue.issue}`).join("; ")}`
          : "yes"
      }`
    );
    for (const asset of item.missingAssets) {
      lines.push(`- Generate ${asset.kind}: ${asset.expectedLocalPath}`);
      lines.push(`  Prompt: ${asset.prompt}`);
    }
    lines.push("");
  }
  lines.push("## Commands After Missing Images Exist");
  lines.push("");
  lines.push(`Use ${report.expectedVisualsFile} as the generation work order.`);
  lines.push(`Create ${report.readyVisualsFile} only after the image files exist and visualChecks are true.`);
  lines.push("");
  lines.push("```bash");
  lines.push(report.commands.merge);
  lines.push("```");
  lines.push("");
  lines.push("```bash");
  lines.push(report.commands.validate);
  lines.push("```");
  lines.push("");
  lines.push("```bash");
  lines.push(report.commands.publish);
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const date = arg("date", await latestColumnProductionDate());
  const columnDir = path.join(process.cwd(), "data/blog-backfill", date, "column-production");
  const visualDir = path.join(columnDir, "visuals");
  if (!(await exists(columnDir))) {
    throw new Error(`column production directory not found: ${columnDir}`);
  }
  const sourceFiles = (await fs.readdir(columnDir))
    .map((file) => file.match(/^column-seq-(\d+)-source\.parsed\.json$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
  const requestedSequences = arg("sequences", "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item));
  const sequences = requestedSequences.length ? requestedSequences : sourceFiles;
  const scaffold = await maybeReadJson(path.join(columnDir, "column-visuals.scaffold.json"));
  const scaffoldBySequence = new Map(
    (Array.isArray(scaffold?.articles) ? scaffold.articles : [])
      .map((article) => [Number(article.sequence), article])
      .filter(([sequence]) => Number.isInteger(sequence))
  );
  const baseUrl = arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL);
  const columnTarget = Number(arg("column-target", String(DEFAULT_COLUMN_TARGET))) || DEFAULT_COLUMN_TARGET;
  const liveColumns = hasFlag("no-live") ? 0 : await liveColumnCount(baseUrl).catch(() => 0);
  const neededColumns = Math.max(0, Number(arg("needed", String(Math.max(0, columnTarget - liveColumns)))) || 0);
  const analyzed = [];
  for (const sequence of sequences) {
    analyzed.push(await analyzeSequence({ columnDir, visualDir, sequence, scaffoldBySequence }));
  }
  const candidates = analyzed.filter((item) => item.sourceReady && item.missingLanguages.length === 0 && !item.mergeReady);
  const selected = candidates.slice(0, neededColumns || candidates.length);
  const env = await envKeys();
  const readyVisualsFile = path.relative(process.cwd(), path.join(columnDir, `column-visuals-next-${selected.map((item) => item.sequence).join("-") || "none"}.ready.json`));
  const expectedVisualsFile = path.relative(process.cwd(), path.join(columnDir, `column-visuals-next-${selected.map((item) => item.sequence).join("-") || "none"}.expected.json`));
  const commands = buildCommands({ date, sequences: selected.map((item) => item.sequence), visualsFile: readyVisualsFile });
  const report = {
    ok: selected.length === 0 || selected.every((item) => item.mergeReady),
    checkedAt: new Date().toISOString(),
    date,
    baseUrl,
    columnTarget,
    liveColumnCount: liveColumns,
    neededColumns,
    bottleneck:
      selected.length > 0
        ? `Column candidates are blocked by ${selected.reduce((sum, item) => sum + item.bodyLengthIssues.length, 0)} text-length gaps, ${selected.reduce((sum, item) => sum + item.formattingIssues.length, 0)} public-formatting gaps, and ${selected.reduce((sum, item) => sum + item.missingAssets.length, 0)} GPT visual assets. Fix text in parallel workers, batch visuals once, then run merge/validate/publish.`
        : "No blocked column candidates selected.",
    headless: {
      antigravityCliForGeneration: false,
      geminiAuthConfigured: env.has("GEMINI_API_KEY") || env.has("GOOGLE_GENAI_USE_VERTEXAI") || env.has("GOOGLE_GENAI_USE_GCA"),
      openaiImageConfigured: env.has("OPENAI_API_KEY"),
      uploadStorageConfigured: env.has("GCS_BUCKET") || env.has("GOOGLE_CLOUD_PROJECT") || env.has("BLOB_READ_WRITE_TOKEN"),
      ingestConfigured: env.has("BLOG_INGEST_HMAC_SECRET")
    },
    selected,
    all: analyzed,
    expectedVisualsFile,
    readyVisualsFile,
    expectedVisualsPayload: { articles: selected.map((item) => item.visualsArticle) },
    commands
  };

  if (hasFlag("write")) {
    const outDir = path.resolve(arg("out-dir", path.join("data/blog-backfill", date, "column-production")));
    const slug = selected.map((item) => item.sequence).join("-") || "none";
    const jsonPath = path.join(outDir, `column-worklist-${slug}.json`);
    const mdPath = path.join(outDir, `column-worklist-${slug}.md`);
    const expectedVisualsPath = path.join(outDir, path.basename(expectedVisualsFile));
    await writeJson(jsonPath, report);
    await fs.writeFile(mdPath, markdownReport(report), "utf8");
    await writeJson(expectedVisualsPath, report.expectedVisualsPayload);
    report.written = {
      jsonPath: path.relative(process.cwd(), jsonPath),
      markdownPath: path.relative(process.cwd(), mdPath),
      expectedVisualsPath: path.relative(process.cwd(), expectedVisualsPath)
    };
  }

  if (arg("format", "json") === "text") {
    process.stdout.write(markdownReport(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
