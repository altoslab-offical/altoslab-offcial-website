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

const peopleHeavyImagePattern =
  /(meeting|conference|congress|committee|summit|panel|speaker|speaking|audience|portrait|headshot|interview|workshop|seminar|forum|startup live|people|person|woman|women|man|men|group|team photo|boardroom|minister|deputy|chief|official|press|discussion|roundtable|talking|session|lecture|會議|演講|人物|肖像|討論|委員會|講座|人像|会議|講演|人物|토론|회의|강연|인물)/i;

const objectImagePattern =
  /(robot|automation|keyboard|code|terminal|server|data center|rack|cable|fiber|chip|circuit|screen|dashboard|chart|interface|wireframe|prototype|library|archive|book|document|notebook|checklist|map|network|lock|security|factory|warehouse|sensor|machine|control|device|laptop|computer|software|database|search|magnifying)/i;

const unsafeOrOffBrandImagePattern =
  /(dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|anti-aircraft|air defense|defense computer|radarno|usdagov|john lennon|austen|desire screenshot|unabridged|dead prisoners|robot arm picks up|shixart|malaria|microscopy training|nigeria)/i;

const recentlyUsedCoverUrls = new Set<string>();
const recentlyUsedCoverCreators = new Map<string, number>();
const recentlyUsedCoverThemes = new Map<string, number>();

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
    "automation control panel",
    "data visualization dashboard",
    "computer code terminal close up",
    "circuit board microchip macro"
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

function imageText(image: OpenverseImage) {
  return [image.title, image.creator, image.source, image.foreign_landing_url, image.url, image.thumbnail].filter(Boolean).join(" ");
}

function approvedImageUrl(url?: string) {
  if (!url || !/^https:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    return !host.includes("facebook.com") && !host.includes("instagram.com") && !host.includes("pinterest.");
  } catch {
    return false;
  }
}

function isVisuallyRelevant(image: OpenverseImage) {
  const text = imageText(image);
  return objectImagePattern.test(text) || /stocksnap/i.test(text);
}

function isRejectedImage(image: OpenverseImage) {
  const text = imageText(image);
  return peopleHeavyImagePattern.test(text) || unsafeOrOffBrandImagePattern.test(text);
}

function imageTheme(image: OpenverseImage) {
  const text = imageText(image).toLowerCase();
  if (/(computer board|technology motherboard|circuit board|motherboard|ccd chip)/i.test(text)) return "circuit-board";
  if (/(server|data center|rack|network integration)/i.test(text)) return "data-center";
  if (/(library|archive|book|notebook|document)/i.test(text)) return "research-docs";
  if (/(control panel|automation|sensor|factory|industrial)/i.test(text)) return "automation";
  if (/(code|terminal|keyboard|software)/i.test(text)) return "code";
  return "";
}

function isOverusedRuntimeImage(image: OpenverseImage) {
  const creator = String(image.creator || "").trim().toLowerCase();
  const theme = imageTheme(image);
  return (creator && (recentlyUsedCoverCreators.get(creator) || 0) >= 2) || (theme && (recentlyUsedCoverThemes.get(theme) || 0) >= 4);
}

function rememberRuntimeImage(image: OpenverseImage, url: string) {
  recentlyUsedCoverUrls.add(url);
  const creator = String(image.creator || "").trim().toLowerCase();
  const theme = imageTheme(image);
  if (creator) recentlyUsedCoverCreators.set(creator, (recentlyUsedCoverCreators.get(creator) || 0) + 1);
  if (theme) recentlyUsedCoverThemes.set(theme, (recentlyUsedCoverThemes.get(theme) || 0) + 1);
}

async function imageLoads(url: string) {
  const response = await fetchWithTimeout(url).catch(() => null);
  if (!response?.ok) return false;
  const contentType = response.headers.get("content-type") || "";
  return /^image\/(jpeg|jpg|png|webp|gif)/i.test(contentType);
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
      .filter((image) => image.license && legalLicenses.includes(image.license))
      .filter((image) => approvedImageUrl(image.url || image.thumbnail))
      .filter((image) => !isRejectedImage(image))
      .filter((image) => isVisuallyRelevant(image))
      .filter((image) => !isOverusedRuntimeImage(image))
      .filter((image) => !recentlyUsedCoverUrls.has(image.thumbnail || image.url || ""))
      .filter((image) => !seen.has(image.thumbnail || image.url || ""))
      .sort((a, b) => imageScore(b) - imageScore(a));
    for (let attempt = 0; attempt < ranked.length; attempt += 1) {
      const best = ranked[(selectionOffset(post, ranked.length) + attempt) % ranked.length];
      const urls = [best.thumbnail, best.url].filter((url): url is string => Boolean(url && approvedImageUrl(url)));
      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        if (!(await imageLoads(url))) continue;
        rememberRuntimeImage(best, url);
        return { image: { ...best, url }, query };
      }
    }
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
  const results: BlogPost[] = [];
  for (const post of posts) {
    results.push(await generateBlogCoverForPost(post));
  }
  const generated = results.filter((post) => post.coverSource === "curated").length;
  const failed = results.filter((post) => post.coverGeneration?.status === "failed").length;
  const warnings = results
    .map((post) => post.coverGeneration?.error)
    .filter(Boolean) as string[];

  return { posts: results, generated, failed, warnings };
}
