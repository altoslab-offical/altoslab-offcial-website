import type { PageSection } from "@/lib/types";

export function StatsBand({ section }: { section: PageSection }) {
  if (!section.items.length) return null;

  return (
    <section className="stats-band" aria-label={section.title || "Implementation stats"}>
      {section.items.map((item) => (
        <article className="stat-tile" key={item.id}>
          <span>{item.body}</span>
          <strong>{item.value}</strong>
          <p>{item.label}</p>
        </article>
      ))}
    </section>
  );
}
