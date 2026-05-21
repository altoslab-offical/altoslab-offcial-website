import { NextResponse } from "next/server";
import { readCmsData } from "@/lib/cms";

export async function GET() {
  const data = await readCmsData();
  return NextResponse.json(data);
}
