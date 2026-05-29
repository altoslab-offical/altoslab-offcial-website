import type { BlogContentType, BlogLanguage, BlogPost, BlogQualityChecks, BlogSourceLink } from "./types";

export const BLOG_LANGUAGES: BlogLanguage[] = ["zh-Hant", "en", "ja", "ko"];

const BLOG_LANGUAGE_CONFIG: Record<
  BlogLanguage,
  { indexPath: string; html: string; metadata: string; label: string; shortLabel: string; cover: string }
> = {
  "zh-Hant": {
    indexPath: "/blog",
    html: "zh-Hant-TW",
    metadata: "zh-Hant-TW",
    label: "繁體中文",
    shortLabel: "中文",
    cover: "/blog-cover-zh-hant.png"
  },
  en: {
    indexPath: "/en/blog",
    html: "en",
    metadata: "en",
    label: "English",
    shortLabel: "EN",
    cover: "/blog-cover-en.png"
  },
  ja: {
    indexPath: "/ja/blog",
    html: "ja",
    metadata: "ja",
    label: "日本語",
    shortLabel: "日本語",
    cover: "/blog-cover-ja.png"
  },
  ko: {
    indexPath: "/ko/blog",
    html: "ko",
    metadata: "ko",
    label: "한국어",
    shortLabel: "한국어",
    cover: "/blog-cover-ko.png"
  }
};

const BLOG_CONTENT_TYPE_LABELS: Record<BlogLanguage, Record<BlogContentType, string>> = {
  "zh-Hant": {
    breaking: "市場快訊",
    column: "專欄",
    feature: "專題"
  },
  en: {
    breaking: "Brief",
    column: "Column",
    feature: "Feature"
  },
  ja: {
    breaking: "市場ブリーフ",
    column: "コラム",
    feature: "特集"
  },
  ko: {
    breaking: "시장 브리프",
    column: "칼럼",
    feature: "기획"
  }
};

export function blogSlugPathSegment(slug: string) {
  return encodeURIComponent(slug);
}

export function blogPostPath(postOrSlug: BlogPost | string, language?: BlogLanguage) {
  const slug = typeof postOrSlug === "string" ? postOrSlug : postOrSlug.slug;
  const lang = language ?? (typeof postOrSlug === "string" ? "zh-Hant" : postOrSlug.language);
  const pathSlug = blogSlugPathSegment(slug);
  return `${BLOG_LANGUAGE_CONFIG[lang].indexPath}/${pathSlug}`;
}

export function blogIndexPath(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].indexPath;
}

export function alternateBlogLanguage(language: BlogLanguage): BlogLanguage {
  return language === "zh-Hant" ? "en" : "zh-Hant";
}

export function languageLabel(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].label;
}

export function languageShortLabel(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].shortLabel;
}

export function blogContentTypeLabel(contentType: BlogContentType, language: BlogLanguage) {
  return BLOG_CONTENT_TYPE_LABELS[language]?.[contentType] || BLOG_CONTENT_TYPE_LABELS.en[contentType];
}

export function htmlLanguage(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].html;
}

export function metadataLanguageKey(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].metadata;
}

export function blogCoverForLanguage(language: BlogLanguage) {
  return BLOG_LANGUAGE_CONFIG[language].cover;
}

export function estimateReadTimeMinutes(text: string, language: BlogLanguage = "zh-Hant") {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return 1;

  if (language === "en") {
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    return Math.max(3, Math.ceil(words / 220));
  }

  const cjkChars = (trimmed.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/g) || []).length;
  const latinWords = (trimmed.replace(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/g, " ").match(/[a-z0-9]+/gi) || []).length;
  return Math.max(3, Math.ceil((cjkChars + latinWords * 1.4) / 500));
}

export function defaultQualityChecks(patch?: Partial<BlogQualityChecks>): BlogQualityChecks {
  return {
    hasHumanReview: false,
    hasQualityReviewerApproval: false,
    hasVisibleSources: false,
    hasNoFabricatedClaims: false,
    hasSearchIntentAnswer: false,
    hasBilingualParity: false,
    hasAntiSlopReview: false,
    ...patch
  };
}

export function normalizeSourceLinks(sourceLinks?: BlogSourceLink[]) {
  return (sourceLinks || [])
    .map((source) => ({
      title: String(source.title || source.url || "").trim(),
      url: String(source.url || "").trim(),
      publisher: source.publisher ? String(source.publisher).trim() : undefined,
      publishedAt: source.publishedAt ? String(source.publishedAt).trim() : undefined,
      summary: source.summary ? String(source.summary).trim() : undefined
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
