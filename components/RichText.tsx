import type { ReactNode } from "react";

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim());
  const elements: ReactNode[] = [];
  let bullets: string[] = [];
  let orderedItems: string[] = [];

  function inlineMarkdown(value: string) {
    const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, index) => {
      const strong = part.match(/^\*\*([^*]+)\*\*$/);
      return strong ? <strong key={`${part}-${index}`}>{strong[1]}</strong> : part;
    });
  }

  function flushBullets() {
    if (!bullets.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`}>
        {bullets.map((item) => (
          <li key={item}>{inlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  }

  function flushOrderedItems() {
    if (!orderedItems.length) return;
    elements.push(
      <ol key={`ol-${elements.length}`}>
        {orderedItems.map((item) => (
          <li key={item}>{inlineMarkdown(item)}</li>
        ))}
      </ol>
    );
    orderedItems = [];
  }

  function flushLists() {
    flushBullets();
    flushOrderedItems();
  }

  lines.forEach((line, index) => {
    if (!line) {
      flushLists();
      return;
    }
    if (line.startsWith("## ")) {
      flushLists();
      elements.push(<h2 key={index}>{inlineMarkdown(line.replace(/^## /, ""))}</h2>);
      return;
    }
    if (line.startsWith("- ")) {
      flushOrderedItems();
      bullets.push(line.replace(/^- /, ""));
      return;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushBullets();
      orderedItems.push(line.replace(/^\d+\.\s+/, ""));
      return;
    }
    flushLists();
    elements.push(<p key={index}>{inlineMarkdown(line)}</p>);
  });

  flushLists();
  return <div className="rich-text">{elements}</div>;
}
