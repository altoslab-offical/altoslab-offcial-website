import { SectionIntro } from "./SectionIntro";
import type { PageSection } from "@/lib/types";

export function ServicesSection({ section }: { section: PageSection }) {
  return (
    <section className="site-section" id="services">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="service-object-list">
        {section.items.map((item) => (
          <article className="service-object" key={item.id}>
            <span>{item.label}</span>
            <div>
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
