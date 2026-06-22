"use client";

import { useState } from "react";
import type { BlogInlineImage } from "@/lib/types";

export function SafeBlogInlineImage({ image }: { image: BlogInlineImage }) {
  const [failed, setFailed] = useState(false);
  if (!image.url || failed) return null;

  return <img src={image.url} alt={image.alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
