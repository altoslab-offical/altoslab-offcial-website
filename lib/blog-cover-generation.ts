import { BLOG_LANGUAGES, blogCoverForLanguage } from "@/lib/blog-utils";
import { nowIso } from "@/lib/cms";
import type { BlogLanguage, BlogPost } from "@/lib/types";

type ImageSourcingResult = {
  posts: BlogPost[];
  generated: number;
  failed: number;
  warnings: string[];
};

type OpenverseImage = {
  id?: string;
  title?: string;
  creator?: string;
  creator_url?: string;
  license?: string;
  license_version?: string;
  license_url?: string;
  url?: string;
  thumbnail?: string;
  foreign_landing_url?: string;
  source?: string;
  width?: number;
  height?: number;
};

type OpenverseResponse = {
  results?: OpenverseImage[];
};

const legalLicenses = ["cc0", "pdm", "by", "by-sa"];

const languageHints: Record<BlogLanguage, string[]> = {
  "zh-Hant": ["taiwan business", "asia startup", "founder desk", "technology team"],
  en: ["business technology", "startup office", "enterprise software", "strategy notebook"],
  ja: ["japan design", "minimal workspace", "technology craft", "editorial business"],
  ko: ["korea startup", "technology office", "creative business", "software team"]
};

export function isBlogImageGenerationConfigured() {
  return process.env.BLOG_IMAGE_PROVIDER !== "none";
}

function shouldSourceImages() {
  return process.env.AUTO_GENERATE_BLOG_COVERS !== "false" && process.env.BLOG_IMAGE_PROVIDER !== "none";
}

function openverseBaseUrl() {
  return (process.env.OPENVERSE_API_BASE_URL || "https://api.openverse.engineering/v1").replace(/\/$/, "");
}

function sourceTimeoutMs() {
  return Number(process.env.BLOG_IMAGE_SOURCE_TIMEOUT_MS || 6000);
}

function cleanWords(input = "") {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !["altos", "lab", "the", "and", "with", "for", "from"].includes(word));
}

function imageSearchQueries(post: BlogPost) {
  const words = cleanWords([post.topic, post.newsCategory, post.title, post.tags.join(" ")].filter(Boolean).join(" "));
  const primary = words.slice(0, 5).join(" ");
  const contentTypeHint =
    post.contentType === "breaking" ? "news editorial" : post.contentType === "feature" ? "magazine cover" : "business editorial";
  const common = ["artificial intelligence", "automation", "technology", "business"];

  return [
    [primary, contentTypeHint, languageHints[post.language][0]].filter(Boolean).join(" "),
    [words.slice(0, 3).join(" "), ...common.slice(0, 2)].filter(Boolean).join(" "),
    [post.tags[0], languageHints[post.language][1], "editorial photo"].filter(Boolean).join(" "),
    [contentTypeHint, ...common].join(" "),
    "artificial intelligence business",
    "technology office",
    "computer workspace",
    "startup business meeting"
  ].filter((query, index, all) => query && all.indexOf(query) === index);
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceTimeoutMs());
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "ALTOS LAB legal image sourcing bot; https://altoslab.com"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchOpenverse(query: string) {
  const url = new URL(`${openverseBaseUrl()}/images/`);
  url.searchParams.set("q", query);
  url.searchParams.set("license", legalLicenses.join(","));
  url.searchParams.set("page_size", "8");
  url.searchParams.set("mature", "false");

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) throw new Error(`Openverse image search failed: ${response.status}`);
  const payload = (await response.json()) as OpenverseResponse;
  return payload.results || [];
}

function imageScore(image: OpenverseImage) {
  let score = 0;
  if (image.url) score += 20;
  if (image.foreign_landing_url) score += 12;
  if (image.creator) score += 10;
  if (image.license && legalLicenses.includes(image.license)) score += image.license === "cc0" || image.license === "pdm" ? 20 : 12;
  if ((image.width || 0) >= 1000) score += 8;
  if ((image.height || 0) >= 650) score += 8;
  if (image.source === "flickr" || image.source === "wikimedia_commons") score += 4;
  return score;
}

function selectionOffset(post: BlogPost, total: number) {
  if (total <= 1) return 0;
  const languageIndex = Math.max(0, BLOG_LANGUAGES.indexOf(post.language));
  const seed = Array.from(post.translationGroupId || post.slug).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (seed + languageIndex * 3) % total;
}

async function findImage(post: BlogPost) {
  const seen = new Set<string>();
  for (const query of imageSearchQueries(post)) {
    const images = await searchOpenverse(query).catch(() => []);
    const ranked = images
      .filter((image) => image.url && image.license && legalLicenses.includes(image.license) && !seen.has(image.url))
      .sort((a, b) => imageScore(b) - imageScore(a));
    const best = ranked[selectionOffset(post, ranked.length)];
    if (best?.url) return { image: best, query };
    ranked.forEach((image) => image.url && seen.add(image.url));
  }
  return null;
}

function licenseName(image: OpenverseImage) {
  if (!image.license) return undefined;
  if (image.license === "cc0") return "CC0";
  if (image.license === "pdm") return "Public Domain Mark";
  return `CC ${image.license.toUpperCase()}${image.license_version ? ` ${image.license_version}` : ""}`;
}

function attribution(image: OpenverseImage) {
  const title = image.title?.trim() || "Open licensed image";
  const creator = image.creator?.trim();
  return creator ? `${title} by ${creator}` : title;
}

function fallbackCoverPost(post: BlogPost, query: string, error?: string): BlogPost {
  return {
    ...post,
    cover: blogCoverForLanguage(post.language),
    coverAlt: post.coverAlt || `${post.title} ALTOS LAB fallback cover image`,
    coverPrompt: query,
    coverSource: "fallback",
    coverGeneration: {
      source: "fallback",
      provider: "openverse",
      prompt: query,
      generatedAt: nowIso(),
      status: error ? "failed" : "skipped",
      error
    }
  };
}

export async function generateBlogCoverForPost(post: BlogPost): Promise<BlogPost> {
  const fallbackQuery = imageSearchQueries(post)[0] || post.title;

  if (!shouldSourceImages()) {
    return fallbackCoverPost(post, fallbackQuery);
  }

  try {
    const match = await findImage(post);
    if (!match) throw new Error("No suitable open-licensed image was found.");

    const url = match.image.thumbnail || match.image.url;
    const credit = attribution(match.image);
    const license = licenseName(match.image);

    return {
      ...post,
      cover: url,
      coverAlt: `${post.title} - ${credit}`,
      coverPrompt: match.query,
      coverSource: "curated",
      coverCredit: credit,
      coverCreditUrl: match.image.foreign_landing_url || match.image.url,
      coverLicense: license,
      coverLicenseUrl: match.image.license_url,
      coverGeneration: {
        source: "curated",
        provider: "openverse",
        prompt: match.query,
        style: "Pinterest-style editorial search using open-licensed photography only.",
        generatedAt: nowIso(),
        status: "generated"
      }
    };
  } catch (error) {
    return fallbackCoverPost(post, fallbackQuery, error instanceof Error ? error.message : "Image sourcing failed");
  }
}

export async function generateBlogCovers(posts: BlogPost[]): Promise<ImageSourcingResult> {
  const results = await Promise.all(posts.map((post) => generateBlogCoverForPost(post)));
  const generated = results.filter((post) => post.coverSource === "curated").length;
  const failed = results.filter((post) => post.coverGeneration?.status === "failed").length;
  const warnings = results
    .map((post) => post.coverGeneration?.error)
    .filter(Boolean) as string[];

  return { posts: results, generated, failed, warnings };
}
