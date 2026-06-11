#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_DATABASE = "altos-blog-cms";
const DEFAULT_CMS_KEY = "altoslab:cms:v1";
const DEFAULT_CHUNK_SIZE = 50_000;

function arg(name, fallback) {
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
  const result = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", database, "--remote", "--json", "--command", command],
    { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `wrangler d1 execute failed with ${result.status}`);
  }
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
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `wrangler d1 execute --file failed with ${result.status}`);
  }
}

function cmsEncryptionKey() {
  const secret = process.env.CMS_ENCRYPTION_KEY;
  if (!secret) throw new Error("CMS_ENCRYPTION_KEY is required for encrypted Cloudflare D1 CMS restore");
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptCmsPayload(payload) {
  if (!payload?.encrypted) return payload;
  const key = cmsEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(decrypted);
}

function encryptCmsPayload(data) {
  const key = cmsEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return {
    encrypted: true,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function digestSourcePost(post) {
  return {
    language: post.language,
    slug: post.slug,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: post.newsCategory,
    topic: post.topic,
    audience: post.audience,
    geoSummary: post.geoSummary,
    body: post.body,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    tags: post.tags,
    author: post.author,
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    coverGeneration: post.coverGeneration,
    coverCredit: post.coverCredit,
    coverCreditUrl: post.coverCreditUrl,
    coverLicense: post.coverLicense,
    coverLicenseUrl: post.coverLicenseUrl,
    contentImages: post.contentImages,
    aiDisclosure: post.aiDisclosure
  };
}

function releaseContentSha256(payload) {
  const posts = [...(payload.posts || [])]
    .map(digestSourcePost)
    .sort((a, b) => String(a.language || "").localeCompare(String(b.language || "")));
  return sha256(
    stableJson({
      translationGroupId: payload.translationGroupId || payload.posts?.find((post) => post.translationGroupId)?.translationGroupId,
      slot: payload.slot,
      generationDate: payload.generationDate,
      scheduledFor: payload.scheduledFor,
      posts
    })
  );
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const target = path.join(dir, name);
    const stat = fs.statSync(target);
    if (stat.isDirectory()) walk(target, out);
    else if (/candidate\.json$/.test(name)) out.push(target);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function candidateIsReleased(candidate) {
  const quality = candidate.qualityManifest?.qualitySummary;
  const image = candidate.qualityManifest?.imageQualitySummary;
  return (
    candidate.status === "released" &&
    candidate.validateOnly?.wouldPublish === true &&
    quality?.approved === true &&
    image?.approved === true &&
    (!Array.isArray(quality.issues) || quality.issues.length === 0) &&
    (!Array.isArray(image.issues) || image.issues.length === 0) &&
    (candidate.publish?.status === 201 || (candidate.publish?.publishedIds || []).length >= LANGUAGES.length)
  );
}

function articleSetCandidates(candidateFile, candidate) {
  const dir = path.dirname(candidateFile);
  const paths = new Set();
  for (const key of ["articleSetPath", "sourceArticleSetPath", "releaseArticleSetPath"]) {
    if (candidate[key]) paths.add(path.isAbsolute(candidate[key]) ? candidate[key] : path.resolve(candidate[key]));
  }
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("article-set") && name.endsWith(".json")) paths.add(path.join(dir, name));
  }
  return [...paths].filter((file) => fs.existsSync(file));
}

function matchingArticleSet(candidateFile, candidate) {
  const expected = candidate.qualityManifest?.contentSha256;
  if (!expected) return null;
  for (const file of articleSetCandidates(candidateFile, candidate)) {
    try {
      const payload = readJson(file);
      if ((payload.posts || []).length !== LANGUAGES.length) continue;
      if (releaseContentSha256(payload) === expected) return { file, payload };
    } catch {
      // Ignore malformed historical artifacts.
    }
  }
  return null;
}

function exactLanguageSet(posts) {
  const languages = posts.map((post) => post.language).sort();
  return languages.length === LANGUAGES.length && LANGUAGES.every((language) => languages.includes(language));
}

function isPublicHttps(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function restoreReadyPosts(payload, candidate) {
  const now = candidate.updatedAt || new Date().toISOString();
  const publishedAt = payload.scheduledFor || candidate.expectedReleaseAt || candidate.updatedAt || now;
  const translationGroupId = payload.translationGroupId || candidate.translationGroupId || payload.posts?.[0]?.translationGroupId;
  return (payload.posts || []).map((post) => ({
    id: post.id || `restored-${post.language}-${post.slug}`,
    sortOrder: Number(post.sortOrder || 0),
    readTimeMinutes: Number(post.readTimeMinutes || 4),
    featured: Boolean(post.featured),
    qualityIssues: [],
    sourceLinks: Array.isArray(post.sourceLinks) ? post.sourceLinks : [],
    tags: Array.isArray(post.tags) ? post.tags : [],
    keyTakeaways: Array.isArray(post.keyTakeaways) ? post.keyTakeaways : [],
    faqs: Array.isArray(post.faqs) ? post.faqs : [],
    contentImages: Array.isArray(post.contentImages) ? post.contentImages : [],
    ...post,
    translationGroupId,
    status: "published",
    reviewStatus: "approved",
    releaseDecision: "published",
    qualityStatus: "passed",
    imageQualityStatus: "passed",
    generationDate: post.generationDate || payload.generationDate,
    generationSlot: post.generationSlot || payload.slot,
    scheduledFor: post.scheduledFor || payload.scheduledFor,
    ingestRunId: post.ingestRunId || payload.ingestRunId || candidate.ingestRunId,
    createdAt: post.createdAt || payload.scheduledFor || candidate.createdAt || now,
    updatedAt: post.updatedAt || now,
    publishedAt: post.publishedAt || publishedAt,
    generatedAt: post.generatedAt || candidate.createdAt || now,
    qualityChecks: {
      ...(post.qualityChecks || {}),
      hasQualityReviewerApproval: true,
      hasNoFabricatedClaims: true,
      hasBilingualParity: true,
      hasSourceTrust: true,
      hasLabsPointOfView: true,
      hasCreativeAngle: true,
      hasReaderEngagement: true,
      hasImageFit: true,
      hasAntiSlopReview: true,
      qualityScore: candidate.qualityManifest?.qualitySummary?.score,
      seoGeoScore: post.qualityChecks?.seoGeoScore,
      antiSlopScore: post.qualityChecks?.antiSlopScore || 40,
      qualityIssues: []
    }
  }));
}

function validateRestoreGroup(posts) {
  const issues = [];
  if (!exactLanguageSet(posts)) issues.push("language set is not exactly the configured 9 languages");
  const groups = new Set(posts.map((post) => post.translationGroupId));
  if (groups.size !== 1) issues.push("posts do not share one translationGroupId");
  for (const post of posts) {
    if (!post.slug || !post.title || !post.body) issues.push(`${post.language || "unknown"} missing slug/title/body`);
    if (!isPublicHttps(post.cover)) issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} cover is not public https`);
    if ((post.contentType === "column" || post.contentType === "feature") && (post.contentImages || []).length < 2) {
      issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} column/feature has fewer than two content images`);
    }
  }
  return issues;
}

function compactPublicBlogListPost(post) {
  const copy = { ...post };
  copy.body = "";
  copy.audience = "";
  copy.sourceLinks = [];
  copy.keyTakeaways = [];
  copy.faqs = [];
  copy.contentImages = [];
  copy.qualityIssues = [];
  delete copy.generationTrace;
  return copy;
}

function compactPublicBlogDuplicatePost(post) {
  const copy = compactPublicBlogListPost(post);
  copy.seoTitle = "";
  copy.seoDescription = "";
  copy.excerpt = "";
  copy.geoSummary = "";
  copy.tags = [];
  copy.coverAlt = "";
  copy.coverSource = undefined;
  copy.coverCredit = undefined;
  copy.coverCreditUrl = undefined;
  copy.coverLicense = undefined;
  copy.coverLicenseUrl = undefined;
  copy.readTimeMinutes = 0;
  copy.featured = false;
  return copy;
}

function publicMergeKey(post) {
  return `${post.language}::${post.slug}`;
}

function splitIntoChunks(text, size = DEFAULT_CHUNK_SIZE) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) chunks.push(text.slice(index, index + size));
  return chunks;
}

function currentCmsData(database, cmsKey) {
  const rows = runWranglerJson(database, `SELECT value FROM cms_blobs WHERE cms_key = ${sqlString(cmsKey)}`);
  const markerText = rows[0]?.value;
  if (!markerText) throw new Error(`CMS blob not found for ${cmsKey}`);
  const marker = JSON.parse(markerText);
  const table = marker.chunkTable || "cms_version_chunks";
  const idColumn = table === "cms_blob_chunks" ? "cms_key" : "version_id";
  const id = marker.chunkId || cmsKey;
  const chunks = runWranglerJson(
    database,
    `SELECT chunk_index, value FROM ${table} WHERE ${idColumn} = ${sqlString(id)} ORDER BY chunk_index ASC`
  );
  const content = chunks
    .sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0))
    .map((chunk) => chunk.value || "")
    .join("");
  return decryptCmsPayload(JSON.parse(content));
}

function versionIdFor(cmsKey) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${cmsKey}:${stamp}:${crypto.randomBytes(4).toString("hex")}`;
}

function writeSqlFile(sql) {
  const file = path.join(os.tmpdir(), `altos-blog-d1-restore-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.sql`);
  fs.writeFileSync(file, sql, "utf8");
  return file;
}

function restoreCandidates(root, existingGroups, existingMergeKeys) {
  const byGroup = new Map();
  const skipped = [];
  for (const file of walk(path.join(root, "data", "blog-worker-runs"))) {
    let candidate;
    try {
      candidate = readJson(file);
    } catch {
      continue;
    }
    if (!candidateIsReleased(candidate)) continue;
    const match = matchingArticleSet(file, candidate);
    if (!match) {
      skipped.push({ file: path.relative(root, file), reason: "no article-set payload matches qualityManifest.contentSha256" });
      continue;
    }
    const posts = restoreReadyPosts(match.payload, candidate);
    const group = posts[0]?.translationGroupId;
    if (!group || existingGroups.has(group)) continue;
    const issues = validateRestoreGroup(posts);
    const duplicateMergeKey = posts.find((post) => existingMergeKeys.has(publicMergeKey(post)));
    if (duplicateMergeKey) issues.push(`merge key already exists: ${publicMergeKey(duplicateMergeKey)}`);
    if (issues.length) {
      skipped.push({ file: path.relative(root, file), group, reason: issues.join("; ") });
      continue;
    }
    const item = {
      file,
      articleSetPath: match.file,
      group,
      posts,
      mtime: fs.statSync(file).mtimeMs
    };
    const previous = byGroup.get(group);
    if (!previous || item.mtime > previous.mtime) byGroup.set(group, item);
  }
  return { items: [...byGroup.values()], skipped };
}

function buildCmsWriteSql(cmsKey, data) {
  const encrypted = encryptCmsPayload(data);
  const content = JSON.stringify(encrypted, null, 2);
  const updatedAt = new Date().toISOString();
  const versionId = versionIdFor(cmsKey);
  const chunks = splitIntoChunks(content);
  const marker = JSON.stringify({
    cloudflareD1Chunked: true,
    chunks: chunks.length,
    byteLength: Buffer.byteLength(content),
    updatedAt,
    chunkTable: "cms_version_chunks",
    chunkId: versionId
  });
  const statements = [];
  statements.push(`DELETE FROM cms_version_chunks WHERE version_id = ${sqlString(versionId)};`);
  chunks.forEach((chunk, index) => {
    statements.push(
      `INSERT INTO cms_version_chunks (version_id, chunk_index, value) VALUES (${sqlString(versionId)}, ${index}, ${sqlString(chunk)});`
    );
  });
  statements.push(
    `INSERT INTO cms_versions (id, cms_key, value, created_at) VALUES (${sqlString(versionId)}, ${sqlString(cmsKey)}, ${sqlString(marker)}, ${sqlString(updatedAt)});`
  );
  statements.push(
    `INSERT INTO cms_blobs (cms_key, value, updated_at) VALUES (${sqlString(cmsKey)}, ${sqlString(marker)}, ${sqlString(updatedAt)})
     ON CONFLICT(cms_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`
  );
  return { sql: statements.join("\n"), versionId, byteLength: Buffer.byteLength(content), chunks: chunks.length };
}

function buildPublicProjectionSql(posts) {
  const updatedAt = new Date().toISOString();
  const statements = [];
  for (const post of posts) {
    statements.push(
      `INSERT INTO public_blog_posts (
        merge_key, language, slug, translation_group_id, status, published_at, updated_at, sort_order, projection_updated_at,
        list_json, inventory_json, duplicate_json, detail_json
      ) VALUES (
        ${sqlString(publicMergeKey(post))},
        ${sqlString(post.language)},
        ${sqlString(post.slug)},
        ${sqlString(post.translationGroupId)},
        'published',
        ${sqlString(post.publishedAt || post.createdAt || "")},
        ${sqlString(post.updatedAt || post.publishedAt || post.createdAt || "")},
        ${Number(post.sortOrder || 0)},
        ${sqlString(updatedAt)},
        ${sqlString(JSON.stringify(compactPublicBlogListPost(post)))},
        ${sqlString(JSON.stringify(compactPublicBlogListPost(post)))},
        ${sqlString(JSON.stringify(compactPublicBlogDuplicatePost(post)))},
        ${sqlString(JSON.stringify(post))}
      )
      ON CONFLICT(merge_key) DO UPDATE SET
        language = excluded.language,
        slug = excluded.slug,
        translation_group_id = excluded.translation_group_id,
        status = excluded.status,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at,
        sort_order = excluded.sort_order,
        projection_updated_at = excluded.projection_updated_at,
        list_json = excluded.list_json,
        inventory_json = excluded.inventory_json,
        duplicate_json = excluded.duplicate_json,
        detail_json = excluded.detail_json;`
    );
  }
  return statements.join("\n");
}

async function main() {
  const root = process.cwd();
  const database = arg("database", DEFAULT_DATABASE);
  const cmsKey = arg("cms-key", process.env.CMS_STORAGE_KEY || DEFAULT_CMS_KEY);
  const write = hasFlag("write");

  const data = currentCmsData(database, cmsKey);
  if (!Array.isArray(data.blogPosts)) throw new Error("CMS data has no blogPosts array");
  const existingGroups = new Set(data.blogPosts.map((post) => post.translationGroupId).filter(Boolean));
  const existingMergeKeys = new Set(data.blogPosts.map((post) => (post.language && post.slug ? publicMergeKey(post) : null)).filter(Boolean));
  const { items, skipped } = restoreCandidates(root, existingGroups, existingMergeKeys);
  const postsToAdd = items.flatMap((item) => item.posts);

  const summary = {
    phase: "blog-restore-released-manifests-to-d1",
    write,
    existingPosts: data.blogPosts.length,
    existingGroups: existingGroups.size,
    restoreGroups: items.length,
    restorePosts: postsToAdd.length,
    skippedCandidates: skipped.length,
    sampleGroups: items.slice(0, 8).map((item) => item.group)
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!write || postsToAdd.length === 0) return;

  data.blogPosts.unshift(...postsToAdd);
  const backupPath = path.join(os.tmpdir(), `altos-blog-cms-before-restore-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ blogPosts: data.blogPosts.length - postsToAdd.length, groups: existingGroups.size }, null, 2), "utf8");

  const cmsSql = buildCmsWriteSql(cmsKey, data);
  const cmsSqlFile = writeSqlFile(cmsSql.sql);
  runWranglerFile(database, cmsSqlFile);

  const projectionSql = buildPublicProjectionSql(postsToAdd);
  const projectionSqlFile = writeSqlFile(projectionSql);
  runWranglerFile(database, projectionSqlFile);

  console.log(
    JSON.stringify(
      {
        phase: "blog-restore-released-manifests-to-d1-complete",
        restoredGroups: items.length,
        restoredPosts: postsToAdd.length,
        cmsVersionId: cmsSql.versionId,
        cmsByteLength: cmsSql.byteLength,
        cmsChunks: cmsSql.chunks,
        cmsSqlFile,
        projectionSqlFile,
        backupPath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
