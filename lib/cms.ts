import { unstable_noStore as noStore } from "next/cache";
import {
  BLOG_LANGUAGES,
  blogCoverForLanguage,
  defaultQualityChecks,
  estimateReadTimeMinutes,
  normalizeSourceLinks
} from "./blog-utils";
import { readCmsDataFromStorage, writeCmsDataToStorage } from "./cms-storage";
import { seedData } from "./seed";
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

function cloneSeedData(): CmsData {
  return JSON.parse(JSON.stringify(seedData)) as CmsData;
}

async function readPublicCmsData(): Promise<CmsData> {
  try {
    return await readCmsData();
  } catch (error) {
    console.warn(
      "[cms] Falling back to seed CMS data for public read:",
      error instanceof Error ? error.message : error
    );
    return hydrateCmsData(cloneSeedData());
  }
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
  const estimatedReadTime = estimateReadTimeMinutes(body, language);

  return {
    ...post,
    language,
    translationGroupId: post.translationGroupId || `seed-${post.slug}`,
    sourceLinks,
    readTimeMinutes: Math.max(estimatedReadTime, Number(post.readTimeMinutes || 0) || 0),
    featured: Boolean(post.featured),
    reviewStatus: post.reviewStatus || (post.generatedBy ? "ai-draft" : "approved"),
    qualityChecks: defaultQualityChecks({
      hasHumanReview: Boolean(post.qualityChecks?.hasHumanReview ?? !post.generatedBy),
      hasQualityReviewerApproval: Boolean(post.qualityChecks?.hasQualityReviewerApproval ?? false),
      hasVisibleSources: Boolean(post.qualityChecks?.hasVisibleSources ?? sourceLinks.length > 0),
      hasNoFabricatedClaims: Boolean(post.qualityChecks?.hasNoFabricatedClaims ?? !post.generatedBy),
      hasSearchIntentAnswer: Boolean(post.qualityChecks?.hasSearchIntentAnswer ?? post.geoSummary),
      hasBilingualParity: Boolean(post.qualityChecks?.hasBilingualParity ?? false),
      hasSourceTrust: Boolean(post.qualityChecks?.hasSourceTrust ?? false),
      hasLabsPointOfView: Boolean(post.qualityChecks?.hasLabsPointOfView ?? false),
      hasCreativeAngle: Boolean(post.qualityChecks?.hasCreativeAngle ?? false),
      hasImageFit: Boolean(post.qualityChecks?.hasImageFit ?? Boolean(post.cover && post.coverAlt)),
      hasAntiSlopReview: Boolean(post.qualityChecks?.hasAntiSlopReview ?? (!post.generatedBy || post.status === "published")),
      qualityScoreBreakdown: post.qualityChecks?.qualityScoreBreakdown,
      qualityScore: post.qualityChecks?.qualityScore,
      qualityIssues: post.qualityChecks?.qualityIssues,
      antiSlopScore: post.qualityChecks?.antiSlopScore,
      antiSlopIssues: post.qualityChecks?.antiSlopIssues,
      llmEvaluation: post.qualityChecks?.llmEvaluation,
      notes: post.qualityChecks?.notes
    }),
    aiDisclosure: post.aiDisclosure,
    generationDate: post.generationDate,
    generationSlot: post.generationSlot,
    scheduledFor: post.scheduledFor,
    coverAlt: post.coverAlt,
    coverPrompt: post.coverPrompt,
    coverSource: post.coverSource ?? (post.generatedBy ? "fallback" : "manual"),
    coverGeneration: post.coverGeneration,
    coverCredit: post.coverCredit,
    coverCreditUrl: post.coverCreditUrl,
    coverLicense: post.coverLicense,
    coverLicenseUrl: post.coverLicenseUrl,
    generationTrace: post.generationTrace
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
  const data = await readPublicCmsData();
  const page = data.sitePages.find((item) => item.slug === "home" && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedPage(slug: string) {
  const data = await readPublicCmsData();
  const page = data.sitePages.find((item) => item.slug === slug && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedProjects() {
  const data = await readPublicCmsData();
  return sortedByOrder(data.projects.filter((project) => project.status === "published"));
}

export async function getPublishedProject(slug: string) {
  const data = await readPublicCmsData();
  return data.projects.find((project) => project.slug === slug && project.status === "published") ?? null;
}

export async function getPublishedBlogPosts() {
  const data = await readPublicCmsData();
  return sortedByOrder(data.blogPosts.filter((post) => post.status === "published"));
}

export async function getPublishedBlogPostsByLanguage(language?: BlogLanguage) {
  const data = await readPublicCmsData();
  return sortedByOrder(
    data.blogPosts.filter(
      (post) => post.status === "published" && (!language || normalizeBlogLanguage(post.language) === language)
    )
  );
}

function decodeSlugCandidate(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function matchesBlogSlug(postSlug: string, requestedSlug: string) {
  return (
    postSlug === requestedSlug ||
    postSlug === decodeSlugCandidate(requestedSlug) ||
    encodeURIComponent(postSlug) === requestedSlug
  );
}

export async function getPublishedBlogPost(slug: string, language?: BlogLanguage) {
  const data = await readPublicCmsData();
  return (
    data.blogPosts.find(
      (post) =>
        matchesBlogSlug(post.slug, slug) &&
        post.status === "published" &&
        (!language || normalizeBlogLanguage(post.language) === language)
    ) ?? null
  );
}

export async function getPublishedBlogAlternates(post: BlogPost) {
  const data = await readPublicCmsData();
  return data.blogPosts.filter(
    (item) =>
      item.status === "published" &&
      item.translationGroupId === post.translationGroupId &&
      item.id !== post.id
  );
}

function blogSourceHosts(post: BlogPost) {
  return post.sourceLinks
    .map((source) => {
      try {
        return new URL(source.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export async function getRelatedPublishedBlogPosts(post: BlogPost, limit = 4) {
  const data = await readPublicCmsData();
  const tagSet = new Set(post.tags.map((tag) => tag.toLowerCase()));
  const sourceHosts = new Set(blogSourceHosts(post));
  return data.blogPosts
    .filter((item) => item.status === "published" && item.id !== post.id && normalizeBlogLanguage(item.language) === post.language)
    .map((item) => {
      const sharedTags = item.tags.filter((tag) => tagSet.has(tag.toLowerCase())).length;
      const sharedSources = blogSourceHosts(item).filter((host) => sourceHosts.has(host)).length;
      const categoryMatch = item.newsCategory && item.newsCategory === post.newsCategory ? 2 : 0;
      const typeMatch = item.contentType === post.contentType ? 1 : 0;
      const recency = Math.max(0, 1_000_000_000_000 - Math.abs(new Date(item.updatedAt).getTime() - new Date(post.updatedAt).getTime())) / 1_000_000_000_000;
      return {
        item,
        score: sharedTags * 3 + sharedSources * 2 + categoryMatch + typeMatch + recency
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime())
    .slice(0, limit)
    .map(({ item }) => item);
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
  const estimatedReadTime = estimateReadTimeMinutes(body, language);
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
    contentType: input.contentType ?? existing?.contentType ?? "column",
    newsCategory: input.newsCategory ?? existing?.newsCategory ?? "AI 趨勢",
    topic: input.topic ?? existing?.topic ?? "AI transformation",
    audience: input.audience ?? existing?.audience ?? "企業主與營運團隊",
    geoSummary: input.geoSummary ?? existing?.geoSummary ?? "",
    body,
    keyTakeaways: input.keyTakeaways ?? existing?.keyTakeaways ?? [],
    faqs: input.faqs ?? existing?.faqs ?? [],
    sourceLinks,
    tags: input.tags ?? existing?.tags ?? ["AI", "GEO"],
    author: input.author ?? existing?.author ?? "ALTOS LAB",
    cover: input.cover ?? existing?.cover ?? blogCoverForLanguage(language),
    coverAlt: input.coverAlt ?? existing?.coverAlt ?? `${title} cover image`,
    coverPrompt: input.coverPrompt ?? existing?.coverPrompt,
    coverSource: input.coverSource ?? existing?.coverSource ?? "manual",
    coverGeneration: input.coverGeneration ?? existing?.coverGeneration,
    coverCredit: input.coverCredit ?? existing?.coverCredit,
    coverCreditUrl: input.coverCreditUrl ?? existing?.coverCreditUrl,
    coverLicense: input.coverLicense ?? existing?.coverLicense,
    coverLicenseUrl: input.coverLicenseUrl ?? existing?.coverLicenseUrl,
    readTimeMinutes: Math.max(estimatedReadTime, Number(input.readTimeMinutes ?? existing?.readTimeMinutes ?? 0) || 0),
    featured: Boolean(input.featured ?? existing?.featured ?? false),
    reviewStatus: input.reviewStatus ?? existing?.reviewStatus ?? "ai-draft",
    qualityChecks,
    aiDisclosure:
      input.aiDisclosure ??
      existing?.aiDisclosure ??
      "This draft may be assisted by AI and should be reviewed by ALTOS LAB before publication.",
    generationDate: input.generationDate ?? existing?.generationDate,
    generationSlot: input.generationSlot ?? existing?.generationSlot,
    scheduledFor: input.scheduledFor ?? existing?.scheduledFor,
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
    publishedAt: status === "published" ? existing?.publishedAt ?? time : existing?.publishedAt,
    generatedAt: input.generatedAt ?? existing?.generatedAt,
    generatedBy: input.generatedBy ?? existing?.generatedBy,
    generationTrace: input.generationTrace ?? existing?.generationTrace
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
  if (!post.contentType) errors.push("contentType is required");
  if (!post.newsCategory) errors.push("newsCategory is required");
  if (!post.body) errors.push("body is required");
  if (!post.geoSummary) errors.push("geoSummary is required");
  if (!post.cover) errors.push("cover is required");
  if (!post.language) errors.push("language is required");
  if (!post.translationGroupId) errors.push("translationGroupId is required");
  if (!post.readTimeMinutes) errors.push("readTimeMinutes is required");
  if (!post.faqs.length) errors.push("at least one visible FAQ is required for GEO");
  if (post.generatedBy && !post.sourceLinks.length) errors.push("AI-generated posts require at least one source link");
  if (post.generatedBy && post.coverSource !== "curated") {
    errors.push("AI-generated posts require a topic-matched legally sourced cover before publishing");
  }
  if (post.generatedBy && post.coverSource === "curated" && !post.coverCredit) {
    errors.push("AI-generated posts require cover attribution before publishing");
  }
  if (
    post.generatedBy &&
    !post.qualityChecks.hasHumanReview &&
    !post.qualityChecks.hasQualityReviewerApproval
  ) {
    errors.push("AI-generated posts require human review or quality reviewer approval before publishing");
  }
  if (post.generatedBy && !post.qualityChecks.hasAntiSlopReview) {
    errors.push("AI-generated posts require anti-slop writing review before publishing");
  }
  if (
    post.generatedBy &&
    typeof post.qualityChecks.antiSlopScore === "number" &&
    post.qualityChecks.antiSlopScore < 35
  ) {
    errors.push("AI-generated posts require anti-slop score 35/50 or higher before publishing");
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
