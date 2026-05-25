import { blogPostPath, htmlLanguage } from "./blog-utils";
import type { BlogPost, Project, SitePage } from "./types";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
export const siteName = "ALTOS LAB";

const verificationEnv = {
  google: "GOOGLE_SITE_VERIFICATION",
  bing: "BING_SITE_VERIFICATION",
  yandex: "YANDEX_SITE_VERIFICATION",
  yahoo: "YAHOO_SITE_VERIFICATION",
  pinterest: "PINTEREST_SITE_VERIFICATION",
  facebook: "FACEBOOK_DOMAIN_VERIFICATION"
} as const;

function envValue(key: string) {
  return process.env[key]?.trim() || "";
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function searchVerificationValues() {
  return {
    google: envValue(verificationEnv.google),
    bing: envValue(verificationEnv.bing),
    yandex: envValue(verificationEnv.yandex),
    yahoo: envValue(verificationEnv.yahoo),
    pinterest: envValue(verificationEnv.pinterest),
    facebook: envValue(verificationEnv.facebook)
  };
}

export function hasSearchVerificationConfigured() {
  return Object.values(searchVerificationValues()).some(Boolean);
}

export function searchVerificationMetadata() {
  const values = searchVerificationValues();
  const other: Record<string, string> = {};

  if (values.bing) other["msvalidate.01"] = values.bing;
  if (values.pinterest) other["p:domain_verify"] = values.pinterest;
  if (values.facebook) other["facebook-domain-verification"] = values.facebook;

  const verification = {
    ...(values.google ? { google: values.google } : {}),
    ...(values.yandex ? { yandex: values.yandex } : {}),
    ...(values.yahoo ? { yahoo: values.yahoo } : {}),
    ...(Object.keys(other).length ? { other } : {})
  };

  return Object.keys(verification).length ? verification : undefined;
}

export function searchVerificationMetaTags() {
  const values = searchVerificationValues();
  const tags = [
    values.google ? ["google-site-verification", values.google] : null,
    values.bing ? ["msvalidate.01", values.bing] : null,
    values.yandex ? ["yandex-verification", values.yandex] : null,
    values.yahoo ? ["y_key", values.yahoo] : null,
    values.pinterest ? ["p:domain_verify", values.pinterest] : null,
    values.facebook ? ["facebook-domain-verification", values.facebook] : null
  ].filter(Boolean) as Array<[string, string]>;

  return tags
    .map(([name, content]) => `<meta name="${name}" content="${escapeHtmlAttribute(content)}" />`)
    .join("\n    ");
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    email: "hello@altoslab.com",
    description: "AI implementation studio for AI agents, automation, CMS, SEO and GEO content systems.",
    areaServed: ["Taiwan", "APAC"],
    knowsAbout: ["AI Agent", "AI customer service", "workflow automation", "SEO", "GEO", "generative AI"],
    sameAs: ["https://github.com/altoslab-offical"]
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    inLanguage: "zh-Hant-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/blog?query={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function servicesJsonLd(projects: Project[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteName,
    url: siteUrl,
    areaServed: "Taiwan and APAC",
    serviceType: ["AI implementation", "AI automation", "GEO content operations", "CMS development"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "ALTOS LAB AI services",
      itemListElement: projects.slice(0, 6).map((project) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: project.title,
          description: project.desc,
          url: absoluteUrl(`/projects/${project.slug}`)
        }
      }))
    }
  };
}

export function pageMetadata(page: SitePage | null) {
  return {
    title: page?.seoTitle || "ALTOS LAB｜AI 自動化、AI Agent 與 GEO 顧問工作室",
    description:
      page?.seoDescription ||
      "ALTOS LAB 協助企業導入 AI Agent、流程自動化、AI 客服、後台 CMS 與 GEO 內容系統。",
    alternates: {
      canonical: siteUrl
    },
    openGraph: {
      title: page?.seoTitle || "ALTOS LAB",
      description: page?.seoDescription || "AI implementation studio in Taiwan.",
      url: siteUrl,
      siteName,
      locale: "zh_TW",
      type: "website"
    }
  };
}

export function articleJsonLd(post: BlogPost) {
  const sourceCitations = post.sourceLinks.map((source) => ({
    "@type": "CreativeWork",
    name: source.title,
    url: source.url,
    publisher: source.publisher ? { "@type": "Organization", name: source.publisher } : undefined,
    datePublished: source.publishedAt
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.cover ? [absoluteUrl(post.cover)] : undefined,
    author: { "@type": "Organization", name: post.author || siteName },
    publisher: { "@type": "Organization", name: siteName },
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: absoluteUrl(blogPostPath(post)),
    inLanguage: htmlLanguage(post.language),
    keywords: post.tags.join(", "),
    about: post.topic,
    citation: sourceCitations.length ? sourceCitations : undefined,
    isAccessibleForFree: true
  };
}

export function faqJsonLd(post: BlogPost) {
  if (!post.faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };
}
