import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

const sourceRegistry = read("lib/blog-source-registry.ts");
const generation = read("lib/blog-generation.ts");
const quality = read("lib/blog-quality.ts");
const covers = read("lib/blog-cover-generation.ts");
const cron = read("lib/blog-cron.ts");
const vercel = JSON.parse(read("vercel.json"));
const marketSeed = read("lib/market-blog-seed.ts");
const seedMatch = marketSeed.match(/export const marketBlogPosts = ([\s\S]*?) satisfies BlogPost\[];/);
const seedPosts = seedMatch ? JSON.parse(seedMatch[1]) : [];

assert(sourceRegistry.includes("BLOG_NEWS_MIX"), "source registry exposes content/news mix");
assert((sourceRegistry.match(/tier: "official-rss"/g) || []).length >= 8, "source registry has at least 8 official RSS sources");
assert((sourceRegistry.match(/tier: "licensed-image"/g) || []).length >= 3, "source registry has licensed image providers");
assert(!/pinterest\.(com|[a-z]+)/i.test(sourceRegistry), "source registry does not use Pinterest as an image source");

assert(generation.includes("deepSeekModelForTask(\"content-draft\")"), "content generation uses DeepSeek model routing");
assert(generation.includes("BLOG_PROMPT_VERSION"), "generation records prompt version");
assert(generation.includes("sourceRegistryEntryForUrl"), "generation ranks sources with registry metadata");
assert(!generation.includes("deepseek-chat"), "generation does not use deprecated deepseek-chat alias");

assert(quality.includes("withLlmQualityEvaluation"), "quality gate can merge LLM-as-judge evaluation");
assert(quality.includes("registryTrustedHostFragments"), "quality source trust uses the source registry");
assert(covers.includes("BLOG_IMAGE_STORE_BLOB"), "image pipeline supports optional Vercel Blob persistence");
assert(covers.includes("searchPexels") && covers.includes("searchPixabay"), "image pipeline supports expanded free image APIs");
assert(covers.includes("pinterest") && covers.includes("approvedImageUrl"), "image pipeline rejects Pinterest URLs while allowing style inspiration");

assert(cron.includes("pickEditorialBrief"), "cron uses editorial brief and content mix");
assert(cron.includes("reviewBlogPairWithDeepSeek"), "cron runs LLM-as-judge before publish when configured");
assert(vercel.crons?.some((item) => item.path.includes("/morning")), "Vercel cron has morning slot");
assert(vercel.crons?.some((item) => item.path.includes("/afternoon")), "Vercel cron has afternoon slot");

for (const language of ["zh-Hant", "en", "ja", "ko"]) {
  const count = seedPosts.filter((post) => post.language === language).length;
  assert(count >= 48, `${language} has at least 48 seed articles`);
}

const typeCounts = seedPosts.reduce((counts, post) => {
  counts[post.contentType] = (counts[post.contentType] || 0) + 1;
  return counts;
}, {});
assert(typeCounts.breaking >= 72, "seed archive has a real latest-news/breaking lane");
assert(typeCounts.column >= 60, "seed archive keeps a substantial column lane");
assert(typeCounts.feature >= 44, "seed archive keeps a substantial feature lane");

const misleadingTitles = seedPosts.filter(
  (post) => /快訊|Market brief|市場ブリーフ|시장 브리프/i.test(post.title) && post.contentType !== "breaking"
);
assert(misleadingTitles.length === 0, "seed article titles match breaking/column/feature classification");

const postsWithoutDatedSource = seedPosts.filter(
  (post) => !post.sourceLinks?.some((source) => source.publishedAt)
);
assert(postsWithoutDatedSource.length === 0, "seed articles include at least one dated real news/source link");

const breakingWithoutNewsAnchor = seedPosts.filter(
  (post) =>
    post.contentType === "breaking" &&
    !/最新新聞錨點|Latest news anchor|最新ニュース|최신 뉴스/.test(post.body || "")
);
assert(breakingWithoutNewsAnchor.length === 0, "breaking articles visibly cite a latest-news anchor");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("PASS blog system smoke checks");
