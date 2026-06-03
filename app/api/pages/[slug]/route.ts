import { NextResponse } from "next/server";
import { getPublishedPage } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(_: Request, context: Params) {
  const { slug } = await context.params;
  const page = await getPublishedPage(slug);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}
