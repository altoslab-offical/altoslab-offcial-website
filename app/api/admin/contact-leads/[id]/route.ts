import { NextResponse } from "next/server";
import { mutateCmsData, updateLeadStatus } from "@/lib/cms";
import type { ContactLeadStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "new") as ContactLeadStatus;
  const note = body.note ? String(body.note) : undefined;

  let lead;
  try {
    lead = await mutateCmsData((data) => {
      const index = data.contactLeads.findIndex((item) => item.id === id);
      if (index === -1) throw new Error("CONTACT_LEAD_NOT_FOUND");
      data.contactLeads[index] = updateLeadStatus(data.contactLeads[index], status, note);
      return data.contactLeads[index];
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTACT_LEAD_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ lead });
}
