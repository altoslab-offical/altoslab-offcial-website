#!/usr/bin/env node
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_DATABASE = "altos-blog-cms";
const DEFAULT_CMS_KEY = "altoslab:cms:v1";
const DEFAULT_BUCKET = "altoslab-official-cms-487316829524";
const DEFAULT_REGION = "ap-northeast-1";
const DEFAULT_CMS_PATH = "cms/altoslab-cms-v1.json";
const MAX_BUFFER = 80 * 1024 * 1024;

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) return process.argv[index + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runWranglerQuery(database, command) {
  const result = spawnSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--json", "--command", command], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: MAX_BUFFER
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler d1 execute failed with ${result.status}`);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Failed to parse wrangler JSON output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function queryResults(database, command) {
  const payload = runWranglerQuery(database, command);
  const first = Array.isArray(payload) ? payload[0] : null;
  return Array.isArray(first?.results) ? first.results : [];
}

function parseChunkMarker(text) {
  try {
    const payload = JSON.parse(text);
    if (payload?.cloudflareD1Chunked === true && Number.isInteger(payload.chunks)) return payload;
  } catch {
    return null;
  }
  return null;
}

function versionPathname(cmsPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = `${stamp}-${randomBytes(4).toString("hex")}.json`;
  return cmsPath.endsWith(".json") ? cmsPath.replace(/\.json$/, `.versions/${suffix}`) : `${cmsPath}.versions/${suffix}`;
}

function inspectCmsPayload(text) {
  const meta = {
    byteLength: Buffer.byteLength(text),
    encrypted: false,
    blogPosts: null,
    languages: []
  };
  try {
    const payload = JSON.parse(text);
    meta.encrypted = payload?.encrypted === true;
    if (!meta.encrypted && Array.isArray(payload?.blogPosts)) {
      meta.blogPosts = payload.blogPosts.length;
      meta.languages = [...new Set(payload.blogPosts.map((post) => post?.language).filter(Boolean))].sort();
    }
  } catch {
    meta.parseable = false;
  }
  return meta;
}

function readD1PublicProjectionPayload(database) {
  const rows = queryResults(
    database,
    `SELECT detail_json FROM public_blog_posts
     WHERE status = 'published'
     ORDER BY sort_order DESC, updated_at DESC, language ASC, slug ASC;`
  );
  const blogPosts = rows.map((row, index) => {
    if (typeof row.detail_json !== "string") throw new Error(`public_blog_posts row ${index} has no detail_json`);
    return JSON.parse(row.detail_json);
  });
  return {
    text: JSON.stringify(
      {
        sitePages: [],
        projects: [],
        blogPosts,
        contactLeads: [],
        assets: []
      },
      null,
      2
    ),
    marker: null,
    publicProjectionPosts: blogPosts.length
  };
}

function readD1CmsPayload(database, cmsKey) {
  const rows = queryResults(database, `SELECT value FROM cms_blobs WHERE cms_key = ${sqlString(cmsKey)};`);
  const raw = rows[0]?.value;
  if (typeof raw !== "string") throw new Error(`No cms_blobs row found for ${cmsKey}`);

  const marker = parseChunkMarker(raw);
  if (!marker) return { text: raw, marker: null };

  const table = marker.chunkTable || "cms_blob_chunks";
  if (table !== "cms_blob_chunks" && table !== "cms_version_chunks") throw new Error(`Unexpected D1 chunk table: ${table}`);
  const idColumn = table === "cms_version_chunks" ? "version_id" : "cms_key";
  const chunkId = marker.chunkId || cmsKey;
  const chunks = queryResults(
    database,
    `SELECT chunk_index, value FROM ${table} WHERE ${idColumn} = ${sqlString(chunkId)} ORDER BY chunk_index ASC;`
  );
  if (chunks.length !== marker.chunks) {
    throw new Error(`D1 CMS chunk count mismatch: marker=${marker.chunks} actual=${chunks.length}`);
  }

  const text = chunks
    .sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0))
    .map((chunk) => {
      if (typeof chunk.value !== "string") throw new Error(`D1 CMS chunk ${chunk.chunk_index} has no text value`);
      return chunk.value;
    })
    .join("");
  const byteLength = Buffer.byteLength(text);
  if (marker.byteLength && byteLength !== marker.byteLength) {
    throw new Error(`D1 CMS byte length mismatch: marker=${marker.byteLength} actual=${byteLength}`);
  }
  return { text, marker };
}

async function writeS3Json({ bucket, region, cmsPath, profile, text }) {
  if (profile) process.env.AWS_PROFILE = profile;
  process.env.AWS_REGION = region;
  const client = new S3Client({ region });
  const versionPath = versionPathname(cmsPath);
  const common = {
    Bucket: bucket,
    Body: text,
    ContentType: "application/json",
    CacheControl: "no-store"
  };
  await client.send(new PutObjectCommand({ ...common, Key: versionPath }));
  await client.send(new PutObjectCommand({ ...common, Key: cmsPath }));
  return { versionPath };
}

async function main() {
  const database = arg("database", process.env.CLOUDFLARE_D1_DATABASE || DEFAULT_DATABASE);
  const cmsKey = arg("cms-key", process.env.CMS_STORAGE_KEY || DEFAULT_CMS_KEY);
  const bucket = arg("bucket", process.env.AWS_S3_BUCKET || DEFAULT_BUCKET);
  const region = arg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || DEFAULT_REGION);
  const cmsPath = arg("cms-path", process.env.AWS_S3_CMS_PATH || DEFAULT_CMS_PATH);
  const profile = arg("profile", process.env.AWS_PROFILE || "altoslab");
  const source = arg("source", "cms-blob");
  const write = hasFlag("write");

  if (source !== "cms-blob" && source !== "public-projection") {
    throw new Error(`Unsupported source ${source}; use cms-blob or public-projection`);
  }

  const { text, marker, publicProjectionPosts } =
    source === "public-projection" ? readD1PublicProjectionPayload(database) : readD1CmsPayload(database, cmsKey);
  const publicRows = queryResults(database, "SELECT count(*) AS publicPosts FROM public_blog_posts;");
  const payload = inspectCmsPayload(text);
  const summary = {
    phase: "d1-cms-to-aws-s3",
    write,
    source,
    database,
    cmsKey,
    bucket,
    region,
    cmsPath,
    profile,
    d1: {
      chunked: Boolean(marker),
      chunks: marker?.chunks || null,
      updatedAt: marker?.updatedAt || null,
      publicPosts: publicRows[0]?.publicPosts ?? null,
      publicProjectionPosts: publicProjectionPosts ?? null
    },
    payload
  };

  if (!write) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const result = await writeS3Json({ bucket, region, cmsPath, profile, text });
  console.log(JSON.stringify({ ...summary, s3: result }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
