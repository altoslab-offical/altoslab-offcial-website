import { getPublishedBlogInventoryPostsForApi } from "@/lib/cms";
import { isBlogLanguage } from "@/lib/blog-utils";
import { blogHtmlResponse, renderBlogIndexHtml } from "@/lib/blog-html-render";
import type { BlogLanguage } from "@/lib/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedLanguage = params.get("language");
  const language: BlogLanguage = isBlogLanguage(requestedLanguage) ? requestedLanguage : "zh-Hant";
  const posts = await getPublishedBlogInventoryPostsForApi(language, 30);
  return blogHtmlResponse(
    renderBlogIndexHtml(language, posts, {
      tag: params.get("tag") || undefined,
      query: params.get("query") || undefined
    })
  );
}
