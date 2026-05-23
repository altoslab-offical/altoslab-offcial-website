import type { PageSection, SitePage } from "./types";

export const homeNavigation = [
  { label: "關於我們", href: "#about" },
  { label: "服務項目", href: "#services" },
  { label: "專案介紹", href: "#portfolio" },
  { label: "合作洽談", href: "#contact" }
];

export function getSection(page: SitePage, key: string) {
  return page.sections.find((section) => section.key === key);
}

export function getRequiredSection(page: SitePage, key: string): PageSection {
  const section = getSection(page, key);
  if (!section) {
    throw new Error(`Missing required home section: ${key}`);
  }
  return section;
}

export function getSectionSetting<T>(section: PageSection | undefined, key: string, fallback: T): T {
  const value = section?.settings?.[key];
  return value === undefined ? fallback : (value as T);
}

export function sectionItems(section: PageSection | undefined) {
  return section?.items ?? [];
}

export const siteSignals = [
  { label: "AI Skill", value: "可部署的能力模組" },
  { label: "AI Agent", value: "能串流程的智能代理" },
  { label: "CMS Ready", value: "內容與案例可後台管理" }
];

export const designSystemModules = [
  "tokens",
  "section objects",
  "project objects",
  "contact leads",
  "admin API"
];
