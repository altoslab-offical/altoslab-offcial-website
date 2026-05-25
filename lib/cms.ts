import { unstable_noStore as noStore } from "next/cache";
import {
  BLOG_LANGUAGES,
  defaultQualityChecks,
  estimateReadTimeMinutes,
  normalizeSourceLinks
} from "./blog-utils";
import { readCmsDataFromStorage, writeCmsDataToStorage } from "./cms-storage";
import type {
  BlogLanguage,
  BlogPost,
  CmsData,
  ContactLead,
  ContactLeadStatus,
  PageSection,
  PageSectionItem,
  Project,
  PublishStatus,
  SitePage
} from "./types";

const PUBLIC_STATUSES = new Set(["published"]);

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(input: string) {
  const normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || `post-${Date.now().toString(36)}`;
}

export async function readCmsData(): Promise<CmsData> {
  noStore();
  const data = await readCmsDataFromStorage();
  return hydrateCmsData(data);
}

export async function writeCmsData(data: CmsData) {
  await writeCmsDataToStorage(data);
}

export async function mutateCmsData<T>(mutator: (data: CmsData) => T | Promise<T>): Promise<T> {
  const data = await readCmsData();
  const result = await mutator(data);
  await writeCmsData(data);
  return result;
}

export function sortedByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function visibleStatus(status: PublishStatus | Project["status"]) {
  return PUBLIC_STATUSES.has(status);
}

function hydrateBlogPost(post: BlogPost): BlogPost {
  const language = normalizeBlogLanguage(post.language);
  const body = post.body || "";
  const sourceLinks = normalizeSourceLinks(post.sourceLinks);

  return {
    ...post,
    language,
    translationGroupId: post.translationGroupId || `seed-${post.slug}`,
    sourceLinks,
    readTimeMinutes: Number(post.readTimeMinutes || estimateReadTimeMinutes(body, language)),
    featured: Boolean(post.featured),
    reviewStatus: post.reviewStatus || (post.generatedBy ? "ai-draft" : "approved"),
    qualityChecks: defaultQualityChecks({
      hasHumanReview: Boolean(post.qualityChecks?.hasHumanReview ?? !post.generatedBy),
      hasVisibleSources: Boolean(post.qualityChecks?.hasVisibleSources ?? sourceLinks.length > 0),
      hasNoFabricatedClaims: Boolean(post.qualityChecks?.hasNoFabricatedClaims ?? !post.generatedBy),
      hasSearchIntentAnswer: Boolean(post.qualityChecks?.hasSearchIntentAnswer ?? post.geoSummary),
      hasBilingualParity: Boolean(post.qualityChecks?.hasBilingualParity ?? false),
      notes: post.qualityChecks?.notes
    }),
    aiDisclosure: post.aiDisclosure,
    generationDate: post.generationDate
  };
}

function hydrateCmsData(data: CmsData): CmsData {
  return {
    ...data,
    blogPosts: data.blogPosts.map(hydrateBlogPost)
  };
}

export function toPublicPage(page: SitePage): SitePage {
  return {
    ...page,
    sections: sortedByOrder(
      page.sections
        .filter((section) => visibleStatus(section.status))
        .map((section) => ({
          ...section,
          items: sortedByOrder(section.items.filter((item) => visibleStatus(item.status)))
        }))
    )
  };
}

export async function getPublishedHomePage() {
  const data = await readCmsData();
  const page = data.sitePages.find((item) => item.slug === "home" && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedPage(slug: string) {
  const data = await readCmsData();
  const page = data.sitePages.find((item) => item.slug === slug && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedProjects() {
  const data = await readCmsData();
  return sortedByOrder(data.projects.filter((project) => project.status === "published"));
}

export async function getPublishedProject(slug: string) {
  const data = await readCmsData();
  return data.projects.find((project) => project.slug === slug && project.status === "published") ?? null;
}

export async function getPublishedBlogPosts() {
  const data = await readCmsData();
  return sortedByOrder(data.blogPosts.filter((post) => post.status === "published"));
}

export async function getPublishedBlogPostsByLanguage(language?: BlogLanguage) {
  const data = await readCmsData();
  return sortedByOrder(
    data.blogPosts.filter(
      (post) => post.status === "published" && (!language || normalizeBlogLanguage(post.language) === language)
    )
  );
}

export async function getPublishedBlogPost(slug: string, language?: BlogLanguage) {
  const data = await readCmsData();
  return (
    data.blogPosts.find(
      (post) =>
        post.slug === slug &&
        post.status === "published" &&
        (!language || normalizeBlogLanguage(post.language) === language)
    ) ?? null
  );
}

export async function getPublishedBlogAlternates(post: BlogPost) {
  const data = await readCmsData();
  return data.blogPosts.filter(
    (item) =>
      item.status === "published" &&
      item.translationGroupId === post.translationGroupId &&
      item.id !== post.id
  );
}

export function normalizePageInput(input: Partial<SitePage>): Partial<SitePage> {
  return {
    ...input,
    updatedAt: nowIso(),
    publishedAt: input.status === "published" ? input.publishedAt ?? nowIso() : input.publishedAt
  };
}

export function normalizeProjectInput(input: Partial<Project>, existing?: Project): Project {
  const time = nowIso();
  const title = input.title ?? existing?.title ?? "New Project";
  const status = input.status ?? existing?.status ?? "draft";

  return {
    id: existing?.id ?? createId("proj"),
    slug: input.slug || existing?.slug || slugify(title),
    status,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 100),
    tag: input.tag ?? existing?.tag ?? "AI",
    title,
    titleEn: input.titleEn ?? existing?.titleEn ?? title,
    url: input.url ?? existing?.url,
    youtubeUrl: input.youtubeUrl ?? existing?.youtubeUrl,
    cover: input.cover ?? existing?.cover ?? "/geo-cover.png",
    gallery: input.gallery ?? existing?.gallery ?? [],
    desc: input.desc ?? existing?.desc ?? "",
    detail: input.detail ?? existing?.detail ?? "",
    productPage: input.productPage ?? existing?.productPage ?? { heroTitle: title, sections: [] },
    metrics: input.metrics ?? existing?.metrics ?? [],
    tech: input.tech ?? existing?.tech ?? [],
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
    publishedAt: status === "published" ? existing?.publishedAt ?? time : existing?.publishedAt
  };
}

function normalizeBlogLanguage(language?: string): BlogLanguage {
  return BLOG_LANGUAGES.includes(language as BlogLanguage) ? (language as BlogLanguage) : "zh-Hant";
}

export function normalizeBlogPostInput(input: Partial<BlogPost>, existing?: BlogPost): BlogPost {
  const time = nowIso();
  const title = input.title ?? existing?.title ?? "New AI Blog Post";
  const status = input.status ?? existing?.status ?? "draft";
  const language = normalizeBlogLanguage(input.language ?? existing?.language);
  const body = input.body ?? existing?.body ?? "";
  const sourceLinks = normalizeSourceLinks(input.sourceLinks ?? existing?.sourceLinks);
  const qualityChecks = defaultQualityChecks({
    ...existing?.qualityChecks,
    ...input.qualityChecks,
    hasVisibleSources:
      input.qualityChecks?.hasVisibleSources ??
      existing?.qualityChecks?.hasVisibleSources ??
      sourceLinks.length > 0
  });

  return {
    id: existing?.id ?? createId("post"),
    slug: input.slug || existing?.slug || slugify(title),
    status,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 100),
    language,
    translationGroupId:
      input.translationGroupId ?? existing?.translationGroupId ?? createId("translation"),
    title,
    seoTitle: input.seoTitle ?? existing?.seoTitle ?? title,
    seoDescription: input.seoDescription ?? existing?.seoDescription ?? input.excerpt ?? existing?.excerpt ?? "",
    excerpt: input.excerpt ?? existing?.excerpt ?? "",
    topic: input.topic ?? existing?.topic ?? "AI transformation",
    audience: input.audience ?? existing?.audience ?? "企業主與營運團隊",
    geoSummary: input.geoSummary ?? existing?.geoSummary ?? "",
    body,
    keyTakeaways: input.keyTakeaways ?? existing?.keyTakeaways ?? [],
    faqs: input.faqs ?? existing?.faqs ?? [],
    sourceLinks,
    tags: input.tags ?? existing?.tags ?? ["AI", "GEO"],
    author: input.author ?? existing?.author ?? "ALTOS LAB",
    cover: input.cover ?? existing?.cover ?? "/geo-cover.png",
    readTimeMinutes: Number(
      input.readTimeMinutes ?? existing?.readTimeMinutes ?? estimateReadTimeMinutes(body, language)
    ),
    featured: Boolean(input.featured ?? existing?.featured ?? false),
    reviewStatus: input.reviewStatus ?? existing?.reviewStatus ?? "ai-draft",
    qualityChecks,
    aiDisclosure:
      input.aiDisclosure ??
      existing?.aiDisclosure ??
      "This draft may be assisted by AI and should be reviewed by ALTOS LAB before publication.",
    generationDate: input.generationDate ?? existing?.generationDate,
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
    publishedAt: status === "published" ? existing?.publishedAt ?? time : existing?.publishedAt,
    generatedAt: input.generatedAt ?? existing?.generatedAt,
    generatedBy: input.generatedBy ?? existing?.generatedBy
  };
}

export function createContactLead(input: Pick<ContactLead, "who" | "contact" | "message">): ContactLead {
  const time = nowIso();
  return {
    id: createId("lead"),
    status: "new",
    who: input.who.trim(),
    contact: input.contact.trim(),
    message: input.message.trim(),
    source: "website-contact",
    createdAt: time,
    updatedAt: time
  };
}

export function updateLeadStatus(lead: ContactLead, status: ContactLeadStatus, note?: string): ContactLead {
  return {
    ...lead,
    status,
    note: note ?? lead.note,
    updatedAt: nowIso()
  };
}

export function publishValidationForProject(project: Project) {
  const errors: string[] = [];
  if (!project.slug) errors.push("slug is required");
  if (!project.title) errors.push("title is required");
  if (!project.titleEn) errors.push("titleEn is required");
  if (!project.tag) errors.push("tag is required");
  if (!project.cover) errors.push("cover is required");
  if (!project.desc) errors.push("desc is required");
  if (!project.metrics.length) errors.push("at least one metric is required");
  if (!project.tech.length) errors.push("at least one tech label is required");
  return errors;
}

export function publishValidationForBlogPost(post: BlogPost) {
  const errors: string[] = [];
  if (!post.slug) errors.push("slug is required");
  if (!post.title) errors.push("title is required");
  if (!post.excerpt) errors.push("excerpt is required");
  if (!post.body) errors.push("body is required");
  if (!post.geoSummary) errors.push("geoSummary is required");
  if (!post.language) errors.push("language is required");
  if (!post.translationGroupId) errors.push("translationGroupId is required");
  if (!post.readTimeMinutes) errors.push("readTimeMinutes is required");
  if (!post.faqs.length) errors.push("at least one visible FAQ is required for GEO");
  if (post.generatedBy && !post.sourceLinks.length) errors.push("AI-generated posts require at least one source link");
  if (post.generatedBy && !post.qualityChecks.hasHumanReview) {
    errors.push("AI-generated posts require human review before publishing");
  }
  return errors;
}

export function normalizeSection(section: PageSection): PageSection {
  return {
    ...section,
    sortOrder: Number(section.sortOrder),
    updatedAt: nowIso(),
    publishedAt: section.status === "published" ? section.publishedAt ?? nowIso() : section.publishedAt,
    items: section.items.map((item) => normalizeSectionItem(item, section.id))
  };
}

export function normalizeSectionItem(item: PageSectionItem, sectionId: string): PageSectionItem {
  return {
    ...item,
    sectionId,
    sortOrder: Number(item.sortOrder),
    updatedAt: nowIso()
  };
}
