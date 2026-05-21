import { NextResponse } from "next/server";
import { mutateCmsData, normalizeProjectInput, publishValidationForProject } from "@/lib/cms";
import type { Project } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const input = (await request.json()) as Partial<Project>;

  const result = await mutateCmsData((data) => {
    const index = data.projects.findIndex((project) => project.id === id);
    if (index === -1) return null;
    const next = normalizeProjectInput(input, data.projects[index]);
    if (next.status === "published") {
      const errors = publishValidationForProject(next);
      if (errors.length) return { errors };
    }
    data.projects[index] = next;
    return { project: next };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("errors" in result) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_: Request, context: Params) {
  const { id } = await context.params;

  const project = await mutateCmsData((data) => {
    const index = data.projects.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data.projects[index] = { ...data.projects[index], status: "archived", updatedAt: new Date().toISOString() };
    return data.projects[index];
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}
