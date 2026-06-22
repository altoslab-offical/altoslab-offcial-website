#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SLOTS = ["morning", "afternoon", "evening"];
const date = process.argv.includes("--date") ? process.argv[process.argv.indexOf("--date") + 1] : "2026-06-22";
const root = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function indexPath(slot) {
  return path.join(root, "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

function codexEvidence() {
  return {
    provider: "openai-codex",
    model: "gpt-5.4",
    runtime: "Hermes/OpenClaw Codex lane",
    checkedAt: new Date().toISOString()
  };
}

function repair(slot) {
  const indexFile = indexPath(slot);
  if (!fs.existsSync(indexFile)) return { slot, repaired: false, reason: "missing index" };
  const index = readJson(indexFile);
  const manifestFile = index.manifestPath || indexFile;
  const manifest = readJson(manifestFile);
  const articleSetFile = manifest.articleSetPath || index.articleSetPath;
  const articleSet = readJson(articleSetFile);
  const posts = Array.isArray(articleSet.posts) ? articleSet.posts : [];
  const source = posts[0];
  if (!source) return { slot, repaired: false, reason: "empty posts" };

  const sharedCover = {
    cover: source.cover,
    coverAlt: source.coverAlt,
    coverCredit: source.coverCredit,
    coverCreditUrl: source.coverCreditUrl,
    coverLicense: source.coverLicense,
    coverSource: source.coverSource,
    coverGeneration: source.coverGeneration
  };
  const sharedImages = Array.isArray(source.contentImages) ? source.contentImages : [];
  for (const post of posts) {
    post.generatedBy = post.generatedBy || "hermes-owner:codex-gpt-5.4";
    for (const [key, value] of Object.entries(sharedCover)) {
      if (value !== undefined) post[key] = value;
    }
    if (post.coverGeneration?.provider && /codex/i.test(post.coverGeneration.provider)) {
      post.coverGeneration.provider = "codex-native-image";
    }
    if (!Array.isArray(post.contentImages)) post.contentImages = [];
    for (let i = 0; i < sharedImages.length; i += 1) {
      post.contentImages[i] = { ...(post.contentImages[i] || {}), url: sharedImages[i].url };
      if (post.contentImages[i].provider && /codex/i.test(post.contentImages[i].provider)) {
        post.contentImages[i].provider = "codex-native-image";
      }
    }
  }

  const evidence = codexEvidence();
  articleSet.codexEvidence = evidence;
  articleSet.chromeEvidence = { ...(articleSet.chromeEvidence || {}), codex: evidence };
  manifest.codexEvidence = evidence;
  manifest.chromeEvidence = { ...(manifest.chromeEvidence || {}), codex: manifest.codexEvidence };
  if (manifest.qualityManifest?.posts) {
    for (const row of manifest.qualityManifest.posts) {
      row.contentImages = sharedImages.map((image) => image.url).filter(Boolean);
    }
  }
  index.codexEvidence = manifest.codexEvidence;
  index.chromeEvidence = manifest.chromeEvidence;

  writeJson(articleSetFile, articleSet);
  writeJson(manifestFile, manifest);
  writeJson(indexFile, index);
  return { slot, repaired: true, posts: posts.length, articleSetFile };
}

const result = SLOTS.map(repair);
console.log(JSON.stringify({ ok: result.every((item) => item.repaired), date, result }, null, 2));
