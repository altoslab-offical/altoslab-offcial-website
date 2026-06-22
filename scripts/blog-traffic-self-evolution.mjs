#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = process.env.ALTOS_BLOG_BASE_URL || "https://altoslab-ai.cc";
const HERMES_ROOT = process.env.HERMES_ROOT || "/Users/asdc163/LocalProjects/Hermes";

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) return process.argv[index + 1];
  return fallback;
}

function taiwanDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function runCommand(command, args, { cwd = process.cwd(), timeoutMs = 180_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      if (!settled) {
        settled = true;
        resolve({ code: 124, stdout, stderr: `${stderr}\ncommand timed out after ${timeoutMs}ms` });
      }
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function buildLearning({ date, baseUrl, reportPath, report }) {
  const ga4 = report.analytics?.ga4 || {};
  const searchConsole = report.analytics?.searchConsole || {};
  const apiReadable = ga4.ok === true && searchConsole.ok === true;
  const aiSessions = Number(ga4.aiSessions || 0);
  const aiReferralLandingEvents = Number(ga4.aiReferralLandingEvents || 0);
  return {
    schema: "hermes_official_blog_traffic_self_evolution_readback_v1",
    owner: "Hermes",
    researchDeputy: "OpenClaw",
    coachVerifier: "Codex",
    generatedAt: new Date().toISOString(),
    date,
    baseUrl,
    status: apiReadable ? "pass" : "action_required",
    ga4: {
      configured: ga4.configured === true,
      apiReadable: ga4.ok === true,
      propertyId: ga4.propertyId || "",
      totalSessions7d: Number(ga4.totalSessions || 0),
      aiReferralSessions7d: aiSessions,
      aiEngagedSessions7d: Number(ga4.aiEngagedSessions || 0),
      aiReferralLandingEvents7d: aiReferralLandingEvents,
      aiReferralEventReadback: ga4.aiReferralEventReadback || "",
      aiSources: ga4.aiSources || {},
      aiLandingPages: ga4.aiLandingPages || [],
      reason: ga4.reason || ""
    },
    searchConsole: {
      configured: searchConsole.configured === true,
      apiReadable: searchConsole.ok === true,
      siteUrl: searchConsole.site || "",
      totalClicks7d: Number(searchConsole.totalClicks || 0),
      totalImpressions7d: Number(searchConsole.totalImpressions || 0),
      blogClicks7d: Number(searchConsole.blogClicks || 0),
      blogImpressions7d: Number(searchConsole.blogImpressions || 0),
      reason: searchConsole.reason || ""
    },
    scores: {
      seo: report.scores?.seo,
      geo: report.scores?.geo
    },
    contentCoverage: {
      publishedPosts: report.content?.publishedPosts,
      completeGroups: report.content?.completeGroups,
      totalGroups: report.content?.translationGroups,
      incompleteGroups: Array.isArray(report.content?.incompleteGroups) ? report.content.incompleteGroups.length : 0
    },
    canOptimizeTopicSelectionFromTraffic: apiReadable,
    canClaimAiTrafficLift: aiSessions > 0 || aiReferralLandingEvents > 0,
    rule:
      "Use GA4 and Search Console readback to adjust future topic selection. Keep AI traffic lift claims blocked until identifiable AI referral sessions or ai_referral_landing events exist.",
    nextHermesRules: [
      "Prefer topics that produce Search Console impressions/clicks or GA engaged sessions over source-only novelty.",
      "Do not chase AI referral growth claims while AI sessions and ai_referral_landing events remain zero; optimize source clarity, titles, language coverage, and internal links first.",
      "Repair incomplete multilingual groups because GEO score is capped by language gaps."
    ],
    sourceReport: reportPath
  };
}

async function main() {
  const date = arg("date", taiwanDate());
  const baseUrl = String(arg("base-url", DEFAULT_BASE_URL)).replace(/\/+$/, "");
  const reportDir = path.join(process.cwd(), "data/blog-worker-runs/seo-geo-readback", date);
  const reportPath = path.join(reportDir, "seo-geo-report.json");
  await fs.mkdir(reportDir, { recursive: true });

  const reportRun = await runCommand(process.execPath, [
    "scripts/seo-geo-insight-report.mjs",
    "--base-url",
    baseUrl,
    "--format",
    "json",
    "--output",
    reportPath
  ]);
  if (reportRun.code !== 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "traffic-self-evolution",
          date,
          baseUrl,
          reportPath,
          stdout: reportRun.stdout,
          stderr: reportRun.stderr
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const learning = buildLearning({ date, baseUrl, reportPath, report });
  const hermesDir = path.join(HERMES_ROOT, "artifacts/ops-profile-shadow/learning/daily-self-evolution", date);
  const hermesPath = path.join(hermesDir, `official-blog-traffic-self-evolution-readback-${date}.json`);
  const latestPath = path.join(
    HERMES_ROOT,
    "artifacts/ops-profile-shadow/learning/daily-self-evolution/latest-official-blog-traffic-self-evolution-readback.json"
  );
  await fs.mkdir(hermesDir, { recursive: true });
  await fs.writeFile(hermesPath, `${JSON.stringify(learning, null, 2)}\n`, "utf8");
  await fs.writeFile(latestPath, `${JSON.stringify(learning, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: learning.status === "pass",
        phase: "traffic-self-evolution",
        date,
        baseUrl,
        reportPath,
        hermesPath,
        latestPath,
        status: learning.status,
        canOptimizeTopicSelectionFromTraffic: learning.canOptimizeTopicSelectionFromTraffic,
        canClaimAiTrafficLift: learning.canClaimAiTrafficLift,
        ga4: learning.ga4,
        searchConsole: learning.searchConsole,
        scores: learning.scores,
        contentCoverage: learning.contentCoverage
      },
      null,
      2
    )
  );
  process.exit(learning.status === "pass" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
