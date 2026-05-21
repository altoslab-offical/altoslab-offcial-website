import { NextResponse } from "next/server";
import { createContactLead, mutateCmsData } from "@/lib/cms";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = rateLimit.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export async function POST(request: Request) {
  const key = getClientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const who = String(body.who || "").trim();
  const contact = String(body.contact || "").trim();
  const message = String(body.message || "").trim();

  if (!who || !contact || !message) {
    return NextResponse.json(
      { ok: false, error: "who, contact and message are required" },
      { status: 400 }
    );
  }

  const lead = createContactLead({ who, contact, message });
  await mutateCmsData((data) => {
    data.contactLeads.unshift(lead);
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
