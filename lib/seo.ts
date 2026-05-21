import type { BlogPost, Project, SitePage } from "./types";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
export const siteName = "ALTOS LAB";

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
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
    knowsAbout: ["AI Agent", "AI customer service", "workflow automation", "SEO", "GEO", "generative AI"]
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
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    inLanguage: "zh-Hant-TW",
    keywords: post.tags.join(", ")
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
