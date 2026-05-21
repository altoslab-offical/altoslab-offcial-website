import { NextResponse } from "next/server";
import { getPublishedProject } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(_: Request, context: Params) {
  const { slug } = await context.params;
  const project = await getPublishedProject(slug);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}
