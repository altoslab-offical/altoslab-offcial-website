#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_COLUMN_TARGET = 9;
const DAILY_COLUMN_MINIMUM = Number(process.env.ALTOS_BLOG_COLUMN_DAILY_LIMIT || "3");
const MARKET_NEWS_DAILY_MINIMUM = Number(process.env.ALTOS_BLOG_MARKET_NEWS_DAILY_MINIMUM || "8");
const REQUIRED_COLUMN_CONTENT_IMAGES = 2;
const COLUMN_BASELINE_POLICY = "advisory";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function taiwanParts(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(input)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function taiwanDate(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[-#*_>`~=[\\\]+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function postsFromParsed(payload) {
  if (payload?.post && typeof payload.post === "object") return [payload.post];
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.articles)) return payload.articles.flatMap((article) => article.posts || []);
  return [];
}

async function parsedPosts(filePath) {
  const payload = await maybeReadJson(filePath);
  return postsFromParsed(payload);
}

function candidatePath(date, slot, lane) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}-${lane}.json`);
}

function legacyCandidatePath(date, slot) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

function postTaiwanDate(post) {
  const timestamp = post?.publishedAt || post?.date || "";
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return taiwanDate(parsed);
}

function postContentDate(post) {
  const text = `${post?.translationGroupId || ""} ${post?.slug || ""}`;
  const match = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match?.[1] || postTaiwanDate(post);
}

async function liveCounts(baseUrl, date) {
  const rows = [];
  for (const language of LANGUAGES) {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog?fields=inventory&language=${encodeURIComponent(language)}&limit=600`, {
      cache: "no-store",
      headers: { "User-Agent": "ALTOS-LAB-blog-ops-audit/1.0" }
    });
    const json = await response.json().catch(() => ({}));
    const posts = Array.isArray(json.posts) ? json.posts : [];
    const breaking = posts.filter((post) => post.contentType === "breaking" || post.category === "市場快訊" || (post.tags || []).includes("市場快訊")).length;
    const todayBreaking = posts.filter((post) => (post.contentType === "breaking" || post.category === "市場快訊" || (post.tags || []).includes("市場快訊")) && postContentDate(post) === date).length;
    const columnPosts = posts.filter((post) => post.contentType === "column" || post.category === "專欄" || (post.tags || []).includes("市場專欄"));
    const column = columnPosts.length;
    const todayColumn = columnPosts.filter((post) => postContentDate(post) === date).length;
    rows.push({ language, total: posts.length, breaking, column, todayColumn, todayBreaking, todayPublished: todayColumn + todayBreaking });
  }
  return rows;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.ALTOS_BLOG_OPS_FETCH_TIMEOUT_MS || "15000"));
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "ALTOS-LAB-blog-ops-audit/1.0" }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function analyticsProbe(baseUrl) {
  const root = normalizeBaseUrl(baseUrl);
  const expectedGtmId = process.env.ALTOS_BLOG_EXPECTED_GTM_ID || "GTM-WJ96VR7V";
  const expectedGaId = process.env.ALTOS_BLOG_EXPECTED_GA_ID || "G-5VSLFNVD28";
  const pages = await Promise.all(
    [
      { key: "home", url: root },
      { key: "blog", url: `${root}/blog` }
    ].map(async (page) => {
      const result = await fetchText(page.url);
      const text = result.text || "";
      const hasGtm =
        text.includes(expectedGtmId) ||
        /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/ns\.html/i.test(text);
      const hasGa =
        text.includes(expectedGaId) ||
        /gtag\s*\(|google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/gtag\/js/i.test(text);
      return {
        ...page,
        ok: result.ok,
        status: result.status,
        hasGtm,
        hasGa,
        error: result.error || ""
      };
    })
  );
  const healthResult = await fetchText(`${root}/api/health`);
  let health = {};
  try {
    health = healthResult.text ? JSON.parse(healthResult.text) : {};
  } catch {
    health = {};
  }
  const integrations = health.integrations || {};
  const healthGtmConfigured = integrations.gtmConfigured === true || health.gtmConfigured === true;
  const healthGaConfigured = integrations.gaConfigured === true || health.gaConfigured === true;
  const ga4PropertyConfigured = integrations.ga4PropertyConfigured === true || health.ga4PropertyConfigured === true;
  const pagesHaveGtm = pages.every((page) => page.ok && page.hasGtm);
  const analyticsConfigured = healthGtmConfigured && (healthGaConfigured || ga4PropertyConfigured);
  const pagesHaveGaOrGtmBackedGa = pages.every((page) => page.ok && (page.hasGa || healthGaConfigured || ga4PropertyConfigured));
  return {
    checked: true,
    expectedGtmId,
    expectedGaId,
    ok: pagesHaveGtm && pagesHaveGaOrGtmBackedGa && analyticsConfigured,
    pages,
    health: {
      ok: healthResult.ok,
      status: healthResult.status,
      gtmConfigured: healthGtmConfigured,
      gaConfigured: healthGaConfigured,
      ga4PropertyConfigured
    }
  };
}

function launchAgentStatus() {
  if (process.platform !== "darwin") return { checked: false, reason: "non-macOS" };
  const uid = typeof process.getuid === "function" ? process.getuid() : "";
  const result = spawnSync("launchctl", ["print", `gui/${uid}/com.altoslab.blog-local-worker`], { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const lastExit = output.match(/last exit code = ([^\n]+)/)?.[1]?.trim() || "";
  const runs = output.match(/\nruns = ([^\n]+)/)?.[1]?.trim() || "";
  return {
    checked: true,
    loaded: result.status === 0,
    state: output.match(/\n\tstate = ([^\n]+)/)?.[1]?.trim() || "",
    runs: runs ? Number(runs) : null,
    lastExitCode: lastExit,
    triggers: [...output.matchAll(/"Hour" => (\d+)[\s\S]*?"Minute" => (\d+)/g)].map((match) => `${String(match[1]).padStart(2, "0")}:${String(match[2]).padStart(2, "0")}`)
  };
}

async function n8nLocalStatus() {
  const composePath = path.join(process.cwd(), "ops/n8n-local/docker-compose.yml");
  if (!(await exists(composePath))) return { checked: false, reason: "n8n compose file missing" };
  const result = spawnSync("docker", ["compose", "-f", composePath, "ps", "--format", "json"], { encoding: "utf8" });
  const output = `${result.stdout || ""}`.trim();
  const rows = output
    ? output
        .split(/\n+/)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];
  const serviceRunning = (name) =>
    rows.some((row) => row.Service === name && /running|up/i.test(`${row.State || ""} ${row.Status || ""}`));
  const bridge = await fetchText("http://127.0.0.1:8797/health");
  let bridgeJson = {};
  try {
    bridgeJson = bridge.text ? JSON.parse(bridge.text) : {};
  } catch {
    bridgeJson = {};
  }
  const n8nRunning = serviceRunning("n8n");
  const postgresRunning = serviceRunning("postgres");
  return {
    checked: true,
    ok: result.status === 0 && n8nRunning && postgresRunning && bridge.ok && bridgeJson.ok === true,
    composePath: path.relative(process.cwd(), composePath),
    n8nRunning,
    postgresRunning,
    bridgeOk: bridge.ok && bridgeJson.ok === true,
    bridgeStatus: bridge.status,
    services: rows.map((row) => ({ service: row.Service, state: row.State, status: row.Status, image: row.Image }))
  };
}

async function envFileKeys() {
  const filePath = path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  const keys = new Set();
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

async function headlessProviderStatus() {
  const keys = await envFileKeys();
  const hasKey = (key) => Boolean(process.env[key]) || keys.has(key);
  const geminiVersion = spawnSync("gemini", ["--version"], { encoding: "utf8" });
  const hermesStatus = spawnSync("hermes", ["status"], { encoding: "utf8", timeout: 10000 });
  const hermesOutput = `${hermesStatus.stdout || ""}${hermesStatus.stderr || ""}`;
  const openclawGateway = spawnSync("openclaw", ["gateway", "health"], { encoding: "utf8", timeout: 10000 });
  const openclawAudit = spawnSync("openclaw", ["tasks", "audit", "--json"], { encoding: "utf8", timeout: 10000 });
  let openclawAuditClean = false;
  try {
    const parsed = JSON.parse(openclawAudit.stdout || "{}");
    openclawAuditClean = parsed?.summary?.combined?.total === 0 || parsed?.count === 0;
  } catch {
    openclawAuditClean = false;
  }
  const hermesCodexConfigured =
    hermesStatus.status === 0 &&
    /Model:\s+gpt-5\.4/i.test(hermesOutput) &&
    /Provider:\s+OpenAI Codex/i.test(hermesOutput) &&
    /OpenAI Codex\s+✓ logged in/i.test(hermesOutput) &&
    /Status:\s+✓ running/i.test(hermesOutput);
  const openclawCodexConfigured = openclawGateway.status === 0 && /\bOK\b/i.test(openclawGateway.stdout || "") && openclawAuditClean;
  return {
    geminiCliInstalled: geminiVersion.status === 0,
    geminiAuthConfigured: hasKey("GEMINI_API_KEY") || hasKey("GOOGLE_GENAI_USE_VERTEXAI") || hasKey("GOOGLE_GENAI_USE_GCA"),
    openaiImageConfigured: hasKey("OPENAI_API_KEY"),
    uploadStorageConfigured: hasKey("BLOB_READ_WRITE_TOKEN") || hasKey("GCS_BUCKET") || hasKey("GOOGLE_CLOUD_PROJECT"),
    blogImageProviderConfigured: hasKey("BLOG_IMAGE_PROVIDER"),
    codexOperatorConfigured: hermesCodexConfigured && openclawCodexConfigured,
    hermesCodexConfigured,
    openclawCodexConfigured,
    openclawAuditClean
  };
}

async function candidateSummary(date) {
  const slots = ["morning", "afternoon", "evening"];
  const lanes = ["column", "market"];
  const rows = [];
  for (const slot of slots) {
    for (const lane of lanes) {
      const filePath = candidatePath(date, slot, lane);
      const candidate = await maybeReadJson(filePath);
      rows.push({
        slot,
        lane,
        path: path.relative(process.cwd(), filePath),
        exists: Boolean(candidate),
        status: candidate?.status || "",
        manifestPath: candidate?.manifestPath || "",
        translationGroupId: candidate?.translationGroupId || candidate?.ingestRunId || "",
        validateWouldPublish: candidate?.validateOnly?.wouldPublish === true,
        publishIds: candidate?.publish?.publishedIds?.length || 0,
        errors: candidate?.validateOnly?.errors || []
      });
    }
    const legacyPath = legacyCandidatePath(date, slot);
    const legacy = await maybeReadJson(legacyPath);
    if (legacy) {
      rows.push({
        slot,
        lane: "legacy",
        path: path.relative(process.cwd(), legacyPath),
        exists: true,
        status: legacy.status || "",
        manifestPath: legacy.manifestPath || "",
        translationGroupId: legacy.translationGroupId || legacy.ingestRunId || "",
        validateWouldPublish: legacy.validateOnly?.wouldPublish === true,
        publishIds: legacy.publish?.publishedIds?.length || 0,
        errors: legacy.validateOnly?.errors || []
      });
    }
  }
  return rows;
}

async function columnVisualGap(date) {
  let checkedDate = date;
  let columnDir = path.join(process.cwd(), "data/blog-backfill", checkedDate, "column-production");
  if (!(await exists(columnDir))) {
    const backfillRoot = path.join(process.cwd(), "data/blog-backfill");
    const dates = (await fs.readdir(backfillRoot).catch(() => []))
      .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort()
      .reverse();
    let fallback = "";
    for (const candidateDate of dates) {
      const candidateDir = path.join(backfillRoot, candidateDate, "column-production");
      const stat = await fs.stat(candidateDir).catch(() => null);
      if (stat?.isDirectory()) {
        fallback = candidateDate;
        break;
      }
    }
    if (fallback) {
      checkedDate = fallback;
      columnDir = path.join(backfillRoot, checkedDate, "column-production");
    }
  }
  if (!(await exists(columnDir))) return { checked: false, reason: "column-production directory missing" };
  const files = await fs.readdir(columnDir).catch(() => []);
  const sourceSequences = files
    .map((file) => file.match(/^column-seq-(\d+)-source\.parsed\.json$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
  const visualDir = path.join(columnDir, "visuals");
  const visualFiles = await fs.readdir(visualDir).catch(() => []);
  const scaffold = await maybeReadJson(path.join(columnDir, "column-visuals.scaffold.json"));
  const scaffoldBySequence = new Map(
    (Array.isArray(scaffold?.articles) ? scaffold.articles : [])
      .map((article) => [Number(article.sequence), article])
      .filter(([sequence]) => Number.isInteger(sequence))
  );
  const rows = [];
  for (const sequence of sourceSequences) {
    const sourcePath = path.join(columnDir, `column-seq-${sequence}-source.parsed.json`);
    const sourcePosts = await parsedPosts(sourcePath);
    const sourcePost = sourcePosts.find((post) => post.language === "zh-Hant") || sourcePosts[0] || null;
    const sourceBodyLength = stripMarkdown(sourcePost?.bodyMarkdown || sourcePost?.body).length;
    const sourceReady = Boolean(sourcePost?.language === "zh-Hant" && sourcePost?.title && sourceBodyLength >= 1200);
    const localizedFiles = files.filter((file) => file.startsWith(`column-seq-${sequence}-localized-`) && file.endsWith(".json"));
    const languages = new Set(sourcePosts.map((post) => post.language).filter(Boolean));
    for (const file of localizedFiles) {
      const posts = await parsedPosts(path.join(columnDir, file));
      for (const post of posts) {
        if (post.language) languages.add(post.language);
      }
    }
    const missingLanguages = LANGUAGES.filter((language) => !languages.has(language));
    const visualMatches = visualFiles.filter((file) => file.startsWith(`seq${sequence}-`) && /\.(png|jpe?g|webp)$/i.test(file));
    const hasCover = visualMatches.some((file) => /cover/i.test(file));
    const contentImageCount = visualMatches.filter((file) => !/cover/i.test(file)).length;
    const scaffoldItem = scaffoldBySequence.get(sequence) || {};
    const expectedContentImages = REQUIRED_COLUMN_CONTENT_IMAGES;
    const missingVisuals = [
      ...(hasCover ? [] : ["cover"]),
      ...Array.from({ length: Math.max(0, expectedContentImages - contentImageCount) }, (_, index) => `contentImage${contentImageCount + index + 1}`)
    ];
    const publishableVisuals = hasCover && contentImageCount >= REQUIRED_COLUMN_CONTENT_IMAGES && contentImageCount <= 3;
    const mergeReady = sourceReady && missingLanguages.length === 0 && publishableVisuals;
    rows.push({
      sequence,
      title: sourcePost?.title || "",
      sourceReady,
      sourceBodyLength,
      localizationFiles: localizedFiles.length,
      languages: LANGUAGES.filter((language) => languages.has(language)),
      missingLanguages,
      hasCover,
      contentImageCount,
      expectedContentImages,
      publishableVisuals,
      mergeReady,
      existingVisualFiles: visualMatches.map((file) => path.relative(process.cwd(), path.join(visualDir, file))).sort(),
      missingVisuals,
      blocker: mergeReady
        ? ""
        : [
            sourceReady ? "" : "source article is missing or too short",
            missingLanguages.length ? `missing languages: ${missingLanguages.join(", ")}` : "",
            publishableVisuals ? "" : `missing GPT visuals: ${missingVisuals.join(", ")}`
          ]
            .filter(Boolean)
            .join("; ")
    });
  }
  return { checked: true, date: checkedDate, rows };
}

function targetGaps(counts, columnTarget) {
  return counts.map((row) => ({
    language: row.language,
    breakingGap: 0,
    columnGap: Math.max(0, columnTarget - row.column)
  }));
}

function summarizeIssues({ counts, gaps, candidates, launchAgent, n8nLocal, visualGap, targets, analytics }) {
  const issues = [];
  const minTotal = Math.min(...counts.map((row) => row.total));
  const minColumn = Math.min(...counts.map((row) => row.column));
  const minTodayColumn = Math.min(...counts.map((row) => row.todayColumn || 0));
  const minTodayBreaking = Math.min(...counts.map((row) => row.todayBreaking || 0));
  const columnTarget = targets?.column || DEFAULT_COLUMN_TARGET;
  const strictColumnBaseline = targets?.columnBaselinePolicy === "hard";
  if (minTotal === 0) {
    issues.push("one or more configured languages have zero public posts; verify active CMS provider, public projection and DNS route before content generation or release");
  }
  if (strictColumnBaseline && gaps.some((gap) => gap.columnGap > 0)) issues.push(`columns below target: min column=${minColumn}`);
  if (minTodayColumn < DAILY_COLUMN_MINIMUM) {
    issues.push(`daily column minimum not met for ${targets?.date || "today"}: min todayColumn=${minTodayColumn}`);
  }
  if (minTodayBreaking < MARKET_NEWS_DAILY_MINIMUM) {
    issues.push(`market-news daily floor not met for ${targets?.date || "today"}: min todayBreaking=${minTodayBreaking}/${MARKET_NEWS_DAILY_MINIMUM}`);
  }
  const legacyMarket = candidates.find((candidate) => candidate.lane === "legacy" && /market/i.test(candidate.translationGroupId || ""));
  if (legacyMarket) issues.push(`legacy candidate index still contains market release: ${legacyMarket.path}`);
  if (n8nLocal?.checked && !n8nLocal.ok) issues.push("n8n local control plane is not healthy");
  if (!n8nLocal?.checked && launchAgent.checked && !launchAgent.loaded) issues.push("no active scheduler check passed");
  if (analytics?.checked && !analytics.ok) {
    const missing = analytics.pages
      .filter((page) => !page.ok || !page.hasGtm || (!page.hasGa && !analytics.health.gaConfigured && !analytics.health.ga4PropertyConfigured))
      .map((page) => `${page.key}:status=${page.status},gtm=${page.hasGtm},ga=${page.hasGa}`)
      .join("; ");
    issues.push(`GA/GTM monitoring needs attention: ${missing || "health integrations not configured"}`);
  }
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  if (strictColumnBaseline && minColumn < columnTarget && blockedVisuals.length) {
    issues.push(`column candidates blocked by visuals: ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`);
  }
  return issues;
}

function summarizeBottlenecks({ counts, gaps, candidates, launchAgent, n8nLocal, visualGap, targets, headlessProviders, analytics }) {
  const minBreaking = Math.min(...counts.map((row) => row.breaking));
  const minTotal = Math.min(...counts.map((row) => row.total));
  const minColumn = Math.min(...counts.map((row) => row.column));
  const minTodayColumn = Math.min(...counts.map((row) => row.todayColumn || 0));
  const minTodayBreaking = Math.min(...counts.map((row) => row.todayBreaking || 0));
  const columnTarget = targets?.column || DEFAULT_COLUMN_TARGET;
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  const readyMarketCandidates = candidates.filter((candidate) => candidate.exists && candidate.lane === "market" && candidate.status === "ready");
  const readyColumnCandidates = candidates.filter(
    (candidate) =>
      candidate.exists &&
      candidate.status === "ready" &&
      (candidate.lane === "column" || (candidate.lane === "legacy" && !/market/i.test(candidate.translationGroupId || "")))
  );
  const strictColumnBaseline = targets?.columnBaselinePolicy === "hard";
  const columnBaselineGap = minColumn < columnTarget;
  return [
    {
      lane: "market",
      status: minTotal === 0 ? "blocked" : minTodayBreaking < MARKET_NEWS_DAILY_MINIMUM ? "attention" : readyMarketCandidates.length ? "attention" : "stable",
      summary:
        minTotal === 0
          ? "at least one configured language has zero public posts; hold market scans until the active CMS projection is multilingual-complete"
          : minTodayBreaking < MARKET_NEWS_DAILY_MINIMUM
          ? `market-news floor is ${minTodayBreaking}/${MARKET_NEWS_DAILY_MINIMUM}; run market-fill and repair/replace held candidates until qualified source-backed items close the gap`
          : readyMarketCandidates.length
          ? `market news has ${readyMarketCandidates.length} ready candidate(s) waiting for release`
          : `market news count is ${minBreaking}/language; scheduled longform scans continue without a hard inventory cap`
    },
    {
      lane: "column",
      status: minTodayColumn < DAILY_COLUMN_MINIMUM ? "blocked" : strictColumnBaseline && columnBaselineGap ? "blocked" : "stable",
      summary:
        minTodayColumn < DAILY_COLUMN_MINIMUM
          ? `daily column missing for ${targets?.date || "today"}; todayColumn=${minTodayColumn}/language`
          : strictColumnBaseline && columnBaselineGap && blockedVisuals.length > 0
            ? `columns stuck at ${minColumn}/language because GPT visual evidence is missing for ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`
            : strictColumnBaseline && columnBaselineGap && readyColumnCandidates.length > 0
              ? `columns below target at ${minColumn}/language with ready candidates waiting for release`
              : strictColumnBaseline && columnBaselineGap
                ? `columns below target at ${minColumn}/language`
                : columnBaselineGap
                  ? `daily column met; historical column baseline is advisory at ${minColumn}/${columnTarget} per language`
                  : blockedVisuals.length > 0
                    ? `daily column met and baseline target met at ${minColumn}/language; next queued candidates need visuals: ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`
                    : `daily column met and baseline target met at ${minColumn}/language`
    },
    {
      lane: "automation",
      status: n8nLocal?.ok ? "stable" : "attention",
      summary: n8nLocal?.checked
        ? `n8nLocal=${n8nLocal.n8nRunning ? "running" : "down"}; postgres=${n8nLocal.postgresRunning ? "running" : "down"}; bridge=${n8nLocal.bridgeOk ? "ok" : "down"}`
        : `n8n local not checked: ${n8nLocal?.reason || "n/a"}; rollback LaunchAgent=${launchAgent.loaded ? "loaded" : "not loaded"}`
    },
    {
      lane: "analytics",
      status: analytics?.ok ? "stable" : "attention",
      summary: analytics?.checked
        ? `homeGtm=${analytics.pages.find((page) => page.key === "home")?.hasGtm ? "yes" : "no"}; blogGtm=${analytics.pages.find((page) => page.key === "blog")?.hasGtm ? "yes" : "no"}; homeGa=${analytics.pages.find((page) => page.key === "home")?.hasGa ? "yes" : "no"}; blogGa=${analytics.pages.find((page) => page.key === "blog")?.hasGa ? "yes" : "no"}; healthGtm=${analytics.health.gtmConfigured ? "yes" : "no"}; healthGa=${analytics.health.gaConfigured ? "yes" : "no"}; ga4Property=${analytics.health.ga4PropertyConfigured ? "yes" : "no"}`
        : "GA/GTM not checked"
    },
    {
      lane: "headless-ai",
      status:
        headlessProviders?.codexOperatorConfigured ||
        (headlessProviders?.geminiCliInstalled &&
          headlessProviders?.geminiAuthConfigured &&
          headlessProviders?.openaiImageConfigured &&
          headlessProviders?.uploadStorageConfigured)
          ? "stable"
          : "attention",
      summary: headlessProviders?.codexOperatorConfigured
        ? `codexOperator=stable; hermesCodex=${headlessProviders?.hermesCodexConfigured ? "configured" : "missing"}; openclawCodex=${headlessProviders?.openclawCodexConfigured ? "configured" : "missing"}; openclawAudit=${headlessProviders?.openclawAuditClean ? "clean" : "attention"}`
        : `geminiCli=${headlessProviders?.geminiCliInstalled ? "installed" : "missing"}; geminiAuth=${headlessProviders?.geminiAuthConfigured ? "configured" : "missing"}; openaiImage=${headlessProviders?.openaiImageConfigured ? "configured" : "missing"}; uploadStorage=${headlessProviders?.uploadStorageConfigured ? "configured" : "missing"}`
    }
  ];
}

function nextActions({ counts, gaps, visualGap, candidates, headlessProviders, analytics, targets }) {
  const actions = [];
  const minTotal = Math.min(...counts.map((row) => row.total));
  const columnGap = Math.max(...gaps.map((gap) => gap.columnGap));
  const minTodayColumn = Math.min(...counts.map((row) => row.todayColumn || 0));
  const minTodayBreaking = Math.min(...counts.map((row) => row.todayBreaking || 0));
  const strictColumnBaseline = targets?.columnBaselinePolicy === "hard";
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  const readyMarketCandidates = candidates.filter((candidate) => candidate.exists && candidate.lane === "market" && candidate.status === "ready");
  if (minTotal === 0) {
    actions.push("Repair the active CMS projection or DNS route before generating, backfilling or releasing content; do not treat a zero-language inventory as a content gap.");
    return actions;
  }
  if (readyMarketCandidates.length) {
    actions.push("Release or clear ready market candidates; do not leave /tmp-backed validate-only candidates in the production queue.");
  } else {
    actions.push("Keep market lane on scheduled no-Chrome longform scans; use --validate-only --no-index for tests so production candidates stay clean.");
  }
  if (analytics?.checked && !analytics.ok) {
    actions.push("Repair GA/GTM installation or /api/health analytics configuration before treating the daily operations report as clean.");
  }
  if (minTodayColumn < DAILY_COLUMN_MINIMUM) {
    actions.push(`Produce and release today's Codex/Hermes-approved daily column sets until ${DAILY_COLUMN_MINIMUM}/language is live; do not treat the baseline column count as satisfying the daily requirement.`);
  } else if (minTodayBreaking < MARKET_NEWS_DAILY_MINIMUM) {
    actions.push(`Run market-fill and repair or replace held candidates until at least ${MARKET_NEWS_DAILY_MINIMUM}/language source-backed market-news groups are live today; qualified items can continue beyond that floor.`);
  } else if (strictColumnBaseline && columnGap > 0 && blockedVisuals.length) {
    actions.push(`Produce GPT cover plus 2-3 content images for ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")} before column release.`);
    if (!headlessProviders?.openaiImageConfigured || !headlessProviders?.uploadStorageConfigured) {
      actions.push("To remove the Chrome bottleneck, configure a headless image provider plus upload storage; otherwise column visuals still require a controlled GPT browser session.");
    }
  } else if (strictColumnBaseline && columnGap > 0) {
    actions.push("Prepare/release enough Gemini-approved column sets to close the column target gap.");
  } else {
    const queued = blockedVisuals.map((row) => `seq${row.sequence}`).join(", ");
    actions.push(
      queued
        ? `Keep daily column minimum at ${DAILY_COLUMN_MINIMUM} approved column sets; next queued columns (${queued}) must wait for Codex/Hermes production evidence and visual readback before release.`
        : `Keep daily column minimum at ${DAILY_COLUMN_MINIMUM} approved column sets; additional columns still require Codex/Hermes production evidence plus visual readback.`
    );
  }
  return actions;
}

function textReport(report) {
  const lines = [];
  lines.push(`# ALTOS LAB Blog Operations Audit`);
  lines.push(`Checked: ${report.checkedAt}`);
  lines.push("");
  lines.push(
    `Targets: market news has no hard cap, published column baseline ${report.targets.column}/language (${report.targets.columnBaselinePolicy}), daily column minimum ${report.targets.dailyColumnMinimum} approved set(s), market-news daily floor ${report.targets.marketNewsDailyMinimum} complete set(s)`
  );
  lines.push("");
  lines.push("Live counts:");
  for (const row of report.counts) {
    lines.push(`- ${row.language}: total ${row.total}, breaking ${row.breaking}, column ${row.column}, todayColumn ${row.todayColumn || 0}, todayBreaking ${row.todayBreaking || 0}, todayPublished ${row.todayPublished || 0}`);
  }
  lines.push("");
  lines.push("Candidate indexes:");
  for (const row of report.candidates.filter((candidate) => candidate.exists)) {
    lines.push(`- ${row.path}: ${row.status || "unknown"} (${row.lane}, ${row.translationGroupId || "no group"})`);
  }
  lines.push("");
  lines.push(
    report.n8nLocal?.checked
      ? `n8n local: ${report.n8nLocal.ok ? "healthy" : "attention"}; n8n=${report.n8nLocal.n8nRunning ? "running" : "down"}; postgres=${report.n8nLocal.postgresRunning ? "running" : "down"}; bridge=${report.n8nLocal.bridgeOk ? "ok" : "down"}`
      : `n8n local: not checked (${report.n8nLocal?.reason || "n/a"}); rollback LaunchAgent=${report.launchAgent.loaded ? "loaded" : "not loaded"}`
  );
  lines.push("");
  if (report.analytics?.checked) {
    const home = report.analytics.pages.find((page) => page.key === "home") || {};
    const blog = report.analytics.pages.find((page) => page.key === "blog") || {};
    lines.push(
      `Analytics monitoring: homeGtm=${home.hasGtm ? "true" : "false"}, blogGtm=${blog.hasGtm ? "true" : "false"}, homeGa=${home.hasGa ? "true" : "false"}, blogGa=${blog.hasGa ? "true" : "false"}, healthGtm=${report.analytics.health.gtmConfigured ? "true" : "false"}, healthGa=${report.analytics.health.gaConfigured ? "true" : "false"}, ga4PropertyConfigured=${report.analytics.health.ga4PropertyConfigured ? "true" : "false"}`
    );
  }
  lines.push("");
  lines.push("Bottleneck summary:");
  for (const bottleneck of report.bottlenecks) {
    lines.push(`- ${bottleneck.lane}: ${bottleneck.status} - ${bottleneck.summary}`);
  }
  if (report.visualGap.checked) {
    lines.push("");
    lines.push(`Column visual gap (${report.visualGap.date || report.date}):`);
    for (const row of report.visualGap.rows.filter((item) => item.sourceReady && !item.publishableVisuals)) {
      lines.push(`- seq${row.sequence}: cover=${row.hasCover}, contentImages=${row.contentImageCount}, blocker=${row.blocker}`);
    }
  }
  lines.push("");
  lines.push(report.issues.length ? "Issues:" : "Issues: none");
  for (const issue of report.issues) lines.push(`- ${issue}`);
  lines.push("");
  lines.push("Next actions:");
  for (const action of report.nextActions) lines.push(`- ${action}`);
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-operations-audit.mjs [--base-url https://altoslab-ai.cc] [--date yyyy-mm-dd] [--format json|text]");
    return;
  }
  const date = arg("date", taiwanDate());
  const baseUrl = arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL);
  const columnTarget = Number(arg("column-target", String(DEFAULT_COLUMN_TARGET))) || DEFAULT_COLUMN_TARGET;
  const columnBaselinePolicy = hasFlag("strict-column-baseline") ? "hard" : COLUMN_BASELINE_POLICY;
  const counts = await liveCounts(baseUrl, date);
  const gaps = targetGaps(counts, columnTarget);
  const candidates = await candidateSummary(date);
  const launchAgent = launchAgentStatus();
  const n8nLocal = await n8nLocalStatus();
  const headlessProviders = await headlessProviderStatus();
  const visualGap = await columnVisualGap(date);
  const analytics = await analyticsProbe(baseUrl);
  const report = {
    ok:
      gaps.every((gap) => gap.breakingGap === 0 && (columnBaselinePolicy !== "hard" || gap.columnGap === 0)) &&
      counts.every((row) => (row.todayColumn || 0) >= DAILY_COLUMN_MINIMUM) &&
      counts.every((row) => (row.todayBreaking || 0) >= MARKET_NEWS_DAILY_MINIMUM) &&
      n8nLocal.ok === true &&
      analytics.ok === true,
    checkedAt: new Date().toISOString(),
    date,
    baseUrl,
    targets: { marketCap: null, column: columnTarget, columnBaselinePolicy, dailyColumnMinimum: DAILY_COLUMN_MINIMUM, marketNewsDailyMinimum: MARKET_NEWS_DAILY_MINIMUM, date },
    counts,
    gaps,
    candidates,
    launchAgent,
    n8nLocal,
    headlessProviders,
    visualGap,
    analytics,
    issues: [],
    bottlenecks: [],
    nextActions: []
  };
  report.issues = summarizeIssues(report);
  report.bottlenecks = summarizeBottlenecks(report);
  report.nextActions = nextActions(report);
  if (arg("format", "json") === "text") {
    process.stdout.write(textReport(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  if (!report.ok || report.issues.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
