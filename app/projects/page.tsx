import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedProjects } from "@/lib/cms";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 產品與實作案例",
  description: "ALTOS LAB 的 AI 客服、流程自動化、GEO 與 AI Agent 實作案例。",
  alternates: {
    canonical: `${siteUrl}/projects`
  }
};

export default async function ProjectsIndexPage() {
  const projects = await getPublishedProjects();

  return (
    <main className="blog-page">
      <p className="eyebrow">Portfolio</p>
      <h1>AI 產品與實作案例</h1>
      <div className="project-grid" style={{ marginTop: 36 }}>
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <Link className="project-image" href={`/projects/${project.slug}`}>
              <img src={project.cover} alt={`${project.title} cover`} loading="lazy" />
            </Link>
            <div className="project-body">
              <p className="eyebrow">{project.tag}</p>
              <h2>{project.title}</h2>
              <p>{project.desc}</p>
              <Link className="card-link" href={`/projects/${project.slug}`}>
                查看案例
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
