#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_PROJECT_ID = "project-e688c018-aec3-4815-891";
const DEFAULT_REGION = "us-central1";
const DEFAULT_SERVICE = "altoslab-official-website";
const DEFAULT_EXPECTED_BUCKET = "altoslab-official-cms-934551798702";
const DEFAULT_GCLOUD_ACCOUNT = "altoslab.offical@gmail.com";
const DEFAULT_CMS_PATH = "cms/altoslab-cms-v1.json";
const DEFAULT_MEDIA_PREFIX = "blog-generated";
const DEFAULT_TIMEOUT_MS = 90_000;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function taiwanStamp(input = new Date()) {
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

function stampForFile(input = new Date()) {
  const parts = taiwanStamp(input);
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadEnvFileIfPresent() {
  const envFile = arg("env-file") || path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  if (!envFile || !(await exists(envFile))) return { envFile, loaded: false };
  const raw = await fs.readFile(envFile, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return { envFile, loaded: true };
}

function runCommand(command, args, { cwd = process.cwd(), env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => {
          stderr += `\ncommand timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`;
          child.kill("SIGTERM");
          finish({ code: 124, stdout, stderr, timedOut: true });
        }, timeoutMs)
      : null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => finish({ code: code ?? 1, stdout, stderr }));
  });
}

async function fetchJson(url, { timeoutMs = 18_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "altos-blog-production-repair/1.0"
      },
      cache: "no-store",
      signal: controller.signal
    });
    const json = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : String(error), json: null };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(raw) {
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizeError(text = "") {
  return String(text)
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "<redacted-token>")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer <redacted-token>")
    .trim()
    .slice(0, 1200);
}

function envMapFromService(service) {
  const envItems = service?.spec?.template?.spec?.containers?.[0]?.env || [];
  const map = {};
  for (const item of envItems) {
    if (!item?.name) continue;
    if (item.valueFrom) {
      map[item.name] = { fromSecret: true };
    } else {
      map[item.name] = { value: item.value ?? "" };
    }
  }
  return map;
}

function summarizeRuntimeEnv(service) {
  const env = envMapFromService(service);
  return {
    GCS_STORAGE_ENABLED: env.GCS_STORAGE_ENABLED?.value || "",
    GCS_BUCKET: env.GCS_BUCKET?.value || "",
    GCS_CMS_PATH: env.GCS_CMS_PATH?.value || "",
    GCS_MEDIA_PREFIX: env.GCS_MEDIA_PREFIX?.value || "",
    CLOUDFLARE_KV_ENABLED: env.CLOUDFLARE_KV_ENABLED?.value || "",
    CLOUDFLARE_R2_ENABLED: env.CLOUDFLARE_R2_ENABLED?.value || "",
    secretKeys: Object.entries(env)
      .filter(([, value]) => value?.fromSecret)
      .map(([key]) => key)
      .sort()
  };
}

async function listGcloudAccounts() {
  const configured =
    arg("gcloud-account") ||
    process.env.ALTOS_PRODUCTION_GCLOUD_ACCOUNT ||
    process.env.ALTOS_GOOGLE_OPERATOR_ACCOUNT ||
    DEFAULT_GCLOUD_ACCOUNT;
  const accounts = [configured].filter(Boolean);
  const result = await runCommand("gcloud", ["auth", "list", "--format=json"], { timeoutMs: 12_000 });
  const parsed = parseJson(result.stdout);
  if (hasFlag("try-all-gcloud-accounts") && Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item?.account && !accounts.includes(item.account)) accounts.push(item.account);
    }
  }
  return {
    accounts,
    listResult: {
      ok: result.code === 0,
      code: result.code,
      stderr: sanitizeError(result.stderr)
    }
  };
}

async function findDeployableAccount({ projectId, region, service }) {
  const { accounts, listResult } = await listGcloudAccounts();
  const impersonateServiceAccount = process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT || "";
  const attempts = [];
  for (const account of accounts) {
    for (const impersonate of ["", impersonateServiceAccount].filter((value, index, list) => value || index === 0).filter((value, index, list) => list.indexOf(value) === index)) {
      const env = { ...process.env, CLOUDSDK_CORE_ACCOUNT: account };
      const globalArgs = impersonate ? [`--impersonate-service-account=${impersonate}`] : [];
      const result = await runCommand("gcloud", [
        ...globalArgs,
        "run",
        "services",
        "describe",
        service,
        "--region",
        region,
        "--project",
        projectId,
        "--format=json"
      ], { env, timeoutMs: 20_000 });
      const parsed = parseJson(result.stdout);
      const attempt = {
        account,
        impersonate: impersonate || "",
        ok: result.code === 0 && Boolean(parsed?.metadata?.name),
        code: result.code,
        stderr: sanitizeError(result.stderr)
      };
      if (attempt.ok) {
        return { account, impersonate, service: parsed, attempts: [...attempts, attempt], listResult };
      }
      attempts.push(attempt);
    }
  }
  return { account: "", impersonate: "", service: null, attempts, listResult };
}

function buildUpdateEnvVars({ expectedBucket, cmsPath, mediaPrefix }) {
  return [
    "GCS_STORAGE_ENABLED=1",
    `GCS_BUCKET=${expectedBucket}`,
    `GCS_CMS_PATH=${cmsPath}`,
    `GCS_MEDIA_PREFIX=${mediaPrefix}`,
    "CLOUDFLARE_KV_ENABLED=0",
    "CLOUDFLARE_R2_ENABLED=0"
  ];
}

async function pollProduction({ baseUrl, expectedBucket, attempts = 6 }) {
  const checks = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const suffix = `repairCheck=${Date.now()}-${attempt}`;
    const health = await fetchJson(`${baseUrl}/api/health?${suffix}`);
    const blog = await fetchJson(`${baseUrl}/api/blog?limit=1&${suffix}`);
    const bucket = health.json?.cmsStorage?.bucket || "";
    const provider = health.json?.cmsStorage?.provider || "";
    const postCount = Array.isArray(blog.json?.posts) ? blog.json.posts.length : null;
    const check = {
      attempt,
      healthOk: health.ok && health.json?.ok === true,
      provider,
      bucket,
      postCount,
      checkedAt: new Date().toISOString()
    };
    checks.push(check);
    if (check.healthOk && provider === "gcs" && bucket === expectedBucket && Number(postCount) > 0) break;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  return checks;
}

async function writeReport(report) {
  const outArg = arg("out");
  const outPath = outArg || path.join(
    process.cwd(),
    "data/blog-repair",
    `production-cms-gcs-repair-${stampForFile(new Date())}.json`
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify({ ...report, reportPath: outPath }, null, 2)}\n`, "utf8");
  return outPath;
}

async function printReport(report) {
  await new Promise((resolve) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`, resolve);
  });
}

async function finish(report, code = 0) {
  await printReport(report);
  if (code !== 0) process.exit(code);
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log(`
Usage:
  node scripts/blog-production-repair.mjs --base-url https://altoslab-ai.cc
  node scripts/blog-production-repair.mjs --apply

Repairs only production Cloud Run CMS/GCS runtime env drift. It never generates,
backfills, rewrites, or publishes blog content.
`);
    return;
  }

  const envFile = await loadEnvFileIfPresent();
  const baseUrl = (arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const projectId = arg("project") || process.env.GCP_PROJECT_ID || DEFAULT_PROJECT_ID;
  const region = arg("region") || process.env.GCP_REGION || DEFAULT_REGION;
  const service = arg("service") || process.env.GCP_CLOUD_RUN_SERVICE || DEFAULT_SERVICE;
  const expectedBucket = arg("expected-bucket") || process.env.ALTOS_EXPECTED_GCS_BUCKET || DEFAULT_EXPECTED_BUCKET;
  const cmsPath = arg("cms-path") || process.env.GCS_CMS_PATH || DEFAULT_CMS_PATH;
  const mediaPrefix = arg("media-prefix") || process.env.GCS_MEDIA_PREFIX || DEFAULT_MEDIA_PREFIX;
  const apply = hasFlag("apply");

  const healthBefore = await fetchJson(`${baseUrl}/api/health?repairCheck=${Date.now()}`);
  const blogBefore = await fetchJson(`${baseUrl}/api/blog?limit=1&repairCheck=${Date.now()}`);
  const publicPostCountBefore = Array.isArray(blogBefore.json?.posts) ? blogBefore.json.posts.length : null;
  const publicBucketBefore = healthBefore.json?.cmsStorage?.bucket || "";
  const publicProviderBefore = healthBefore.json?.cmsStorage?.provider || "";
  const publicDrift =
    publicProviderBefore !== "gcs" ||
    publicBucketBefore !== expectedBucket ||
    publicPostCountBefore === 0;

  const deployable = await findDeployableAccount({ projectId, region, service });
  const serviceEnvBefore = deployable.service ? summarizeRuntimeEnv(deployable.service) : null;
  const serviceDrift = Boolean(
    serviceEnvBefore &&
      (serviceEnvBefore.GCS_STORAGE_ENABLED !== "1" ||
        serviceEnvBefore.GCS_BUCKET !== expectedBucket ||
        serviceEnvBefore.GCS_CMS_PATH !== cmsPath ||
        serviceEnvBefore.GCS_MEDIA_PREFIX !== mediaPrefix ||
        serviceEnvBefore.CLOUDFLARE_KV_ENABLED !== "0" ||
        serviceEnvBefore.CLOUDFLARE_R2_ENABLED !== "0")
  );

  const report = {
    ok: false,
    phase: "blog-production-repair",
    checkedAt: new Date().toISOString(),
    baseUrl,
    target: { projectId, region, service, expectedBucket, cmsPath, mediaPrefix },
    envFile,
    apply,
    before: {
      healthOk: healthBefore.ok && healthBefore.json?.ok === true,
      cmsProvider: publicProviderBefore,
      bucket: publicBucketBefore,
      publicPostCount: publicPostCountBefore,
      serviceEnv: serviceEnvBefore
    },
    gcloud: {
      selectedAccount: deployable.account || "",
      impersonateServiceAccount: deployable.impersonate || "",
      authListOk: deployable.listResult.ok,
      attempts: deployable.attempts
    },
    action: {
      needed: publicDrift || serviceDrift,
      applied: false,
      reason: ""
    },
    after: null,
    errors: [],
    warnings: []
  };

  if (!report.action.needed) {
    report.ok = true;
    report.action.reason = "production CMS/GCS runtime already matches expected contract";
    report.after = report.before;
    report.reportPath = await writeReport(report);
    await finish(report);
    return;
  }

  if (!deployable.account || !deployable.service) {
    report.action.reason = "gcloud credentials unavailable or lack Cloud Run service read permission";
    report.errors.push(
      "Cannot auto-repair Cloud Run env without a valid local GCP account that has run.services.get and run.services.update on the production service."
    );
    report.reportPath = await writeReport(report);
    await finish(report, 1);
    return;
  }

  if (!apply) {
    report.action.reason = "dry-run only; rerun with --apply to update Cloud Run runtime env";
    report.warnings.push("Repairable production drift was detected but --apply was not provided.");
    report.reportPath = await writeReport(report);
    await finish(report, 1);
    return;
  }

  const updateEnvVars = buildUpdateEnvVars({ expectedBucket, cmsPath, mediaPrefix });
  const updateGlobalArgs = deployable.impersonate ? [`--impersonate-service-account=${deployable.impersonate}`] : [];
  const update = await runCommand("gcloud", [
    ...updateGlobalArgs,
    "run",
    "services",
    "update",
    service,
    "--region",
    region,
    "--project",
    projectId,
    "--update-env-vars",
    updateEnvVars.join(",")
  ], {
    env: { ...process.env, CLOUDSDK_CORE_ACCOUNT: deployable.account },
    timeoutMs: 120_000
  });

  report.action.applied = update.code === 0;
  report.action.reason = update.code === 0 ? "updated Cloud Run CMS/GCS runtime env" : "Cloud Run env update failed";
  report.action.update = {
    code: update.code,
    stderr: sanitizeError(update.stderr),
    stdout: sanitizeError(update.stdout)
  };

  if (update.code !== 0) {
    report.errors.push("Cloud Run runtime env update failed.");
    report.reportPath = await writeReport(report);
    await finish(report, 1);
    return;
  }

  const checks = await pollProduction({ baseUrl, expectedBucket });
  const last = checks[checks.length - 1] || {};
  report.after = { checks, latest: last };
  if (last.healthOk && last.provider === "gcs" && last.bucket === expectedBucket && Number(last.postCount) > 0) {
    report.ok = true;
  } else {
    report.errors.push("Cloud Run env was updated, but production health/blog inventory did not recover yet.");
  }

  report.reportPath = await writeReport(report);
  await finish(report, report.ok ? 0 : 1);
}

main().catch(async (error) => {
  const report = {
    ok: false,
    phase: "blog-production-repair",
    checkedAt: new Date().toISOString(),
    errors: [error instanceof Error ? error.message : String(error)]
  };
  report.reportPath = await writeReport(report).catch(() => "");
  await finish(report, 1);
});
