import { runBlogDraftCron } from "@/lib/blog-cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runBlogDraftCron(request, "morning");
}
