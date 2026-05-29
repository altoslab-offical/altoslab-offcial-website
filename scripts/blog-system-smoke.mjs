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
  const count = (marketSeed.match(new RegExp(`"language": "${language}"`, "g")) || []).length;
  assert(count >= 48, `${language} has at least 48 seed articles`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("PASS blog system smoke checks");
