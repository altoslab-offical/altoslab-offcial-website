import { getPublishedBlogAlternates, getPublishedBlogPost } from "@/lib/cms";
import { isBlogLanguage } from "@/lib/blog-utils";
import { blogHtmlResponse, renderBlogPostHtml } from "@/lib/blog-html-render";
import type { BlogLanguage } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(request: Request, context: Params) {
  const { slug } = await context.params;
  const params = new URL(request.url).searchParams;
  const requestedLanguage = params.get("language");
  const language: BlogLanguage | undefined = isBlogLanguage(requestedLanguage) ? requestedLanguage : undefined;
  const post = await getPublishedBlogPost(slug, language);
  if (!post) return blogHtmlResponse("<!doctype html><title>Not found</title><h1>Not found</h1>", { status: 404 });
  const alternates = await getPublishedBlogAlternates(post);
  return blogHtmlResponse(renderBlogPostHtml(post, alternates));
}
