import { NextResponse, type NextRequest } from "next/server";
import { adminCookieName, getAdminSessionToken } from "./lib/auth";
import { shouldRedirectToCanonicalHost, siteUrl } from "./lib/seo";

const AI_CRAWLER_PATTERN =
  /(GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|PerplexityBot|Google-Extended|Meta-ExternalAgent|Bytespider)/i;
const BLOG_HTML_LANGUAGE_PREFIXES = new Set(["en", "ja", "ko", "id", "vi", "th", "ms", "fil"]);

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-altos-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  const userAgent = request.headers.get("user-agent") || "";
  if (AI_CRAWLER_PATTERN.test(userAgent)) {
    response.headers.set("x-altos-ai-crawler", "detected");
    console.info(
      "[altos-ai-crawler]",
      JSON.stringify({
        path: request.nextUrl.pathname,
        userAgent: userAgent.slice(0, 160),
        at: new Date().toISOString()
      })
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    !pathname.startsWith("/api/") &&
    shouldRedirectToCanonicalHost(host)
  ) {
    const canonicalUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, siteUrl);
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if ((request.method === "GET" || request.method === "HEAD") && !pathname.startsWith("/api/")) {
    const segments = pathname.split("/").filter(Boolean);
    const isZhBlogIndex = segments.length === 1 && segments[0] === "blog";
    const isZhBlogPost = segments.length === 2 && segments[0] === "blog";
    const isLocalizedBlogIndex = segments.length === 2 && BLOG_HTML_LANGUAGE_PREFIXES.has(segments[0]) && segments[1] === "blog";
    const isLocalizedBlogPost = segments.length === 3 && BLOG_HTML_LANGUAGE_PREFIXES.has(segments[0]) && segments[1] === "blog";

    if (isZhBlogIndex || isLocalizedBlogIndex || isZhBlogPost || isLocalizedBlogPost) {
      const rewriteUrl = request.nextUrl.clone();
      const language = isLocalizedBlogIndex || isLocalizedBlogPost ? segments[0] : "zh-Hant";
      const slug = isZhBlogPost ? segments[1] : isLocalizedBlogPost ? segments[2] : "";
      rewriteUrl.pathname = slug ? `/api/blog-html/${slug}` : "/api/blog-html";
      rewriteUrl.searchParams.set("language", language);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout";
  const isPublicSignedIngestRoute =
    pathname === "/api/admin/blog/ingest-set" ||
    pathname === "/api/admin/blog/release-set" ||
    pathname === "/api/admin/blog/media";

  if ((!isAdminPage && !isAdminApi) || isPublicAuthRoute || isPublicSignedIngestRoute) {
    return nextWithPathname(request);
  }

  const token = request.cookies.get(adminCookieName)?.value;
  const expected = getAdminSessionToken();

  if (token && expected && token === expected) {
    return nextWithPathname(request);
  }

  if (isAdminApi) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/feed.xml",
    "/llms-full.txt",
    "/llms.txt",
    "/manifest.webmanifest",
    "/robots.txt",
    "/sitemap.xml"
  ]
};
