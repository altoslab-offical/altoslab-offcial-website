"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { SectionIntro } from "./SectionIntro";
import type { PageSection, Project } from "@/lib/types";

type PortfolioSectionProps = {
  section: PageSection;
  projects: Project[];
};

function projectGallery(project: Project) {
  const gallery = project.gallery.length ? project.gallery : [project.cover];
  return gallery.slice(0, 15);
}

export function PortfolioSection({ section, projects }: PortfolioSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  );

  return (
    <section className="site-section portfolio-section" id="portfolio">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="portfolio-grid">
        {projects.map((project) => (
          <button className="portfolio-card" key={project.id} type="button" onClick={() => setSelectedId(project.id)}>
            <img src={project.cover} alt={`${project.title} cover`} loading="lazy" />
            <span className="portfolio-tag">{project.tag}</span>
            <span className="portfolio-arrow" aria-hidden="true">
              <ArrowUpRight size={16} />
            </span>
            <div>
              <p>{project.titleEn}</p>
              <h3>{project.title}</h3>
            </div>
          </button>
        ))}
      </div>
      {selectedProject ? <ProjectModal project={selectedProject} onClose={() => setSelectedId(null)} /> : null}
    </section>
  );
}

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const gallery = projectGallery(project);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] || project.cover;
  const youtubeUrl = project.productPage.youtubeUrl || project.youtubeUrl;

  return (
    <div className="project-modal-backdrop" role="dialog" aria-modal="true" aria-label={project.title}>
      <div className="project-modal">
        <button className="project-modal-close" type="button" onClick={onClose} aria-label="Close project details">
          <X size={28} />
        </button>
        <div className="project-modal-media">
          <img src={activeImage} alt={`${project.title} screenshot ${activeIndex + 1}`} />
          {gallery.length > 1 ? (
            <div className="project-modal-thumbs">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={index === activeIndex ? "active" : undefined}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show screenshot ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="project-modal-body">
          <div className="project-modal-main">
            <p className="site-eyebrow">{project.titleEn}</p>
            <h2>{project.title}</h2>
            <div className="project-copy-block">
              <p className="project-copy-label">概述</p>
              <p>{project.desc}</p>
            </div>
            <div className="project-copy-block">
              <p className="project-copy-label">執行細節</p>
              <p>{project.detail}</p>
            </div>
            {youtubeUrl ? (
              <div className="project-video">
                <p className="project-copy-label">YouTube</p>
                <iframe
                  src={youtubeUrl.replace("watch?v=", "embed/")}
                  title={`${project.title} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
          </div>
          <aside className="project-modal-aside">
            <p className="project-copy-label">成效指標</p>
            <div className="project-metrics">
              {project.metrics.map((metric) => (
                <div key={`${metric.label}-${metric.value}`}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
            <p className="project-copy-label">Tech Stack</p>
            <div className="project-tech-tags">
              {project.tech.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </div>
            {project.url ? (
              <a className="site-button site-button-primary project-link" href={project.url} target="_blank" rel="noreferrer">
                前往網站
                <ArrowUpRight size={18} />
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
