import type { CSSProperties, ReactNode } from "react";
import { renderBrandText } from "@/components/BrandText";

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim());
  const elements: ReactNode[] = [];
  let bullets: string[] = [];
  let orderedItems: string[] = [];
  let tableRows: string[][] = [];
  let chartLines: string[] = [];
  let isChart = false;

  function inlineMarkdown(value: string) {
    const parts = value.split(/(\*\*[^*\n]+\*\*|==[^=\n]+==)/g).filter(Boolean);
    return parts.map((part, index) => {
      const strong = part.match(/^\*\*([^*]+)\*\*$/);
      if (strong) return <strong key={`${part}-${index}`}>{renderBrandText(strong[1])}</strong>;

      const highlight = part.match(/^==([^=]+)==$/);
      if (highlight) {
        return (
          <mark className="rich-highlight" key={`${part}-${index}`}>
            {renderBrandText(highlight[1])}
          </mark>
        );
      }

      return renderBrandText(part);
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

  function flushChart() {
    if (!chartLines.length) return;

    const config = chartLines.reduce<Record<string, string>>((next, rawLine) => {
      const splitIndex = rawLine.indexOf(":");
      if (splitIndex < 0) return next;
      const key = rawLine.slice(0, splitIndex).trim().toLowerCase();
      const value = rawLine.slice(splitIndex + 1).trim();
      if (key && value) next[key] = value;
      return next;
    }, {});
    const labels = (config.labels || "").split("|").map((label) => label.trim()).filter(Boolean);
    const values = (config.values || "")
      .split("|")
      .map((value) => Math.max(0, Math.min(100, Number(value.trim()) || 0)));
    const items = labels.map((label, index) => ({ label, value: values[index] || 0 }));

    if (items.length) {
      elements.push(
        <figure className="rich-chart" key={`chart-${elements.length}`}>
          {config.title ? <figcaption>{inlineMarkdown(config.title)}</figcaption> : null}
          <div className="rich-chart-bars">
            {items.map((item) => (
              <div className="rich-chart-row" key={item.label}>
                <span className="rich-chart-label">{inlineMarkdown(item.label)}</span>
                <span className="rich-chart-track" aria-hidden="true">
                  <span className="rich-chart-fill" style={{ "--value": `${item.value}%` } as CSSProperties} />
                </span>
                <span className="rich-chart-value">{item.value}</span>
              </div>
            ))}
          </div>
          {config.caption ? <p>{inlineMarkdown(config.caption)}</p> : null}
        </figure>
      );
    }

    chartLines = [];
  }

  function flushLists() {
    flushBullets();
    flushOrderedItems();
    flushTable();
    flushChart();
  }

  lines.forEach((line, index) => {
    if (line === ":::chart") {
      flushLists();
      isChart = true;
      chartLines = [];
      return;
    }
    if (isChart) {
      if (line === ":::") {
        isChart = false;
        flushChart();
        return;
      }
      chartLines.push(line);
      return;
    }
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
    if (/^>\s+/.test(line)) {
      flushLists();
      elements.push(
        <blockquote key={index}>
          <p>{inlineMarkdown(line.replace(/^>\s+/, ""))}</p>
        </blockquote>
      );
      return;
    }
    if (/^(?:-|\*)\s+/.test(line)) {
      flushOrderedItems();
      bullets.push(line.replace(/^(?:-|\*)\s+/, ""));
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
