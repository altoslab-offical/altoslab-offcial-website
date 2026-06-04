#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function collectFromCodeFences(raw) {
  const candidates = [];
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fenceRe.exec(raw))) {
    const body = String(match[1] || "").trim();
    if (body.startsWith("{") || body.startsWith("[")) {
      candidates.push({ jsonText: body, start: match.index });
    }
  }
  return candidates;
}

function collectFromBalanced(raw) {
  const candidates = [];
  const chars = [...raw];
  const stack = [];
  let start = -1;
  let inString = false;
  let escape = false;
  const closers = { "{": "}", "[": "]" };

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      if (stack.length === 0) start = i;
      stack.push(closers[char]);
      continue;
    }

    if (stack.length === 0) continue;
    if (char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0 && start >= 0) {
        candidates.push({ jsonText: raw.slice(start, i + 1).trim(), start });
        start = -1;
      }
    }
  }

  return candidates;
}

function parseCandidate(candidate) {
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function scoreCandidate(payload) {
  if (!payload || typeof payload !== "object") return 0;
  let score = 0;
  if (Array.isArray(payload)) score += 2;
  if (payload && typeof payload.articles === "object" && Array.isArray(payload.articles)) score += 20;
  if (Array.isArray(payload.posts)) score += 30;
  if (typeof payload.status === "string") score += 5;
  if (typeof payload.sequence === "number" || typeof payload.sequence === "string") score += 3;
  if (payload && !Array.isArray(payload) && typeof payload.language === "string") score += 1;
  if (Array.isArray(payload.posts) && payload.posts.some((post) => post && typeof post === "object" && typeof post.language === "string")) {
    score += 40;
  }
  return score;
}

function chooseLatest(candidates) {
  const parsed = candidates
    .map((item) => {
      const value = parseCandidate(item.jsonText);
      if (value === null) return null;
      return {
        value,
        start: item.start || 0,
        score: scoreCandidate(value)
      };
    })
    .filter(Boolean);
  if (!parsed.length) return null;
  parsed.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.start - a.start;
  });
  return parsed[0].value;
}

export async function extractLatestGeminiJsonFromFile(filePath) {
  const raw = (await fs.readFile(filePath, "utf8")).toString();
  const candidates = [
    ...collectFromCodeFences(raw),
    ...collectFromBalanced(raw)
  ];
  const payload = chooseLatest(candidates);
  if (!payload) throw new Error("no valid JSON found in input");
  return payload;
}

export async function writeExtractedGeminiJson(input, output) {
  const payload = await extractLatestGeminiJsonFromFile(input);
  if (!output) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function usage() {
  console.log(`
ALTOS LAB Gemini output JSON extractor

Usage:
  node scripts/extract-latest-gemini-json.mjs --input <file> [--output <file>]

Required:
  --input:  input text file from Gemini page
`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }
  const input = arg("input", "");
  const output = arg("output", "");
  if (!input) fail("--input is required");
  await writeExtractedGeminiJson(path.resolve(input), output ? path.resolve(output) : "");
}

main().catch((error) => {
  fail(error?.message || "extract failed");
});
