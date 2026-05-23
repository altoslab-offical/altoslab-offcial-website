import { AboutSection } from "./AboutSection";
import { ContactSection } from "./ContactSection";
import { HeroSection } from "./HeroSection";
import { InsightsSection } from "./InsightsSection";
import { PortfolioSection } from "./PortfolioSection";
import { TeamSection, WhySection } from "./ProofSections";
import { ServicesSection } from "./ServicesSection";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { StatsBand } from "./StatsBand";
import { getSection, getRequiredSection } from "@/lib/site-content";
import type { BlogPost, Project, SitePage } from "@/lib/types";

type HomePageProps = {
  page: SitePage;
  projects: Project[];
  posts: BlogPost[];
};

export function HomePage({ page, projects, posts }: HomePageProps) {
  const hero = getRequiredSection(page, "hero");
  const stats = getSection(page, "stats");
  const about = getRequiredSection(page, "about");
  const services = getRequiredSection(page, "services");
  const portfolio = getRequiredSection(page, "portfolio");
  const why = getRequiredSection(page, "why-us");
  const team = getRequiredSection(page, "team");
  const blog = getSection(page, "blog");
  const contact = getRequiredSection(page, "contact");

  return (
    <main className="site-home">
      <SiteHeader />
      <HeroSection section={hero} />
      {stats ? <StatsBand section={stats} /> : null}
      <AboutSection section={about} />
      <ServicesSection section={services} />
      <PortfolioSection section={portfolio} projects={projects} />
      <WhySection section={why} />
      <TeamSection section={team} />
      {blog ? <InsightsSection section={blog} posts={posts} /> : null}
      <ContactSection section={contact} />
      <SiteFooter />
    </main>
  );
}
