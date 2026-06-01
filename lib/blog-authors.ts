import type { BlogGenerationSlot, BlogLanguage, BlogPost } from "./types";

export type PublicBlogAuthor = "Tommy" | "Ken";

export const PUBLIC_BLOG_AUTHORS: PublicBlogAuthor[] = ["Tommy", "Ken"];

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function normalizeBlogAuthor(
  author?: string | null,
  options: { slot?: BlogGenerationSlot; seed?: string } = {}
): PublicBlogAuthor {
  const trimmed = String(author || "").trim();
  if (trimmed === "Tommy" || trimmed === "Ken") return trimmed;
  if (options.slot === "morning") return "Tommy";
  if (options.slot === "afternoon") return "Ken";
  return hashSeed(options.seed || trimmed || "altos-lab") % 2 === 0 ? "Tommy" : "Ken";
}

export function blogAuthorForPost(
  post: Pick<BlogPost, "author" | "generationSlot" | "translationGroupId" | "ingestRunId" | "slug">
) {
  return normalizeBlogAuthor(post.author, {
    slot: post.generationSlot,
    seed: post.translationGroupId || post.ingestRunId || post.slug
  });
}

export function blogAuthorInitials(author: PublicBlogAuthor) {
  return author === "Ken" ? "K" : "T";
}

export function blogAuthorProfile(author: PublicBlogAuthor, language: BlogLanguage) {
  const profiles = {
    Tommy: {
      "zh-Hant":
        "ALTOS LAB 產品與 AI 導入編輯，關注企業流程、生成式搜尋與能真正落地的決策框架。",
      en: "ALTOS LAB product and AI implementation editor, focused on enterprise workflows, generative search and practical decision frameworks.",
      ja: "ALTOS LAB のプロダクト／AI導入編集者。企業ワークフロー、生成型検索、実装できる判断軸を扱います。",
      ko: "ALTOS LAB 제품 및 AI 도입 에디터. 기업 워크플로, 생성형 검색, 실행 가능한 의사결정 프레임을 다룹니다."
    },
    Ken: {
      "zh-Hant":
        "ALTOS LAB 研究與工程編輯，聚焦 AI Agent、資料流程、品質門禁與產品化風險。",
      en: "ALTOS LAB research and engineering editor, focused on AI agents, data workflows, quality gates and productization risk.",
      ja: "ALTOS LAB のリサーチ／エンジニアリング編集者。AIエージェント、データフロー、品質ゲート、プロダクト化リスクを追います。",
      ko: "ALTOS LAB 리서치 및 엔지니어링 에디터. AI Agent, 데이터 흐름, 품질 게이트, 제품화 리스크를 봅니다."
    }
  } satisfies Record<PublicBlogAuthor, Record<BlogLanguage, string>>;

  return {
    name: author,
    bio: profiles[author][language],
    avatar: author === "Ken" ? "/authors/ken-avatar.jpg" : "/authors/tommy-avatar.jpg"
  };
}

export function publicEditorialReviewNote(language: BlogLanguage) {
  if (language === "en") {
    return "Reviewed and edited by ALTOS LAB for source context, readability, factual consistency and practical usefulness.";
  }
  if (language === "ja") {
    return "この記事は ALTOS LAB が出典の文脈、読みやすさ、事実の整合性、実務での有用性を確認して編集しています。";
  }
  if (language === "ko") {
    return "이 글은 ALTOS LAB이 출처 맥락, 가독성, 사실 일관성, 실무 활용성을 검토하고 편집했습니다.";
  }
  return "本文由 ALTOS LAB 編輯團隊審校，已確認來源脈絡、可讀性、事實一致性與實務可用性。";
}

export function publicCoverCreditForPost(post: Pick<BlogPost, "coverCredit" | "coverSource" | "language">) {
  const credit = String(post.coverCredit || "").trim();
  if (!credit) return "";
  if (post.coverSource === "generated" || /AI[-\s]?generated|AI 生成|AI-assisted|AI 協助/i.test(credit)) {
    if (post.language === "en") return "ALTOS LAB editorial visual";
    if (post.language === "ja") return "ALTOS LAB 編集ビジュアル";
    if (post.language === "ko") return "ALTOS LAB 편집 비주얼";
    return "ALTOS LAB 編輯視覺";
  }
  return credit;
}
