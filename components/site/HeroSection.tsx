import { ArrowDown, ArrowUpRight } from "lucide-react";
import { designSystemModules, siteSignals } from "@/lib/site-content";
import type { PageSection } from "@/lib/types";

export function HeroSection({ section }: { section: PageSection }) {
  return (
    <section className="home-hero">
      <div className="hero-copy-block">
        {section.eyebrow ? <p className="site-eyebrow">{section.eyebrow}</p> : null}
        <h1>
          {section.title || "ALTOS"}
          <span>{section.accentText || "LAB"}</span>
        </h1>
        {section.subtitle ? <p className="hero-kicker">{section.subtitle}</p> : null}
        {section.body ? <p className="hero-body">{section.body}</p> : null}
        <div className="hero-actions">
          {section.ctaPrimaryUrl ? (
            <a className="site-button site-button-primary" href={section.ctaPrimaryUrl}>
              {section.ctaPrimaryLabel || "開始合作"}
              <ArrowUpRight size={18} />
            </a>
          ) : null}
          {section.ctaSecondaryUrl ? (
            <a className="site-button site-button-secondary" href={section.ctaSecondaryUrl}>
              {section.ctaSecondaryLabel || "了解更多"}
              <ArrowDown size={18} />
            </a>
          ) : null}
        </div>
      </div>

      <aside className="hero-system-panel" aria-label="ALTOS LAB system modules">
        <div className="panel-topline">
          <span>LIVE SYSTEM</span>
          <span>CMS READY</span>
        </div>
        <div className="signal-list">
          {siteSignals.map((signal, index) => (
            <div className="signal-item" key={signal.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{signal.label}</strong>
              <em>{signal.value}</em>
            </div>
          ))}
        </div>
        <div className="module-strip">
          {designSystemModules.map((module) => (
            <span key={module}>{module}</span>
          ))}
        </div>
      </aside>
    </section>
  );
}
