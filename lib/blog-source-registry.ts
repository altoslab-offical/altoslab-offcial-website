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
  breaking: 0.775,
  column: 0.225,
  feature: 0
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
    id: "microsoft-azure-ai",
    name: "Microsoft Azure AI Blog",
    url: "https://azure.microsoft.com/en-us/blog/product/azure-ai/",
    feedUrl: "https://azure.microsoft.com/en-us/blog/product/azure-ai/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 88,
    freshness: 88,
    notes: "Official Azure AI product, platform and enterprise deployment announcements. Use for cloud AI, governance, model deployment and workflow integration stories."
  },
  {
    id: "microsoft-research",
    name: "Microsoft Research",
    url: "https://www.microsoft.com/en-us/research/",
    feedUrl: "https://www.microsoft.com/en-us/research/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 87,
    freshness: 82,
    notes: "Official research and applied science signal. Use for source enrichment and substantial AI research items, not thin product recaps."
  },
  {
    id: "microsoft-worklab",
    name: "Microsoft WorkLab",
    url: "https://www.microsoft.com/en-us/worklab/",
    tier: "official-docs",
    market: "global",
    language: "en",
    category: "Industry Workflow",
    authority: 88,
    freshness: 80,
    notes: "Microsoft's official workplace research channel for AI, agents, productivity and organization-design signals."
  },
  {
    id: "stanford-hai",
    name: "Stanford HAI",
    url: "https://hai.stanford.edu/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Ops & Governance",
    authority: 92,
    freshness: 76,
    notes: "Academic AI adoption, governance and AI Index research used for source-backed columns."
  },
  {
    id: "harvard-business-review",
    name: "Harvard Business Review",
    url: "https://hbr.org/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Industry Workflow",
    authority: 90,
    freshness: 74,
    notes: "Management and organization-design source for workplace, leadership and AI adoption analysis."
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
    id: "meta-ai-blog",
    name: "Meta AI Blog",
    url: "https://ai.meta.com/blog/",
    tier: "official-docs",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 90,
    freshness: 86,
    notes: "Official Meta AI model, Llama, research and product announcements. No stable feed is currently used by the scanner; keep as trusted official source and host verifier."
  },
  {
    id: "mistral-news",
    name: "Mistral AI News",
    url: "https://mistral.ai/news/",
    tier: "official-docs",
    market: "europe",
    language: "en",
    category: "AI Products",
    authority: 88,
    freshness: 86,
    notes: "Official Mistral model, product and enterprise AI announcements. Use as official verification when a trusted media source surfaces the same event."
  },
  {
    id: "cohere-blog",
    name: "Cohere Blog",
    url: "https://cohere.com/blog",
    tier: "official-docs",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 84,
    freshness: 78,
    notes: "Official enterprise AI, model and deployment blog. The public page is trusted, but the scanner does not treat its HTML page as a scheduled feed."
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
    id: "google-cloud-ai-blog",
    name: "Google Cloud AI & Machine Learning Blog",
    url: "https://cloud.google.com/blog/products/ai-machine-learning",
    feedUrl: "https://cloudblog.withgoogle.com/products/ai-machine-learning/rss/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 87,
    freshness: 88,
    notes: "Official Google Cloud AI, Gemini, data and enterprise deployment signal. Prefer concrete product, infra, customer workflow and governance updates."
  },
  {
    id: "google-research-blog",
    name: "Google Research Blog",
    url: "https://research.google/blog/",
    feedUrl: "https://research.google/blog/rss/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 90,
    freshness: 80,
    notes: "Official Google research feed. Use for substantial AI research signals and connect to product/workflow implications only when the source facts support it."
  },
  {
    id: "apple-machine-learning-research",
    name: "Apple Machine Learning Research",
    url: "https://machinelearning.apple.com/",
    feedUrl: "https://machinelearning.apple.com/rss.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 86,
    freshness: 72,
    notes: "Official Apple ML research signal. Use for Apple Intelligence, on-device AI and privacy-preserving model stories when the item is public and source-backed."
  },
  {
    id: "engineering-at-meta",
    name: "Engineering at Meta",
    url: "https://engineering.fb.com/",
    feedUrl: "https://engineering.fb.com/feed/",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 84,
    freshness: 78,
    notes: "Official Meta engineering feed. Use for infrastructure, AI systems, Llama operations and developer workflow stories; avoid generic corporate posts."
  },
  {
    id: "weaviate-blog",
    name: "Weaviate Blog",
    url: "https://weaviate.io/blog",
    feedUrl: "https://weaviate.io/blog/rss.xml",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 78,
    freshness: 82,
    notes: "Vector database and RAG implementation signal. Use for retrieval, agent memory, search infrastructure and applied enterprise AI architecture stories."
  },
  {
    id: "stripe-blog",
    name: "Stripe Blog",
    url: "https://stripe.com/blog",
    feedUrl: "https://stripe.com/blog/feed.rss",
    tier: "official-rss",
    market: "global",
    language: "en",
    category: "Industry Workflow",
    authority: 84,
    freshness: 76,
    notes: "Official product and business infrastructure signal. Use only when the item connects to AI agents, checkout automation, platform tooling or growth operations."
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
    name: "Hacker News Algolia API",
    url: "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story",
    tier: "community-signal",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 68,
    freshness: 92,
    notes: "Free developer-community signal API. Use for surfacing discussed AI tools/releases, then verify with official or trusted media sources before publishing."
  },
  {
    id: "techmeme",
    name: "Techmeme",
    url: "https://www.techmeme.com/",
    feedUrl: "https://www.techmeme.com/feed.xml",
    tier: "community-signal",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 74,
    freshness: 96,
    notes: "High-velocity tech aggregation signal for traffic-sensitive AI/platform stories. Discovery only: publish from original source or trusted primary reporting, not from Techmeme summaries."
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
    feedUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
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
    id: "the-rundown-ai",
    name: "The Rundown AI",
    url: "https://www.therundown.ai/",
    feedUrl: "https://www.therundown.ai/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 76,
    freshness: 96,
    notes: "High-frequency AI newsletter and market-signal source. The public site is Cloudflare-protected, so the scanner uses the bounded reader-index adapter rather than assuming a normal RSS feed. Use for traffic-sensitive AI product, tool, workflow and market-news candidates; preserve The Rundown/source image attribution and verify primary linked sources when claims are material."
  },
  {
    id: "ars-technica-ai",
    name: "Ars Technica AI",
    url: "https://arstechnica.com/ai/",
    feedUrl: "https://arstechnica.com/ai/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Ops & Governance",
    authority: 78,
    freshness: 86,
    notes: "Technical longform AI reporting and policy/product analysis; prefer substantial articles with clear source images."
  },
  {
    id: "the-register-ai",
    name: "The Register AI/ML",
    url: "https://www.theregister.com/software/ai_ml/",
    feedUrl: "https://www.theregister.com/software/ai_ml/headlines.atom",
    tier: "trusted-media",
    market: "europe",
    language: "en",
    category: "Infrastructure",
    authority: 78,
    freshness: 90,
    notes: "Fast engineering, infrastructure, policy and enterprise AI coverage. Prefer source-faithful briefs with concrete deployment or governance facts."
  },
  {
    id: "infoworld-ai",
    name: "InfoWorld AI",
    url: "https://www.infoworld.com/artificial-intelligence/",
    feedUrl: "https://www.infoworld.com/artificial-intelligence/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Industry Workflow",
    authority: 76,
    freshness: 88,
    notes: "Practical enterprise AI, developer, operations and governance coverage. Good for richer market-news items beyond funding headlines."
  },
  {
    id: "ieee-spectrum-ai",
    name: "IEEE Spectrum AI",
    url: "https://spectrum.ieee.org/topic/artificial-intelligence/",
    feedUrl: "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Industry Workflow",
    authority: 80,
    freshness: 78,
    notes: "Engineering-oriented AI, robotics and automation reporting; useful for longform technical market news."
  },
  {
    id: "the-new-stack-ai",
    name: "The New Stack AI",
    url: "https://thenewstack.io/ai/",
    feedUrl: "https://thenewstack.io/category/ai/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Infrastructure",
    authority: 72,
    freshness: 84,
    notes: "Developer and infrastructure AI coverage; use for source-faithful longform items with usable article images."
  },
  {
    id: "siliconangle-ai",
    name: "SiliconANGLE AI",
    url: "https://siliconangle.com/category/ai/",
    feedUrl: "https://siliconangle.com/category/ai/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Infrastructure",
    authority: 74,
    freshness: 88,
    notes: "Enterprise AI, cloud, infrastructure and funding coverage with a reliable RSS feed. Prefer concrete product, deployment and ecosystem stories; verify vendor claims with primary links."
  },
  {
    id: "ai-business",
    name: "AI Business",
    url: "https://aibusiness.com/",
    feedUrl: "https://aibusiness.com/rss.xml",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Industry Workflow",
    authority: 76,
    freshness: 90,
    notes: "Enterprise AI, regulation, adoption and industry workflow coverage. Good for source-faithful briefs when the story has concrete business or governance impact."
  },
  {
    id: "artificial-intelligence-news",
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/",
    feedUrl: "https://www.artificialintelligence-news.com/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 70,
    freshness: 88,
    notes: "High-frequency AI product and policy news signal. Use as discovery or secondary reporting; confirm material product facts with official sources when possible."
  },
  {
    id: "synced-review",
    name: "Synced Review",
    url: "https://syncedreview.com/",
    feedUrl: "https://syncedreview.com/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 72,
    freshness: 78,
    notes: "AI research and model development coverage. Use for research-heavy market briefs only when the source has clear facts and accessible primary references."
  },
  {
    id: "the-gradient",
    name: "The Gradient",
    url: "https://thegradient.pub/",
    feedUrl: "https://thegradient.pub/rss/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Ops & Governance",
    authority: 78,
    freshness: 70,
    notes: "Longform AI research and society analysis. Use for richer columns or context, not thin hourly news unless a current item has clear source facts."
  },
  {
    id: "towards-ai",
    name: "Towards AI",
    url: "https://towardsai.net/",
    feedUrl: "https://towardsai.net/feed",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 68,
    freshness: 82,
    notes: "Applied AI tutorials and practitioner coverage. Use primarily for implementation context and technique signals; avoid low-evidence listicles."
  },
  {
    id: "analytics-vidhya-ai",
    name: "Analytics Vidhya AI",
    url: "https://www.analyticsvidhya.com/blog/category/artificial-intelligence/",
    feedUrl: "https://www.analyticsvidhya.com/blog/category/artificial-intelligence/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 66,
    freshness: 82,
    notes: "Applied machine-learning and AI practitioner feed. Use as technique/source context for explainers; do not use as sole proof for market claims."
  },
  {
    id: "towards-data-science",
    name: "Towards Data Science",
    url: "https://towardsdatascience.com/",
    feedUrl: "https://towardsdatascience.com/feed",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 72,
    freshness: 80,
    notes: "Practitioner essays and data/ML implementation patterns. Good for Hermes learning and technical context; publish only source-backed current items."
  },
  {
    id: "latent-space",
    name: "Latent Space",
    url: "https://www.latent.space/",
    feedUrl: "https://www.latent.space/feed",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Agents & Automation",
    authority: 76,
    freshness: 82,
    notes: "AI engineering, agents and developer ecosystem signal. Use for context and source discovery; OpenClaw should verify primary links before market-news publication."
  },
  {
    id: "sebastian-raschka",
    name: "Sebastian Raschka Blog",
    url: "https://sebastianraschka.com/",
    feedUrl: "https://sebastianraschka.com/rss_feed.xml",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 80,
    freshness: 72,
    notes: "High-quality ML education and model implementation analysis. Use for knowledge density, technical grounding and column enrichment; not a routine breaking-news source."
  },
  {
    id: "lilian-weng",
    name: "Lilian Weng Blog",
    url: "https://lilianweng.github.io/",
    feedUrl: "https://lilianweng.github.io/index.xml",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Build Notes",
    authority: 82,
    freshness: 68,
    notes: "Deep AI systems and agent research explainers. Use for Hermes/OpenClaw domain learning and source-backed columns; do not force into hourly news."
  },
  {
    id: "data-center-dynamics-ai",
    name: "Data Center Dynamics AI",
    url: "https://www.datacenterdynamics.com/en/tags/ai/",
    feedUrl: "https://www.datacenterdynamics.com/en/rss/?tag=AI",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Infrastructure",
    authority: 74,
    freshness: 84,
    notes: "AI data center, power, infrastructure and compute market signal. Strong fit for AdSense/search traffic around AI infrastructure and enterprise spend."
  },
  {
    id: "computerworld-ai",
    name: "Computerworld AI",
    url: "https://www.computerworld.com/artificial-intelligence/",
    feedUrl: "https://www.computerworld.com/artificial-intelligence/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Industry Workflow",
    authority: 74,
    freshness: 86,
    notes: "Enterprise IT and workplace AI coverage. Use for adoption, governance, tooling and CIO workflow stories with concrete operational relevance."
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
    id: "9to5google",
    name: "9to5Google",
    url: "https://9to5google.com/",
    feedUrl: "https://9to5google.com/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 72,
    freshness: 94,
    notes: "High-traffic Google, Android, Gemini and Search product signal. Use only for AI/Search/platform items with enterprise, GEO or workflow relevance."
  },
  {
    id: "9to5mac",
    name: "9to5Mac",
    url: "https://9to5mac.com/",
    feedUrl: "https://9to5mac.com/feed/",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 72,
    freshness: 92,
    notes: "High-traffic Apple platform signal. Use only for Apple Intelligence, Siri, developer tooling, privacy or platform AI stories relevant to business users."
  },
  {
    id: "android-authority",
    name: "Android Authority",
    url: "https://www.androidauthority.com/",
    feedUrl: "https://www.androidauthority.com/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Products",
    authority: 68,
    freshness: 90,
    notes: "High-traffic Android and mobile AI signal. Avoid consumer gadget filler; use only for AI assistant, platform search, app workflow or adoption stories."
  },
  {
    id: "wired-ai",
    name: "WIRED AI",
    url: "https://www.wired.com/tag/artificial-intelligence/",
    feedUrl: "https://www.wired.com/feed/tag/ai/latest/rss",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "AI Products",
    authority: 78,
    freshness: 88,
    notes: "Mainstream US technology reporting on AI products, safety, policy and culture; use for market-facing source translation."
  },
  {
    id: "search-engine-land",
    name: "Search Engine Land",
    url: "https://searchengineland.com/",
    feedUrl: "https://searchengineland.com/feed",
    tier: "trusted-media",
    market: "us",
    language: "en",
    category: "Search & GEO",
    authority: 80,
    freshness: 90,
    notes: "Search, AI Overviews, ads and GEO/SEO market signal. Strong fit for traffic-building articles when paired with official Google documentation or Search Console readback."
  },
  {
    id: "semrush-blog",
    name: "Semrush Blog",
    url: "https://www.semrush.com/blog/",
    feedUrl: "https://www.semrush.com/blog/rss/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Search & GEO",
    authority: 74,
    freshness: 78,
    notes: "SEO and content marketing signal. Use for GEO/SEO tactics only when the article is source-backed and does not overclaim traffic outcomes."
  },
  {
    id: "ahrefs-blog",
    name: "Ahrefs Blog",
    url: "https://ahrefs.com/blog/",
    feedUrl: "https://ahrefs.com/blog/feed/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "Search & GEO",
    authority: 76,
    freshness: 78,
    notes: "SEO research and search traffic signal. Use for content strategy and GEO context with GA/Search Console readback; avoid treating vendor claims as independent proof."
  },
  {
    id: "reuters-technology-ai",
    name: "Reuters Technology / AI",
    url: "https://www.reuters.com/technology/",
    tier: "trusted-media",
    market: "global",
    language: "en",
    category: "AI Ops & Governance",
    authority: 90,
    freshness: 92,
    notes: "High-authority global market, policy and technology reporting. RSS access is not reliable from this environment, so use as a trusted host and cross-check source rather than a scheduled feed."
  },
  {
    id: "tech-in-asia-ai",
    name: "Tech in Asia AI",
    url: "https://www.techinasia.com/tag/artificial-intelligence",
    tier: "trusted-media",
    market: "apac",
    language: "en",
    category: "AI Products",
    authority: 76,
    freshness: 88,
    notes: "Southeast Asia startup, product and funding coverage. The tag page can be paywalled or blocked, so use for APAC discovery and source verification, not as a hard daily feed."
  },
  {
    id: "krasia-ai",
    name: "KrASIA AI",
    url: "https://kr-asia.com/industry/ai",
    tier: "trusted-media",
    market: "apac",
    language: "en",
    category: "AI Products",
    authority: 74,
    freshness: 86,
    notes: "APAC AI business, startup and regional market coverage. Check whether each story is original or syndicated before publication."
  },
  {
    id: "dealstreetasia-southeast-asia",
    name: "DealStreetAsia Southeast Asia",
    url: "https://www.dealstreetasia.com/countries/southeast-asia",
    tier: "trusted-media",
    market: "apac",
    language: "en",
    category: "Industry Workflow",
    authority: 76,
    freshness: 86,
    notes: "Southeast Asia funding, M&A and venture signal. Often paywalled; never use inaccessible copy as the sole source for a market-news article."
  },
  {
    id: "channel-newsasia-ai",
    name: "Channel NewsAsia AI",
    url: "https://www.channelnewsasia.com/topic/artificial-intelligence",
    feedUrl: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511",
    tier: "trusted-media",
    market: "apac",
    language: "en",
    category: "AI Ops & Governance",
    authority: 75,
    freshness: 84,
    notes: "Singapore and Southeast Asia AI policy, business and society coverage. Use for regional context when the article has concrete AI market or governance facts."
  },
  {
    id: "ai-verify-foundation",
    name: "AI Verify Foundation",
    url: "https://aiverifyfoundation.sg/news/",
    tier: "official-docs",
    market: "apac",
    language: "en",
    category: "AI Ops & Governance",
    authority: 82,
    freshness: 68,
    notes: "Singapore AI governance, testing and trust framework source. Use as governance context, not as a daily market-news feed."
  },
  {
    id: "imda-ai",
    name: "IMDA Artificial Intelligence",
    url: "https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence",
    tier: "official-docs",
    market: "apac",
    language: "en",
    category: "AI Ops & Governance",
    authority: 84,
    freshness: 62,
    notes: "Singapore official AI governance and emerging technology guidance. Use for regulatory context and SEA localization."
  },
  {
    id: "asean-ai-governance",
    name: "ASEAN AI Governance and Ethics",
    url: "https://asean.org/book/expanded-asean-guide-on-ai-governance-and-ethics-generative-ai/",
    tier: "official-docs",
    market: "apac",
    language: "en",
    category: "AI Ops & Governance",
    authority: 82,
    freshness: 58,
    notes: "ASEAN regional governance reference for generative AI. Use for background and regional framing, not for routine scans."
  },
  {
    id: "japan-aisi",
    name: "Japan AI Safety Institute",
    url: "https://aisi.go.jp/",
    tier: "official-docs",
    market: "japan",
    language: "en",
    category: "AI Ops & Governance",
    authority: 80,
    freshness: 58,
    notes: "Japan AI safety, evaluation and governance source. Use as APAC policy context when English/Japanese source facts are accessible."
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
  morning: ["column", "column", "column", "column", "column", "column", "column", "column", "column", "column"],
  afternoon: ["breaking", "breaking", "breaking", "breaking", "breaking", "breaking", "breaking", "breaking", "breaking", "breaking"]
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
