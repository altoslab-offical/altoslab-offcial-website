export type PublishStatus = "draft" | "published" | "archived" | "deleted";
export type ProjectStatus = "draft" | "published" | "archived";
export type ContactLeadStatus = "new" | "contacted" | "qualified" | "closed" | "spam";
export type BlogLanguage = "zh-Hant" | "en" | "ja" | "ko" | "id" | "vi" | "th" | "ms" | "fil";
export type BlogReviewStatus = "ai-draft" | "human-review" | "approved" | "needs-revision";
export type BlogGenerationSlot = "manual" | "morning" | "afternoon";
export type BlogContentType = "breaking" | "column" | "feature";
export type BlogGenerationTask = "source-planning" | "content-draft" | "quality-review" | "quality-repair";
export type BlogQualityStatus = "passed" | "held" | "failed";
export type BlogReleaseDecision = "published" | "held_for_review" | "rejected";

export type PageSectionType =
  | "hero"
  | "stats"
  | "about"
  | "services"
  | "portfolio"
  | "why-us"
  | "team"
  | "contact"
  | "blog"
  | "custom";

export type ProjectMetric = {
  id?: string;
  label: string;
  value: string;
  sortOrder?: number;
};

export type ProductContentSection = {
  id: string;
  title: string;
  eyebrow?: string;
  body: string;
  image?: string;
  sortOrder: number;
};

export type ProductPageContent = {
  heroTitle: string;
  heroSubtitle?: string;
  heroBody?: string;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  youtubeUrl?: string;
  sections: ProductContentSection[];
};

export type Project = {
  id: string;
  slug: string;
  status: ProjectStatus;
  sortOrder: number;
  tag: string;
  title: string;
  titleEn: string;
  url?: string;
  youtubeUrl?: string;
  cover: string;
  gallery: string[];
  desc: string;
  detail: string;
  productPage: ProductPageContent;
  metrics: ProjectMetric[];
  tech: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type PageSectionItem = {
  id: string;
  sectionId: string;
  status: PublishStatus;
  sortOrder: number;
  title?: string;
  eyebrow?: string;
  label?: string;
  value?: string;
  body?: string;
  icon?: string;
  mediaUrl?: string;
  url?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PageSection = {
  id: string;
  pageId: string;
  type: PageSectionType;
  key: string;
  status: PublishStatus;
  sortOrder: number;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  body?: string;
  accentText?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  mediaUrl?: string;
  items: PageSectionItem[];
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type SitePage = {
  id: string;
  slug: string;
  status: PublishStatus;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: PageSection[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogSourceLink = {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  summary?: string;
};

export type BlogLlmQualityEvaluation = {
  enabled: boolean;
  approved: boolean;
  score: number;
  threshold: number;
  model?: string;
  promptVersion?: string;
  latencyMs?: number;
  issues: string[];
  warnings: string[];
  notes?: string;
};

export type BlogGenerationTrace = {
  provider:
    | "deepseek"
    | "fallback"
    | "local"
    | "local-antigravity"
    | "gemini-chatgpt"
    | "source-translation"
    | "codex-image"
    | "chatgpt-image";
  task: BlogGenerationTask;
  model?: string;
  promptVersion?: string;
  latencyMs?: number;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
    reasoningTokens?: number;
  };
  sourceCount?: number;
  error?: string;
  attemptedAt: string;
};

export type BlogQualityChecks = {
  hasHumanReview: boolean;
  hasQualityReviewerApproval: boolean;
  hasVisibleSources: boolean;
  hasNoFabricatedClaims: boolean;
  hasSearchIntentAnswer: boolean;
  hasBilingualParity: boolean;
  hasSourceTrust?: boolean;
  hasLabsPointOfView?: boolean;
  hasCreativeAngle?: boolean;
  hasReaderEngagement?: boolean;
  hasImageFit?: boolean;
  hasAntiSlopReview?: boolean;
  hasSeoGeoReview?: boolean;
  qualityScoreBreakdown?: {
    sourceTrust: number;
    labsPointOfView: number;
    seoGeoStructure: number;
    readerEngagement?: number;
    readability: number;
    imageFit: number;
    multilingualParity: number;
  };
  qualityScore?: number;
  qualityIssues?: string[];
  seoGeoScore?: number;
  seoGeoIssues?: string[];
  antiSlopScore?: number;
  antiSlopIssues?: string[];
  llmEvaluation?: BlogLlmQualityEvaluation;
  notes?: string;
};

export type BlogCoverSource = "curated" | "manual" | "fallback" | "generated" | "source";

export type BlogCoverVisualChecks = {
  topicFit: boolean;
  noTextArtifacts: boolean;
  noLogos: boolean;
  noPeople: boolean;
  noTrademarkRisk: boolean;
  noGenericStockLook: boolean;
  brandFit?: boolean;
  editorialSpecificity?: boolean;
  visualHierarchy?: boolean;
  thumbnailReadability?: boolean;
  noCliche?: boolean;
  mobileCropResilience?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
};

export type BlogCoverGeneration = {
  source: BlogCoverSource;
  provider?: string;
  model?: string;
  prompt?: string;
  style?: string;
  generatedAt?: string;
  status?: "generated" | "skipped" | "failed";
  error?: string;
  storedUrl?: string;
  visualChecks?: BlogCoverVisualChecks;
};

export type BlogInlineImage = {
  url?: string;
  localPath?: string;
  alt: string;
  caption?: string;
  source: BlogCoverSource;
  credit?: string;
  creditUrl?: string;
  license?: string;
  licenseUrl?: string;
  aspectRatio?: "wide" | "square" | "portrait";
  placement?: "after-lead" | "mid-article" | "before-faq";
  prompt?: string;
  provider?: string;
  model?: string;
  generatedAt?: string;
  visualChecks?: BlogCoverVisualChecks;
};

export type BlogPost = {
  id: string;
  slug: string;
  status: PublishStatus;
  sortOrder: number;
  language: BlogLanguage;
  translationGroupId: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt: string;
  contentType?: BlogContentType;
  newsCategory?: string;
  topic: string;
  audience: string;
  geoSummary: string;
  body: string;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  sourceLinks: BlogSourceLink[];
  tags: string[];
  author: string;
  cover?: string;
  coverAlt?: string;
  coverPrompt?: string;
  coverSource?: BlogCoverSource;
  coverGeneration?: BlogCoverGeneration;
  coverCredit?: string;
  coverCreditUrl?: string;
  coverLicense?: string;
  coverLicenseUrl?: string;
  contentImages?: BlogInlineImage[];
  readTimeMinutes: number;
  featured: boolean;
  reviewStatus: BlogReviewStatus;
  qualityChecks: BlogQualityChecks;
  qualityStatus?: BlogQualityStatus;
  imageQualityStatus?: BlogQualityStatus;
  releaseDecision?: BlogReleaseDecision;
  qualityIssues?: string[];
  ingestRunId?: string;
  aiDisclosure?: string;
  generationDate?: string;
  generationSlot?: BlogGenerationSlot;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  generatedAt?: string;
  generatedBy?: string;
  generationTrace?: BlogGenerationTrace[];
};

export type ContactLead = {
  id: string;
  status: ContactLeadStatus;
  who: string;
  contact: string;
  message: string;
  source: "website-contact";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CmsData = {
  sitePages: SitePage[];
  projects: Project[];
  blogPosts: BlogPost[];
  contactLeads: ContactLead[];
  assets: Array<{
    id: string;
    url: string;
    folder?: string;
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
    size?: number;
    createdAt: string;
    updatedAt: string;
  }>;
};
