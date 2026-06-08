#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function stripJsonc(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
}

function safeStorageKey(key) {
  return key.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

const root = process.cwd();
const configPath = path.resolve(root, arg("config", "wrangler.staging.jsonc"));
const dataPath = path.resolve(root, arg("data", "data/cms.json"));
const binding = arg("binding", "ALTOS_BLOG_KV");

if (!fs.existsSync(configPath)) {
  console.error(`Missing Wrangler config: ${configPath}`);
  process.exit(1);
}
if (!fs.existsSync(dataPath)) {
  console.error(`Missing CMS data file: ${dataPath}`);
  process.exit(1);
}

const config = JSON.parse(stripJsonc(fs.readFileSync(configPath, "utf8")));
const namespace = (config.kv_namespaces || []).find((item) => item.binding === binding);
if (!namespace?.id) {
  console.error(`Wrangler config does not define KV binding ${binding}`);
  process.exit(1);
}

const cmsStorageKey = config.vars?.CMS_STORAGE_KEY || "altoslab:cms:v1";
const kvKey = `cms:${safeStorageKey(cmsStorageKey)}`;
const metadata = JSON.stringify({
  contentType: "application/json",
  seededAt: new Date().toISOString(),
  source: path.relative(root, dataPath)
});

const result = spawnSync(
  "npx",
  [
    "wrangler",
    "kv",
    "key",
    "put",
    kvKey,
    "--namespace-id",
    namespace.id,
    "--path",
    dataPath,
    "--metadata",
    metadata,
    "--remote"
  ],
  {
    cwd: root,
    stdio: "inherit"
  }
);

if (result.status !== 0) process.exit(result.status || 1);
console.log(`Seeded ${kvKey} into ${binding} (${namespace.id}) from ${path.relative(root, dataPath)}.`);
