import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { getPublishedProject } from "@/lib/cms";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return {};

  return {
    title: `${project.title}｜AI 實作案例`,
    description: project.desc,
    alternates: {
      canonical: absoluteUrl(`/projects/${project.slug}`)
    },
    openGraph: {
      title: project.title,
      description: project.desc,
      url: absoluteUrl(`/projects/${project.slug}`),
      images: [absoluteUrl(project.cover)]
    }
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  return (
    <main className="project-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Projects", url: "/projects" },
          { name: project.title, url: `/projects/${project.slug}` }
        ])}
      />
      <Link className="card-link" href="/projects">
        ← Projects
      </Link>
      <p className="eyebrow">{project.tag}</p>
      <h1>{project.productPage.heroTitle || project.title}</h1>
      {project.productPage.heroSubtitle ? <p className="hero-subtitle">{project.productPage.heroSubtitle}</p> : null}
      <p className="hero-copy">{project.productPage.heroBody || project.desc}</p>

      <div className="project-gallery">
        {(project.gallery.length ? project.gallery : [project.cover]).slice(0, 6).map((image) => (
          <img src={image} alt={`${project.title} gallery`} key={image} loading="lazy" />
        ))}
      </div>

      <section className="project-detail-card">
        <p className="eyebrow">Overview</p>
        <p className="muted">{project.desc}</p>
        <p className="muted">{project.detail}</p>
      </section>

      <section className="stats-grid">
        {project.metrics.map((metric) => (
          <article className="stat-card" key={`${metric.label}-${metric.value}`}>
            <div className="stat-value">{metric.value}</div>
            <div className="stat-label">{metric.label}</div>
          </article>
        ))}
      </section>

      {project.productPage.sections.length ? (
        <section style={{ marginTop: 36 }}>
          {project.productPage.sections
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section) => (
              <article className="project-detail-card" key={section.id}>
                <p className="eyebrow">{section.eyebrow}</p>
                <h2>{section.title}</h2>
                <p className="muted">{section.body}</p>
                {section.image ? <img src={section.image} alt={section.title} loading="lazy" /> : null}
              </article>
            ))}
        </section>
      ) : null}

      {project.youtubeUrl || project.productPage.youtubeUrl ? (
        <section className="project-detail-card">
          <p className="eyebrow">Video</p>
          <div style={{ aspectRatio: "16 / 9" }}>
            <iframe
              width="100%"
              height="100%"
              src={(project.productPage.youtubeUrl || project.youtubeUrl || "").replace("watch?v=", "embed/")}
              title={`${project.title} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      <div className="tag-row">
        {project.tech.map((tech) => (
          <span className="tag" key={tech}>
            {tech}
          </span>
        ))}
      </div>
    </main>
  );
}
