import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ filename: string }> | { filename: string } };

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

export async function GET(_: Request, context: Params) {
  const { filename } = await context.params;
  const safeFilename = path.basename(filename);
  const filepath = path.join(process.cwd(), "data", "generated-blog-media", safeFilename);

  try {
    const bytes = await fs.readFile(filepath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentTypeFor(safeFilename),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Generated media not found" }, { status: 404 });
  }
}
