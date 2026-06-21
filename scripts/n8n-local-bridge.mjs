#!/usr/bin/env node

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const ROOT_DIR =
  process.env.ALTOS_BLOG_WORKER_ROOT || "/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime";
const WORKER_URL = "https://altoslab-official-website.altoslab-ai.workers.dev";
const CUSTOM_DOMAIN_URL = "https://altoslab-ai.cc";
const HOST = process.env.ALTOS_N8N_BRIDGE_HOST || "127.0.0.1";
const PORT = Number(process.env.ALTOS_N8N_BRIDGE_PORT || "8797");
const MAX_OUTPUT_BYTES = Number(process.env.ALTOS_N8N_BRIDGE_MAX_OUTPUT_BYTES || "24000");
const LOG_DIR = path.join(ROOT_DIR, "data/n8n-local-runs");

let activeRun = null;

function parseEnvText(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnvFile(filePath) {
  try {
    return parseEnvText(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

const localBlogEnv = await loadEnvFile(path.join(process.env.HOME || "", ".altoslab-blog-worker.env"));
const localN8nEnv = await loadEnvFile(path.join(process.env.HOME || "", ".altoslab-n8n.env"));
const bridgeEnv = { ...process.env, ...localBlogEnv, ...localN8nEnv };
const bridgeToken = bridgeEnv.ALTOS_N8N_BRIDGE_TOKEN || "";
const DEFAULT_BASE_URL = bridgeEnv.ALTOS_BLOG_AUTOMATION_BASE_URL || CUSTOM_DOMAIN_URL;

function nodeCommand(scriptPath, args = []) {
  return [
    bridgeEnv.ALTOS_BLOG_NODE_BIN || process.execPath,
    [scriptPath, ...args]
  ];
}

function dateArgs(input = {}) {
  const date = typeof input.date === "string" ? input.date.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? ["--date", date] : [];
}

function slotArgs(input = {}, fallback = "morning") {
  const slot = typeof input.slot === "string" ? input.slot.trim() : "";
  return ["--slot", /^(morning|afternoon|evening)$/.test(slot) ? slot : fallback];
}

const jobs = {
  health: {
    timeoutMs: 45_000,
    command: () =>
      nodeCommand("scripts/aws-production-smoke.mjs", [
        "--base-url",
        DEFAULT_BASE_URL,
        "--expected-provider",
        "aws-s3"
      ])
  },
  "worker-smoke": {
    timeoutMs: 90_000,
    command: () => nodeCommand("scripts/cloudflare-smoke.mjs", ["--base-url", WORKER_URL])
  },
  "custom-domain-smoke": {
    timeoutMs: 90_000,
    command: () => nodeCommand("scripts/aws-production-smoke.mjs", ["--base-url", CUSTOM_DOMAIN_URL, "--expected-provider", "aws-s3"])
  },
  doctor: {
    timeoutMs: 90_000,
    command: () => nodeCommand("scripts/blog-sop-doctor.mjs", ["--base-url", DEFAULT_BASE_URL])
  },
  "ops-audit": {
    timeoutMs: 120_000,
    command: () => nodeCommand("scripts/blog-operations-audit.mjs", ["--base-url", DEFAULT_BASE_URL, "--format", "json"])
  },
  "seo-geo-report": {
    timeoutMs: 180_000,
    command: () => nodeCommand("scripts/seo-geo-insight-report.mjs", ["--base-url", DEFAULT_BASE_URL, "--format", "text"])
  },
  "column-prep": {
    timeoutMs: 600_000,
    command: (input) => nodeCommand("scripts/blog-scheduled-runner.mjs", [
      "--prep",
      ...dateArgs(input),
      ...slotArgs(input),
      "--base-url",
      DEFAULT_BASE_URL
    ])
  },
  "column-status": {
    timeoutMs: 120_000,
    command: (input) => nodeCommand("scripts/blog-scheduled-runner.mjs", [
      "--column-status",
      ...dateArgs(input),
      ...slotArgs(input),
      "--base-url",
      DEFAULT_BASE_URL,
      "--no-lock"
    ])
  },
  "column-validate": {
    timeoutMs: 600_000,
    command: (input) => nodeCommand("scripts/blog-scheduled-runner.mjs", [
      "--column-validate",
      ...dateArgs(input),
      ...slotArgs(input),
      "--base-url",
      DEFAULT_BASE_URL
    ])
  },
  "column-release": {
    timeoutMs: 600_000,
    command: (input) => nodeCommand("scripts/blog-scheduled-runner.mjs", [
      "--release",
      ...dateArgs(input),
      ...slotArgs(input),
      "--base-url",
      DEFAULT_BASE_URL,
      "--force-release"
    ])
  },
  "daily-closeout": {
    timeoutMs: 180_000,
    command: (input) => nodeCommand("scripts/blog-daily-closeout.mjs", [
      ...dateArgs(input),
      "--base-url",
      DEFAULT_BASE_URL
    ])
  },
  scheduled: {
    timeoutMs: 600_000,
    command: () => nodeCommand("scripts/blog-scheduled-runner.mjs", ["--scheduled", "--base-url", DEFAULT_BASE_URL])
  },
  "market-scan-validate": {
    timeoutMs: 600_000,
    env: {
      ALTOS_BLOG_MARKET_SCAN_VALIDATE_ONLY: "true",
      ALTOS_BLOG_MARKET_SCAN_CANDIDATE_PACKS: "1"
    },
    command: () => nodeCommand("scripts/blog-scheduled-runner.mjs", ["--market-scan", "--base-url", DEFAULT_BASE_URL, "--no-index"])
  },
  "market-scan": {
    timeoutMs: 600_000,
    command: () => nodeCommand("scripts/blog-scheduled-runner.mjs", ["--market-scan", "--base-url", DEFAULT_BASE_URL])
  }
};

function redact(value) {
  let next = String(value || "");
  for (const [key, secret] of Object.entries(bridgeEnv)) {
    if (!secret || secret.length < 12) continue;
    if (!/(SECRET|TOKEN|KEY|PASSWORD|COOKIE|SESSION|HMAC)/i.test(key)) continue;
    next = next.split(secret).join(`[redacted:${key}]`);
  }
  return next;
}

function truncate(value) {
  const text = redact(value);
  if (Buffer.byteLength(text, "utf8") <= MAX_OUTPUT_BYTES) return text;
  return `${text.slice(0, MAX_OUTPUT_BYTES)}\n[truncated]`;
}

function writeJson(response, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

function authorized(request) {
  if (!bridgeToken) return false;
  const header = request.headers["x-altos-n8n-token"];
  if (typeof header !== "string") return false;
  const left = Buffer.from(header);
  const right = Buffer.from(bridgeToken);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function runCommand(jobName, input = {}) {
  const job = jobs[jobName];
  const [command, args] = job.command(input);
  const startedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      env: {
        ...bridgeEnv,
        ...(job.env || {}),
        ALTOS_BLOG_BASE_URL: DEFAULT_BASE_URL
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, job.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_OUTPUT_BYTES * 2) stdout = stdout.slice(-MAX_OUTPUT_BYTES * 2);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > MAX_OUTPUT_BYTES * 2) stderr = stderr.slice(-MAX_OUTPUT_BYTES * 2);
    });
    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      const result = {
        ok: code === 0,
        job: jobName,
        code,
        signal,
        startedAt,
        finishedAt,
        stdout: truncate(stdout),
        stderr: truncate(stderr)
      };
      await fs.mkdir(LOG_DIR, { recursive: true });
      const stamp = finishedAt.replace(/[:.]/g, "-");
      await fs.writeFile(path.join(LOG_DIR, `${stamp}-${jobName}.json`), JSON.stringify(result, null, 2));
      resolve(result);
    });
    child.on("error", async (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        job: jobName,
        code: null,
        signal: null,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: truncate(stdout),
        stderr: truncate(`${stderr}\n${error.message}`)
      });
    });
  });
}

async function handleRun(request, response, jobName) {
  if (!authorized(request)) {
    writeJson(response, 401, { ok: false, error: "unauthorized" });
    return;
  }
  if (!jobs[jobName]) {
    writeJson(response, 404, { ok: false, error: "unknown job", jobs: Object.keys(jobs) });
    return;
  }
  const input = await readRequestBody(request);
  if (activeRun) {
    writeJson(response, 423, { ok: false, error: "bridge busy", activeRun });
    return;
  }
  activeRun = { job: jobName, startedAt: new Date().toISOString() };
  try {
    const result = await runCommand(jobName, input);
    writeJson(response, result.ok ? 200 : 500, result);
  } finally {
    activeRun = null;
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);
  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, {
      ok: true,
      service: "altos-n8n-local-bridge",
      root: ROOT_DIR,
      baseUrl: DEFAULT_BASE_URL,
      workerUrl: WORKER_URL,
      customDomainUrl: CUSTOM_DOMAIN_URL,
      jobs: Object.keys(jobs),
      tokenConfigured: Boolean(bridgeToken),
      activeRun
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/jobs") {
    writeJson(response, 200, { ok: true, jobs: Object.keys(jobs) });
    return;
  }
  const match = url.pathname.match(/^\/run\/([a-z0-9-]+)$/i);
  if (request.method === "POST" && match) {
    await handleRun(request, response, match[1]);
    return;
  }
  writeJson(response, 404, { ok: false, error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`ALTOS n8n local bridge listening on http://${HOST}:${PORT}`);
});
