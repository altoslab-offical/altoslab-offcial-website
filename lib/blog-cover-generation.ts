import { BLOG_LANGUAGES, blogCoverForLanguage } from "@/lib/blog-utils";
import { nowIso } from "@/lib/cms";
import { FREE_STOCK_COVER_LIBRARY } from "@/lib/blog-stock-cover-library";
import { put } from "@vercel/blob";
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
  alt?: string;
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

type PexelsResponse = {
  photos?: Array<{
    id?: number;
    alt?: string;
    photographer?: string;
    photographer_url?: string;
    url?: string;
    width?: number;
    height?: number;
    src?: {
      large2x?: string;
      large?: string;
      landscape?: string;
    };
  }>;
};

type PixabayResponse = {
  hits?: Array<{
    id?: number;
    tags?: string;
    user?: string;
    pageURL?: string;
    largeImageURL?: string;
    webformatURL?: string;
    imageWidth?: number;
    imageHeight?: number;
  }>;
};

const legalLicenses = ["cc0", "pdm", "by", "by-sa", "pexels", "pixabay"];
const openverseLicenses = ["cc0", "pdm", "by", "by-sa"];

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

function shouldStoreImagesInBlob() {
  return process.env.BLOG_IMAGE_STORE_BLOB !== "false" && Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
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

async function fetchWithTimeout(url: string, headers?: HeadersInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceTimeoutMs());
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "ALTOS LAB legal image sourcing bot; https://altoslab.com",
        ...(headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchOpenverse(query: string) {
  const url = new URL(`${openverseBaseUrl()}/images/`);
  url.searchParams.set("q", query);
  url.searchParams.set("license", openverseLicenses.join(","));
  url.searchParams.set("page_size", "8");
  url.searchParams.set("mature", "false");

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) throw new Error(`Openverse image search failed: ${response.status}`);
  const payload = (await response.json()) as OpenverseResponse;
  return payload.results || [];
}

async function searchPexels(query: string): Promise<OpenverseImage[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", "8");

  const response = await fetchWithTimeout(url.toString(), {
    Authorization: apiKey
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as PexelsResponse;
  return (payload.photos || []).map((photo) => ({
    id: photo.id ? String(photo.id) : undefined,
    title: photo.alt || "Pexels photo",
    alt: photo.alt,
    creator: photo.photographer,
    creator_url: photo.photographer_url,
    license: "pexels",
    license_url: "https://www.pexels.com/license/",
    url: photo.src?.large2x || photo.src?.large || photo.src?.landscape,
    thumbnail: photo.src?.landscape || photo.src?.large,
    foreign_landing_url: photo.url,
    source: "pexels",
    width: photo.width,
    height: photo.height
  }));
}

async function searchPixabay(query: string): Promise<OpenverseImage[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", "8");

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) return [];
  const payload = (await response.json()) as PixabayResponse;
  return (payload.hits || []).map((hit) => ({
    id: hit.id ? String(hit.id) : undefined,
    title: hit.tags || "Pixabay photo",
    creator: hit.user,
    license: "pixabay",
    license_url: "https://pixabay.com/service/license-summary/",
    url: hit.largeImageURL || hit.webformatURL,
    thumbnail: hit.webformatURL || hit.largeImageURL,
    foreign_landing_url: hit.pageURL,
    source: "pixabay",
    width: hit.imageWidth,
    height: hit.imageHeight
  }));
}

async function searchLicensedImages(query: string) {
  const [openverse, pexels, pixabay] = await Promise.all([
    searchOpenverse(query).catch(() => []),
    searchPexels(query).catch(() => []),
    searchPixabay(query).catch(() => [])
  ]);
  return [...pexels, ...pixabay, ...openverse];
}

function imageText(image: OpenverseImage) {
  return [image.title, image.alt, image.creator, image.source, image.foreign_landing_url, image.url, image.thumbnail]
    .filter(Boolean)
    .join(" ");
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

function stockCoverScore(post: BlogPost, cover: (typeof FREE_STOCK_COVER_LIBRARY)[number]) {
  const haystack = [post.contentType, post.newsCategory, post.topic, post.title, post.tags.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tagScore = cover.tags.reduce((score, tag) => score + (haystack.includes(tag) ? 4 : 0), 0);
  const peopleHeavyPenalty = /(team|workshop|boardroom|collaborative|planning workspace|operations desk|operational planning|startup product team|creative business)/i.test(
    cover.credit
  )
    ? 8
    : 0;

  return tagScore - peopleHeavyPenalty;
}

async function findStockCover(post: BlogPost, { allowReuse = true } = {}) {
  const ranked = FREE_STOCK_COVER_LIBRARY.map((cover, index) => ({
    cover,
    index,
    score: stockCoverScore(post, cover)
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const fresh = ranked.filter((item) => !recentlyUsedCoverUrls.has(item.cover.url));
  if (!fresh.length && !allowReuse) return null;
  const pool = fresh.length ? fresh : ranked;
  const start = selectionOffset(post, pool.length);

  for (let attempt = 0; attempt < pool.length; attempt += 1) {
    const selected = pool[(start + attempt) % pool.length].cover;
    if (!(await imageLoads(selected.url))) continue;
    recentlyUsedCoverUrls.add(selected.url);
    return selected;
  }

  return null;
}

async function imageLoads(url: string) {
  const response = await fetchWithTimeout(url).catch(() => null);
  if (!response?.ok) return false;
  const contentType = response.headers.get("content-type") || "";
  return /^image\/(jpeg|jpg|png|webp|gif)/i.test(contentType);
}

function extensionFromContentType(contentType: string) {
  if (/webp/i.test(contentType)) return "webp";
  if (/png/i.test(contentType)) return "png";
  if (/gif/i.test(contentType)) return "gif";
  return "jpg";
}

function shortHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

async function storeCoverInBlob(post: BlogPost, url: string) {
  if (!shouldStoreImagesInBlob()) return { url };

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`image fetch failed: HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!/^image\/(jpeg|jpg|png|webp|gif)/i.test(contentType)) {
      throw new Error(`image content-type is not supported: ${contentType || "unknown"}`);
    }

    const bytes = await response.arrayBuffer();
    const extension = extensionFromContentType(contentType);
    const pathname = `blog-covers/${post.language}/${post.slug || "post"}-${shortHash(url)}.${extension}`;
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "public",
      contentType,
      addRandomSuffix: false
    });
    return { url: blob.url, storedUrl: blob.url };
  } catch (error) {
    return {
      url,
      error: error instanceof Error ? `Vercel Blob image store skipped: ${error.message}` : "Vercel Blob image store skipped"
    };
  }
}

function imageScore(image: OpenverseImage) {
  let score = 0;
  if (image.url) score += 20;
  if (image.foreign_landing_url) score += 12;
  if (image.creator) score += 10;
  if (image.license && legalLicenses.includes(image.license)) score += image.license === "cc0" || image.license === "pdm" ? 20 : 12;
  if ((image.width || 0) >= 1000) score += 8;
  if ((image.height || 0) >= 650) score += 8;
  if (image.source === "flickr" || image.source === "wikimedia_commons" || image.source === "pexels" || image.source === "pixabay") {
    score += 4;
  }
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
    const images = await searchLicensedImages(query).catch(() => []);
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
  if (image.license === "pexels") return "Pexels License";
  if (image.license === "pixabay") return "Pixabay Content License";
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
    const preferredStockCover = await findStockCover(post, { allowReuse: false });
    if (preferredStockCover) {
      const stored = await storeCoverInBlob(post, preferredStockCover.url);
      return {
        ...post,
        cover: stored.url,
        coverAlt: `${post.title} - ${preferredStockCover.credit}`,
        coverPrompt: `${imageSearchQueries(post)[0] || post.title} curated free stock`,
        coverSource: "curated",
        coverCredit: preferredStockCover.credit,
        coverCreditUrl: preferredStockCover.creditUrl,
        coverLicense: preferredStockCover.license,
        coverLicenseUrl: preferredStockCover.licenseUrl,
        coverGeneration: {
          source: "curated",
          provider: preferredStockCover.provider,
          prompt: `${imageSearchQueries(post)[0] || post.title} curated free stock`,
          style: "Pinterest-inspired editorial image selection using legal free stock photography.",
          generatedAt: nowIso(),
          status: "generated",
          storedUrl: stored.storedUrl,
          error: stored.error
        }
      };
    }

    const match = await findImage(post);
    if (!match) {
      const stockCover = await findStockCover(post);
      if (!stockCover) throw new Error("No suitable open-licensed image was found.");
      const stored = await storeCoverInBlob(post, stockCover.url);

      return {
        ...post,
        cover: stored.url,
        coverAlt: `${post.title} - ${stockCover.credit}`,
        coverPrompt: `${imageSearchQueries(post)[0] || post.title} curated free stock`,
        coverSource: "curated",
        coverCredit: stockCover.credit,
        coverCreditUrl: stockCover.creditUrl,
        coverLicense: stockCover.license,
        coverLicenseUrl: stockCover.licenseUrl,
        coverGeneration: {
          source: "curated",
          provider: stockCover.provider,
          prompt: `${imageSearchQueries(post)[0] || post.title} curated free stock`,
          style: "Pinterest-inspired editorial image selection using legal free stock photography.",
          generatedAt: nowIso(),
          status: "generated",
          storedUrl: stored.storedUrl,
          error: stored.error
        }
      };
    }

    const url = match.image.thumbnail || match.image.url;
    const credit = attribution(match.image);
    const license = licenseName(match.image);
    const stored = await storeCoverInBlob(post, url);

    return {
      ...post,
      cover: stored.url,
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
        status: "generated",
        storedUrl: stored.storedUrl,
        error: stored.error
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
