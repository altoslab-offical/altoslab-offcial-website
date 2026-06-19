const ADSENSE_CLIENT_PATTERN = /^ca-pub-\d+$/i;
const ADSENSE_SLOT_PATTERN = /^\d+$/;
const DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "no"]);

const PUBLIC_ENV = {
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED: process.env.NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED,
  NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT: process.env.NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT,
  NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT: process.env.NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT,
  NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT: process.env.NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT,
  NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT: process.env.NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT
};

type PublicEnvKey = keyof typeof PUBLIC_ENV;

export type BlogAdPlacement = "index-feed" | "after-summary" | "mid-article" | "before-related";

type BlogAdPlacementConfig = {
  envKey: PublicEnvKey;
  format: "auto";
  fullWidthResponsive: boolean;
};

export type BlogAdSlotConfig = {
  placement: BlogAdPlacement;
  client: string;
  slot: string;
  format: BlogAdPlacementConfig["format"];
  fullWidthResponsive: boolean;
};

const BLOG_AD_PLACEMENTS: Record<BlogAdPlacement, BlogAdPlacementConfig> = {
  "index-feed": {
    envKey: "NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT",
    format: "auto",
    fullWidthResponsive: true
  },
  "after-summary": {
    envKey: "NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT",
    format: "auto",
    fullWidthResponsive: true
  },
  "mid-article": {
    envKey: "NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT",
    format: "auto",
    fullWidthResponsive: true
  },
  "before-related": {
    envKey: "NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT",
    format: "auto",
    fullWidthResponsive: true
  }
};

function publicEnv(name: PublicEnvKey) {
  return PUBLIC_ENV[name]?.trim() || "";
}

export function isBlogAdsenseEnabled() {
  const raw = publicEnv("NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED");
  return raw ? !DISABLED_VALUES.has(raw.toLowerCase()) : true;
}

export function getBlogAdSlotConfig(placement: BlogAdPlacement): BlogAdSlotConfig | null {
  if (!isBlogAdsenseEnabled()) return null;

  const client = publicEnv("NEXT_PUBLIC_ADSENSE_CLIENT");
  const config = BLOG_AD_PLACEMENTS[placement];
  const slot = publicEnv(config.envKey);

  if (!ADSENSE_CLIENT_PATTERN.test(client) || !ADSENSE_SLOT_PATTERN.test(slot)) return null;

  return {
    placement,
    client,
    slot,
    format: config.format,
    fullWidthResponsive: config.fullWidthResponsive
  };
}

export function hasConfiguredBlogAdSlots() {
  return (Object.keys(BLOG_AD_PLACEMENTS) as BlogAdPlacement[]).some((placement) => Boolean(getBlogAdSlotConfig(placement)));
}

export function blogAdSlotHtml(placement: BlogAdPlacement) {
  const config = getBlogAdSlotConfig(placement);
  if (!config) return "";

  return `<aside class="blog-adsense-slot is-${config.placement}" data-blog-ad-placement="${config.placement}" aria-label="Advertisement">
    <ins class="adsbygoogle" style="display:block" data-ad-client="${config.client}" data-ad-slot="${config.slot}" data-ad-format="${config.format}" data-full-width-responsive="${config.fullWidthResponsive ? "true" : "false"}"></ins>
    <script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script>
  </aside>`;
}
