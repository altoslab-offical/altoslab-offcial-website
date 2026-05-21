import { unstable_noStore as noStore } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { seedData } from "./seed";
import type {
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

const DATA_PATH = path.join(process.cwd(), "data", "cms.json");
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
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as CmsData;
  } catch {
    return JSON.parse(JSON.stringify(seedData)) as CmsData;
  }
}

export async function writeCmsData(data: CmsData) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

export async function getPublishedBlogPost(slug: string) {
  const data = await readCmsData();
  return data.blogPosts.find((post) => post.slug === slug && post.status === "published") ?? null;
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

export function normalizeBlogPostInput(input: Partial<BlogPost>, existing?: BlogPost): BlogPost {
  const time = nowIso();
  const title = input.title ?? existing?.title ?? "New AI Blog Post";
  const status = input.status ?? existing?.status ?? "draft";

  return {
    id: existing?.id ?? createId("post"),
    slug: input.slug || existing?.slug || slugify(title),
    status,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 100),
    title,
    seoTitle: input.seoTitle ?? existing?.seoTitle ?? title,
    seoDescription: input.seoDescription ?? existing?.seoDescription ?? input.excerpt ?? existing?.excerpt ?? "",
    excerpt: input.excerpt ?? existing?.excerpt ?? "",
    topic: input.topic ?? existing?.topic ?? "AI transformation",
    audience: input.audience ?? existing?.audience ?? "企業主與營運團隊",
    geoSummary: input.geoSummary ?? existing?.geoSummary ?? "",
    body: input.body ?? existing?.body ?? "",
    keyTakeaways: input.keyTakeaways ?? existing?.keyTakeaways ?? [],
    faqs: input.faqs ?? existing?.faqs ?? [],
    tags: input.tags ?? existing?.tags ?? ["AI", "GEO"],
    author: input.author ?? existing?.author ?? "ALTOS LAB",
    cover: input.cover ?? existing?.cover ?? "/geo-cover.png",
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
  if (!post.faqs.length) errors.push("at least one FAQ is required for GEO");
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
