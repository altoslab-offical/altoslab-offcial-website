"use client";

import { useState } from "react";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import type { BlogVisualPost } from "@/lib/blog-visual";

type SafeBlogImageProps = {
  post: BlogVisualPost;
  className?: string;
  loading?: "eager" | "lazy";
  compact?: boolean;
};

const rejectedCoverPattern =
  /(dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|anti-aircraft|air defense|defense computer|radarno|usdagov|john lennon|austen|desire screenshot|unabridged|dead prisoners|robot arm picks up|shixart|malaria|microscopy training|nigeria)/i;

function hasRejectedCover(post: BlogVisualPost) {
  return rejectedCoverPattern.test([post.cover, post.coverAlt, post.coverCredit, post.coverPrompt].filter(Boolean).join(" "));
}

export function SafeBlogImage({ post, className, loading = "lazy", compact }: SafeBlogImageProps) {
  const [failed, setFailed] = useState(false);
  const shouldUseEditorialVisual =
    failed || hasRejectedCover(post) || !post.cover || (post.coverSource !== "curated" && post.coverGeneration?.provider === "local");

  if (shouldUseEditorialVisual) {
    return <BlogEditorialVisual compact={compact} post={post} />;
  }

  return (
    <img
      className={className}
      src={post.cover}
      alt={post.coverAlt || `${post.title} cover`}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
