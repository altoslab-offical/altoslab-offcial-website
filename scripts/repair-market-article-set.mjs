#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildMarketNewsroomPost, hasMarketTemplateSlop } from "./blog-market-newsroom.mjs";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function articleSetFrom(data) {
  return Array.isArray(data) ? data : data.posts || data.articles || data.articleSet || [];
}

function publicText(post) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    ...(post.keyTakeaways || []),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
    ...(post.sourceLinks || []).flatMap((source) => [source.title, source.summary])
  ]
    .filter(Boolean)
    .join("\n");
}

function hasForbiddenMarketText(post) {
  const text = publicText(post);
  const forbidden = [
    "這則消息可以拿來",
    "企業檢查",
    "卡在哪個流程",
    "原因是企業決策問題",
    "Source:",
    "Event:",
    "Evidence:",
    "Decision cue",
    "Next action",
    "source index",
    "article claims should remain anchored"
  ];
  return forbidden.find((phrase) => text.includes(phrase)) || "";
}

function repairPost(post) {
  if (post.contentType !== "breaking") return post;
  const patch = buildMarketNewsroomPost({
    language: post.language,
    post,
    slug: post.slug,
    author: post.author,
    readTimeMinutes: post.readTimeMinutes
  });
  return {
    ...post,
    ...patch,
    coverUrl: patch.cover,
    coverImage: patch.cover,
    sourceLinks: patch.sourceLinks,
    updatedAt: new Date().toISOString()
  };
}

function main() {
  const input = arg("article-set") || arg("input");
  const output = arg("out") || arg("output");
  if (!input) fail("--article-set is required");
  if (!output) fail("--out is required");

  const resolvedInput = path.resolve(input);
  const resolvedOutput = path.resolve(output);
  const data = JSON.parse(fs.readFileSync(resolvedInput, "utf8"));
  const posts = articleSetFrom(data);
  if (!Array.isArray(posts) || posts.length === 0) fail("article set has no posts");

  const languages = [...new Set(posts.map((post) => post.language))].sort();
  const missingLanguages = LANGUAGES.filter((language) => !languages.includes(language));
  if (missingLanguages.length) fail(`missing languages: ${missingLanguages.join(", ")}`);

  const repairedPosts = posts.map(repairPost);
  const failures = repairedPosts
    .map((post) => ({
      slug: post.slug,
      language: post.language,
      templateSlop: hasMarketTemplateSlop(post),
      forbidden: hasForbiddenMarketText(post)
    }))
    .filter((item) => item.templateSlop || item.forbidden);
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }

  const next = Array.isArray(data) ? repairedPosts : { ...data, posts: repairedPosts };
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        input: resolvedInput,
        output: resolvedOutput,
        posts: repairedPosts.length,
        languages
      },
      null,
      2
    )
  );
}

main();
