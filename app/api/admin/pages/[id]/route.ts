import { NextResponse } from "next/server";
import { mutateCmsData, normalizePageInput, normalizeSection } from "@/lib/cms";
import type { SitePage } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const input = (await request.json()) as Partial<SitePage>;

  const updated = await mutateCmsData((data) => {
    const index = data.sitePages.findIndex((page) => page.id === id);
    if (index === -1) return null;
    const existing = data.sitePages[index];
    const next = {
      ...existing,
      ...normalizePageInput(input),
      sections: input.sections ? input.sections.map(normalizeSection) : existing.sections
    };
    data.sitePages[index] = next;
    return next;
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page: updated });
}
