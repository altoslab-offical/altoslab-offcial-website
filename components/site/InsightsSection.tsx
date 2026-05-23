import Link from "next/link";
import { SectionIntro } from "./SectionIntro";
import type { BlogPost, PageSection } from "@/lib/types";

export function InsightsSection({ section, posts }: { section: PageSection; posts: BlogPost[] }) {
  if (!posts.length) return null;

  return (
    <section className="site-section insights-section">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="insight-list">
        {posts.slice(0, 3).map((post) => (
          <Link className="insight-row" href={`/blog/${post.slug}`} key={post.id}>
            <span>{post.topic}</span>
            <strong>{post.title}</strong>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
