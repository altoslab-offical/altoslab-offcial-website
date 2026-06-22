"use client";

import { useState } from "react";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import type { BlogVisualPost } from "@/lib/blog-visual";

type SafeBlogImageProps = {
  post: BlogVisualPost;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  compact?: boolean;
};

const rejectedCoverPattern =
  /(dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|anti-aircraft|air defense|defense computer|radarno|usdagov|john lennon|austen|desire screenshot|unabridged|dead prisoners|robot arm picks up|shixart|malaria|microscopy training|nigeria)/i;
const lowQualityGeneratedCoverPattern =
  /(generic|placeholder|abstract background|glowing dashboard|fake dashboard|network map|glass cube|server room|robot handshake|tilted|skewed|slanted|large cursor|cursor shape|pink editorial background|source-cover|科技感背景|抽象科技|假儀表板|網路圖|玻璃方塊|漸層背景|斜的|歪斜|巨大游標|斜游標)/i;

function hasRejectedCover(post: BlogVisualPost) {
  const metadata = [post.cover, post.coverAlt, post.coverCredit, post.coverPrompt].filter(Boolean).join(" ");
  return rejectedCoverPattern.test(metadata) || lowQualityGeneratedCoverPattern.test(metadata);
}

export function SafeBlogImage({ post, className, loading = "lazy", fetchPriority, compact }: SafeBlogImageProps) {
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
      fetchPriority={fetchPriority}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
