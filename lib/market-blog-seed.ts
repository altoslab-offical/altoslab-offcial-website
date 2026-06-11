import type { BlogPost } from "./types";

// Blog production now lives in the Cloudflare KV-backed CMS and the scheduled source pipeline.
// Keep the seed archive empty so old template-written posts cannot reappear in local
// or fallback data hydration.
export const marketBlogPosts = [] satisfies BlogPost[];
