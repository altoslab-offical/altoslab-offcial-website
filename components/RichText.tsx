import type { ReactNode } from "react";

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim());
  const elements: ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
    bullets = [];
  }

  lines.forEach((line, index) => {
    if (!line) {
      flushBullets();
      return;
    }
    if (line.startsWith("## ")) {
      flushBullets();
      elements.push(<h2 key={index}>{line.replace(/^## /, "")}</h2>);
      return;
    }
    if (line.startsWith("- ")) {
      bullets.push(line.replace(/^- /, ""));
      return;
    }
    flushBullets();
    elements.push(<p key={index}>{line}</p>);
  });

  flushBullets();
  return <div className="rich-text">{elements}</div>;
}
