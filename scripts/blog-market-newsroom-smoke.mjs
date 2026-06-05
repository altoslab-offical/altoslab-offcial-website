#!/usr/bin/env node

import { buildMarketNewsroomPost } from "./blog-market-newsroom.mjs";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LEGACY_TEMPLATE_PATTERN =
  /消息落在哪個產品環節|來源裡的具體細節|先看採用而不是聲量|下一步先看三個指標|實際使用量是否增加、付費或正式採用|具體使用者與可觀察的使用量|Adoption matters more than buzz|Next step: watch three signals/i;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

const fixtures = [
  {
    name: "amazon",
    mustAny: [["Amazon"]],
    pack: {
      topic: "Amazon will show AI product images when you search for some reason",
      sourceLinks: [
        {
          title: "Amazon will show AI product images when you search for some reason",
          url: "https://techcrunch.com/2026/06/03/amazon-will-show-ai-product-images-when-you-search-for-some-reason/",
          publisher: "TechCrunch AI",
          publishedAt: "Wed, 03 Jun 2026 15:50:26 +0000",
          summary:
            "Amazon will use visual search and AI to show AI-generated product images that match your search queries. The retailer says it will help guide users to products."
        }
      ],
      primarySourceImageUrl: "https://techcrunch.com/wp-content/uploads/2026/06/Screenshot-2026-06-03-at-11.16.52-AM.jpg?resize=1200,695",
      coverCredit: "Source image: TechCrunch AI",
      coverCreditUrl: "https://techcrunch.com/2026/06/03/amazon-will-show-ai-product-images-when-you-search-for-some-reason/"
    }
  },
  {
    name: "lovable",
    mustAny: [["Lovable"], ["Google"], ["5", "fivefold", "5x", "gấp 5", "5 เท่า", "lima kali"]],
    pack: {
      topic: "Lovable signs multiyear deal with Google Cloud to up usage 5x, source says",
      sourceLinks: [
        {
          title: "Lovable signs multiyear deal with Google Cloud to up usage 5x, source says",
          url: "https://techcrunch.com/2026/06/03/lovable-signs-multi-year-deal-with-google-cloud-to-up-usage-5x-source-says/",
          publisher: "TechCrunch AI",
          publishedAt: "Wed, 03 Jun 2026 22:56:51 +0000",
          summary:
            "Lovable and Google signed an expanded multiyear deal that involves a 5x expansion of Lovable's footprint on Google Cloud, and expanded access to Anthropic Claude."
        }
      ],
      primarySourceImageUrl: "https://techcrunch.com/wp-content/uploads/2026/03/GettyImages-2245627953.jpg?resize=1200,800",
      coverCredit: "Source image: TechCrunch AI",
      coverCreditUrl: "https://techcrunch.com/2026/06/03/lovable-signs-multi-year-deal-with-google-cloud-to-up-usage-5x-source-says/"
    }
  },
  {
    name: "voice",
    mustAny: [["AethexAI"], ["17,000", "17.000", "17,000", "mahigit 17", "hơn 17", "มากกว่า 17"]],
    pack: {
      topic: "These two founders left Goldman and Meta to build voice AI for markets everyone else overlooked",
      sourceLinks: [
        {
          title: "These two founders left Goldman and Meta to build voice AI for markets everyone else overlooked",
          url: "https://techcrunch.com/2026/06/03/these-two-founders-left-goldman-and-meta-to-build-voice-ai-for-markets-everyone-else-overlooked/",
          publisher: "TechCrunch AI",
          publishedAt: "Wed, 03 Jun 2026 12:00:00 +0000",
          summary: "The startup's own stack for Africa and Middle East is now handling more than 17,000 calls per day."
        }
      ],
      primarySourceImageUrl: "https://techcrunch.com/wp-content/uploads/2026/06/aethexai.jpg",
      coverCredit: "Source image: TechCrunch AI",
      coverCreditUrl: "https://techcrunch.com/2026/06/03/these-two-founders-left-goldman-and-meta-to-build-voice-ai-for-markets-everyone-else-overlooked/",
      sourceArticle: {
        headline: "These two founders left Goldman and Meta to build voice AI for markets everyone else overlooked",
        publisher: "TechCrunch AI",
        publishedAt: "2026-06-03T12:00:00.000Z",
        canonicalUrl: "https://techcrunch.com/2026/06/03/these-two-founders-left-goldman-and-meta-to-build-voice-ai-for-markets-everyone-else-overlooked/",
        standfirst: "AethexAI raised $3 million in pre-seed funding to build voice AI systems for Africa and the Middle East.",
        factBullets: [
          "AethexAI was founded by Mariama Diallo and Ayooluwa Odemuyiwa.",
          "The company says its system handles more than 17,000 calls per day.",
          "Its early use cases include debt collection, customer activation, and KYC."
        ],
        entities: ["AethexAI", "Goldman Sachs", "Meta", "Africa", "Middle East"],
        numbers: ["$3 million", "17,000 calls per day"],
        extractionConfidence: 0.88,
        image: {
          url: "https://techcrunch.com/wp-content/uploads/2026/06/aethexai.jpg",
          credit: "TechCrunch AI",
          creditUrl: "https://techcrunch.com/2026/06/03/these-two-founders-left-goldman-and-meta-to-build-voice-ai-for-markets-everyone-else-overlooked/"
        }
      }
    }
  }
];

for (const fixture of fixtures) {
  for (const language of LANGUAGES) {
    const post = buildMarketNewsroomPost({ language, pack: fixture.pack, slug: `${fixture.name}-${language}` });
    const publicText = [post.title, post.excerpt, post.geoSummary, post.body, ...(post.keyTakeaways || [])].join("\n");
    assert(!LEGACY_TEMPLATE_PATTERN.test(publicText), `${fixture.name}/${language} should not use legacy market template`);
    assert(post.coverSource === "source", `${fixture.name}/${language} should keep source cover`);
    assert(post.sourceLinks.length >= 2, `${fixture.name}/${language} should include the primary source plus a clean publisher AI coverage link`);
    for (const terms of fixture.mustAny) {
      assert(
        terms.some((term) => publicText.toLowerCase().includes(term.toLowerCase())),
        `${fixture.name}/${language} missing one of ${terms.join(", ")}`
      );
    }
    if (language === "zh-Hant") {
      assert(!post.title.includes("更新："), `${fixture.name}/zh-Hant title should not use weak update label`);
      assert(!post.title.includes("市場訊號"), `${fixture.name}/zh-Hant title should not use market signal label`);
      assert(!post.excerpt.includes(fixture.pack.sourceLinks[0].title), `${fixture.name}/zh-Hant excerpt should not leak raw English title`);
    }
    if (language !== "en") {
      assert(!/reported:\s+[A-Z][A-Za-z]/.test(post.body), `${fixture.name}/${language} should not leak English fallback report phrasing`);
    }
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({ ok: true, fixtures: fixtures.length, languages: LANGUAGES.length }, null, 2));
