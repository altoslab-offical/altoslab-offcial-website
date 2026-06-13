#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_DATABASE = "altos-blog-cms";
const PUBLIC_EXCERPT_PREFIX_PATTERN =
  /^\s*(?:TL\s*;?\s*DR|TLDR)\s*(?:[（(][^）)]{0,80}[）)]|\s+from\s+[^:：]{1,80})?\s*[:：]\s*/i;
const PUBLIC_TLDR_WORD_PATTERN = /\bTL\s*;?\s*DR\b(?:-style)?/gi;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function stripPublicExcerptPrefix(value) {
  const raw = String(value ?? "");
  let text = raw.trimStart();
  if (PUBLIC_EXCERPT_PREFIX_PATTERN.test(text)) {
    let previous = "";
    while (text && text !== previous) {
      previous = text;
      text = text.replace(PUBLIC_EXCERPT_PREFIX_PATTERN, "").trimStart();
    }
    return text.trim();
  }
  return raw.replace(PUBLIC_TLDR_WORD_PATTERN, "summary");
}

function cleanPayload(value) {
  if (typeof value === "string") return stripPublicExcerptPrefix(value);
  if (Array.isArray(value)) return value.map(cleanPayload);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cleanPayload(child)]));
  }
  return value;
}

function runWranglerJson(database, command) {
  const result = spawnSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--json", "--command", command], {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler d1 execute failed with ${result.status}`);
  const parsed = JSON.parse(result.stdout);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first?.success) throw new Error(`D1 command failed: ${JSON.stringify(first)}`);
  return first.results || [];
}

function runWranglerFile(database, file) {
  const result = spawnSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--file", file], {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler d1 execute --file failed with ${result.status}`);
}

function writeSqlFile(sql) {
  const file = path.join(os.tmpdir(), `altos-blog-strip-preview-prefixes-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.sql`);
  fs.writeFileSync(file, sql, "utf8");
  return file;
}

function cleanJsonColumn(raw, rowLabel, column) {
  const parsed = JSON.parse(raw || "{}");
  const cleaned = cleanPayload(parsed);
  const next = JSON.stringify(cleaned);
  return {
    changed: next !== JSON.stringify(parsed),
    value: next,
    label: `${rowLabel}:${column}`
  };
}

const database = arg("database", DEFAULT_DATABASE);
const rows = runWranglerJson(
  database,
  `SELECT merge_key, language, slug, list_json, inventory_json, duplicate_json, detail_json
   FROM public_blog_posts
   WHERE status = 'published'
     AND (list_json LIKE '%TLDR%' OR list_json LIKE '%TL;DR%'
       OR inventory_json LIKE '%TLDR%' OR inventory_json LIKE '%TL;DR%'
       OR duplicate_json LIKE '%TLDR%' OR duplicate_json LIKE '%TL;DR%'
       OR detail_json LIKE '%TLDR%' OR detail_json LIKE '%TL;DR%')
   ORDER BY published_at DESC, slug ASC, language ASC`
);

const updates = [];
const cleanedRows = [];

for (const row of rows) {
  const rowLabel = `${row.slug} [${row.language}]`;
  const columns = ["list_json", "inventory_json", "duplicate_json", "detail_json"];
  const cleanedColumns = Object.fromEntries(columns.map((column) => [column, cleanJsonColumn(row[column], rowLabel, column)]));
  const changed = Object.values(cleanedColumns).some((column) => column.changed);
  if (!changed) continue;
  updates.push(`UPDATE public_blog_posts SET
    list_json = ${sqlString(cleanedColumns.list_json.value)},
    inventory_json = ${sqlString(cleanedColumns.inventory_json.value)},
    duplicate_json = ${sqlString(cleanedColumns.duplicate_json.value)},
    detail_json = ${sqlString(cleanedColumns.detail_json.value)},
    projection_updated_at = ${sqlString(new Date().toISOString())}
  WHERE merge_key = ${sqlString(row.merge_key)};`);
  cleanedRows.push(rowLabel);
}

if (!updates.length) {
  console.log("No public preview prefixes found in published projection rows.");
  process.exit(0);
}

const file = writeSqlFile(updates.join("\n"));
runWranglerFile(database, file);
console.log(`Cleaned ${cleanedRows.length} public blog projection rows.`);
for (const label of cleanedRows) console.log(`- ${label}`);
