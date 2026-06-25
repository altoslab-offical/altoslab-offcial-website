#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const ROOT_DIR =
  process.env.ALTOS_BLOG_WORKER_ROOT || "/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime";
const DEFAULT_BASE_URL = process.env.ALTOS_BLOG_BASE_URL || process.env.ALTOS_BLOG_AUTOMATION_BASE_URL || "https://altoslab-ai.cc";
const COLUMN_DAILY_TARGET = Number(process.env.ALTOS_BLOG_COLUMN_DAILY_LIMIT || "3");
const MARKET_NEWS_DAILY_MINIMUM = Number(process.env.ALTOS_BLOG_MARKET_NEWS_DAILY_MINIMUM || "8");
const COLUMN_MIN_SPACING_MINUTES = Number(process.env.ALTOS_BLOG_COLUMN_MIN_SPACING_MINUTES || "120");
const INVENTORY_LIMIT = Number(process.env.ALTOS_BLOG_DAILY_CLOSEOUT_INVENTORY_LIMIT || "200");
const COLUMN_SLOTS = (process.env.ALTOS_BLOG_COLUMN_SLOTS || "morning,afternoon,evening")
  .split(",")
  .map((slot) => slot.trim())
  .filter(Boolean);
const HERMES_ROOT = process.env.HERMES_ROOT || "/Users/asdc163/LocalProjects/Hermes";

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) return process.argv[index + 1];
  return fallback;
}

function taiwanDate(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(value);
}

function postTaiwanDate(post) {
  const raw = post?.publishedAt || post?.updatedAt || post?.createdAt || post?.date || "";
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return taiwanDate(date);
}

function postContentDate(post) {
  const text = `${post?.translationGroupId || ""} ${post?.slug || ""}`;
  const match = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match?.[1] || postTaiwanDate(post);
}

function postTaiwanMinutesOfDay(post) {
  const raw = post?.publishedAt || post?.updatedAt || post?.createdAt || post?.date || "";
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
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

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid JSON from ${url}: ${text.slice(0, 500)}`);
  }
}

async function fetchPostsByLanguage(baseUrl) {
  const result = {};
  for (const language of REQUIRED_LANGUAGES) {
    const payload = await fetchJson(
      `${baseUrl}/api/blog?language=${encodeURIComponent(language)}&fields=inventory&limit=${INVENTORY_LIMIT}`
    );
    result[language] = Array.isArray(payload.posts) ? payload.posts : [];
  }
  return result;
}

function groupCoverage(postsByLanguage, translationGroupId) {
  const present = [];
  const missing = [];
  for (const language of REQUIRED_LANGUAGES) {
    const posts = postsByLanguage[language] || [];
    const match = posts.find((post) => post.translationGroupId === translationGroupId && post.status !== "draft");
    if (match) present.push(language);
    else missing.push(language);
  }
  return { complete: missing.length === 0, present, missing };
}

function liveGroupByTranslationGroupId(postsByLanguage, translationGroupId) {
  if (!translationGroupId) return null;
  const zhMatch = (postsByLanguage["zh-Hant"] || []).find(
    (post) => post.translationGroupId === translationGroupId && post.status !== "draft"
  );
  if (!zhMatch) return null;
  return {
    translationGroupId,
    slug: zhMatch.slug,
    title: zhMatch.title,
    publishedAt: zhMatch.publishedAt || zhMatch.createdAt || "",
    contentType: zhMatch.contentType || "",
    coverage: groupCoverage(postsByLanguage, translationGroupId),
    matchedByCandidate: true
  };
}

function liveGroupsForDate(postsByLanguage, { date, contentType }) {
  const zhPosts = postsByLanguage["zh-Hant"] || [];
  const candidates = zhPosts.filter((post) => post.contentType === contentType && postContentDate(post) === date && post.translationGroupId);
  return candidates.map((post) => ({
    translationGroupId: post.translationGroupId,
    slug: post.slug,
    title: post.title,
    publishedAt: post.publishedAt || post.createdAt || "",
    taipeiMinutes: postTaiwanMinutesOfDay(post),
    coverage: groupCoverage(postsByLanguage, post.translationGroupId)
  }));
}

function candidateIndexPath(date, slot, lane) {
  return path.join(ROOT_DIR, "data/blog-prepared-candidates", `${date}-${slot}-${lane}.json`);
}

function legacyCandidateIndexPath(date, slot) {
  return path.join(ROOT_DIR, "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

async function resolveCandidateIndexPath(date, slot, lane) {
  const lanePath = candidateIndexPath(date, slot, lane);
  if (await exists(lanePath)) return lanePath;
  if (lane !== "column") return lanePath;
  const legacyPath = legacyCandidateIndexPath(date, slot);
  return (await exists(legacyPath)) ? legacyPath : lanePath;
}

async function summarizeCandidate(filePath) {
  const index = await readJsonIfExists(filePath);
  if (!index) return { exists: false, path: filePath };
  const manifestPath = index.manifestPath || filePath;
  const manifest = (await readJsonIfExists(manifestPath)) || index;
  const articleSetPath = manifest.articleSetPath ? path.resolve(manifest.articleSetPath) : "";
  const articleSetExists = articleSetPath ? await exists(articleSetPath) : false;
  return {
    exists: true,
    path: filePath,
    manifestPath,
    status: manifest.status || index.status || "unknown",
    slot: manifest.slot || index.slot || "",
    translationGroupId: manifest.translationGroupId || index.translationGroupId || "",
    articleSetPath,
    articleSetExists,
    validateOnly: manifest.validateOnly
      ? {
          wouldPublish: manifest.validateOnly.wouldPublish === true,
          errors: Array.isArray(manifest.validateOnly.errors) ? manifest.validateOnly.errors : []
        }
      : null,
    publish: manifest.publish
      ? {
          publishedIds: Array.isArray(manifest.publish.publishedIds) ? manifest.publish.publishedIds : []
        }
      : null,
    releaseVerification: manifest.releaseVerification
      ? {
          ok: manifest.releaseVerification.ok === true,
          errors: Array.isArray(manifest.releaseVerification.errors) ? manifest.releaseVerification.errors : [],
          warnings: Array.isArray(manifest.releaseVerification.warnings) ? manifest.releaseVerification.warnings : []
        }
      : null
  };
}

function bestCompleteGroup(groups) {
  return groups.find((group) => group.coverage.complete) || null;
}

function summarizeGroups(groups) {
  return groups.map((group) => ({
    translationGroupId: group.translationGroupId,
    slug: group.slug,
    title: group.title,
    publishedAt: group.publishedAt,
    taipeiMinutes: group.taipeiMinutes ?? null,
    languages: group.coverage.present,
    missingLanguages: group.coverage.missing
  }));
}

function columnSpacingStatus(groups) {
  const minutes = groups
    .map((group) => ({ slug: group.slug, title: group.title, minutes: group.taipeiMinutes }))
    .filter((item) => Number.isFinite(item.minutes))
    .sort((a, b) => a.minutes - b.minutes);
  const deltas = [];
  for (let index = 1; index < minutes.length; index += 1) {
    deltas.push({
      previousSlug: minutes[index - 1].slug,
      nextSlug: minutes[index].slug,
      minutes: minutes[index].minutes - minutes[index - 1].minutes
    });
  }
  const minDelta = deltas.length ? Math.min(...deltas.map((delta) => delta.minutes)) : null;
  return {
    checked: minutes.length >= 2,
    minimumRequiredMinutes: COLUMN_MIN_SPACING_MINUTES,
    minimumObservedMinutes: minDelta,
    ok: minutes.length < 2 || minDelta >= COLUMN_MIN_SPACING_MINUTES,
    deltas
  };
}

async function writeHermesCloseout(payload) {
  const date = payload.date || taiwanDate();
  const outDir = path.join(HERMES_ROOT, "artifacts/ops-profile-shadow/learning/daily-self-evolution", date);
  const outPath = path.join(outDir, `official-blog-daily-closeout-${date}.json`);
  const latestPath = path.join(HERMES_ROOT, "artifacts/ops-profile-shadow/learning/daily-self-evolution/latest-official-blog-daily-closeout.json");
  const completeColumns = payload.live?.dailyColumnCount || 0;
  const target = payload.live?.dailyColumnTarget || COLUMN_DAILY_TARGET;
  const marketOk = payload.live?.marketNews?.ok === true;
  const marketNewsDailyMinimum = payload.live?.marketNews?.dailyMinimum || MARKET_NEWS_DAILY_MINIMUM;
  const marketNewsCompleteGroups = payload.live?.marketNews?.completeCount || 0;
  const learning = {
    schema: "hermes_official_blog_daily_closeout_v1",
    owner: "Hermes",
    researchDeputy: "OpenClaw",
    coachVerifier: "Codex",
    generatedAt: new Date().toISOString(),
    date,
    baseUrl: payload.baseUrl,
    status: payload.ok ? "pass" : "action_required",
    dailyAutomation: {
      canClaimDailyPublishStable: payload.ok === true,
      columnTargetMet: completeColumns >= target,
      completeColumnGroups: completeColumns,
      columnDailyTarget: target,
      columnSpacingOk: payload.live?.dailyColumnSpacing?.ok === true,
      marketNewsComplete: marketOk,
      marketNewsMinimumMet: marketNewsCompleteGroups >= marketNewsDailyMinimum,
      marketNewsCompleteGroups,
      marketNewsDailyMinimum,
      dailyPublicationUpperCap: null,
      rule: "Stable daily publish requires live public inventory readback, complete language coverage, three spaced daily columns, at least eight complete market-news groups, no daily market-news upper cap, and repair-forward handling for held candidates."
    },
    trafficSelfEvolution: {
      canClaimTrafficOptimizedSelection: false,
      status: "requires_ga_gsc_metric_readback",
      rule: "Topic selection may learn from GA4/Search Console only after source readback is present; daily publish readiness must not fabricate traffic or revenue lift."
    },
    releaseEvidence: payload.live,
    localCandidateState: payload.localCandidates,
    errors: payload.errors || [],
    warnings: payload.warnings || [],
    actions: payload.actions || [],
    nextHermesRules: [
      "Before any release window, check public inventory so stale held candidates do not create false scheduler failures after the daily target is already met.",
      "Market news has no daily upper cap. Eight complete 9-language market-news groups is the minimum floor; qualified source-backed items should keep publishing beyond that floor.",
      "Held or low-quality market-news candidates must enter repair or source replacement until a qualified item publishes; do not treat quality hold as a healthy skip.",
      "Market news source images preserve the credited source image lane; near-standard source OG dimensions are acceptable when attribution and topic fit pass.",
      "Validated-only, held, or missing article-set candidates are repair signals, not completion."
    ]
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(learning, null, 2)}\n`, "utf8");
  await fs.mkdir(path.dirname(latestPath), { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(learning, null, 2)}\n`, "utf8");
  return { outPath, latestPath };
}

async function outputAndExit(payload) {
  if (hasFlag("write-hermes")) {
    try {
      payload.hermesWriteback = await writeHermesCloseout(payload);
    } catch (error) {
      payload.warnings = [
        ...(payload.warnings || []),
        `Hermes closeout writeback failed: ${error instanceof Error ? error.message : String(error)}`
      ];
    }
  }
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.ok ? 0 : 1);
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-daily-closeout.mjs [--date YYYY-MM-DD] [--base-url URL]");
    return;
  }

  const date = arg("date", taiwanDate());
  const baseUrl = normalizeBaseUrl(arg("base-url", DEFAULT_BASE_URL));
  const checkedAt = new Date().toISOString();
  const errors = [];
  const warnings = [];
  const actions = [];

  let postsByLanguage = {};
  try {
    postsByLanguage = await fetchPostsByLanguage(baseUrl);
  } catch (error) {
    await outputAndExit({
      ok: false,
      checkedAt,
      date,
      baseUrl,
      errors: [`public blog inventory fetch failed: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
      actions: ["Repair the public blog API or AWS production route before treating daily automation as healthy."]
    });
  }

  const columnCandidates = Object.fromEntries(
    await Promise.all(
      COLUMN_SLOTS.map(async (slot) => [slot, await summarizeCandidate(await resolveCandidateIndexPath(date, slot, "column"))])
    )
  );
  const marketCandidates = {
    morning: await summarizeCandidate(candidateIndexPath(date, "morning", "market")),
    afternoon: await summarizeCandidate(candidateIndexPath(date, "afternoon", "market"))
  };

  const columnGroups = liveGroupsForDate(postsByLanguage, { date, contentType: "column" });
  const marketGroups = liveGroupsForDate(postsByLanguage, { date, contentType: "breaking" });
  const completeColumns = columnGroups.filter((group) => group.coverage.complete);
  const completeMarketGroups = marketGroups.filter((group) => group.coverage.complete);
  const completeMarket = bestCompleteGroup(marketGroups);
  const columnSpacing = columnSpacingStatus(completeColumns);

  for (const [slot, columnCandidate] of Object.entries(columnCandidates)) {
    if (columnCandidate.status !== "released" || !columnCandidate.translationGroupId) continue;
    const fallbackColumn = liveGroupByTranslationGroupId(postsByLanguage, columnCandidate.translationGroupId);
    if (fallbackColumn?.contentType === "column" && fallbackColumn.coverage.complete) {
      if (!completeColumns.some((group) => group.translationGroupId === fallbackColumn.translationGroupId)) {
        completeColumns.push(fallbackColumn);
      }
      const liveDate = postTaiwanDate(fallbackColumn);
      warnings.push(
        liveDate && liveDate !== date
          ? `daily column ${slot} is live and complete via released candidate ${columnCandidate.translationGroupId}, but its public timestamp resolves to Taipei date ${liveDate}`
          : `daily column ${slot} is live and complete via released candidate ${columnCandidate.translationGroupId}`
      );
    }
  }

  if (completeColumns.length < COLUMN_DAILY_TARGET) {
    const missingLanguages = columnGroups.flatMap((group) => group.coverage.missing);
    const languageDetail = missingLanguages.length ? `; incomplete live groups missing ${[...new Set(missingLanguages)].join(", ")}` : "";
    errors.push(
      `daily columns are below target for ${date}: ${completeColumns.length}/${COLUMN_DAILY_TARGET} complete 9-language groups${languageDetail}`
    );
    const missingCandidateSlots = Object.entries(columnCandidates)
      .filter(([, candidate]) => !candidate.articleSetExists)
      .map(([slot]) => slot);
    if (missingCandidateSlots.length) {
      errors.push(
        `column article-set.json is missing for slot(s): ${missingCandidateSlots.join(", ")}; Gemini/GPT browser production has not produced every publishable candidate`
      );
      actions.push("Run the John-profile Gemini/GPT column production workbench for each missing slot, write article-set.json, then run /run/column-validate and /run/column-release.");
    } else {
      actions.push("Rerun /run/column-validate for the incomplete slots, fix validateOnly/design/image errors, then rerun /run/column-release.");
    }
  }

  if (completeColumns.length >= COLUMN_DAILY_TARGET && !columnSpacing.ok) {
    errors.push(
      `daily columns are not spaced enough for ${date}: minimum observed ${columnSpacing.minimumObservedMinutes} minutes, required ${COLUMN_MIN_SPACING_MINUTES} minutes`
    );
    actions.push("Keep the three daily column publish windows separated instead of clustering all columns into one traffic burst.");
  }

  if (completeMarketGroups.length < MARKET_NEWS_DAILY_MINIMUM) {
    const missingLanguages = marketGroups.flatMap((group) => group.coverage.missing);
    const languageDetail = missingLanguages.length ? `; incomplete live groups missing ${[...new Set(missingLanguages)].join(", ")}` : "";
    errors.push(
      `market-news lane is below the daily floor for ${date}: ${completeMarketGroups.length}/${MARKET_NEWS_DAILY_MINIMUM} complete 9-language groups${languageDetail}`
    );
    actions.push("Run /run/market-fill so Hermes/OpenClaw keep scanning, repairing, or replacing sources until at least eight complete market-news groups publish.");
  }

  const completePublicationCount = completeColumns.length + completeMarketGroups.length;

  if (marketCandidates.morning.status === "held" && marketCandidates.afternoon.status === "released") {
    warnings.push("morning market scan held, but afternoon market scan released a complete item");
  }

  await outputAndExit({
    ok: errors.length === 0,
    checkedAt,
    date,
    baseUrl,
    requiredLanguages: REQUIRED_LANGUAGES,
    live: {
      dailyColumnTarget: COLUMN_DAILY_TARGET,
      dailyColumnCount: completeColumns.length,
      dailyPublicationUpperCap: null,
      dailyPublicationCount: completePublicationCount,
      marketNewsDailyMinimum: MARKET_NEWS_DAILY_MINIMUM,
      dailyColumnSpacing: columnSpacing,
      dailyColumn: completeColumns[0]
        ? {
            ok: true,
            translationGroupId: completeColumns[0].translationGroupId,
            slug: completeColumns[0].slug,
            title: completeColumns[0].title,
            publishedAt: completeColumns[0].publishedAt,
            languages: completeColumns[0].coverage.present,
            matchedByCandidate: completeColumns[0].matchedByCandidate === true
          }
        : {
            ok: false,
            groups: summarizeGroups(columnGroups)
          },
      dailyColumns: summarizeGroups(completeColumns),
      marketNews: completeMarket
        ? {
            ok: completeMarketGroups.length >= MARKET_NEWS_DAILY_MINIMUM,
            dailyMinimum: MARKET_NEWS_DAILY_MINIMUM,
            completeCount: completeMarketGroups.length,
            noUpperCap: true,
            translationGroupId: completeMarket.translationGroupId,
            slug: completeMarket.slug,
            title: completeMarket.title,
            publishedAt: completeMarket.publishedAt,
            languages: completeMarket.coverage.present,
            completeGroups: summarizeGroups(completeMarketGroups)
          }
        : {
            ok: false,
            dailyMinimum: MARKET_NEWS_DAILY_MINIMUM,
            completeCount: completeMarketGroups.length,
            noUpperCap: true,
            groups: summarizeGroups(marketGroups)
          }
    },
    localCandidates: {
      column: columnCandidates,
      market: marketCandidates
    },
    errors,
    warnings,
    actions
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
