import { unstable_noStore as noStore } from "next/cache";
import {
  BLOG_LANGUAGES,
  blogCoverForLanguage,
  defaultQualityChecks,
  estimateReadTimeMinutes,
  normalizeSourceLinks
} from "./blog-utils";
import { normalizeBlogAuthor, publicCoverCreditForPost, publicEditorialReviewNote } from "./blog-authors";
import { getCloudflareKvConfig, getCloudflareKvNamespace } from "./cloudflare-kv";
import { readCmsDataFromStorage, writeCmsDataToStorage } from "./cms-storage";
import { seedData } from "./seed";
import type {
  BlogLanguage,
  BlogInlineImage,
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
const PUBLIC_CMS_CACHE_TTL_MS = 15_000;
const PUBLIC_BLOG_CACHE_TTL_MS = 60_000;
const PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE = Number(process.env.PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE || 80);

let publicRawCmsCache: { data: CmsData; expiresAt: number } | null = null;
let publicBlogPostsCache: { posts: BlogPost[]; expiresAt: number } | null = null;

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
  const raw = await readPublicRawCmsData();
  return hydrateCmsData(raw);
}

async function readPublicRawCmsData(): Promise<CmsData> {
  noStore();
  if (publicRawCmsCache && publicRawCmsCache.expiresAt > Date.now()) {
    return publicRawCmsCache.data;
  }

  try {
    const data = await readCmsDataFromStorage();
    publicRawCmsCache = { data, expiresAt: Date.now() + PUBLIC_CMS_CACHE_TTL_MS };
    return data;
  } catch (error) {
    console.warn(
      "[cms] Falling back to seed CMS data for public read:",
      error instanceof Error ? error.message : error
    );
    const data = cloneSeedData();
    publicRawCmsCache = { data, expiresAt: Date.now() + PUBLIC_CMS_CACHE_TTL_MS };
    return data;
  }
}

export async function writeCmsData(data: CmsData) {
  publicRawCmsCache = null;
  publicBlogPostsCache = null;
  await writeCmsDataToStorage(data);
  await writePublicBlogCacheFromData(data).catch((error) => {
    console.warn("[cms] Unable to refresh public blog cache:", error instanceof Error ? error.message : error);
  });
}

export async function mutateCmsData<T>(mutator: (data: CmsData) => T | Promise<T>): Promise<T> {
  const data = await readCmsData();
  const result = await mutator(data);
  await writeCmsData(data);
  return result;
}

export async function mutateRawCmsData<T>(mutator: (data: CmsData) => T | Promise<T>): Promise<T> {
  const data = await readCmsDataFromStorage();
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

const INLINE_FAQ_HEADINGS = new Set([
  "常見問題",
  "FAQ",
  "FAQs",
  "Frequently Asked Questions",
  "よくある質問",
  "자주 묻는 질문",
  "Pertanyaan Umum",
  "Câu hỏi thường gặp",
  "คำถามที่พบบ่อย",
  "Soalan Lazim"
]);

function normalizeContentImage(image: Partial<BlogInlineImage>): BlogInlineImage | null {
  const url = typeof image.url === "string" ? image.url.trim() : undefined;
  const localPath = typeof image.localPath === "string" ? image.localPath.trim() : undefined;
  const alt = typeof image.alt === "string" ? image.alt.trim() : "";
  if (!alt || (!url && !localPath)) return null;
  const aspectRatio =
    image.aspectRatio === "square" || image.aspectRatio === "portrait" || image.aspectRatio === "wide"
      ? image.aspectRatio
      : "wide";
  const placement =
    image.placement === "after-lead" || image.placement === "before-faq" || image.placement === "mid-article"
      ? image.placement
      : "mid-article";

  return {
    ...(url ? { url } : {}),
    ...(localPath ? { localPath } : {}),
    alt,
    caption: typeof image.caption === "string" ? image.caption.trim() : undefined,
    source: image.source || "manual",
    credit: typeof image.credit === "string" ? image.credit.trim() : undefined,
    creditUrl: typeof image.creditUrl === "string" ? image.creditUrl.trim() : undefined,
    license: typeof image.license === "string" ? image.license.trim() : undefined,
    licenseUrl: typeof image.licenseUrl === "string" ? image.licenseUrl.trim() : undefined,
    aspectRatio,
    placement,
    prompt: typeof image.prompt === "string" ? image.prompt.trim() : undefined,
    provider: typeof image.provider === "string" ? image.provider.trim() : undefined,
    model: typeof image.model === "string" ? image.model.trim() : undefined,
    generatedAt: typeof image.generatedAt === "string" ? image.generatedAt.trim() : undefined,
    visualChecks: image.visualChecks
  };
}

function normalizeContentImages(images?: Partial<BlogInlineImage>[]) {
  return (Array.isArray(images) ? images : []).map(normalizeContentImage).filter(Boolean) as BlogInlineImage[];
}

function publicContentImages(images?: BlogInlineImage[]) {
  return (images || []).map(({ url, alt, caption, source, credit, creditUrl, license, licenseUrl, aspectRatio, placement }) => ({
    url,
    alt,
    caption,
    source,
    credit,
    creditUrl,
    license,
    licenseUrl,
    aspectRatio,
    placement
  }));
}

function stripInlineFaqSection(body: string, hasStructuredFaqs: boolean) {
  if (!hasStructuredFaqs || !body.includes("##")) return body;

  const lines = body.split(/\r?\n/);
  const faqStart = lines.findIndex((line) => {
    const match = line.match(/^##\s+(.+?)\s*$/);
    return match ? INLINE_FAQ_HEADINGS.has(match[1].trim()) : false;
  });

  if (faqStart < 0) return body;

  const faqEnd = lines.findIndex((line, index) => index > faqStart && /^##\s+/.test(line));
  const nextSectionIndex = faqEnd >= 0 ? faqEnd : lines.length;
  const before = lines.slice(0, faqStart);
  const after = lines.slice(nextSectionIndex);

  return [...before, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function hydrateBlogPost(post: BlogPost): BlogPost {
  const language = normalizeBlogLanguage(post.language);
  const body = stripInlineFaqSection(post.body || "", Boolean(post.faqs?.length));
  const sourceLinks = normalizeSourceLinks(post.sourceLinks);
  const estimatedReadTime = estimateReadTimeMinutes(body, language);
  const author = normalizeBlogAuthor(post.author, {
    slot: post.generationSlot,
    seed: post.translationGroupId || post.ingestRunId || post.slug
  });
  const editorialReviewNote = /AI[-\s]?generated|AI-assisted|AI 內容揭露|AI 協助|AI 生成|AI 開示|AI公開|AI公開|自動品質|automated quality/i.test(
    post.aiDisclosure || ""
  )
    ? publicEditorialReviewNote(language)
    : post.aiDisclosure || publicEditorialReviewNote(language);
  const coverSource = post.coverSource ?? (post.generatedBy ? "fallback" : "manual");
  const coverCredit = publicCoverCreditForPost({
    coverCredit: post.coverCredit,
    coverSource,
    language
  });
  const contentImages = normalizeContentImages(post.contentImages);

  return {
    ...post,
    language,
    author,
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
    qualityStatus: post.qualityStatus,
    imageQualityStatus: post.imageQualityStatus,
    releaseDecision: post.releaseDecision,
    qualityIssues: post.qualityIssues,
    ingestRunId: post.ingestRunId,
    aiDisclosure: editorialReviewNote,
    generationDate: post.generationDate,
    generationSlot: post.generationSlot,
    scheduledFor: post.scheduledFor,
    coverAlt: post.coverAlt,
    coverPrompt: post.coverPrompt,
    coverSource,
    coverGeneration: post.coverGeneration,
    coverCredit,
    coverCreditUrl: post.coverCreditUrl,
    coverLicense: post.coverLicense,
    coverLicenseUrl: post.coverLicenseUrl,
    contentImages,
    generationTrace: post.generationTrace
  };
}

function hydrateCmsData(data: CmsData): CmsData {
  return {
    ...data,
    blogPosts: data.blogPosts.map(hydrateBlogPost)
  };
}

function publicBlogCacheKey() {
  const config = getCloudflareKvConfig();
  return config ? `${config.cmsPathname}:public-blog:v1` : "";
}

function containsUnicodeReplacement(value: unknown): boolean {
  return typeof value === "string" ? value.includes("\uFFFD") : JSON.stringify(value).includes("\uFFFD");
}

function compactPublicBlogPost(post: BlogPost): BlogPost {
  return {
    ...post,
    coverPrompt: undefined,
    coverGeneration: post.coverGeneration
      ? {
          source: post.coverGeneration.source,
          provider: post.coverGeneration.provider,
          generatedAt: post.coverGeneration.generatedAt,
          status: post.coverGeneration.status,
          storedUrl: post.coverGeneration.storedUrl
        }
      : undefined,
    contentImages: publicContentImages(post.contentImages),
    qualityIssues: post.qualityIssues?.slice(0, 8) || [],
    qualityChecks: defaultQualityChecks({
      hasHumanReview: post.qualityChecks.hasHumanReview,
      hasQualityReviewerApproval: post.qualityChecks.hasQualityReviewerApproval,
      hasVisibleSources: post.qualityChecks.hasVisibleSources,
      hasNoFabricatedClaims: post.qualityChecks.hasNoFabricatedClaims,
      hasSearchIntentAnswer: post.qualityChecks.hasSearchIntentAnswer,
      hasBilingualParity: post.qualityChecks.hasBilingualParity,
      hasSourceTrust: post.qualityChecks.hasSourceTrust,
      hasLabsPointOfView: post.qualityChecks.hasLabsPointOfView,
      hasCreativeAngle: post.qualityChecks.hasCreativeAngle,
      hasReaderEngagement: post.qualityChecks.hasReaderEngagement,
      hasImageFit: post.qualityChecks.hasImageFit,
      hasAntiSlopReview: post.qualityChecks.hasAntiSlopReview,
      hasSeoGeoReview: post.qualityChecks.hasSeoGeoReview,
      qualityScore: post.qualityChecks.qualityScore,
      seoGeoScore: post.qualityChecks.seoGeoScore,
      antiSlopScore: post.qualityChecks.antiSlopScore
    }),
    generationTrace: undefined
  };
}

function publicBlogPostsFromData(data: CmsData) {
  const published = data.blogPosts
    .filter((post) => post.status === "published")
    .map(hydrateBlogPost)
    .map(compactPublicBlogPost);

  return BLOG_LANGUAGES.flatMap((language) =>
    sortedByOrder(published.filter((post) => normalizeBlogLanguage(post.language) === language)).slice(
      0,
      PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE
    )
  );
}

async function readPublicBlogCache() {
  if (publicBlogPostsCache && publicBlogPostsCache.expiresAt > Date.now()) return publicBlogPostsCache.posts;

  const namespace = getCloudflareKvNamespace();
  const key = publicBlogCacheKey();
  if (!namespace || !key) return null;

  const raw = await namespace.get(key).catch(() => null);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { posts?: BlogPost[] };
    if (!Array.isArray(parsed.posts)) return null;
    if (containsUnicodeReplacement(parsed.posts)) {
      await namespace.delete(key).catch(() => undefined);
      console.warn("[cms] Public blog cache contains replacement characters; rebuilding from CMS data.");
      return null;
    }
    publicBlogPostsCache = { posts: parsed.posts, expiresAt: Date.now() + PUBLIC_BLOG_CACHE_TTL_MS };
    return parsed.posts;
  } catch (error) {
    console.warn("[cms] Public blog cache is unreadable:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function writePublicBlogCacheFromData(data: CmsData) {
  const namespace = getCloudflareKvNamespace();
  const key = publicBlogCacheKey();
  if (!namespace || !key) return;

  const posts = publicBlogPostsFromData(data);
  await namespace.put(
    key,
    JSON.stringify({
      version: 1,
      updatedAt: nowIso(),
      limitPerLanguage: PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE,
      posts
    }),
    {
      metadata: {
        contentType: "application/json",
        updatedAt: nowIso(),
        source: "cms-public-blog-cache"
      }
    }
  );
  publicBlogPostsCache = { posts, expiresAt: Date.now() + PUBLIC_BLOG_CACHE_TTL_MS };
}

async function readPublishedBlogPostsForPublic() {
  const cached = await readPublicBlogCache();
  if (cached) return cached;

  const data = await readPublicRawCmsData();
  const posts = publicBlogPostsFromData(data);
  await writePublicBlogCacheFromData(data).catch((error) => {
    console.warn("[cms] Unable to rebuild public blog cache:", error instanceof Error ? error.message : error);
  });
  return posts;
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
  const data = await readPublicRawCmsData();
  const page = data.sitePages.find((item) => item.slug === "home" && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedPage(slug: string) {
  const data = await readPublicRawCmsData();
  const page = data.sitePages.find((item) => item.slug === slug && item.status === "published");
  return page ? toPublicPage(page) : null;
}

export async function getPublishedProjects() {
  const data = await readPublicRawCmsData();
  return sortedByOrder(data.projects.filter((project) => project.status === "published"));
}

export async function getPublishedProject(slug: string) {
  const data = await readPublicRawCmsData();
  return data.projects.find((project) => project.slug === slug && project.status === "published") ?? null;
}

export async function getPublishedBlogPosts() {
  return sortedByOrder(await readPublishedBlogPostsForPublic());
}

export async function getPublishedBlogPostsByLanguage(language?: BlogLanguage) {
  const posts = await readPublishedBlogPostsForPublic();
  return sortedByOrder(
    posts.filter((post) => post.status === "published" && (!language || normalizeBlogLanguage(post.language) === language))
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
  const posts = await readPublishedBlogPostsForPublic();
  const post = posts.find(
    (item) =>
      matchesBlogSlug(item.slug, slug) &&
      item.status === "published" &&
      (!language || normalizeBlogLanguage(item.language) === language)
  );
  return post || null;
}

export async function getPublishedBlogAlternates(post: BlogPost) {
  const posts = await readPublishedBlogPostsForPublic();
  return posts.filter(
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
  const posts = await readPublishedBlogPostsForPublic();
  const tagSet = new Set(post.tags.map((tag) => tag.toLowerCase()));
  const sourceHosts = new Set(blogSourceHosts(post));
  return posts
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
  const contentImages = normalizeContentImages(input.contentImages ?? existing?.contentImages);
  const author = normalizeBlogAuthor(input.author ?? existing?.author, {
    slot: input.generationSlot ?? existing?.generationSlot,
    seed: input.translationGroupId ?? existing?.translationGroupId ?? input.slug ?? existing?.slug
  });
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
    author,
    cover: input.cover ?? existing?.cover ?? blogCoverForLanguage(language),
    coverAlt: input.coverAlt ?? existing?.coverAlt ?? `${title} cover image`,
    coverPrompt: input.coverPrompt ?? existing?.coverPrompt,
    coverSource: input.coverSource ?? existing?.coverSource ?? "manual",
    coverGeneration: input.coverGeneration ?? existing?.coverGeneration,
    coverCredit: input.coverCredit ?? existing?.coverCredit,
    coverCreditUrl: input.coverCreditUrl ?? existing?.coverCreditUrl,
    coverLicense: input.coverLicense ?? existing?.coverLicense,
    coverLicenseUrl: input.coverLicenseUrl ?? existing?.coverLicenseUrl,
    contentImages,
    readTimeMinutes: Math.max(estimatedReadTime, Number(input.readTimeMinutes ?? existing?.readTimeMinutes ?? 0) || 0),
    featured: Boolean(input.featured ?? existing?.featured ?? false),
    reviewStatus: input.reviewStatus ?? existing?.reviewStatus ?? "ai-draft",
    qualityChecks,
    qualityStatus: input.qualityStatus ?? existing?.qualityStatus,
    imageQualityStatus: input.imageQualityStatus ?? existing?.imageQualityStatus,
    releaseDecision: input.releaseDecision ?? existing?.releaseDecision,
    qualityIssues: input.qualityIssues ?? existing?.qualityIssues,
    ingestRunId: input.ingestRunId ?? existing?.ingestRunId,
    aiDisclosure:
      input.aiDisclosure ??
      existing?.aiDisclosure ??
      publicEditorialReviewNote(language),
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
  if (post.generatedBy && !post.sourceLinks.length) errors.push("generated posts require at least one source link");
  const hasApprovedCoverSource =
    post.coverSource === "curated" ||
    post.coverSource === "generated" ||
    post.coverSource === "manual" ||
    post.coverSource === "source";
  if (post.generatedBy && !hasApprovedCoverSource) {
    errors.push("generated posts require a topic-matched curated, generated, source or human-approved manual cover before publishing");
  }
  if (post.generatedBy && hasApprovedCoverSource && !post.coverCredit) {
    errors.push("generated posts require cover attribution before publishing");
  }
  if (post.generatedBy && post.contentType === "breaking" && post.coverSource !== "source") {
    errors.push("market news posts require a source article cover image before publishing");
  }
  if (post.generatedBy && post.coverSource === "source" && (!post.coverCreditUrl || !post.coverLicense)) {
    errors.push("source cover images require public credit URL and source-rights metadata before publishing");
  }
  if (post.generatedBy && post.coverSource === "generated" && !post.coverGeneration?.prompt) {
    errors.push("generated cover images require the stored generation prompt before publishing");
  }
  if (post.generatedBy && post.coverSource === "generated" && !post.coverGeneration?.provider) {
    errors.push("generated cover images require the image provider before publishing");
  }
  if (post.generatedBy && (post.contentType === "column" || post.contentType === "feature")) {
    const contentImages = post.contentImages || [];
    if (contentImages.length < 2) {
      errors.push("column and feature posts require at least two in-article images before publishing");
    }
    if (contentImages.length > 3) {
      errors.push("column and feature posts should use no more than three in-article images");
    }
    contentImages.forEach((image, index) => {
      if (!image.url) errors.push(`content image ${index + 1} requires a public URL`);
      if (image.url && !/^https:\/\//.test(image.url)) {
        errors.push(`content image ${index + 1} must use a public https URL`);
      }
      if (!image.alt || image.alt.trim().length < 18) {
        errors.push(`content image ${index + 1} requires descriptive alt text`);
      }
      if (image.source === "generated" && !/(chatgpt|gpt|openai)/i.test(image.provider || "")) {
        errors.push(`content image ${index + 1} must be generated through ChatGPT/GPT`);
      }
    });
  }
  if (post.generatedBy && post.qualityStatus && post.qualityStatus !== "passed") {
    errors.push("generated posts require qualityStatus passed before publishing");
  }
  if (post.generatedBy && post.imageQualityStatus && post.imageQualityStatus !== "passed") {
    errors.push("generated posts require imageQualityStatus passed before publishing");
  }
  if (
    post.generatedBy &&
    !post.qualityChecks.hasHumanReview &&
    !post.qualityChecks.hasQualityReviewerApproval
  ) {
    errors.push("generated posts require human review or quality reviewer approval before publishing");
  }
  if (post.generatedBy && !post.qualityChecks.hasAntiSlopReview) {
    errors.push("generated posts require anti-slop writing review before publishing");
  }
  if (
    post.generatedBy &&
    typeof post.qualityChecks.antiSlopScore === "number" &&
    post.qualityChecks.antiSlopScore < 35
  ) {
    errors.push("generated posts require anti-slop score 35/50 or higher before publishing");
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
