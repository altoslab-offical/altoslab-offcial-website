import type { BlogPost } from "./types";
import { absoluteUrl } from "./seo";

export type BlogVisualPost = Pick<
  BlogPost,
  "id" | "slug" | "title" | "language" | "contentType" | "cover" | "coverAlt" | "coverCredit" | "coverPrompt" | "coverSource"
> & {
  coverGeneration?: Pick<NonNullable<BlogPost["coverGeneration"]>, "provider">;
};

function publicCoverGeneration(post: BlogPost): BlogVisualPost["coverGeneration"] {
  // The public UI only needs to know about local, unsafe fallback media. Keep
  // production provider names out of rendered HTML and social preview payloads.
  return post.coverGeneration?.provider === "local" ? { provider: "local" } : undefined;
}

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
    coverPrompt: undefined,
    coverSource: post.coverSource,
    coverGeneration: publicCoverGeneration(post)
  };
}
