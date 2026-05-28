import type { ReactNode } from "react";
import { renderBrandText } from "@/components/BrandText";

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim());
  const elements: ReactNode[] = [];
  let bullets: string[] = [];
  let orderedItems: string[] = [];
  let tableRows: string[][] = [];

  function inlineMarkdown(value: string) {
    const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, index) => {
      const strong = part.match(/^\*\*([^*]+)\*\*$/);
      return strong ? <strong key={`${part}-${index}`}>{renderBrandText(strong[1])}</strong> : renderBrandText(part);
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

  function flushTable() {
    if (tableRows.length < 2) {
      tableRows = [];
      return;
    }

    const [head, maybeSeparator, ...body] = tableRows;
    const rows = maybeSeparator.every((cell) => /^:?-{3,}:?$/.test(cell)) ? body : [maybeSeparator, ...body];
    elements.push(
      <div className="rich-table-wrap" key={`table-${elements.length}`}>
        <table>
          <thead>
            <tr>
              {head.map((cell) => (
                <th key={cell}>{inlineMarkdown(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{inlineMarkdown(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  }

  function flushLists() {
    flushBullets();
    flushOrderedItems();
    flushTable();
  }

  lines.forEach((line, index) => {
    if (!line) {
      flushLists();
      return;
    }
    if (line.startsWith("|") && line.endsWith("|")) {
      flushBullets();
      flushOrderedItems();
      tableRows.push(line.split("|").slice(1, -1).map((cell) => cell.trim()));
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
