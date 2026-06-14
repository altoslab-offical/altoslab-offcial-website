#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_DATABASE = "altos-blog-cms";
const POLLUTED_PUBLIC_PATTERNS = [
  /OpenAI News's current AI coverage/i,
  /current AI coverage page for related reporting/i,
  /Frame \(4\)/i,
  /Oracle partnership/i,
  /PRC-linked/i,
  /Confidential submission of draft S-1/i,
  /Built for broad benefit/i,
  /Economic research forum/i
];

function arg(name, fallback = "") {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
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
  const file = path.join(os.tmpdir(), `altos-blog-clean-public-market-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.sql`);
  fs.writeFileSync(file, sql, "utf8");
  return file;
}

function pollutedText(value = "") {
  return POLLUTED_PUBLIC_PATTERNS.some((pattern) => pattern.test(String(value || "")));
}

function cleanSourceLinks(sourceLinks = []) {
  const links = Array.isArray(sourceLinks) ? sourceLinks : [];
  return links.filter((link, index) => {
    if (index === 0) return true;
    return !pollutedText(`${link?.title || ""}\n${link?.url || ""}\n${link?.summary || ""}`);
  });
}

function cleanContentImages(contentImages = []) {
  const images = Array.isArray(contentImages) ? contentImages : [];
  return images.filter((image) => !pollutedText(`${image?.alt || ""}\n${image?.caption || ""}\n${image?.url || ""}`));
}

function cleanPost(post) {
  const next = { ...post };
  next.sourceLinks = cleanSourceLinks(next.sourceLinks);
  next.contentImages = cleanContentImages(next.contentImages);
  if (Array.isArray(next.generationTrace)) {
    next.generationTrace = [
      ...next.generationTrace,
      {
        lane: "public-projection-cleanup",
        worker: "scripts/blog-clean-public-market-news-projection.mjs",
        reason: "Removed generic OpenAI news index source links and unrelated source-card inline images from public projections."
      }
    ];
  }
  return next;
}

function cleanJsonColumn(raw, column) {
  const parsed = JSON.parse(raw || "{}");
  const cleaned = cleanPost(parsed);
  const before = JSON.stringify(parsed);
  const after = JSON.stringify(cleaned);
  return { changed: before !== after, value: after, column };
}

const database = arg("database", DEFAULT_DATABASE);
const write = hasFlag("write");
const likeClauses = [
  "%OpenAI News''s current AI coverage%",
  "%current AI coverage page for related reporting%",
  "%Frame (4)%",
  "%Oracle partnership%",
  "%PRC-linked%",
  "%Confidential submission of draft S-1%",
  "%Built for broad benefit%",
  "%Economic research forum%"
]
  .map((value) => `detail_json LIKE ${sqlString(value)}`)
  .join(" OR ");

const rows = runWranglerJson(
  database,
  `SELECT merge_key, language, slug, list_json, inventory_json, duplicate_json, detail_json
   FROM public_blog_posts
   WHERE status = 'published'
     AND (${likeClauses})
   ORDER BY published_at DESC, slug ASC, language ASC`
);

const updates = [];
const cleanedRows = [];

for (const row of rows) {
  const columns = ["list_json", "inventory_json", "duplicate_json", "detail_json"];
  const cleanedColumns = Object.fromEntries(columns.map((column) => [column, cleanJsonColumn(row[column], column)]));
  const changed = Object.values(cleanedColumns).some((column) => column.changed);
  if (!changed) continue;
  updates.push(`UPDATE public_blog_posts SET
    list_json = ${sqlString(cleanedColumns.list_json.value)},
    inventory_json = ${sqlString(cleanedColumns.inventory_json.value)},
    duplicate_json = ${sqlString(cleanedColumns.duplicate_json.value)},
    detail_json = ${sqlString(cleanedColumns.detail_json.value)},
    projection_updated_at = ${sqlString(new Date().toISOString())}
  WHERE merge_key = ${sqlString(row.merge_key)};`);
  cleanedRows.push({ slug: row.slug, language: row.language });
}

const summary = {
  ok: true,
  write,
  matchedRows: rows.length,
  changedRows: cleanedRows.length,
  cleanedRows
};
console.log(JSON.stringify(summary, null, 2));

if (write && updates.length) {
  const file = writeSqlFile(updates.join("\n"));
  runWranglerFile(database, file);
  console.log(JSON.stringify({ ok: true, phase: "public-market-projection-cleanup-complete", changedRows: cleanedRows.length, sqlFile: file }, null, 2));
}
