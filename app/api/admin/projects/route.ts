import { NextResponse } from "next/server";
import { mutateCmsData, normalizeProjectInput, readCmsData } from "@/lib/cms";
import type { Project } from "@/lib/types";

export async function GET() {
  const data = await readCmsData();
  return NextResponse.json({ projects: data.projects });
}

export async function POST(request: Request) {
  const input = (await request.json()) as Partial<Project>;
  const project = normalizeProjectInput(input);

  await mutateCmsData((data) => {
    data.projects.push(project);
  });

  return NextResponse.json({ project }, { status: 201 });
}
