export type PublishStatus = "draft" | "published" | "archived" | "deleted";
export type ProjectStatus = "draft" | "published" | "archived";
export type ContactLeadStatus = "new" | "contacted" | "qualified" | "closed" | "spam";

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

export type BlogPost = {
  id: string;
  slug: string;
  status: PublishStatus;
  sortOrder: number;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt: string;
  topic: string;
  audience: string;
  geoSummary: string;
  body: string;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  tags: string[];
  author: string;
  cover?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  generatedAt?: string;
  generatedBy?: string;
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
