import { SectionIntro } from "./SectionIntro";
import type { PageSection } from "@/lib/types";

export function WhySection({ section }: { section: PageSection }) {
  return (
    <section className="site-section proof-section">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="proof-list">
        {section.items.map((item) => (
          <article className="proof-row" key={item.id}>
            <span>{item.icon || "◈"}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TeamSection({ section }: { section: PageSection }) {
  return (
    <section className="site-section team-section">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="team-module-list">
        {section.items.map((item) => (
          <article className="team-module" key={item.id}>
            <span>{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
