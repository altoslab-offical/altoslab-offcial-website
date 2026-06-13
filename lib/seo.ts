import { SITE_LANGUAGES, blogCoverForLanguage, blogPostPath, htmlLanguage, languageLabel } from "./blog-utils";
import type { BlogPost, Project, SitePage } from "./types";
import { publicTaxonomyLabel } from "./public-taxonomy";
import { blogAuthorForPost, blogAuthorProfile } from "./blog-authors";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
export const siteName = "ALTOS LAB";
export const canonicalHost = new URL(siteUrl).host;

const defaultAlternateHosts = [
  `www.${canonicalHost.replace(/^www\./, "")}`,
  "altoslab.com",
  "www.altoslab.com",
  "altoslab-offcial-website.vercel.app",
  "altoslab-offcial-website-altoslaboffical-3015s-projects.vercel.app"
];

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
  if (path.startsWith("http")) {
    try {
      const url = new URL(path);
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === canonicalHost.toLowerCase() ||
        hostname === "altoslab-official-website.altoslab-ai.workers.dev" ||
        hostname.endsWith(".altoslab-ai.workers.dev")
      ) {
        return `${siteUrl}${url.pathname}${url.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function blogAuthorJsonLd(post: BlogPost) {
  const author = blogAuthorForPost(post);
  const profile = blogAuthorProfile(author, post.language);
  return {
    "@type": "Person",
    name: author,
    image: absoluteUrl(profile.avatar)
  };
}

export function canonicalRedirectHosts() {
  const configured = process.env.CANONICAL_REDIRECT_HOSTS?.split(",") || defaultAlternateHosts;
  return Array.from(
    new Set(
      configured
        .map((host) => host.trim().toLowerCase())
        .filter((host) => host && host !== canonicalHost.toLowerCase())
    )
  );
}

export function shouldRedirectToCanonicalHost(host: string) {
  return canonicalRedirectHosts().includes(host.split(":")[0].toLowerCase());
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
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    email: "hello@altoslab.com",
    logo: absoluteUrl("/geo-cover.png"),
    image: absoluteUrl("/geo-cover.png"),
    description: "AI implementation lab and product studio for agents, automation, AI products, CMS, search-ready content systems and applied AI research.",
    areaServed: ["Taiwan", "APAC"],
    knowsAbout: ["AI Agent", "AI product studio", "workflow automation", "AI operations", "search visibility", "generative AI"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@altoslab.com",
      contactType: "business inquiries",
      availableLanguage: SITE_LANGUAGES.map(languageLabel)
    },
    sameAs: ["https://github.com/altoslab-offical"]
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: siteName,
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "zh-Hant-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/blog?query={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function homepageWebPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/#webpage`,
    url: siteUrl,
    name: "ALTOS LAB AI Studio 人工智慧工作室",
    description:
      "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接、後台 CMS、搜尋可見度內容系統與智能行銷。",
    inLanguage: "zh-Hant-TW",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    primaryImageOfPage: absoluteUrl("/geo-cover.png")
  };
}

export function professionalServiceJsonLd() {
  const services = [
    "AI product studio",
    "AI agent implementation",
    "Workflow automation",
    "AI customer service systems",
    "CMS and backoffice development",
    "Search visibility content operations"
  ];

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/#professional-service`,
    name: siteName,
    url: siteUrl,
    image: absoluteUrl("/geo-cover.png"),
    areaServed: ["Taiwan", "APAC"],
    priceRange: "$$",
    provider: { "@id": `${siteUrl}/#organization` },
    serviceType: services,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "ALTOS LAB AI implementation services",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service,
          provider: { "@id": `${siteUrl}/#organization` }
        }
      }))
    }
  };
}

export function blogIndexItemListJsonLd(posts: BlogPost[], url: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(url),
    numberOfItems: posts.length,
    itemListElement: posts.slice(0, 20).map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(blogPostPath(post)),
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seoDescription || post.excerpt,
        image: absoluteUrl(post.cover || blogCoverForLanguage(post.language)),
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt,
        author: blogAuthorJsonLd(post),
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: htmlLanguage(post.language)
      }
    }))
  };
}

export function servicesJsonLd(projects: Project[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteName,
    url: siteUrl,
    areaServed: "Taiwan and APAC",
    serviceType: ["AI implementation", "AI product studio", "AI automation", "search visibility content operations", "CMS development"],
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
  const image = {
    url: absoluteUrl("/geo-cover.png"),
    width: 1200,
    height: 630,
    alt: "ALTOS LAB AI implementation and search visibility studio"
  };
  const publicTitle = publicTaxonomyLabel(page?.seoTitle || "ALTOS LAB｜AI 自動化、AI Agent 顧問工作室", "zh-Hant");
  const publicDescription = publicTaxonomyLabel(
    page?.seoDescription || "ALTOS LAB 協助企業導入 AI Agent、流程自動化、AI 客服、後台 CMS 與搜尋可見度內容系統。",
    "zh-Hant"
  );

  return {
    title: publicTitle,
    description: publicDescription,
    alternates: {
      canonical: siteUrl
    },
    openGraph: {
      title: publicTitle || "ALTOS LAB",
      description: publicDescription || "AI implementation studio in Taiwan.",
      url: siteUrl,
      siteName,
      locale: "zh_TW",
      type: "website",
      images: [image]
    },
    twitter: {
      card: "summary_large_image",
      title: publicTitle,
      description: publicDescription,
      images: [image]
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
    image: [absoluteUrl(post.cover || blogCoverForLanguage(post.language))],
    author: blogAuthorJsonLd(post),
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
