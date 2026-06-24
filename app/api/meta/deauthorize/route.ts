import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "meta_deauthorize",
    acceptedMethods: ["POST"],
    purpose: "Meta app deauthorization callback endpoint for ALTOS LAB social integrations."
  });
}

export async function POST(request: Request) {
  await request.formData().catch(() => null);

  return NextResponse.json({
    ok: true,
    status: "received",
    endpoint: "meta_deauthorize"
  });
}
