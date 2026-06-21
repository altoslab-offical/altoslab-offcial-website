#!/usr/bin/env node

import http from "node:http";
import https from "node:https";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_TTFB_BUDGET_MS = Number(process.env.BLOG_PERF_TTFB_BUDGET_MS || "1200");
const DEFAULT_TOTAL_BUDGET_MS = Number(process.env.BLOG_PERF_TOTAL_BUDGET_MS || "1800");
const API_TTFB_BUDGET_MS = Number(process.env.BLOG_PERF_API_TTFB_BUDGET_MS || "900");

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const baseUrl = (arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

function requestText(path, redirectCount = 0) {
  const url = new URL(path, baseUrl);
  const client = url.protocol === "http:" ? http : https;
  const started = performance.now();

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        headers: { "User-Agent": "altos-blog-performance-smoke/1.0" },
        timeout: Number(process.env.BLOG_PERF_TIMEOUT_MS || "12000")
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location && redirectCount < 4) {
          res.resume();
          resolve(requestText(res.headers.location, redirectCount + 1));
          return;
        }

        const ttfbMs = performance.now() - started;
        let bytes = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          bytes += chunk.length;
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve({
            path,
            status: res.statusCode || 0,
            bytes,
            ttfbMs,
            totalMs: performance.now() - started,
            text: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error(`timeout after ${req.timeout}ms`)));
    req.on("error", reject);
    req.end();
  });
}

function articlePath(post) {
  const prefix = post.language === "zh-Hant" ? "" : `/${post.language}`;
  return `${prefix}/blog/${encodeURIComponent(post.slug)}`;
}

function budgetFor(path) {
  if (path.startsWith("/api/")) return { ttfbMs: API_TTFB_BUDGET_MS, totalMs: DEFAULT_TOTAL_BUDGET_MS };
  if (path.endsWith(".xml") || path.endsWith(".txt")) return { ttfbMs: API_TTFB_BUDGET_MS, totalMs: DEFAULT_TOTAL_BUDGET_MS };
  return { ttfbMs: DEFAULT_TTFB_BUDGET_MS, totalMs: DEFAULT_TOTAL_BUDGET_MS };
}

function validateResult(result) {
  const issues = [];
  const budget = budgetFor(result.path);
  if (result.status < 200 || result.status >= 400) issues.push(`status ${result.status}`);
  if (result.bytes < 300) issues.push(`too small (${result.bytes} bytes)`);
  if (result.ttfbMs > budget.ttfbMs) issues.push(`TTFB ${Math.round(result.ttfbMs)}ms > ${budget.ttfbMs}ms`);
  if (result.totalMs > budget.totalMs) issues.push(`total ${Math.round(result.totalMs)}ms > ${budget.totalMs}ms`);
  return issues;
}

async function main() {
  const inventory = await requestText("/api/blog?language=zh-Hant&limit=1&fields=inventory");
  const parsed = JSON.parse(inventory.text || "{}");
  const firstPost = Array.isArray(parsed.posts) ? parsed.posts.find((post) => post?.slug && post?.language) : null;
  const routes = [
    "/blog",
    "/api/blog?language=zh-Hant&limit=12&fields=inventory",
    firstPost ? articlePath(firstPost) : "/blog/openai-s-codex-can-now-watch-you-work-once-and-repeat-the-task-forever",
    "/feed.xml",
    "/llms.txt"
  ];

  const results = [];
  const errors = [];
  for (const route of routes) {
    const result = await requestText(route);
    const issues = validateResult(result);
    results.push({
      path: route,
      status: result.status,
      bytes: result.bytes,
      ttfbMs: Math.round(result.ttfbMs),
      totalMs: Math.round(result.totalMs),
      issues
    });
    if (issues.length) errors.push({ path: route, issues });
  }

  const payload = {
    ok: errors.length === 0,
    phase: "blog-performance-smoke",
    baseUrl,
    checkedAt: new Date().toISOString(),
    budgets: {
      defaultTtfbMs: DEFAULT_TTFB_BUDGET_MS,
      apiTtfbMs: API_TTFB_BUDGET_MS,
      totalMs: DEFAULT_TOTAL_BUDGET_MS
    },
    results,
    errors
  };
  console.log(JSON.stringify(payload, null, 2));
  if (errors.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
