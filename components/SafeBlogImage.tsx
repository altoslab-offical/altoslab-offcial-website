"use client";

import { useState } from "react";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import type { BlogPost } from "@/lib/types";

type SafeBlogImageProps = {
  post: BlogPost;
  className?: string;
  loading?: "eager" | "lazy";
  compact?: boolean;
};

export function SafeBlogImage({ post, className, loading = "lazy", compact }: SafeBlogImageProps) {
  const [failed, setFailed] = useState(false);
  const shouldUseEditorialVisual =
    failed || !post.cover || (post.coverSource !== "curated" && post.coverGeneration?.provider === "local");

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
