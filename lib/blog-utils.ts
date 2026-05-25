import type { BlogLanguage, BlogPost, BlogQualityChecks, BlogSourceLink } from "./types";

export const BLOG_LANGUAGES: BlogLanguage[] = ["zh-Hant", "en"];

export function blogPostPath(postOrSlug: BlogPost | string, language?: BlogLanguage) {
  const slug = typeof postOrSlug === "string" ? postOrSlug : postOrSlug.slug;
  const lang = language ?? (typeof postOrSlug === "string" ? "zh-Hant" : postOrSlug.language);
  return lang === "en" ? `/en/blog/${slug}` : `/blog/${slug}`;
}

export function blogIndexPath(language: BlogLanguage) {
  return language === "en" ? "/en/blog" : "/blog";
}

export function alternateBlogLanguage(language: BlogLanguage): BlogLanguage {
  return language === "en" ? "zh-Hant" : "en";
}

export function languageLabel(language: BlogLanguage) {
  return language === "en" ? "English" : "繁體中文";
}

export function htmlLanguage(language: BlogLanguage) {
  return language === "en" ? "en" : "zh-Hant-TW";
}

export function metadataLanguageKey(language: BlogLanguage) {
  return language === "en" ? "en" : "zh-Hant-TW";
}

export function estimateReadTimeMinutes(text: string, language: BlogLanguage = "zh-Hant") {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return 1;

  if (language === "en") {
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  const cjkChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (trimmed.replace(/[\u4e00-\u9fff]/g, " ").match(/[a-z0-9]+/gi) || []).length;
  return Math.max(1, Math.ceil((cjkChars + latinWords * 1.4) / 500));
}

export function defaultQualityChecks(patch?: Partial<BlogQualityChecks>): BlogQualityChecks {
  return {
    hasHumanReview: false,
    hasVisibleSources: false,
    hasNoFabricatedClaims: false,
    hasSearchIntentAnswer: false,
    hasBilingualParity: false,
    ...patch
  };
}

export function normalizeSourceLinks(sourceLinks?: BlogSourceLink[]) {
  return (sourceLinks || [])
    .map((source) => ({
      title: String(source.title || source.url || "").trim(),
      url: String(source.url || "").trim(),
      publisher: source.publisher ? String(source.publisher).trim() : undefined,
      publishedAt: source.publishedAt ? String(source.publishedAt).trim() : undefined
    }))
    .filter((source) => source.title && /^https?:\/\//.test(source.url))
    .slice(0, 8);
}

export function taiwanDate(input = new Date()) {
  const tw = new Date(input.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const year = tw.getFullYear();
  const month = String(tw.getMonth() + 1).padStart(2, "0");
  const day = String(tw.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
