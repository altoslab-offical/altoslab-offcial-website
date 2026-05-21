import { NextResponse, type NextRequest } from "next/server";
import { adminCookieName, getAdminSessionToken } from "./lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout";

  if ((!isAdminPage && !isAdminApi) || isPublicAuthRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(adminCookieName)?.value;
  const expected = getAdminSessionToken();

  if (token && expected && token === expected) {
    return NextResponse.next();
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
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
