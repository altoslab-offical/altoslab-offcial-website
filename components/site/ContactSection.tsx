import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { getSectionSetting } from "@/lib/site-content";
import type { PageSection } from "@/lib/types";

export function ContactSection({ section }: { section: PageSection }) {
  const email = getSectionSetting(section, "email", "hello@altoslab.ai");
  const formEnabled = getSectionSetting(section, "formEnabled", true);

  return (
    <section className="site-section contact-section" id="contact">
      <div className="contact-copy">
        {section.eyebrow ? <p className="site-eyebrow">{section.eyebrow}</p> : null}
        <h2>
          {section.title || "Let's Build"}
          <span>{section.accentText || "Together."}</span>
        </h2>
        <div className="open-status">
          <span />
          OPEN FOR NEW PROJECTS
        </div>
        <a className="contact-email" href={`mailto:${email}`}>
          {email}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="contact-panel">
        {section.body ? <p>{section.body}</p> : null}
        {formEnabled ? (
          <ContactForm
            labels={{
              who: getSectionSetting(section, "whoLabel", "公司 / 團隊 / 姓名"),
              contact: getSectionSetting(section, "contactLabel", "Email / LINE / 電話"),
              message: getSectionSetting(section, "messageLabel", "想導入 AI 的場景"),
              submit: section.ctaPrimaryLabel || "送出需求"
            }}
          />
        ) : (
          <a className="site-button site-button-primary" href={`mailto:${email}`}>
            {section.ctaPrimaryLabel || "送出需求"}
            <ArrowUpRight size={18} />
          </a>
        )}
      </div>
    </section>
  );
}
