import type { ReactNode } from "react";

type SectionIntroProps = {
  eyebrow?: string;
  title?: string;
  accent?: string;
  body?: string;
  children?: ReactNode;
};

export function SectionIntro({ eyebrow, title, accent, body, children }: SectionIntroProps) {
  return (
    <div className="section-intro">
      <div>
        {eyebrow ? <p className="site-eyebrow">{eyebrow}</p> : null}
        {title ? (
          <h2>
            {title}
            {accent ? (
              <>
                <br />
                <span>{accent}</span>
              </>
            ) : null}
          </h2>
        ) : null}
      </div>
      <div className="section-intro-copy">
        {body ? <p>{body}</p> : null}
        {children}
      </div>
    </div>
  );
}
