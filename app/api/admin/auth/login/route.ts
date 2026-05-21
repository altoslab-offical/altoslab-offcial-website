import { NextResponse } from "next/server";
import { adminCookieName, getAdminPassword, getAdminSessionToken, isAdminConfigured } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin auth is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");

  if (password !== getAdminPassword()) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, getAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
