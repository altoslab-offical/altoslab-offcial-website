import type { BlogLanguage } from "./types";

const SEARCH_CITATION_LABELS: Record<BlogLanguage, string> = {
  "zh-Hant": "AI 搜尋引用",
  en: "AI search visibility",
  ja: "AI検索での引用",
  ko: "AI 검색 인용"
};

const SEARCH_CONTENT_LABELS: Record<BlogLanguage, string> = {
  "zh-Hant": "搜尋可見度",
  en: "search visibility",
  ja: "検索での見え方",
  ko: "검색 가시성"
};

export function publicTaxonomyLabel(value: string | undefined, language: BlogLanguage) {
  const label = String(value || "").trim();
  if (!label) return "";

  return label
    .replace(/GEO\s*Hero\s*AI\s*能見度平台/gi, "AI 搜尋能見度平台")
    .replace(/GEO\s*Hero\s*Visibility\s*Platform/gi, "AI Search Visibility Platform")
    .replace(/\bGEO\s*Platform\b/gi, "AI search visibility platform")
    .replace(/\bSEO\s*\/\s*GEO\b/gi, SEARCH_CONTENT_LABELS[language])
    .replace(/\bSearch\s*&\s*GEO\b/gi, "Search & citation")
    .replace(/AI\s*搜尋與\s*GEO/gi, SEARCH_CITATION_LABELS["zh-Hant"])
    .replace(/AI\s*search\s*and\s*GEO/gi, SEARCH_CITATION_LABELS.en)
    .replace(/AI検索とGEO/gi, SEARCH_CITATION_LABELS.ja)
    .replace(/AI\s*검색과\s*GEO/gi, SEARCH_CITATION_LABELS.ko)
    .replace(/\bGEO\b/g, SEARCH_CITATION_LABELS[language])
    .replace(/\bSEO\b/g, SEARCH_CONTENT_LABELS[language]);
}

export function publicTaxonomyLabels(values: string[], language: BlogLanguage) {
  const seen = new Set<string>();
  return values
    .map((value) => publicTaxonomyLabel(value, language))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
