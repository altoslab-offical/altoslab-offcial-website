import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export type TrustSection = {
  title: string;
  body: Array<string>;
};

type TrustPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: Array<TrustSection>;
};

export function TrustPage({ eyebrow, title, intro, updated, sections }: TrustPageProps) {
  return (
    <div className="site-shell trust-site-shell">
      <SiteHeader />
      <main className="trust-page">
        <section className="trust-hero" aria-labelledby="trust-page-title">
          <p className="site-eyebrow">{eyebrow}</p>
          <h1 id="trust-page-title">{title}</h1>
          <p>{intro}</p>
          <span>Updated {updated}</span>
        </section>
        <div className="trust-layout">
          <aside aria-label="ALTOS LAB trust pages">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/editorial-policy">Editorial Policy</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms</Link>
          </aside>
          <article>
            {sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
