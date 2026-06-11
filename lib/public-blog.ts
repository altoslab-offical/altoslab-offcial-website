import {
  blogAuthorForPost,
  publicCoverCreditForPost
} from "./blog-authors";
import { publicTaxonomyLabel, publicTaxonomyLabels } from "./public-taxonomy";
import type { BlogPost } from "./types";

export type PublicBlogPost = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "status"
  | "sortOrder"
  | "language"
  | "translationGroupId"
  | "title"
  | "seoTitle"
  | "seoDescription"
  | "excerpt"
  | "contentType"
  | "newsCategory"
  | "topic"
  | "audience"
  | "geoSummary"
  | "body"
  | "keyTakeaways"
  | "faqs"
  | "sourceLinks"
  | "tags"
  | "author"
  | "cover"
  | "coverAlt"
  | "coverSource"
  | "coverCredit"
  | "coverCreditUrl"
  | "coverLicense"
  | "coverLicenseUrl"
  | "contentImages"
  | "readTimeMinutes"
  | "featured"
  | "createdAt"
  | "updatedAt"
  | "publishedAt"
>;

export function toPublicBlogPost(post: BlogPost): PublicBlogPost {
  const publicCoverCredit = publicCoverCreditForPost(post);
  const canExposeCoverAttribution = Boolean(publicCoverCredit && publicCoverCredit === post.coverCredit);

  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    sortOrder: post.sortOrder,
    language: post.language,
    translationGroupId: post.translationGroupId,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: publicTaxonomyLabel(post.newsCategory, post.language),
    topic: post.topic,
    audience: post.audience,
    geoSummary: post.geoSummary,
    body: post.body,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    tags: publicTaxonomyLabels(post.tags, post.language),
    author: blogAuthorForPost(post),
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    coverCredit: publicCoverCredit || undefined,
    coverCreditUrl: canExposeCoverAttribution ? post.coverCreditUrl : undefined,
    coverLicense: canExposeCoverAttribution ? post.coverLicense : undefined,
    coverLicenseUrl: canExposeCoverAttribution ? post.coverLicenseUrl : undefined,
    contentImages: post.contentImages || [],
    readTimeMinutes: post.readTimeMinutes,
    featured: post.featured,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt
  };
}

export function toPublicBlogListPost(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    sortOrder: post.sortOrder,
    language: post.language,
    translationGroupId: post.translationGroupId,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: publicTaxonomyLabel(post.newsCategory, post.language),
    topic: post.topic,
    audience: post.audience,
    geoSummary: post.geoSummary,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    tags: publicTaxonomyLabels(post.tags, post.language),
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    readTimeMinutes: post.readTimeMinutes,
    featured: post.featured,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt
  };
}

export function toPublicBlogInventoryPost(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    sortOrder: post.sortOrder,
    language: post.language,
    translationGroupId: post.translationGroupId,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: publicTaxonomyLabel(post.newsCategory, post.language),
    topic: post.topic,
    geoSummary: post.geoSummary,
    tags: publicTaxonomyLabels(post.tags, post.language),
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    readTimeMinutes: post.readTimeMinutes,
    featured: post.featured,
    createdAt: post.createdAt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt
  };
}
