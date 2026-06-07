#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const WIDTH = 2400;
const HEIGHT = 1350;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB column visual renderer

Creates crisp 16:9 PNG visuals for column image repairs. The output is a
high-resolution editorial render intended to be uploaded through the blog media
route and shared by all localized article versions.

Examples:
  node scripts/blog-column-visual-renderer.mjs --out-dir data/blog-worker-runs/<run>/visual-repair --basename ai-delivery-accountability-hq-v2

Options:
  --out-dir <path>   Required output directory
  --basename <name>  Output filename stem. Defaults to altos-column-visual
  --force           Overwrite existing files
`);
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgShell(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f4efe6"/>
  <path d="M0 1030 C390 930 760 1160 1120 1010 C1500 850 1840 890 2400 740 L2400 1350 L0 1350 Z" fill="#e9ded0"/>
  <path d="M0 0 H2400 V1350 H0 Z" fill="none" stroke="#e1d8cb" stroke-width="2"/>
  <g opacity="0.28" stroke="#cfc4b7" stroke-width="1.5">
    ${Array.from({ length: 15 }, (_, index) => `<path d="M${160 + index * 150} 120 V1225"/>`).join("\n    ")}
    ${Array.from({ length: 7 }, (_, index) => `<path d="M130 ${200 + index * 150} H2270"/>`).join("\n    ")}
  </g>
  ${body}
</svg>`;
}

function card(x, y, w, h, fill = "#fffaf1", stroke = "#3b3732", opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="5"/>`;
}

function shadowCard(x, y, w, h, fill = "#fffaf1", stroke = "#3b3732") {
  return `
    <rect x="${x + 20}" y="${y + 22}" width="${w}" height="${h}" rx="26" fill="#2f2a24" opacity="0.14"/>
    ${card(x, y, w, h, fill, stroke)}`;
}

function blankLines(x, y, widths, color = "#81766a") {
  return widths
    .map((w, index) => `<path d="M${x} ${y + index * 42} H${x + w}" stroke="${color}" stroke-width="14" stroke-linecap="round" opacity="0.45"/>`)
    .join("\n");
}

function token(cx, cy, r, fill, stroke = "#2d312c") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="5"/>`;
}

function connector(points, color = "#27745f", width = 8) {
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`)
    .join(" ");
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function coverSvg() {
  const body = `
  <g transform="translate(0 16)">
    ${shadowCard(185, 210, 510, 760, "#fffaf1")}
    ${shadowCard(945, 155, 510, 870, "#f8f2e7")}
    ${shadowCard(1705, 240, 510, 720, "#fffaf1")}

    ${blankLines(255, 305, [285, 210, 330])}
    ${blankLines(1015, 255, [335, 245, 310])}
    ${blankLines(1775, 335, [300, 230, 330])}

    <rect x="275" y="515" width="320" height="56" rx="28" fill="#e4c46e" stroke="#3b3732" stroke-width="4"/>
    <rect x="1035" y="482" width="330" height="56" rx="28" fill="#6fb196" stroke="#3b3732" stroke-width="4"/>
    <rect x="1795" y="530" width="300" height="56" rx="28" fill="#d88171" stroke="#3b3732" stroke-width="4"/>

    <g fill="none" stroke="#3b3732" stroke-width="5" stroke-linecap="round">
      <path d="M315 705 h250"/>
      <path d="M315 775 h180"/>
      <path d="M1078 700 h245"/>
      <path d="M1078 770 h305"/>
      <path d="M1838 710 h240"/>
      <path d="M1838 780 h175"/>
    </g>

    ${connector([[700, 590], [835, 590], [835, 485], [940, 485]], "#2f7d68", 10)}
    ${connector([[1455, 505], [1588, 505], [1588, 610], [1700, 610]], "#2f7d68", 10)}
    ${connector([[1210, 1030], [1210, 1132], [450, 1132], [450, 980]], "#9b6b31", 8)}

    ${token(835, 590, 34, "#6fb196")}
    ${token(1588, 505, 34, "#6fb196")}
    ${token(1210, 1132, 28, "#e4c46e")}

    <g stroke="#2d312c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M818 588 l16 18 l38 -44"/>
      <path d="M1571 503 l16 18 l38 -44"/>
      <path d="M1196 1131 l14 16 l32 -39"/>
    </g>

    <g opacity="0.92">
      <rect x="150" y="1035" width="495" height="42" rx="21" fill="#3b3732"/>
      <rect x="675" y="1035" width="1010" height="42" rx="21" fill="#6fb196"/>
      <rect x="1715" y="1035" width="535" height="42" rx="21" fill="#3b3732"/>
    </g>
  </g>`;
  return svgShell("ALTOS LAB editorial visual for AI delivery accountability", body);
}

function openingSvg() {
  const body = `
  <g transform="rotate(-3 1200 675)">
    ${shadowCard(310, 265, 500, 660, "#fffaf1")}
    ${shadowCard(880, 210, 640, 760, "#f8f2e7")}
    ${shadowCard(1595, 315, 495, 600, "#fffaf1")}
  </g>
  <g>
    <rect x="430" y="355" width="250" height="44" rx="22" fill="#e4c46e" stroke="#3b3732" stroke-width="4"/>
    <rect x="1005" y="340" width="350" height="44" rx="22" fill="#6fb196" stroke="#3b3732" stroke-width="4"/>
    <rect x="1700" y="430" width="250" height="44" rx="22" fill="#d88171" stroke="#3b3732" stroke-width="4"/>
    ${blankLines(420, 520, [275, 225, 320], "#5f574e")}
    ${blankLines(1005, 505, [360, 280, 430], "#5f574e")}
    ${blankLines(1700, 585, [260, 210, 300], "#5f574e")}

    ${connector([[675, 700], [835, 700], [835, 620], [980, 620]], "#2f7d68", 9)}
    ${connector([[1500, 628], [1635, 628], [1635, 710], [1720, 710]], "#2f7d68", 9)}

    ${token(835, 700, 32, "#6fb196")}
    ${token(1635, 628, 32, "#6fb196")}
    ${token(1180, 910, 42, "#e4c46e")}
    <path d="M1160 910 l20 22 l48 -58" fill="none" stroke="#2d312c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>

    <g opacity="0.84" fill="#3b3732">
      <rect x="360" y="1015" width="370" height="32" rx="16"/>
      <rect x="820" y="1048" width="730" height="32" rx="16"/>
      <rect x="1660" y="1015" width="380" height="32" rx="16"/>
    </g>
  </g>`;
  return svgShell("ALTOS LAB editorial visual for AI-assisted delivery handoffs", body);
}

function mechanismSvg() {
  const body = `
  <g>
    ${shadowCard(210, 235, 580, 250, "#fffaf1")}
    ${shadowCard(210, 550, 760, 250, "#f8f2e7")}
    ${shadowCard(210, 865, 940, 250, "#fffaf1")}

    <rect x="305" y="325" width="330" height="58" rx="29" fill="#6fb196" stroke="#3b3732" stroke-width="4"/>
    <rect x="305" y="640" width="455" height="58" rx="29" fill="#e4c46e" stroke="#3b3732" stroke-width="4"/>
    <rect x="305" y="955" width="580" height="58" rx="29" fill="#d88171" stroke="#3b3732" stroke-width="4"/>

    ${shadowCard(1340, 300, 700, 650, "#f7efe2")}
    <g stroke="#3b3732" stroke-width="5" stroke-linecap="round">
      <path d="M1455 415 H1905"/>
      <path d="M1455 515 H1818"/>
      <path d="M1455 615 H1935"/>
      <path d="M1455 715 H1775"/>
      <path d="M1455 815 H1880"/>
    </g>

    ${connector([[790, 360], [1120, 360], [1120, 420], [1340, 420]], "#2f7d68", 9)}
    ${connector([[970, 675], [1120, 675], [1120, 620], [1340, 620]], "#9b6b31", 9)}
    ${connector([[1150, 990], [1240, 990], [1240, 820], [1340, 820]], "#a65147", 9)}
    ${connector([[1690, 950], [1690, 1090], [535, 1090], [535, 1115]], "#5c574f", 8)}

    ${token(1120, 360, 32, "#6fb196")}
    ${token(1120, 675, 32, "#e4c46e")}
    ${token(1240, 990, 32, "#d88171")}
    ${token(1690, 1090, 28, "#3b3732")}

    <g fill="none" stroke="#2d312c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1104 357 l15 18 l39 -47"/>
      <path d="M1105 674 l14 17 l38 -45"/>
      <path d="M1224 989 l14 17 l38 -45"/>
    </g>
  </g>`;
  return svgShell("ALTOS LAB editorial visual for AI work risk tiers and checkpoints", body);
}

async function renderPng(svg, outputPath) {
  await sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toFile(outputPath);
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }
  const outDir = arg("out-dir");
  if (!outDir) throw new Error("--out-dir is required");
  const basename = arg("basename", "altos-column-visual").replace(/[^a-z0-9._-]+/gi, "-");
  const force = hasFlag("force");
  await fs.mkdir(outDir, { recursive: true });
  const outputs = [
    { key: "cover", svg: coverSvg(), file: `${basename}-cover.png` },
    { key: "opening", svg: openingSvg(), file: `${basename}-opening.png` },
    { key: "mechanism", svg: mechanismSvg(), file: `${basename}-mechanism.png` }
  ];
  const written = [];
  for (const output of outputs) {
    const outputPath = path.resolve(outDir, output.file);
    if (!force) {
      await fs.access(outputPath).then(
        () => {
          throw new Error(`${outputPath} already exists; pass --force to overwrite`);
        },
        () => undefined
      );
    }
    await renderPng(output.svg, outputPath);
    const metadata = await sharp(outputPath).metadata();
    const stats = await fs.stat(outputPath);
    written.push({
      key: output.key,
      file: output.file,
      path: outputPath,
      width: metadata.width,
      height: metadata.height,
      bytes: stats.size
    });
  }
  console.log(JSON.stringify({ ok: true, written }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
