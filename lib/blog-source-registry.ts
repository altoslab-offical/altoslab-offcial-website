import type { BlogContentType, BlogGenerationSlot, BlogLanguage, BlogSourceLink } from "./types";

export type BlogSourceTier = "official-rss" | "official-docs" | "trusted-media" | "community-signal" | "licensed-image";

export type BlogSourceRegistryEntry = {
  id: string;
  name: string;
  url: string;
  feedUrl?: string;
  tier: BlogSourceTier;
  market: "global" | "us" | "apac" | "taiwan" | "japan" | "korea" | "europe";
  language: BlogLanguage | "multi" | "en";
  category:
    | "AI Products"
    | "Agents & Automation"
    | "AI Ops & Governance"
    | "Search & GEO"
    | "Infrastructure"
    | "Industry Workflow"
    | "Build Notes"
    | "Image Library";
  authority: number;
  freshness: number;
  notes: string;
};

export type EditorialBrief = {
  contentType: BlogContentType;
  newsCategory: string;
  topic: string;
  intent: string;
  sourceFocus: string[];
  newsRatio: number;
};

export const BLOG_CONTENT_PILLARS = [
  "AI Products",
  "Agents & Automation",
  "AI Ops & Governance",
  "Search & GEO",
  "Infrastructure",
  "Industry Workflow",
  "Build Notes"
] as const;

export const BLOG_NEWS_MIX = {
  breaking: 0.4,
  column: 0.35,
  feature: 0.25
} satisfies Record<BlogContentType, number>;

export const BLOG_SOURCE_REGISTRY: BlogSourceRegistryEntry[] = [
  {
    id: "openai-news",
    name: "OpenAI News",
    url: "https://openai.com/news/",
    feedUrl: "https://openai.com/news/rss.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 98,
    freshness: 95,
    notes: "Primary official source for ChatGPT, API, model and product launches."
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/",
    feedUrl: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 96,
    freshness: 92,
    notes: "Official Google AI product and search feature announcements."
  },
  {
    id: "google-deepmind",
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/blog/",
    feedUrl: "https://deepmind.google/blog/rss.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 98,
    freshness: 88,
    notes: "Research lab reference for model, science and safety writing."
  },
  {
    id: "anthropic-news",
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    tier: "official-docs",
    market: "global",
    language: "en",
    category: "AI Ops & Governance",
    authority: 95,
    freshness: 88,
    notes: "Official model, safety and enterprise AI updates. No stable official RSS feed is exposed, so use as a trusted source URL rather than a scheduled feed."
  },
  {
    id: "deepseek-docs",
    name: "DeepSeek API Docs",
    url: "https://api-docs.deepseek.com/",
    tier: "official-docs",
    market: "apac",
    language: "en",
    category: "Infrastructure",
    authority: 94,
    freshness: 80,
    notes: "Primary API and model behavior reference for the blog generation system."
  },
  {
    id: "huggingface-blog",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 90,
    freshness: 85,
    notes: "Open-source models, agents, datasets and applied AI implementation signals."
  },
  {
    id: "github-blog-ai",
    name: "GitHub Blog AI",
    url: "https://github.blog/ai-and-ml/",
    feedUrl: "https://github.blog/ai-and-ml/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Agents & Automation",
    authority: 88,
    freshness: 86,
    notes: "Developer tooling, coding agents and software workflow signals."
  },
  {
    id: "vercel-blog",
    name: "Vercel Blog",
    url: "https://vercel.com/blog",
    feedUrl: "https://vercel.com/blog/rss.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 86,
    freshness: 82,
    notes: "Product, infrastructure and developer experience reference."
  },
  {
    id: "google-search-central",
    name: "Google Search Central",
    url: "https://developers.google.com/search",
    tier: "official-docs",
    market: "global",
    language: "en",
    category: "Search & GEO",
    authority: 99,
    freshness: 70,
    notes: "Canonical SEO and AI Search technical guidance."
  },
  {
    id: "microsoft-ai",
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/",
    feedUrl: "https://blogs.microsoft.com/ai/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Industry Workflow",
    authority: 86,
    freshness: 84,
    notes: "Enterprise AI, Copilot and workflow adoption signal."
  },
  {
    id: "nvidia-blog-ai",
    name: "NVIDIA AI Blog",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/",
    feedUrl: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 86,
    freshness: 82,
    notes: "AI infrastructure, robotics, inference and hardware ecosystem signals."
  },
  {
    id: "aws-machine-learning-blog",
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/",
    feedUrl: "https://aws.amazon.com/blogs/machine-learning/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 84,
    freshness: 84,
    notes: "Official AWS machine learning and enterprise AI implementation signal; useful for cloud, inference, data and applied workflow market news."
  },
  {
    id: "cloudflare-ai-blog",
    name: "Cloudflare AI Blog",
    url: "https://blog.cloudflare.com/tag/ai/",
    feedUrl: "https://blog.cloudflare.com/tag/ai/rss/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 82,
    freshness: 83,
    notes: "Official Cloudflare AI, edge infrastructure and developer workflow signal."
  },
  {
    id: "arxiv-cs-ai",
    name: "arXiv cs.AI RSS",
    url: "https://arxiv.org/list/cs.AI/recent",
    feedUrl: "https://export.arxiv.org/rss/cs.AI",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 78,
    freshness: 78,
    notes: "Open research signal only; use for trend spotting and cite papers carefully, not as product news."
  },
  {
    id: "gdelt-doc-api",
    name: "GDELT DOC API",
    url: "https://api.gdeltproject.org/api/v2/doc/doc",
    tier: "community-signal",
    market: "global",
    language: "multi",
    category: "AI Ops & Governance",
    authority: 72,
    freshness: 92,
    notes: "Free real-time global news discovery API. Use only to discover source candidates; final market news still needs the original article and source-image/license checks."
  },
  {
    id: "hacker-news-api",
    name: "Hacker News API",
    url: "https://hacker-news.firebaseio.com/v0/",
    tier: "community-signal",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 68,
    freshness: 92,
    notes: "Free developer-community signal API. Use for surfacing discussed AI tools/releases, then verify with official sources before publishing."
  },
  {
    id: "semantic-scholar-api",
    name: "Semantic Scholar API",
    url: "https://api.semanticscholar.org/graph/v1/",
    tier: "community-signal",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 74,
    freshness: 78,
    notes: "Scholarly metadata API for AI research discovery. Use for source pack enrichment; do not use as a market-news image source."
  },
  {
    id: "mit-technology-review-ai",
    name: "MIT Technology Review AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/",
    feedUrl: "https://www.technologyreview.com/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Ops & Governance",
    authority: 82,
    freshness: 82,
    notes: "Market and policy context; use as secondary source, not sole proof."
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 76,
    freshness: 95,
    notes: "Fast product/startup news signal; validate major claims with official sources."
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/",
    feedUrl: "https://venturebeat.com/category/ai/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 72,
    freshness: 91,
    notes: "Fast enterprise AI/startup news signal; use for market timing, then confirm with primary sources where possible."
  },
  {
    id: "the-decoder-ai",
    name: "The Decoder",
    url: "https://the-decoder.com/",
    feedUrl: "https://the-decoder.com/feed/",
    tier: "trusted-media",
    market: "europe",
    language: "en",
    category: "AI Products",
    authority: 72,
    freshness: 88,
    notes: "AI product and research news signal with a European editorial lens; validate product claims with official sources."
  },
  {
    id: "zdnet-ai",
    name: "ZDNET AI",
    url: "https://www.zdnet.com/topic/artificial-intelligence/",
    feedUrl: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Industry Workflow",
    authority: 70,
    freshness: 86,
    notes: "Enterprise technology news signal; useful for practical adoption stories and tool availability checks."
  },
  {
    id: "ai-magazine",
    name: "AI Magazine",
    url: "https://aimagazine.com/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 74,
    freshness: 90,
    notes: "International enterprise AI news; use as translated/adapted market signal with official or technical sources for verification."
  },
  {
    id: "the-verge-ai",
    name: "The Verge AI",
    url: "https://www.theverge.com/ai-artificial-intelligence",
    feedUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 76,
    freshness: 92,
    notes: "Consumer and platform AI news; use for market timing, not technical truth alone."
  },
  {
    id: "openverse-images",
    name: "Openverse",
    url: "https://openverse.org/",
    tier: "licensed-image",
    market: "global",
    language: "multi",
    category: "Image Library",
    authority: 90,
    freshness: 65,
    notes: "Open-licensed image search source; copy license and attribution metadata."
  },
  {
    id: "wikimedia-commons",
    name: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/",
    tier: "licensed-image",
    market: "global",
    language: "multi",
    category: "Image Library",
    authority: 88,
    freshness: 62,
    notes: "Open image source; verify license and avoid off-topic historical/political images."
  },
  {
    id: "nasa-images",
    name: "NASA Image and Video Library",
    url: "https://images.nasa.gov/",
    tier: "licensed-image",
    market: "us",
    language: "en",
    category: "Image Library",
    authority: 86,
    freshness: 60,
    notes: "Public-domain science and space imagery for infrastructure/research metaphors."
  },
  {
    id: "the-met-open-access",
    name: "The Met Open Access",
    url: "https://www.metmuseum.org/art/collection",
    tier: "licensed-image",
    market: "us",
    language: "en",
    category: "Image Library",
    authority: 84,
    freshness: 45,
    notes: "Public-domain art images for editorial metaphor; avoid when topic needs concrete tech image."
  }
];

const editorialCycle: Record<Extract<BlogGenerationSlot, "morning" | "afternoon">, BlogContentType[]> = {
  morning: ["breaking", "column", "breaking", "feature", "breaking", "column", "breaking", "column", "feature", "breaking"],
  afternoon: ["column", "feature", "breaking", "column", "feature", "column", "feature", "breaking", "column", "feature"]
};

export function registryFeedsFromEnv() {
  const configured = (process.env.BLOG_TREND_SOURCES || "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);
  if (configured.length) return configured.slice(0, 18);

  return BLOG_SOURCE_REGISTRY
    .filter((source) => source.feedUrl && source.tier !== "licensed-image")
    .sort((a, b) => b.freshness - a.freshness || b.authority - a.authority)
    .map((source) => source.feedUrl as string)
    .slice(0, 18);
}

export function registryTrustedHostFragments() {
  return BLOG_SOURCE_REGISTRY.flatMap((source) => {
    try {
      const hosts = [new URL(source.url).hostname.replace(/^www\./, "")];
      if (source.feedUrl) hosts.push(new URL(source.feedUrl).hostname.replace(/^www\./, ""));
      return hosts;
    } catch {
      return [];
    }
  });
}

export function sourceRegistryEntryForUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return BLOG_SOURCE_REGISTRY.find((source) => {
      const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
      const feedHost = source.feedUrl ? new URL(source.feedUrl).hostname.replace(/^www\./, "") : "";
      return host === sourceHost || host.endsWith(`.${sourceHost}`) || (feedHost && (host === feedHost || host.endsWith(`.${feedHost}`)));
    });
  } catch {
    return undefined;
  }
}

export function enrichSourceLink(source: BlogSourceLink): BlogSourceLink {
  const registry = sourceRegistryEntryForUrl(source.url);
  return {
    ...source,
    publisher: source.publisher || registry?.name
  };
}

export function sourceAuthorityScore(url: string) {
  return sourceRegistryEntryForUrl(url)?.authority || 50;
}

export function sourceFreshnessScore(url: string) {
  return sourceRegistryEntryForUrl(url)?.freshness || 50;
}

export function pickEditorialBrief(slot: BlogGenerationSlot = "manual", date = new Date()): EditorialBrief {
  const normalizedSlot = slot === "afternoon" ? "afternoon" : "morning";
  const dayIndex = Math.floor(date.getTime() / 86_400_000) % editorialCycle[normalizedSlot].length;
  const contentType = slot === "manual" ? "column" : editorialCycle[normalizedSlot][dayIndex];

  if (contentType === "breaking") {
    return {
      contentType,
      newsCategory: "AI 快訊",
      topic: "Latest AI product, model, agent and search news signals",
      intent:
        "understand the latest AI market news quickly, verify the source trail, and decide whether it changes product, workflow, SEO or GEO priorities",
      sourceFocus: ["official-rss", "trusted-media"],
      newsRatio: BLOG_NEWS_MIX.breaking
    };
  }

  if (contentType === "feature") {
    return {
      contentType,
      newsCategory: "AI 專題研究",
      topic: "AI implementation systems, agent operations and search visibility research",
      intent:
        "turn recent AI source signals into a durable ALTOS LAB research essay with mechanism, comparison, risks, implementation steps and GEO-friendly citations",
      sourceFocus: ["official-rss", "official-docs"],
      newsRatio: BLOG_NEWS_MIX.feature
    };
  }

  return {
    contentType,
    newsCategory: "AI 專欄",
    topic: "AI market signals translated into product and operating decisions",
    intent:
      "answer one concrete operator question from recent AI news and translate it into product, agent, automation, SEO/GEO and workflow decisions",
    sourceFocus: ["official-rss", "trusted-media"],
    newsRatio: BLOG_NEWS_MIX.column
  };
}
