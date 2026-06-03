import type { BlogVisualPost } from "@/lib/blog-visual";

type BlogEditorialVisualProps = {
  post: BlogVisualPost;
  compact?: boolean;
};

const languageClass = {
  "zh-Hant": "zh",
  en: "en",
  ja: "ja",
  ko: "ko"
};

function visualVariant(post: BlogVisualPost) {
  const seed = post.slug || post.id || post.title;
  return Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
}

export function BlogEditorialVisual({ post, compact = false }: BlogEditorialVisualProps) {
  const contentType = post.contentType || "column";
  const variant = visualVariant(post);

  return (
    <div
      aria-label={post.coverAlt || `${post.title} editorial visual`}
      className={`blog-editorial-visual blog-editorial-visual-${contentType} blog-editorial-visual-${languageClass[post.language]} blog-editorial-visual-v${variant}${compact ? " compact" : ""}`}
      role="img"
    >
      <span className="blog-visual-layer layer-grid" aria-hidden="true" />
      <span className="blog-visual-layer layer-field" aria-hidden="true" />
      <span className="blog-visual-layer layer-arc" aria-hidden="true" />
      <span className="blog-visual-layer layer-card-one" aria-hidden="true" />
      <span className="blog-visual-layer layer-card-two" aria-hidden="true" />
      <span className="blog-visual-layer layer-card-three" aria-hidden="true" />
      <span className="blog-visual-layer layer-thread-one" aria-hidden="true" />
      <span className="blog-visual-layer layer-thread-two" aria-hidden="true" />
      <span className="blog-visual-layer layer-spark-one" aria-hidden="true" />
      <span className="blog-visual-layer layer-spark-two" aria-hidden="true" />
    </div>
  );
}
