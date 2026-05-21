import { NextResponse } from "next/server";
import { mutateCmsData, updateLeadStatus } from "@/lib/cms";
import type { ContactLeadStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "new") as ContactLeadStatus;
  const note = body.note ? String(body.note) : undefined;

  const lead = await mutateCmsData((data) => {
    const index = data.contactLeads.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data.contactLeads[index] = updateLeadStatus(data.contactLeads[index], status, note);
    return data.contactLeads[index];
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
