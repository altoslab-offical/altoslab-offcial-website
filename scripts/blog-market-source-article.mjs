const ENTITY_WORD_PATTERN =
  /\b[A-Z][A-Za-z0-9&.+-]*(?:\s+[A-Z][A-Za-z0-9&.+-]*){0,4}\b/g;
const SOURCE_FACT_SCAN_CHARS = Number(process.env.ALTOS_BLOG_MARKET_SOURCE_FACT_SCAN_CHARS || "6000");
const SOURCE_BODY_STORE_CHARS = Number(process.env.ALTOS_BLOG_MARKET_SOURCE_BODY_STORE_CHARS || "8000");
const SOURCE_FACT_LIMIT = Number(process.env.ALTOS_BLOG_MARKET_SOURCE_FACT_LIMIT || "10");

export function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)));
}

export function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNewsText(value = "") {
  return decodeEntities(value)
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([。！？,.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function cleanSourceTitle(value = "") {
  return stripHtml(value)
    .replace(/\s*\|\s*(TechCrunch|OpenAI|Google|Google AI Blog|Amazon Web Services|AWS|Vercel|Hugging Face)$/i, "")
    .replace(/\s*-\s*(OpenAI|Google|Microsoft|NVIDIA|Anthropic|AWS|Vercel)$/i, "")
    .trim();
}

export function shortPublisher(value = "") {
  return stripHtml(value)
    .replace(/\s+AI$/i, "")
    .replace(/\s+News$/i, "")
    .trim() || "source";
}

export function metaContent(html = "", key = "") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return "";
}

function splitSentences(value = "") {
  return normalizeNewsText(value)
    .split(/(?<=[.!?。！？])\s+|[。！？]\s*/g)
    .map((sentence) => sentence.trim().replace(/[。！？.!?]+$/, ""))
    .filter((sentence) => sentence.length >= 16)
    .filter((sentence) => !isSourceNoiseText(sentence));
}

function unique(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = String(value || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstString(...values) {
  for (const value of values.flatMap(asArray)) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested = firstString(value.name, value.headline, value.text, value.url, value["@id"]);
      if (nested) return nested;
    }
  }
  return "";
}

function absoluteSourceUrl(value = "", base = "") {
  const raw = decodeEntities(String(value || "").trim());
  if (!raw || /^data:|^blob:|^javascript:/i.test(raw)) return "";
  try {
    return new URL(raw, base || undefined).toString();
  } catch {
    return "";
  }
}

function attrValue(tag = "", names = []) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = tag.match(new RegExp(`\\s${escaped}=["']([^"']+)["']`, "i"));
    if (match?.[1]) return decodeEntities(match[1]).trim();
  }
  return "";
}

function bestSrcFromSrcset(value = "") {
  const candidates = decodeEntities(value)
    .split(",")
    .map((part) => {
      const [url, size = ""] = part.trim().split(/\s+/, 2);
      const score = Number.parseInt(size.replace(/\D/g, ""), 10) || 0;
      return { url, score };
    })
    .filter((item) => item.url);
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url || "";
}

function realImageUrl(value = "", base = "") {
  const url = absoluteSourceUrl(value, base);
  if (!url) return "";
  if (/#primaryimage$/i.test(url) || /\/#primaryimage$/i.test(url)) return "";
  if (/^https?:\/\/[^/]+\/?$/i.test(url)) return "";
  if (/google-analytics\.com\/g\/collect/i.test(url)) return "";
  return url;
}

function extractMetaImage(html = "", baseUrl = "") {
  return (
    realImageUrl(metaContent(html, "og:image"), baseUrl) ||
    realImageUrl(metaContent(html, "twitter:image"), baseUrl) ||
    realImageUrl(metaContent(html, "thumbnail"), baseUrl)
  );
}

function extractArticleSection(html = "") {
  const starts = [
    /<div[^>]+class=["'][^"']*(?:blog-content|entry-content|wp-block-post-content|article-content|post-content|article-module__[^"']*content)[^"']*["'][^>]*>/i,
    /<article\b[^>]*>/i,
    /<main\b[^>]*>/i
  ];
  let start = -1;
  for (const pattern of starts) {
    const match = pattern.exec(html);
    if (match) {
      start = match.index;
      break;
    }
  }
  if (start < 0) return "";
  const raw = html.slice(start, start + 110_000);
  const stopPattern =
    /(?:Keep reading|Models mentioned in this article|Datasets mentioned in this article|Related posts|Related Articles|More from|Recommended|Comments|Newsletter|Subscribe|Sign up)|<(?:footer|aside)\b|class=["'][^"']*(?:related|newsletter|author-card|post-relevant|comments|recommended|footer)[^"']*["']/i;
  const stop = raw.search(stopPattern);
  return stop > 0 ? raw.slice(0, stop) : raw;
}

function extractArticleImages(html = "", baseUrl = "", fallbackCredit = "") {
  const scopedHtml = extractArticleSection(html) || html;
  const images = [];
  const seen = new Set();
  for (const match of scopedHtml.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0] || "";
    const rawSrc =
      attrValue(tag, ["src", "data-src", "data-original", "data-lazy-src"]) ||
      bestSrcFromSrcset(attrValue(tag, ["srcset", "data-srcset"]));
    const url = realImageUrl(rawSrc, baseUrl);
    if (!url || seen.has(url)) continue;
    if (/\.(?:svg|gif)(?:[?#]|$)/i.test(url)) continue;
    if (/(avatar|profile|logo|icon|sprite|tracking|pixel|placeholder|spacer|gravatar|headshot|author)/i.test(url)) continue;
    if (/[?&](?:w|width|resize)=(?:48|64|80|96|128|150)(?:&|$|,)/i.test(url) || /(?:^|[?&])h=(?:48|64|80|96|128|150)(?:&|$)/i.test(url)) continue;
    if (/(?:w_|,w_|\/w_)(?:48|64|80|96|128)|(?:h_|,h_)(?:48|64|80|96|128)|[-_](?:48|64|80|96|128)\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i.test(url)) continue;
    const alt = stripHtml(attrValue(tag, ["alt", "aria-label", "title"]));
    if (/^(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|作者)$/.test(alt) && /(?:w=150|avatar|profile|author)/i.test(url)) continue;
    seen.add(url);
    images.push({
      url,
      alt,
      caption: alt,
      credit: fallbackCredit,
      creditUrl: baseUrl
    });
    if (images.length >= 5) break;
  }
  return images;
}

function extractArticleBodyFromHtml(html = "") {
  const section = extractArticleSection(html);
  if (!section) return extractReaderMarkdownBody(html);
  const paragraphs = [];
  const seen = new Set();
  for (const match of section.matchAll(/<(p|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const attrs = match[2] || "";
    if (/\b(?:ad-unit|wp-block-tc-ads|social|newsletter|caption|credit|byline)\b/i.test(attrs)) continue;
    const text = stripHtml(match[3] || "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 34) continue;
    if (isSourceNoiseText(text)) continue;
    if (/^(Image Credits|圖片來源|作者|Tags?|Topics?|Read more|Sign up|Subscribe|Advertisement|Recommended|Related|Share this|本文獲)/i.test(text)) {
      continue;
    }
    if (/newsletter|sign up|subscribe|advertisement|cookie|privacy policy|terms of service/i.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    paragraphs.push(text);
    if (paragraphs.length >= 18) break;
  }
  return paragraphs.join("\n\n");
}

function extractReaderMarkdownBody(value = "") {
  const marker = value.search(/Markdown Content:/i);
  if (marker < 0) return "";
  const markdown = value
    .slice(marker)
    .replace(/^Markdown Content:\s*/i, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .trim();
  const seen = new Set();
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((paragraph) =>
      stripHtml(paragraph)
        .replace(/^\s*[-*]\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((paragraph) => paragraph.length >= 44)
    .filter((paragraph) => !isSourceNoiseText(paragraph))
    .filter((paragraph) => {
      const key = paragraph.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18);
  return paragraphs.join("\n\n");
}

function isSourceNoiseText(value = "") {
  const text = normalizeNewsText(value);
  const compact = text.replace(/\s+/g, " ");
  if (!compact) return true;
  if (/404\s*(?:-|–|not found)|that page does not exist|try again or go back to the homepage/i.test(compact)) return true;
  if (/^(Image Credits|圖片來源|作者|Tags?|Topics?|Read more|Sign up|Subscribe|Advertisement|Recommended|Related|Share this|本文獲)/i.test(compact)) return true;
  if (/^Updated\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}:/i.test(compact)) return true;
  if (/newsletter|sign up|subscribe|advertisement|cookie|privacy policy|terms of service/i.test(compact)) return true;
  if (/Products AI Cloud AI Gateway|Core Platform CI\/CD|Resources Company Customers|Web Application Firewall|DDoS Protection/i.test(compact)) return true;
  if (/Verge Shopping Expand|Transportation Expand|Founded in 2011, we offer our audience/i.test(compact)) return true;
  if (/We’re on a journey to advance and democratize artificial intelligence/i.test(compact)) return true;
  if (/^A Blog post by .* on Hugging Face\b/i.test(compact)) return true;
  if (/^SECTION\s+\d+[:：]/i.test(compact) || (compact.match(/\bSECTION\s+\d+[:：]/gi) || []).length >= 2) return true;
  if (/Guides have aided humanity|Prehistoric civilizations|sun and the moon|Centuries later, the introduction of the compass|GPS navigation apps/i.test(compact)) return true;
  if (/These workflows are:\s*A|Dynamic and long-running\s*B|Possess a plethora of APIs.*\s*C/i.test(compact)) return true;
  return false;
}

function collectJsonLdNodes(value, nodes = []) {
  if (!value) return nodes;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdNodes(item, nodes);
    return nodes;
  }
  if (typeof value !== "object") return nodes;
  nodes.push(value);
  if (value["@graph"]) collectJsonLdNodes(value["@graph"], nodes);
  if (value.mainEntity) collectJsonLdNodes(value.mainEntity, nodes);
  return nodes;
}

function parseJsonLdBlocks(html = "") {
  const blocks = [];
  for (const match of html.matchAll(/<script[^>]+type=["'][^"']*application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities(match[1] || "").trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
      continue;
    } catch {}
    try {
      blocks.push(JSON.parse(raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1")));
    } catch {}
  }
  return blocks.flatMap((block) => collectJsonLdNodes(block, []));
}

function isArticleNode(node = {}) {
  const types = asArray(node["@type"]).map((type) => String(type || "").toLowerCase());
  return types.some((type) => /(newsarticle|article|reportagenewsarticle|blogposting|analysisnewsarticle)/.test(type));
}

function imageFromJsonLd(node = {}) {
  const image = firstString(node.image, node.thumbnailUrl, node.primaryImageOfPage);
  if (image) return image;
  for (const candidate of asArray(node.image)) {
    const url = firstString(candidate?.url, candidate?.contentUrl);
    if (url) return url;
  }
  return "";
}

function publisherFromJsonLd(node = {}) {
  return firstString(node.publisher?.name, node.publisher, node.sourceOrganization?.name, node.author?.name, node.author);
}

function extractJsonLdArticle(html = "") {
  const nodes = parseJsonLdBlocks(html);
  const article =
    nodes.find((node) => isArticleNode(node) && (node.headline || node.name)) ||
    nodes.find((node) => isArticleNode(node)) ||
    {};
  if (!Object.keys(article).length) return {};
  const canonicalUrl = firstString(article.url, article.mainEntityOfPage?.["@id"], article.mainEntityOfPage?.url, article["@id"]);
  return {
    headline: firstString(article.headline, article.name),
    publisher: publisherFromJsonLd(article),
    publishedAt: firstString(article.datePublished, article.dateCreated),
    modifiedAt: firstString(article.dateModified),
    canonicalUrl,
    standfirst: firstString(article.description, article.abstract),
    body: firstString(article.articleBody),
    image: { url: imageFromJsonLd(article) }
  };
}

export function extractNumbers(...values) {
  return unique(
    values
      .join("\n")
      .match(/(?:[$€£]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:k|m|b|bn|tn|%|x|倍|萬|億|million|billion|trillion|calls?|parameters?|users?|organizations?|countries?|美元|美金|通電話|參數|家|國)?/gi) || []
  ).slice(0, 8);
}

export function extractEntities(...values) {
  const text = values.join("\n");
  const raw = text.match(ENTITY_WORD_PATTERN) || [];
  return unique(
    raw
      .map((item) => item.trim())
      .filter((item) => item.length > 1)
      .filter((item) => !/^(The|This|That|Source|Image|TechCrunch|Reuters|Bloomberg|Associated Press|AI|LLM)$/i.test(item))
  ).slice(0, 10);
}

function factBulletsFromText({ title = "", summary = "", publisher = "" } = {}) {
  const facts = [];
  for (const sentence of splitSentences(summary)) facts.push(sentence.replace(/^\s*[-*]\s+/, "").trim());
  if (facts.length < 3 && title && !/404\s*(?:-|–|not found)/i.test(title)) facts.unshift(`${shortPublisher(publisher)} reported: ${cleanSourceTitle(title)}`);
  const numbers = extractNumbers(title, summary);
  if (facts.length < 3 && numbers.length) facts.push(`The source includes these concrete figures: ${numbers.join(", ")}`);
  return unique(facts).slice(0, SOURCE_FACT_LIMIT);
}

export function normalizeSourceArticle(sourceArticle = {}, fallbackSource = {}, fallbackPack = {}) {
  const source = fallbackSource || {};
  const headline = cleanSourceTitle(sourceArticle.headline || sourceArticle.title || source.title || fallbackPack.topic || "");
  const publisher = shortPublisher(sourceArticle.publisher || source.publisher || fallbackPack.coverCredit || "");
  const publishedAt = sourceArticle.publishedAt || source.publishedAt || "";
  const canonicalUrl = sourceArticle.canonicalUrl || sourceArticle.url || source.url || "";
  const rawStandfirst = normalizeNewsText(sourceArticle.standfirst || sourceArticle.description || source.summary || "");
  const standfirst = isSourceNoiseText(rawStandfirst) ? "" : rawStandfirst;
  const body = normalizeNewsText(sourceArticle.body || sourceArticle.articleBody || "");
  const bodyForFacts = isSourceNoiseText(body) ? "" : body;
  const localizedLanguage = sourceArticle.localizedLanguage || "";
  const factBullets = unique(
    [
      ...(Array.isArray(sourceArticle.factBullets) ? sourceArticle.factBullets : []),
      ...(localizedLanguage
        ? []
        : factBulletsFromText({
            title: headline,
            summary: [standfirst, bodyForFacts.slice(0, SOURCE_FACT_SCAN_CHARS)].filter(Boolean).join(" "),
            publisher
          }))
    ]
      .map((fact) => normalizeNewsText(fact))
      .filter(Boolean)
      .filter((fact) => !isSourceNoiseText(fact))
  ).slice(0, SOURCE_FACT_LIMIT);
  const entities = unique([...(sourceArticle.entities || []), ...extractEntities(headline, standfirst, factBullets.join("\n"))]).slice(0, 12);
  const numbers = unique([...(sourceArticle.numbers || []), ...extractNumbers(headline, standfirst, factBullets.join("\n"))]).slice(0, 10);
  const image = {
    url: sourceArticle.image?.url || fallbackPack.primarySourceImageUrl || fallbackPack.cover || "",
    credit: sourceArticle.image?.credit || fallbackPack.coverCredit || publisher,
    creditUrl: sourceArticle.image?.creditUrl || fallbackPack.coverCreditUrl || canonicalUrl,
    probe: sourceArticle.image?.probe || fallbackPack.scanner?.imageProbe || null
  };
  const imageSeen = new Set([image.url].filter(Boolean));
  const images = [
    ...(Array.isArray(sourceArticle.images) ? sourceArticle.images : []),
    ...(Array.isArray(sourceArticle.contentImages) ? sourceArticle.contentImages : [])
  ]
    .map((item) => {
      const url = typeof item === "string" ? item : item?.url;
      if (!url || imageSeen.has(url)) return null;
      imageSeen.add(url);
      return {
        url,
        alt: normalizeNewsText(item?.alt || item?.caption || headline || "source article image"),
        caption: normalizeNewsText(item?.caption || item?.alt || ""),
        credit: item?.credit || image.credit || publisher,
        creditUrl: item?.creditUrl || image.creditUrl || canonicalUrl
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  const minimumFacts = !/404\s*(?:-|–|not found)/i.test(headline) && (factBullets.length >= 3 || (standfirst && (entities.length >= 2 || numbers.length >= 1)));
  const extractionConfidence =
    Number.isFinite(Number(sourceArticle.extractionConfidence))
      ? Number(sourceArticle.extractionConfidence)
      : minimumFacts
        ? 0.72
        : 0.42;

  return {
    headline,
    publisher,
    publishedAt,
    canonicalUrl,
    standfirst,
    localizedLanguage,
    factBullets,
    entities,
    numbers,
    body: bodyForFacts.slice(0, SOURCE_BODY_STORE_CHARS),
    image,
    images,
    extractionConfidence
  };
}

export function sourceArticleFromPackOrPost({ pack = {}, post = {} } = {}) {
  const sourceLinks = pack.sourceLinks || post.sourceLinks || [];
  const source = sourceLinks[0] || {};
  return normalizeSourceArticle(pack.sourceArticle || post.sourceArticle || {}, source, pack);
}

export function extractSourceArticleFromHtml(candidate = {}, html = "", image = {}) {
  const jsonLd = extractJsonLdArticle(html);
  const headline = jsonLd.headline || metaContent(html, "og:title") || metaContent(html, "twitter:title") || candidate.title || "";
  const standfirst =
    jsonLd.standfirst ||
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    metaContent(html, "twitter:description") ||
    candidate.summary ||
    "";
  const publisher = candidate.publisher || jsonLd.publisher || metaContent(html, "article:publisher") || "";
  const publishedAt = jsonLd.publishedAt || metaContent(html, "article:published_time") || candidate.publishedAt || "";
  const canonicalUrl =
    jsonLd.canonicalUrl ||
    metaContent(html, "og:url") ||
    (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "") ||
    candidate.url ||
    "";
  const articleImages = extractArticleImages(html, canonicalUrl || candidate.url || "", image.credit || publisher);
  const primaryImage =
    realImageUrl(image.url, canonicalUrl || candidate.url || "") ||
    realImageUrl(jsonLd.image?.url, canonicalUrl || candidate.url || "") ||
    extractMetaImage(html, canonicalUrl || candidate.url || "") ||
    articleImages[0]?.url ||
    "";
  const normalized = normalizeSourceArticle(
    {
      headline,
      publisher,
      publishedAt,
      canonicalUrl,
      standfirst,
      body: jsonLd.body || extractArticleBodyFromHtml(html),
      image: {
        url: primaryImage || candidate.imageUrl || "",
        credit: image.credit || publisher,
        creditUrl: image.creditUrl || canonicalUrl || candidate.url || "",
        probe: image.probe || candidate.imageProbe || null
      },
      images: articleImages
    },
    {
      title: headline || candidate.title,
      summary: standfirst || candidate.summary,
      publisher,
      publishedAt,
      url: canonicalUrl || candidate.url
    },
    {
      primarySourceImageUrl: primaryImage || candidate.imageUrl || "",
      coverCredit: image.credit || publisher,
      coverCreditUrl: image.creditUrl || canonicalUrl || candidate.url || "",
      scanner: { imageProbe: image.probe || candidate.imageProbe || null }
    }
  );
  return normalized;
}
