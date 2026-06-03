import type { BlogPost } from "./types";
import { absoluteUrl } from "./seo";

export type BlogVisualPost = Pick<
  BlogPost,
  "id" | "slug" | "title" | "language" | "contentType" | "cover" | "coverAlt" | "coverCredit" | "coverPrompt" | "coverSource"
> & {
  coverGeneration?: Pick<NonNullable<BlogPost["coverGeneration"]>, "provider">;
};

export function toBlogVisualPost(post: BlogPost): BlogVisualPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    language: post.language,
    contentType: post.contentType,
    cover: post.cover ? absoluteUrl(post.cover) : post.cover,
    coverAlt: post.coverAlt,
    coverCredit: post.coverCredit,
    coverPrompt: post.coverPrompt,
    coverSource: post.coverSource,
    coverGeneration: post.coverGeneration ? { provider: post.coverGeneration.provider } : undefined
  };
}
