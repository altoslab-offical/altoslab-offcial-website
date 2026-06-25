import { defaultQualityChecks } from "./blog-utils";
import type { BlogInlineImage, BlogPost, BlogQualityStatus } from "./types";

type ImageDimensions = {
  width: number;
  height: number;
};

type ImageProbe = {
  contentType?: string;
  contentLength?: number;
  dimensions?: ImageDimensions;
  issues: string[];
  warnings: string[];
};

type MultilingualCoverPost = Partial<Pick<BlogPost, "language" | "slug" | "translationGroupId" | "cover" | "contentImages">>;

export type BlogImagePostReview = {
  language: BlogPost["language"];
  slug: string;
  approved: boolean;
  status: BlogQualityStatus;
  score: number;
  issues: string[];
  warnings: string[];
  metadata?: {
    contentType?: string;
    contentLength?: number;
    width?: number;
    height?: number;
  };
};

export type BlogImageQualityReview = {
  approved: boolean;
  score: number;
  threshold: number;
  issues: string[];
  warnings: string[];
  postReviews: BlogImagePostReview[];
  notes: string;
};

export type BlogImageQualityOptions = {
  requireGeneratedCover?: boolean;
  requireGeneratedCoverForNonBreaking?: boolean;
  requireSourceCoverForBreaking?: boolean;
  requireBlobCover?: boolean;
  verifyRemoteImage?: boolean;
  allowLocalHttp?: boolean;
};

const IMAGE_TIMEOUT_MS = 5000;
const IMAGE_THRESHOLD = 82;
const MIN_IMAGE_WIDTH = 1200;
const MIN_IMAGE_HEIGHT = 630;
const MIN_IMAGE_BYTES = 40_000;
const MIN_SOURCE_IMAGE_WIDTH = 768;
const MIN_SOURCE_IMAGE_HEIGHT = 432;
const MIN_SOURCE_IMAGE_BYTES = 25_000;
const MAX_IMAGE_BYTES = 8_000_000;
const SAFE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GENERIC_STOCK_IMAGE_HOSTS = [
  "unsplash.com",
  "images.unsplash.com",
  "pexels.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "openverse.org",
  "openverse.engineering",
  "api.openverse.org",
  "api.openverse.engineering"
];

const unsafeImageMetadataPattern =
  /\b(?:dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|logo|trademark|celebrity|real person|portrait of|screenshot|ui screenshot|fake dashboard)\b|(?:亂碼|錯字|商標|真人|肖像|政治人物|ロゴ|実在人物|초상|상표|로고)/i;

const genericGeneratedImagePattern =
  /(generic|placeholder|abstract background|glowing dashboard|futuristic dashboard|fake dashboard|network map|glass cube|server room|business meeting|robot handshake|stock photo|tilted|skewed|slanted|large cursor|cursor shape|pink editorial background|source-cover|rounded-card workflow wallpaper|random lines|dark grid|科技感背景|抽象科技|假儀表板|網路圖|玻璃方塊|會議室|儀表板|伺服器機房|斜的|歪斜|巨大游標|斜游標|汎用|会議|傾いた|서버룸|회의실|추상 배경)/i;

const generatedTemplateArtifactPattern =
  /(permission cards?|permission boundary cards?|evidence cards?|source cards?|review cards?|reviewer stamps?|audit trail ledger|rollback switch|return switch|handoff lanes?|metric feedback loop|workflow lanes?|rounded cards?|node map|process cards?|cards and lanes|acceptance-test stack|cost folder|source citation cards?|reader questions?|citation paths?|權限卡|審核節點|審核章|證據卡|來源卡|流程卡|圓角方塊|節點圖|回滾開關|退場路線|交接泳道)/gi;

const sourceCoverWeakContextPattern =
  /(generic|abstract|placeholder|wallpaper|stock|gradient|dashboard|fake dashboard|network map|glass cube|tilted|skewed|slanted|large cursor|cursor shape|pink editorial background|source-cover|科技感背景|抽象|漸層|占位|假儀表板|網路圖|玻璃方塊|斜的|歪斜|巨大游標|斜游標|汎用|抽象背景|추상|그라데이션)/i;

const enterpriseAgentGovernancePattern =
  /(enterprise|agent|trust|governance|control|permission|access|audit|rollback|trace|registry|workflow|assert|agent 365|企業|代理人|信任|治理|控制|權限|稽核|審計|回滾|復原|追蹤|登記|工作流|ระบบควบคุม|ควบคุม|audit|rollback|kontrol|kawalan|jejak|kiểm soát|truy vết|권한|감사|거버넌스|制御|監査)/i;

const concreteGovernanceVisualPattern =
  /(access card|lock|key|permission|audit trail|ledger|registry|control board|checkpoint|rollback|switch|circuit breaker|handoff|workflow lane|decision token|evidence card|安全版本|權限卡|權限|稽核|審計|操作軌跡|登記表|控制板|檢查點|回滾|復原|接管|決策節點|證據卡|คีย์|สิทธิ์|ตรวจสอบ|ย้อนกลับ|권한|감사|체크포인트|롤백|権限|監査|ロールバック)/i;

function removeNegativeImageConstraints(input: string) {
  return input
    .replace(/Negative prompt:[\s\S]*$/i, "")
    .replace(/\bno\s+(?:readable\s+)?text\s+(?:or|and)\s+(?:fake\s+)?logos?\b/gi, "")
    .replace(/\bno\s+(?:fake\s+)?logos?\s+(?:or|and)\s+(?:readable\s+)?text\b/gi, "")
    .replace(/\bno\s+(?:protected\s+)?brands?\s+(?:or|and)\s+(?:trademarks?|brand\s+marks?)\b/gi, "")
    .replace(/\bno\s+(?:trademarks?|brand\s+marks?)\s+(?:or|and)\s+(?:protected\s+)?brands?\b/gi, "")
    .replace(/\bno\s+text\s+artifacts?\b/gi, "")
    .replace(/\bno\s+brand\s+marks?\b/gi, "")
    .replace(/\bno\s+protected\s+brands?\b/gi, "")
    .replace(/\bno\s+(readable\s+)?text\b/gi, "")
    .replace(/\bno\s+(fake\s+)?logos?\b/gi, "")
    .replace(/\bno\s+(real\s+)?people\b/gi, "")
    .replace(/\bno\s+real-person\s+likeness(?:es)?\b/gi, "")
    .replace(/\bno\s+(fake\s+)?ui\b/gi, "")
    .replace(/\bno\s+fake\s+dashboards?\b/gi, "")
    .replace(/\bno\s+(microsoft\s+)?branding\b/gi, "")
    .replace(/\bno\s+trademarks?\b/gi, "")
    .replace(/\b(?:or|and)\s+(?:fake\s+)?logos?\b/gi, "")
    .replace(/\b(?:or|and)\s+(?:trademarks?|brand\s+marks?|protected\s+brands?)\b/gi, "")
    .replace(/不要(?:可讀)?文字|不要標誌|不要商標|不要真人|不要肖像|不要假介面|不要假儀表板/g, "")
    .replace(/ロゴなし|商標なし|実在人物なし/g, "")
    .replace(/로고 없음|상표 없음|실제 인물 없음/g, "");
}

function isManagedGeneratedCoverUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host.endsWith(".public.blob.vercel-storage.com") ||
      parsed.pathname.startsWith("/api/blog/generated-media/")
    );
  } catch {
    return false;
  }
}

function isAllowedLocalHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE || process.env.VERCEL_ENV === "production");
}

function isHttpUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function parsedHost(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceHostMatches(creditUrl: string, sourceUrl: string) {
  const creditHost = parsedHost(creditUrl);
  const sourceHost = parsedHost(sourceUrl);
  return Boolean(
    creditHost &&
      sourceHost &&
      (creditHost === sourceHost || creditHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${creditHost}`))
  );
}

function isGenericStockImageUrl(url?: string) {
  const host = parsedHost(url);
  return Boolean(host && GENERIC_STOCK_IMAGE_HOSTS.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`)));
}

function sourceCoverMatchesSourceList(post: BlogPost) {
  return post.sourceLinks.some((source) => sourceHostMatches(post.coverCreditUrl || "", source.url));
}

function isBreakingNews(post: BlogPost) {
  return post.contentType === "breaking";
}

function imageContext(post: BlogPost) {
  return removeNegativeImageConstraints(
    [
    post.title,
    post.topic,
    post.newsCategory,
    post.tags.join(" "),
    post.coverAlt,
    post.coverPrompt,
    post.coverGeneration?.prompt,
    post.coverGeneration?.visualChecks?.notes
  ]
    .filter(Boolean)
      .join("\n")
  );
}

function generatedCoverSemanticIssues(post: BlogPost) {
  const context = imageContext(post);
  if (!enterpriseAgentGovernancePattern.test(context)) return [];
  if (concreteGovernanceVisualPattern.test(context)) return [];
  return [
    "enterprise agent governance covers must show a concrete control metaphor such as permissions, audit trail, registry, checkpoint or rollback; abstract tech visuals are not enough"
  ];
}

function generatedTemplateArtifactHits(input: string) {
  return Array.from(input.matchAll(generatedTemplateArtifactPattern)).length;
}

function generatedTemplateVisualIssues(context: string, label: string) {
  const hits = generatedTemplateArtifactHits(context);
  if (hits < 3) return [];
  return [
    `${label} repeats the old abstract card/node-map visual template; require a concrete scene, object, source photograph, or style-diverse GPT image2 visual instead`
  ];
}

function topicWords(post: BlogPost) {
  return `${post.topic} ${post.newsCategory} ${post.tags.join(" ")} ${post.title}`
    .toLowerCase()
    .split(/\s+|、|\/|,|，|:|：|\||\(|\)|（|）/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !["the", "and", "with", "from", "this", "that", "for"].includes(word));
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function parsePngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function parseJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    };
  }
  return null;
}

function parseImageDimensions(buffer: Buffer, contentType?: string): ImageDimensions | null {
  if (contentType?.includes("png")) return parsePngDimensions(buffer);
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return parseJpegDimensions(buffer);
  if (contentType?.includes("webp")) return parseWebpDimensions(buffer);
  return parsePngDimensions(buffer) || parseJpegDimensions(buffer) || parseWebpDimensions(buffer);
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "ALTOS LAB image quality gate; https://altoslab-ai.cc",
        ...(init.headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

type ImageProbeOptions = {
  minWidth?: number;
  minHeight?: number;
  minBytes?: number;
};

function imageProbeMinimums(options: ImageProbeOptions = {}) {
  return {
    minWidth: options.minWidth || MIN_IMAGE_WIDTH,
    minHeight: options.minHeight || MIN_IMAGE_HEIGHT,
    minBytes: options.minBytes || MIN_IMAGE_BYTES
  };
}

async function probeRemoteImage(url: string, options: ImageProbeOptions = {}): Promise<ImageProbe> {
  const issues: string[] = [];
  const warnings: string[] = [];
  let contentType = "";
  let contentLength = 0;
  const minimums = imageProbeMinimums(options);

  try {
    const head = await fetchWithTimeout(url, { method: "HEAD" });
    if (!head.ok && head.status !== 405 && head.status !== 403) {
      issues.push(`cover URL returned HTTP ${head.status}`);
      return { issues, warnings };
    }
    contentType = head.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
    contentLength = Number(head.headers.get("content-length") || 0);
  } catch (error) {
    warnings.push(`cover HEAD check failed: ${error instanceof Error ? error.message : "request failed"}`);
  }

  const genericBinaryContentType = contentType === "application/octet-stream" || contentType === "binary/octet-stream";
  if (contentType && !SAFE_IMAGE_TYPES.includes(contentType) && !genericBinaryContentType) {
    issues.push(`cover content-type must be jpeg, png or webp; received ${contentType}`);
  }
  if (contentLength && contentLength < minimums.minBytes) issues.push("cover image file is too small for a blog hero image");
  if (contentLength && contentLength > MAX_IMAGE_BYTES) issues.push("cover image file is too large for blog delivery");

  try {
    const get = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Range: "bytes=0-131071" }
    });
    if (!get.ok && get.status !== 206) {
      issues.push(`cover binary probe returned HTTP ${get.status}`);
      return { contentType, contentLength, issues, warnings };
    }
    const binaryContentType = get.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType && binaryContentType) contentType = binaryContentType;
    const buffer = Buffer.from(await get.arrayBuffer());
    const dimensions = parseImageDimensions(buffer, contentType);
    if (!dimensions) {
      if (genericBinaryContentType) {
        issues.push(`cover content-type must be jpeg, png or webp; received ${contentType}`);
      }
      issues.push("cover image dimensions could not be verified from the binary header");
      return { contentType, contentLength, issues, warnings };
    }
    if (dimensions.width < minimums.minWidth || dimensions.height < minimums.minHeight) {
      issues.push(`cover image dimensions ${dimensions.width}x${dimensions.height} are below ${minimums.minWidth}x${minimums.minHeight}`);
    }
    const ratio = dimensions.width / dimensions.height;
    if (ratio < 1.45 || ratio > 2.15) {
      warnings.push(`cover image ratio ${ratio.toFixed(2)} may crop poorly in blog cards`);
    }
    return { contentType, contentLength, dimensions, issues, warnings };
  } catch (error) {
    issues.push(`cover binary probe failed: ${error instanceof Error ? error.message : "request failed"}`);
    return { contentType, contentLength, issues, warnings };
  }
}

function generatedInlineImageIssues(image: BlogInlineImage, label: string) {
  const issues: string[] = [];
  if (!/(chatgpt|gpt|openai|codex)/i.test(image.provider || "")) issues.push(`${label} provider must be ChatGPT/GPT`);
  if (!image.prompt?.trim()) issues.push(`${label} prompt is required`);
  if (!image.generatedAt?.trim()) issues.push(`${label} generatedAt is required`);
  if (!image.credit?.trim()) issues.push(`${label} credit is required`);
  const context = removeNegativeImageConstraints(
    [image.alt, image.caption, image.prompt, image.visualChecks?.notes].filter(Boolean).join("\n")
  );
  if (genericGeneratedImagePattern.test(context)) {
    issues.push(`${label} metadata reads like generic abstract AI art`);
  }
  issues.push(...generatedTemplateVisualIssues(context, label));
  const checks = image.visualChecks;
  if (!checks) {
    issues.push(`${label} visualChecks are required`);
  } else {
    const failedChecks = [
      ["topicFit", checks.topicFit],
      ["noTextArtifacts", checks.noTextArtifacts],
      ["noLogos", checks.noLogos],
      ["noPeople", checks.noPeople],
      ["noTrademarkRisk", checks.noTrademarkRisk],
      ["noGenericStockLook", checks.noGenericStockLook]
    ].filter(([, ok]) => ok !== true);
    if (failedChecks.length) issues.push(`${label} visual QA failed: ${failedChecks.map(([name]) => name).join(", ")}`);
  }
  return issues;
}

async function reviewPostImage(post: BlogPost, options: Required<BlogImageQualityOptions>): Promise<BlogImagePostReview> {
  const issues: string[] = [];
  const warnings: string[] = [];
  let probe: ImageProbe | undefined;
  const breakingNews = isBreakingNews(post);
  const sourceCover = post.coverSource === "source";
  const generatedCover = post.coverSource === "generated";

  if (!post.cover) issues.push("cover image URL is required");
  if (!post.coverAlt?.trim()) issues.push("cover alt text is required");
  if (post.coverAlt && post.coverAlt.trim().length < 18) issues.push("cover alt text is too thin");
  if (post.coverAlt && post.coverAlt.length > 180) warnings.push("cover alt text is too long");

  if (options.requireGeneratedCover && post.coverSource !== "generated") {
    issues.push("external browser production pipeline requires coverSource generated");
  }
  if (options.requireGeneratedCoverForNonBreaking && !breakingNews && !generatedCover) {
    issues.push("non-news production covers must use coverSource generated from ChatGPT/GPT");
  }
  if (options.requireSourceCoverForBreaking && breakingNews && !sourceCover) {
    issues.push("market news cover must use coverSource source from the source article or official announcement");
  }

  if (generatedCover) {
    if (post.coverGeneration?.status !== "generated") issues.push("generated cover status must be generated");
    if (!post.coverGeneration?.provider) issues.push("generated cover provider is required");
    if (!post.coverGeneration?.prompt) issues.push("generated cover prompt is required");
    if (!post.coverGeneration?.generatedAt) issues.push("generated cover timestamp is required");
    if (!post.coverCredit?.trim()) issues.push("generated cover credit is required");

    const checks = post.coverGeneration?.visualChecks;
    if (!checks) {
      issues.push("generated cover requires visualChecks from local image QA");
    } else {
      const failedChecks = [
        ["topicFit", checks.topicFit],
        ["noTextArtifacts", checks.noTextArtifacts],
        ["noLogos", checks.noLogos],
        ["noPeople", checks.noPeople],
        ["noTrademarkRisk", checks.noTrademarkRisk],
        ["noGenericStockLook", checks.noGenericStockLook]
      ].filter(([, ok]) => ok !== true);
      if (failedChecks.length) {
        issues.push(`generated cover visual QA failed: ${failedChecks.map(([name]) => name).join(", ")}`);
      }
      if (!checks.checkedBy || !checks.checkedAt) warnings.push("generated cover visual QA should record checkedBy and checkedAt");
    }
  }

  if (sourceCover) {
    if (!post.coverCredit?.trim()) issues.push("source cover requires visible source credit");
    if (!isHttpUrl(post.coverCreditUrl)) issues.push("source cover requires a public source credit URL");
    if (!post.coverLicense?.trim()) issues.push("source cover requires license or source-rights metadata");
    if (isGenericStockImageUrl(post.cover) || isGenericStockImageUrl(post.coverCreditUrl)) {
      issues.push("market news source cover must come from the source article or official announcement, not a stock/free image provider");
    }
    if (!sourceCoverMatchesSourceList(post)) {
      issues.push("source cover credit URL must match one of the article source links");
    }
    if (sourceCoverWeakContextPattern.test(imageContext(post))) {
      issues.push("source cover metadata reads like a placeholder or generic tech visual instead of a source-backed editorial image");
    }
  }

  const context = imageContext(post);
  if (breakingNews && !sourceCover && sourceCoverWeakContextPattern.test(context)) {
    issues.push("market news without a source cover must return to source-image repair instead of using fallback art");
  }
  if (generatedCover && unsafeImageMetadataPattern.test(context)) {
    issues.push("cover metadata indicates text artifacts, logos, people, trademark or unsafe visual risk");
  }
  if (generatedCover && /codex-local-editorial-renderer|svg-sharp-renderer/i.test(context)) {
    issues.push("generated cover uses local abstract repair renderer; official covers must be ChatGPT/GPT raster images or source-safe editorial images");
  }
  if (generatedCover && genericGeneratedImagePattern.test(context)) {
    issues.push("cover metadata reads like generic stock or abstract AI art");
  }
  if (generatedCover) {
    issues.push(...generatedTemplateVisualIssues(context, "cover metadata"));
  }
  if (generatedCover) issues.push(...generatedCoverSemanticIssues(post));
  const lowerContext = context.toLowerCase();
  if (!topicWords(post).some((word) => lowerContext.includes(word))) {
    warnings.push("cover prompt or alt text should name the article topic more directly");
  }

  if (post.cover) {
    const allowedLocalHttp = options.allowLocalHttp && isAllowedLocalHttpUrl(post.cover);
    if (isProductionRuntime() && isAllowedLocalHttpUrl(post.cover)) {
      issues.push("production cover must not use localhost or private development URLs");
    }
    if (!/^https:\/\//.test(post.cover) && !allowedLocalHttp) {
      issues.push("cover must use a public https URL");
    } else if (generatedCover && options.requireBlobCover && !isManagedGeneratedCoverUrl(post.cover)) {
      issues.push("generated cover must be stored in managed generated media before ingest");
    }
    if (options.verifyRemoteImage && (/^https:\/\//.test(post.cover) || allowedLocalHttp)) {
      const probeOptions =
        breakingNews && sourceCover
          ? { minWidth: MIN_SOURCE_IMAGE_WIDTH, minHeight: MIN_SOURCE_IMAGE_HEIGHT, minBytes: MIN_SOURCE_IMAGE_BYTES }
          : {};
      probe = await probeRemoteImage(post.cover, probeOptions);
      issues.push(...probe.issues);
      warnings.push(...probe.warnings);
    }
  }

  if (post.contentType === "column" || post.contentType === "feature") {
    const contentImages = post.contentImages || [];
    if (contentImages.length < 2) issues.push("column/feature posts require at least two in-article images");
    if (contentImages.length > 3) warnings.push("column/feature posts should keep in-article images to three or fewer");
    for (const [index, image] of contentImages.entries()) {
      const label = `content image ${index + 1}`;
      if (!image.url) issues.push(`${label} URL is required`);
      if (!image.alt?.trim()) issues.push(`${label} alt text is required`);
      if (image.alt && image.alt.trim().length < 18) issues.push(`${label} alt text is too thin`);
      if (image.alt && image.alt.length > 180) warnings.push(`${label} alt text is too long`);
      if (!image.caption?.trim() && !image.credit?.trim()) warnings.push(`${label} should include a caption or visible credit`);
      if (image.source === "generated") issues.push(...generatedInlineImageIssues(image, label));
      if (image.source === "source" && (!image.credit?.trim() || !image.creditUrl?.trim())) {
        issues.push(`${label} source image requires credit and creditUrl`);
      }
      if (image.url) {
        const allowedLocalHttp = options.allowLocalHttp && isAllowedLocalHttpUrl(image.url);
        if (isProductionRuntime() && isAllowedLocalHttpUrl(image.url)) issues.push(`${label} must not use localhost or private development URLs`);
        if (!/^https:\/\//.test(image.url) && !allowedLocalHttp) {
          issues.push(`${label} must use a public https URL`);
        } else if (image.source === "generated" && options.requireBlobCover && !isManagedGeneratedCoverUrl(image.url)) {
          issues.push(`${label} must be stored in managed generated media before ingest`);
        }
        if (options.verifyRemoteImage && (/^https:\/\//.test(image.url) || allowedLocalHttp)) {
          const inlineProbe = await probeRemoteImage(image.url);
          issues.push(...inlineProbe.issues.map((issue) => `${label}: ${issue}`));
          warnings.push(...inlineProbe.warnings.map((warning) => `${label}: ${warning}`));
        }
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 18 - warnings.length * 3);
  const approved = issues.length === 0 && score >= IMAGE_THRESHOLD;
  return {
    language: post.language,
    slug: post.slug,
    approved,
    status: approved ? "passed" : "held",
    score,
    issues,
    warnings,
    metadata: {
      contentType: probe?.contentType,
      contentLength: probe?.contentLength,
      width: probe?.dimensions?.width,
      height: probe?.dimensions?.height
    }
  };
}

export function multilingualCoverConsistencyIssues(posts: MultilingualCoverPost[]) {
  const issues: string[] = [];
  const groups = new Map<string, MultilingualCoverPost[]>();
  for (const post of posts) {
    const group = post.translationGroupId || "__article_set__";
    groups.set(group, [...(groups.get(group) || []), post]);
  }

  for (const [group, groupPosts] of groups) {
    if (groupPosts.length < 2) continue;
    const covers = [...new Set(groupPosts.map((post) => post.cover?.trim()).filter(Boolean))];
    if (covers.length > 1) {
      issues.push(
        `all language versions in an article set must share the same cover URL (${group}: ${groupPosts
          .map((post) => `${post.language}/${post.slug}`)
          .join(", ")})`
      );
    }
    const contentImageCounts = [...new Set(groupPosts.map((post) => post.contentImages?.length || 0))];
    if (contentImageCounts.length > 1) {
      issues.push(`all language versions in an article set must share the same number of content images (${group})`);
    }
    const maxContentImages = Math.max(...contentImageCounts, 0);
    for (let index = 0; index < maxContentImages; index += 1) {
      const urls = [...new Set(groupPosts.map((post) => post.contentImages?.[index]?.url?.trim()).filter(Boolean))];
      if (urls.length > 1) {
        issues.push(`all language versions in an article set must share content image ${index + 1} URL (${group})`);
      }
    }
    for (const post of groupPosts) {
      const contentImages = post.contentImages || [];
      const urls = contentImages.map((image) => image.url?.trim()).filter(Boolean);
      const prompts = contentImages.map((image) => image.prompt?.trim()).filter(Boolean);
      if (new Set(urls).size < urls.length) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} content images must not reuse the same URL`);
      }
      if (new Set(prompts).size < prompts.length) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} content images must not reuse the same prompt`);
      }
    }
  }

  return issues;
}

export async function reviewBlogImagesForRelease(
  posts: BlogPost[],
  options: BlogImageQualityOptions = {}
): Promise<BlogImageQualityReview> {
  const resolvedOptions: Required<BlogImageQualityOptions> = {
    requireGeneratedCover: options.requireGeneratedCover ?? false,
    requireGeneratedCoverForNonBreaking: options.requireGeneratedCoverForNonBreaking ?? false,
    requireSourceCoverForBreaking: options.requireSourceCoverForBreaking ?? false,
    requireBlobCover: options.requireBlobCover ?? false,
    verifyRemoteImage: options.verifyRemoteImage ?? true,
    allowLocalHttp: options.allowLocalHttp ?? false
  };
  const postReviews = await Promise.all(posts.map((post) => reviewPostImage(post, resolvedOptions)));
  const setIssues = multilingualCoverConsistencyIssues(posts);
  const issues = [
    ...setIssues,
    ...postReviews.flatMap((review) => review.issues.map((issue) => `${review.language}/${review.slug}: ${issue}`))
  ];
  const warnings = postReviews.flatMap((review) => review.warnings.map((warning) => `${review.language}/${review.slug}: ${warning}`));
  const score = postReviews.length ? Math.max(0, Math.min(...postReviews.map((review) => review.score)) - setIssues.length * 18) : 0;
  const approved = postReviews.length > 0 && postReviews.every((review) => review.approved) && setIssues.length === 0 && warnings.length === 0;
  const notes = approved
    ? `ALTOS LAB image QA approved all covers. Score ${score}/${IMAGE_THRESHOLD}.`
    : `ALTOS LAB image QA held publish. Score ${score}/${IMAGE_THRESHOLD}. Issues: ${issues.join("; ")}`;

  return {
    approved,
    score,
    threshold: IMAGE_THRESHOLD,
    issues,
    warnings,
    postReviews,
    notes
  };
}

export function applyImageQualityReview(post: BlogPost, review: BlogImageQualityReview, publish: boolean): BlogPost {
  const postReview = review.postReviews.find((item) => item.language === post.language && item.slug === post.slug);
  const imageIssues = [...(postReview?.issues || []), ...(postReview?.warnings || [])];
  const qualityIssues = [...(post.qualityIssues || []), ...imageIssues];

  return {
    ...post,
    imageQualityStatus: postReview?.approved ? "passed" : "held",
    releaseDecision: publish ? "published" : "held_for_review",
    qualityIssues,
    qualityChecks: defaultQualityChecks({
      ...post.qualityChecks,
      hasImageFit: Boolean(postReview?.approved),
      qualityIssues: [...(post.qualityChecks.qualityIssues || []), ...imageIssues],
      notes: [post.qualityChecks.notes, review.notes].filter(Boolean).join("\n")
    })
  };
}
