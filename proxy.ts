import { NextResponse, type NextRequest } from "next/server";
import { adminCookieName, getAdminSessionToken } from "./lib/auth";
import { shouldRedirectToCanonicalHost, siteUrl } from "./lib/seo";

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-altos-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export function proxy(request: NextRequest) {
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

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout";

  if ((!isAdminPage && !isAdminApi) || isPublicAuthRoute) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
