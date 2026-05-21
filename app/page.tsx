import { ArrowRight, ExternalLink, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import {
  getPublishedBlogPosts,
  getPublishedHomePage,
  getPublishedProjects,
  sortedByOrder
} from "@/lib/cms";
import {
  organizationJsonLd,
  pageMetadata,
  servicesJsonLd,
  websiteJsonLd
} from "@/lib/seo";
import type { PageSection } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedHomePage();
  return pageMetadata(page);
}

function sectionByKey(sections: PageSection[], key: string) {
  return sections.find((section) => section.key === key);
}

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>ALTOS LAB</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#blog">Blog</a>
          <a href="#contact">Contact</a>
          <Link href="/admin">Admin</Link>
        </nav>
        <a className="button primary" href="#contact">
          <Mail size={16} />
          Start
        </a>
      </div>
    </header>
  );
}

export default async function HomePage() {
  const [page, projects, posts] = await Promise.all([
    getPublishedHomePage(),
    getPublishedProjects(),
    getPublishedBlogPosts()
  ]);

  const sections = page?.sections ?? [];
  const hero = sectionByKey(sections, "hero");
  const stats = sectionByKey(sections, "stats");
  const about = sectionByKey(sections, "about");
  const services = sectionByKey(sections, "services");
  const portfolio = sectionByKey(sections, "portfolio");
  const why = sectionByKey(sections, "why-us");
  const team = sectionByKey(sections, "team");
  const blog = sectionByKey(sections, "blog");
  const contact = sectionByKey(sections, "contact");

  return (
    <div className="site-shell">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={servicesJsonLd(projects)} />
      <SiteHeader />

      <main>
        <section className="hero" id="top">
          <div>
            <p className="eyebrow">{hero?.eyebrow}</p>
            <h1 className="hero-title">
              {hero?.title || "ALTOS"}
              <span>{hero?.accentText || "LAB"}</span>
            </h1>
            <p className="hero-subtitle">{hero?.subtitle}</p>
            <p className="hero-copy">{hero?.body}</p>
            <div className="hero-actions">
              <a className="button primary" href={hero?.ctaPrimaryUrl || "#contact"}>
                {hero?.ctaPrimaryLabel || "Start"}
                <ArrowRight size={16} />
              </a>
              <a className="button" href={hero?.ctaSecondaryUrl || "#portfolio"}>
                {hero?.ctaSecondaryLabel || "Explore"}
              </a>
            </div>
          </div>

          <aside className="signal-panel" aria-label="ALTOS LAB system signals">
            <div className="signal-panel-top">
              <span>AI OPERATIONS STACK</span>
              <span>LIVE</span>
            </div>
            <div className="signal-stack">
              {["Knowledge Base", "Agent Workflow", "CMS Control", "GEO Content"].map((label, index) => (
                <div className="signal-row" key={label}>
                  <span className="signal-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="signal-label">{label}</span>
                    <br />
                    <span className="signal-meta">Backend-managed module</span>
                  </span>
                  <span className="signal-status">READY</span>
                </div>
              ))}
            </div>
            <div className="signal-panel-bottom">
              <span>CMS / API / SEO / GEO</span>
              <span>ALTOSLAB.COM</span>
            </div>
          </aside>
        </section>

        {stats ? (
          <section className="section">
            <div className="section-inner stats-grid">
              {sortedByOrder(stats.items).map((item) => (
                <article className="stat-card" key={item.id}>
                  <div className="stat-value">{item.value}</div>
                  <div className="stat-label">{item.label}</div>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {about ? (
          <section className="section" id="about">
            <div className="section-inner about-band">
              <p className="eyebrow">{about.eyebrow}</p>
              <div className="section-heading">
                <h2>{about.title}</h2>
                <p>
                  <strong>{about.accentText}</strong>
                  <br />
                  {about.body}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {services ? (
          <section className="section" id="services">
            <div className="section-inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{services.eyebrow}</p>
                  <h2>{services.title}</h2>
                </div>
                <p>{services.body || "從策略、系統、後台到內容營運，建立完整 AI 落地能力。"}</p>
              </div>
              <div className="service-list">
                {sortedByOrder(services.items).map((item) => (
                  <article className="service-row" key={item.id}>
                    <div className="service-number">{item.label}</div>
                    <div>
                      <p className="eyebrow">{item.eyebrow}</p>
                      <h3>{item.title}</h3>
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {portfolio ? (
          <section className="section" id="portfolio">
            <div className="section-inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{portfolio.eyebrow}</p>
                  <h2>{portfolio.title}</h2>
                </div>
                <p>{portfolio.body}</p>
              </div>
              <div className="project-grid">
                {projects.map((project) => (
                  <article className="project-card" key={project.id}>
                    <Link className="project-image" href={`/projects/${project.slug}`}>
                      <img src={project.cover} alt={`${project.title} cover`} loading="lazy" />
                    </Link>
                    <div className="project-body">
                      <p className="eyebrow">{project.tag}</p>
                      <h3>{project.title}</h3>
                      <p>{project.desc}</p>
                      <div className="tag-row">
                        {project.tech.slice(0, 4).map((tech) => (
                          <span className="tag" key={tech}>
                            {tech}
                          </span>
                        ))}
                      </div>
                      <Link className="card-link" href={`/projects/${project.slug}`}>
                        查看案例
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {why ? (
          <section className="section" id="why-us">
            <div className="section-inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{why.eyebrow}</p>
                  <h2>{why.title}</h2>
                </div>
              </div>
              <div className="why-grid">
                {sortedByOrder(why.items).map((item) => (
                  <article className="why-card" key={item.id}>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {team ? (
          <section className="section" id="team">
            <div className="section-inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{team.eyebrow}</p>
                  <h2>{team.title}</h2>
                </div>
              </div>
              <div className="team-grid">
                {sortedByOrder(team.items).map((item) => (
                  <article className="team-card" key={item.id}>
                    <span className="status-pill published">{item.label}</span>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {blog ? (
          <section className="section" id="blog">
            <div className="section-inner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{blog.eyebrow}</p>
                  <h2>{blog.title}</h2>
                </div>
                <p>{blog.body}</p>
              </div>
              <div className="blog-grid">
                {posts.slice(0, 3).map((post) => (
                  <article className="blog-card" key={post.id}>
                    {post.cover ? (
                      <Link className="blog-image" href={`/blog/${post.slug}`}>
                        <img src={post.cover} alt={`${post.title} cover`} loading="lazy" />
                      </Link>
                    ) : null}
                    <div className="blog-body">
                      <p className="eyebrow">{post.tags.slice(0, 2).join(" / ")}</p>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                      <Link className="card-link" href={`/blog/${post.slug}`}>
                        閱讀文章
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {contact ? (
          <section className="section" id="contact">
            <div className="section-inner contact-grid">
              <div>
                <p className="eyebrow">{contact.eyebrow}</p>
                <h2 className="hero-subtitle">{contact.title}</h2>
                <p className="hero-copy">{contact.body}</p>
                <a className="card-link" href={`mailto:${String(contact.settings?.email || "hello@altoslab.com")}`}>
                  {String(contact.settings?.email || "hello@altoslab.com")}
                  <ExternalLink size={15} />
                </a>
              </div>
              <ContactForm />
            </div>
          </section>
        ) : null}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} ALTOS LAB</span>
          <span>AI systems · CMS · SEO/GEO</span>
        </div>
      </footer>
    </div>
  );
}
