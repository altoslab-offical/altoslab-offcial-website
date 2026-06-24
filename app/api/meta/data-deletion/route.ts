import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "meta_data_deletion",
    acceptedMethods: ["POST"],
    purpose: "Meta data deletion request callback endpoint for ALTOS LAB social integrations."
  });
}

export async function POST(request: Request) {
  await request.formData().catch(() => null);
  const confirmationCode = `altoslab-meta-delete-${Date.now()}`;

  return NextResponse.json({
    url: "https://altoslab-ai.cc/privacy",
    confirmation_code: confirmationCode
  });
}
