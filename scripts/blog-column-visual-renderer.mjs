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

function neonShell(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <radialGradient id="neonGlow" cx="58%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#1a7f86"/>
      <stop offset="44%" stop-color="#102a38"/>
      <stop offset="100%" stop-color="#080b12"/>
    </radialGradient>
    <linearGradient id="deskGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f2b84b"/>
      <stop offset="55%" stop-color="#2de2c2"/>
      <stop offset="100%" stop-color="#ed5d7d"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#neonGlow)"/>
  <path d="M0 1050 C430 890 840 1120 1220 930 C1640 720 1980 800 2400 620 L2400 1350 L0 1350 Z" fill="#0f1724" opacity="0.96"/>
  <g opacity="0.18" stroke="#63f3dc" stroke-width="2">
    ${Array.from({ length: 18 }, (_, index) => `<path d="M${index * 150} 1250 L${1080 + index * 70} 120"/>`).join("\n    ")}
    ${Array.from({ length: 9 }, (_, index) => `<path d="M0 ${1080 - index * 90} H2400"/>`).join("\n    ")}
  </g>
  ${body}
</svg>`;
}

function warmStudioShell(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="studioSky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff6df"/>
      <stop offset="52%" stop-color="#e7f4ee"/>
      <stop offset="100%" stop-color="#f8d7c9"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#studioSky)"/>
  <path d="M0 940 C420 810 730 965 1050 850 C1460 700 1830 785 2400 610 L2400 1350 L0 1350 Z" fill="#f0dfcc"/>
  <g opacity="0.32" stroke="#ffffff" stroke-width="8">
    <path d="M210 190 H2190"/>
    <path d="M210 370 H2190"/>
    <path d="M210 550 H2190"/>
    <path d="M210 730 H2190"/>
  </g>
  ${body}
</svg>`;
}

function blueprintShell(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#102238"/>
  <g opacity="0.22" stroke="#d8eadb" stroke-width="1.4">
    ${Array.from({ length: 23 }, (_, index) => `<path d="M${80 + index * 100} 0 V1350"/>`).join("\n    ")}
    ${Array.from({ length: 13 }, (_, index) => `<path d="M0 ${75 + index * 100} H2400"/>`).join("\n    ")}
  </g>
  <rect x="95" y="95" width="2210" height="1160" fill="none" stroke="#d8eadb" stroke-width="5" opacity="0.74"/>
  <path d="M135 1190 H2265" stroke="#f2b84b" stroke-width="7" opacity="0.72"/>
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
  <g transform="translate(0 18)">
    <ellipse cx="1200" cy="1040" rx="900" ry="120" fill="#000000" opacity="0.38"/>
    <path d="M320 890 C620 810 920 850 1190 790 C1500 720 1750 710 2085 790" fill="none" stroke="url(#deskGlow)" stroke-width="18" stroke-linecap="round"/>
    <g opacity="0.88">
      <rect x="360" y="330" width="420" height="520" rx="34" fill="#101a28" stroke="#2de2c2" stroke-width="6"/>
      <rect x="990" y="220" width="430" height="650" rx="34" fill="#141322" stroke="#f2b84b" stroke-width="6"/>
      <rect x="1645" y="350" width="420" height="500" rx="34" fill="#171425" stroke="#ed5d7d" stroke-width="6"/>
    </g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M455 455 H690 M455 525 H630 M455 595 H710" stroke="#b8fff3" stroke-width="13" opacity="0.55"/>
      <path d="M1085 370 H1325 M1085 450 H1265 M1085 530 H1355" stroke="#ffe0a1" stroke-width="13" opacity="0.6"/>
      <path d="M1740 485 H1970 M1740 555 H1900 M1740 625 H1995" stroke="#ffc4cf" stroke-width="13" opacity="0.58"/>
    </g>
    <g fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <path d="M780 590 C905 565 890 445 990 450" stroke="#2de2c2"/>
      <path d="M1420 520 C1535 520 1535 650 1645 650" stroke="#ed5d7d"/>
      <path d="M1206 872 C1206 1035 590 1028 590 850" stroke="#f2b84b"/>
    </g>
    ${token(890, 445, 38, "#2de2c2", "#d7fff7")}
    ${token(1535, 650, 38, "#ed5d7d", "#ffd1da")}
    ${token(1206, 1035, 34, "#f2b84b", "#fff0c0")}
    <g opacity="0.9">
      <rect x="505" y="705" width="180" height="36" rx="18" fill="#2de2c2"/>
      <rect x="1110" y="720" width="220" height="36" rx="18" fill="#f2b84b"/>
      <rect x="1770" y="735" width="190" height="36" rx="18" fill="#ed5d7d"/>
    </g>
  </g>`;
  return neonShell("ALTOS LAB cyberpunk editorial visual for AI delegation control", body);
}

function openingSvg() {
  const body = `
  <g transform="translate(0 22)">
    <path d="M250 850 L2150 850 L1985 1065 L430 1065 Z" fill="#2f2b28" opacity="0.18"/>
    <g stroke="#342e2a" stroke-width="6" stroke-linejoin="round">
      <path d="M290 285 L740 210 L740 770 L290 820 Z" fill="#fff8e6"/>
      <path d="M910 170 L1525 255 L1445 870 L850 790 Z" fill="#f7fff7"/>
      <path d="M1660 315 L2110 265 L2090 760 L1610 830 Z" fill="#fff3ee"/>
    </g>
    <g opacity="0.55" stroke="#342e2a" stroke-width="12" stroke-linecap="round">
      <path d="M380 410 H610 M375 485 H650 M370 560 H560"/>
      <path d="M1035 390 H1320 M1018 470 H1390 M1005 550 H1285"/>
      <path d="M1745 435 H1970 M1735 515 H2015 M1725 595 H1900"/>
    </g>
    <g>
      <circle cx="790" cy="795" r="46" fill="#76b59d" stroke="#342e2a" stroke-width="6"/>
      <circle cx="1535" cy="815" r="46" fill="#76b59d" stroke="#342e2a" stroke-width="6"/>
      <path d="M835 795 C980 725 1285 745 1490 815" fill="none" stroke="#2f7d68" stroke-width="12" stroke-linecap="round"/>
      <path d="M505 840 C770 1040 1590 1070 1910 820" fill="none" stroke="#d57b65" stroke-width="10" stroke-linecap="round" opacity="0.82"/>
    </g>
    <g>
      <rect x="445" y="660" width="215" height="42" rx="21" fill="#e5c866" stroke="#342e2a" stroke-width="5"/>
      <rect x="1050" y="660" width="300" height="42" rx="21" fill="#76b59d" stroke="#342e2a" stroke-width="5"/>
      <rect x="1775" y="660" width="230" height="42" rx="21" fill="#d57b65" stroke="#342e2a" stroke-width="5"/>
    </g>
    <g opacity="0.88" fill="#342e2a">
      <path d="M315 930 C470 900 625 908 785 940 L760 990 C590 960 455 960 300 990 Z"/>
      <path d="M1010 982 C1190 940 1380 945 1560 990 L1540 1045 C1330 1005 1180 1005 995 1042 Z"/>
      <path d="M1660 930 C1815 905 1965 910 2115 940 L2100 992 C1935 965 1815 960 1650 990 Z"/>
    </g>
  </g>`;
  return warmStudioShell("ALTOS LAB anime-inspired editorial visual for AI task handoff", body);
}

function mechanismSvg() {
  const body = `
  <g transform="translate(0 10)">
    <g fill="none" stroke="#d8eadb" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M350 350 H860 V585 H1140"/>
      <path d="M350 675 H920 V585"/>
      <path d="M350 1000 H860 V760 H1140"/>
      <path d="M1260 585 H1650 V430 H2050"/>
      <path d="M1260 760 H1660 V930 H2050"/>
      <path d="M1760 930 V1105 H520 V1000"/>
    </g>
    <g>
      <rect x="220" y="255" width="330" height="190" rx="18" fill="#173251" stroke="#d8eadb" stroke-width="5"/>
      <rect x="220" y="580" width="330" height="190" rx="18" fill="#173251" stroke="#f2b84b" stroke-width="5"/>
      <rect x="220" y="905" width="330" height="190" rx="18" fill="#173251" stroke="#ec7f6f" stroke-width="5"/>
      <rect x="1100" y="475" width="260" height="380" rx="26" fill="#12304c" stroke="#d8eadb" stroke-width="6"/>
      <rect x="1960" y="335" width="240" height="190" rx="18" fill="#173251" stroke="#8bd6bb" stroke-width="5"/>
      <rect x="1960" y="835" width="240" height="190" rx="18" fill="#173251" stroke="#ec7f6f" stroke-width="5"/>
    </g>
    <g opacity="0.78" stroke-linecap="round">
      <path d="M290 328 H480 M290 380 H430" stroke="#d8eadb" stroke-width="10"/>
      <path d="M290 653 H480 M290 705 H430" stroke="#f2b84b" stroke-width="10"/>
      <path d="M290 978 H480 M290 1030 H430" stroke="#ec7f6f" stroke-width="10"/>
      <path d="M1165 570 H1295 M1165 655 H1255 M1165 740 H1305" stroke="#d8eadb" stroke-width="10"/>
      <path d="M2025 410 H2145 M2025 905 H2145" stroke="#d8eadb" stroke-width="10"/>
    </g>
    ${token(920, 585, 34, "#f2b84b", "#102238")}
    ${token(1260, 585, 34, "#8bd6bb", "#102238")}
    ${token(1260, 760, 34, "#ec7f6f", "#102238")}
    ${token(1760, 930, 30, "#d8eadb", "#102238")}
    <g fill="none" stroke="#f2b84b" stroke-width="4" opacity="0.9">
      <circle cx="1230" cy="665" r="255"/>
      <path d="M1030 665 H1430"/>
      <path d="M1230 465 V865"/>
    </g>
  </g>`;
  return blueprintShell("ALTOS LAB technical blueprint visual for AI delegation checkpoints", body);
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
