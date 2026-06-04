#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { extractLatestGeminiJsonFromFile } from "./extract-latest-gemini-json.mjs";

const DEFAULT_DATE = "2026-06-03";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJsonLoose(filePath) {
  const input = path.extname(filePath).toLowerCase();
  if (input === ".txt") {
    return extractLatestGeminiJsonFromFile(filePath);
  }
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("input is not valid JSON and no JSON object could be extracted");
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function languagesForPosts(posts) {
  return [...new Set(posts.map((post) => String(post.language || "").trim()).filter(Boolean))].sort();
}

async function main() {
  const input = arg("input");
  const date = arg("date", DEFAULT_DATE);
  const tag = arg("tag", "browser");
  const outDir = path.resolve(arg("out-dir", path.join("data/blog-backfill", date)));
  if (!input) fail("provide --input");

  const payload = await readJsonLoose(path.resolve(input));
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  if (!articles.length) fail("input payload must contain articles[]");

  const outputs = [];
  for (const article of articles) {
    const sequence = Number(article.sequence);
    if (!Number.isInteger(sequence) || sequence <= 0) fail("each article must include a positive sequence");
    const posts = Array.isArray(article.posts) ? article.posts : [];
    if (!posts.length) fail(`sequence ${sequence} has no posts`);
    const languages = languagesForPosts(posts);
    const languageTag = languages.join("-").replace(/[^A-Za-z0-9-]/g, "");
    const filePath = path.join(outDir, `market-seq-${sequence}-gemini-parsed-${tag}-${languageTag}.json`);
    await writeJson(filePath, {
      status: payload.status || "ok",
      sequence,
      posts
    });
    outputs.push(path.relative(process.cwd(), filePath));
  }

  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
