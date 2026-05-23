import { SectionIntro } from "./SectionIntro";
import type { PageSection } from "@/lib/types";

export function AboutSection({ section }: { section: PageSection }) {
  const secondary = section.items[0]?.body;
  const note = section.items[1]?.body;

  return (
    <section className="site-section about-section" id="about">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} accent={section.accentText}>
        {section.body ? <p className="about-lead">{section.body}</p> : null}
        {secondary ? <p className="about-secondary">{secondary}</p> : null}
        {note ? <p className="about-note">{note}</p> : null}
      </SectionIntro>
    </section>
  );
}
