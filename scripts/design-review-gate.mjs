#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "config/design-review-baseline.json");
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const errors = [];

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", options.ignoreErrors ? "ignore" : "pipe"]
    }).trim();
  } catch (error) {
    if (options.ignoreErrors) return "";
    throw error;
  }
}

function gitOk(args) {
  try {
    execFileSync("git", args, {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

function addLines(set, output) {
  for (const line of output.split("\n")) {
    const file = line.trim();
    if (file) set.add(file);
  }
}

function changedFiles() {
  const files = new Set();
  addLines(files, git(["diff", "--name-only"], { ignoreErrors: true }));
  addLines(files, git(["diff", "--name-only", "--cached"], { ignoreErrors: true }));
  addLines(files, git(["ls-files", "--others", "--exclude-standard"], { ignoreErrors: true }));

  const baseRef = process.env.DESIGN_REVIEW_BASE_REF;
  if (baseRef) {
    const mergeBase = git(["merge-base", baseRef, "HEAD"], { ignoreErrors: true });
    if (mergeBase) addLines(files, git(["diff", "--name-only", `${mergeBase}..HEAD`], { ignoreErrors: true }));
  } else {
    const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], { ignoreErrors: true });
    if (upstream) {
      const ahead = Number(git(["rev-list", "--count", `${upstream}..HEAD`], { ignoreErrors: true }) || "0");
      const mergeBase = ahead > 0 ? git(["merge-base", upstream, "HEAD"], { ignoreErrors: true }) : "";
      if (mergeBase) addLines(files, git(["diff", "--name-only", `${mergeBase}..HEAD`], { ignoreErrors: true }));
    }
  }

  return [...files].sort();
}

function patternToRegExp(pattern) {
  const doubleStar = "__DOUBLE_STAR__";
  const singleStar = "__SINGLE_STAR__";
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escaped
      .replaceAll("**", doubleStar)
      .replaceAll("*", singleStar)
      .replaceAll(doubleStar, ".*")
      .replaceAll(singleStar, "[^/]*")}$`
  );
}

function matchesPattern(file, pattern) {
  return file === pattern || patternToRegExp(pattern).test(file);
}

function isProtected(file) {
  return baseline.protectedPatterns.some((pattern) => matchesPattern(file, pattern));
}

function isDesignReviewRecord(file) {
  return /^docs\/design-review\/.+\.md$/.test(file) && !file.endsWith("/current-approved-baseline.md") && !file.endsWith("/change-record-template.md");
}

function readRelative(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

if (!fs.existsSync(path.join(root, baseline.reviewDoc))) {
  errors.push(`Missing approved design baseline doc: ${baseline.reviewDoc}`);
}

if (!fs.existsSync(path.join(root, baseline.reviewRecordTemplate))) {
  errors.push(`Missing design change review template: ${baseline.reviewRecordTemplate}`);
}

if (!gitOk(["cat-file", "-e", `${baseline.baselineCommit}^{commit}`]) && process.env.DESIGN_REVIEW_SKIP_COMMIT_CHECK !== "1") {
  errors.push(`Approved design baseline commit is not available locally: ${baseline.baselineCommit}`);
}

const baselineDoc = fs.existsSync(path.join(root, baseline.reviewDoc)) ? readRelative(baseline.reviewDoc) : "";
for (const marker of [baseline.baselineCommit, baseline.baselineUrl, ...baseline.requiredBaselineMarkers]) {
  if (!baselineDoc.includes(marker)) {
    errors.push(`${baseline.reviewDoc} is missing baseline marker: ${marker}`);
  }
}

const packageJson = JSON.parse(readRelative("package.json"));
if (!packageJson.scripts?.["review:design"]?.includes("scripts/design-review-gate.mjs")) {
  errors.push("package.json must expose npm run review:design.");
}
if (!packageJson.scripts?.test?.includes("review:design")) {
  errors.push("package.json test must run review:design before public release checks.");
}
if (!packageJson.scripts?.["preflight:cloudflare"]?.includes("review:design")) {
  errors.push("Cloudflare preflight must run review:design before deploy.");
}

const changed = changedFiles();
const protectedChanged = changed.filter(isProtected);

if (protectedChanged.length) {
  const changedSet = new Set(changed);
  const missingDocs = baseline.requiredDocs.filter((file) => !changedSet.has(file));
  const changedSmokeGuards = baseline.requiredSmokeGuards.filter((file) => changedSet.has(file));
  const reviewRecords = changed.filter(isDesignReviewRecord);

  if (!reviewRecords.length) {
    errors.push("Protected public UI files changed without a new docs/design-review/*.md review record.");
  }
  if (missingDocs.length) {
    errors.push(`Protected public UI files changed without updating required docs: ${missingDocs.join(", ")}`);
  }
  if (!changedSmokeGuards.length) {
    errors.push(`Protected public UI files changed without updating a smoke guard: ${baseline.requiredSmokeGuards.join(" or ")}`);
  }

  for (const record of reviewRecords) {
    const text = readRelative(record);
    if (!text.includes(baseline.baselineCommit)) {
      errors.push(`${record} must cite the approved baseline commit ${baseline.baselineCommit}.`);
    }
    if (!/Desktop browser evidence:\s*\S/im.test(text) || !/Mobile browser evidence:\s*\S/im.test(text)) {
      errors.push(`${record} must include desktop and mobile browser evidence entries before release.`);
    }
  }
}

if (errors.length) {
  console.error("Design review gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  if (protectedChanged.length) {
    console.error("");
    console.error("Protected public UI files in this change:");
    for (const file of protectedChanged) console.error(`- ${file}`);
  }
  console.error("");
  console.error(`Use ${baseline.reviewRecordTemplate} and compare against baseline ${baseline.baselineCommit}.`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      phase: "design-review-gate",
      baselineCommit: baseline.baselineCommit.slice(0, 7),
      protectedChanges: protectedChanged.length,
      checkedFiles: changed.length
    },
    null,
    2
  )
);
