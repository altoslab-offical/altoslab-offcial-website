const ENTITY_WORD_PATTERN =
  /\b[A-Z][A-Za-z0-9&.+-]*(?:\s+[A-Z][A-Za-z0-9&.+-]*){0,4}\b/g;

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
    .filter((sentence) => sentence.length >= 16);
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
      .match(/(?:[$€£]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:%|x|倍|萬|億|million|billion|trillion|calls?|parameters?|users?|organizations?|countries?|美元|美金|通電話|參數|家|國)?/gi) || []
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
  for (const sentence of splitSentences(summary)) facts.push(sentence);
  if (facts.length < 3 && title) facts.unshift(`${shortPublisher(publisher)} reported: ${cleanSourceTitle(title)}`);
  const numbers = extractNumbers(title, summary);
  if (facts.length < 3 && numbers.length) facts.push(`The source includes these concrete figures: ${numbers.join(", ")}`);
  return unique(facts).slice(0, 6);
}

export function normalizeSourceArticle(sourceArticle = {}, fallbackSource = {}, fallbackPack = {}) {
  const source = fallbackSource || {};
  const headline = cleanSourceTitle(sourceArticle.headline || sourceArticle.title || source.title || fallbackPack.topic || "");
  const publisher = shortPublisher(sourceArticle.publisher || source.publisher || fallbackPack.coverCredit || "");
  const publishedAt = sourceArticle.publishedAt || source.publishedAt || "";
  const canonicalUrl = sourceArticle.canonicalUrl || sourceArticle.url || source.url || "";
  const standfirst = normalizeNewsText(sourceArticle.standfirst || sourceArticle.description || source.summary || "");
  const body = normalizeNewsText(sourceArticle.body || sourceArticle.articleBody || "");
  const factBullets = unique(
    [
      ...(Array.isArray(sourceArticle.factBullets) ? sourceArticle.factBullets : []),
      ...factBulletsFromText({
        title: headline,
        summary: [standfirst, body.slice(0, 1600)].filter(Boolean).join(" "),
        publisher
      })
    ]
      .map((fact) => normalizeNewsText(fact))
      .filter(Boolean)
  ).slice(0, 6);
  const entities = unique([...(sourceArticle.entities || []), ...extractEntities(headline, standfirst, factBullets.join("\n"))]).slice(0, 12);
  const numbers = unique([...(sourceArticle.numbers || []), ...extractNumbers(headline, standfirst, factBullets.join("\n"))]).slice(0, 10);
  const image = {
    url: sourceArticle.image?.url || fallbackPack.primarySourceImageUrl || fallbackPack.cover || "",
    credit: sourceArticle.image?.credit || fallbackPack.coverCredit || publisher,
    creditUrl: sourceArticle.image?.creditUrl || fallbackPack.coverCreditUrl || canonicalUrl,
    probe: sourceArticle.image?.probe || fallbackPack.scanner?.imageProbe || null
  };
  const minimumFacts = factBullets.length >= 3 || (standfirst && (entities.length >= 2 || numbers.length >= 1));
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
    factBullets,
    entities,
    numbers,
    body: body.slice(0, 2000),
    image,
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
  const normalized = normalizeSourceArticle(
    {
      headline,
      publisher,
      publishedAt,
      canonicalUrl,
      standfirst,
      body: jsonLd.body,
      image: {
        url: image.url || jsonLd.image?.url || candidate.imageUrl || "",
        credit: image.credit || publisher,
        creditUrl: image.creditUrl || canonicalUrl || candidate.url || "",
        probe: image.probe || candidate.imageProbe || null
      }
    },
    {
      title: headline || candidate.title,
      summary: standfirst || candidate.summary,
      publisher,
      publishedAt,
      url: canonicalUrl || candidate.url
    },
    {
      primarySourceImageUrl: image.url || jsonLd.image?.url || candidate.imageUrl || "",
      coverCredit: image.credit || publisher,
      coverCreditUrl: image.creditUrl || canonicalUrl || candidate.url || "",
      scanner: { imageProbe: image.probe || candidate.imageProbe || null }
    }
  );
  return normalized;
}
