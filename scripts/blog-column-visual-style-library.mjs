#!/usr/bin/env node

export const COLUMN_VISUAL_STYLES = [
  {
    id: "cyberpunk-neon-operations",
    label: "cyberpunk operations desk",
    prompt:
      "A cyberpunk editorial scene with neon reflections, layered operations maps, tactile objects, and a strong human-scale focal point. Use high contrast but avoid generic purple-blue tech wallpaper.",
    palette: "electric cyan, sodium amber, deep charcoal, small magenta accents",
    avoid:
      "No fake brand logos, no readable UI text, no real-person likeness, no weapons, no dystopian disaster scene, no generic server-room stock look."
  },
  {
    id: "anime-inspired-product-lab",
    label: "anime-inspired product lab",
    prompt:
      "A polished anime-inspired editorial still, with expressive lighting, clean composition, and product strategy objects arranged like a quiet studio scene. It should feel original and contemporary, not copied from any named show.",
    palette: "warm paper white, ink black, soft teal, tomato red, muted yellow",
    avoid:
      "Do not imitate any protected anime franchise, character, logo, or exact studio style. No text-heavy panels, no mascot faces, no real people."
  },
  {
    id: "satirical-prime-time-cartoon",
    label: "satirical cartoon office",
    prompt:
      "A satirical prime-time cartoon-inspired office tableau about AI operations, with exaggerated props, clear silhouettes, and dry editorial humor. Keep the style broad and original.",
    palette: "flat warm yellow, sky blue, brick red, charcoal linework",
    avoid:
      "Do not copy The Simpsons, its yellow-family characters, character shapes, logos, or exact background style. No celebrity likenesses and no readable text."
  },
  {
    id: "technical-blueprint-lab",
    label: "technical blueprint lab",
    prompt:
      "A premium technical blueprint editorial visual with hand-drawn system diagrams, measurement marks, physical tools, and one clear operational metaphor. Make it specific to the article thesis.",
    palette: "blueprint navy, cream linework, graphite, safety orange",
    avoid:
      "No fake UI dashboards, no tiny unreadable labels, no generic circuit-board pattern, no logo-like marks."
  },
  {
    id: "magazine-documentary-still-life",
    label: "documentary still life",
    prompt:
      "A magazine-style documentary still life: desks, notes, devices, workflow artifacts, and one surprising object that captures the article's argument. Natural light, realistic textures, editorial framing.",
    palette: "neutral paper, olive, muted blue, black ink, one accent color",
    avoid:
      "No stock-photo corporate handshake, no conference-room people, no glossy fake screens, no brand logos."
  },
  {
    id: "retro-futurist-riso",
    label: "retro futurist risograph",
    prompt:
      "A retro-futurist risograph editorial illustration with layered print texture, imperfect registration, abstract systems objects, and one simple metaphor for accountability or decision-making.",
    palette: "riso red, sea green, dusty violet, cream paper, black",
    avoid:
      "No generic gradient orbs, no text blocks, no franchise references, no cheap sci-fi spaceship imagery."
  },
  {
    id: "monochrome-manga-ink",
    label: "monochrome manga ink",
    prompt:
      "A monochrome manga-ink editorial panel with disciplined linework, strong negative space, and symbolic product/operations objects. Use panel energy without copying any known manga IP.",
    palette: "black ink, warm white, limited gray wash, one restrained red mark",
    avoid:
      "No named manga style imitation, no characters from existing works, no dramatic violence, no illegible text bubbles."
  },
  {
    id: "clay-paper-systems",
    label: "clay and paper systems",
    prompt:
      "A tactile clay-and-paper editorial visual: handmade tokens, folded process cards, model checkpoints, and modular pieces arranged into a readable system story.",
    palette: "matte clay, moss green, ink black, off-white, coral accent",
    avoid:
      "No plastic toy look, no childish mascot, no brand marks, no generic AI brain icon."
  }
];

function hashText(value = "") {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function selectColumnVisualStyle({ date = "", slot = "", topic = "" } = {}) {
  const seed = hashText(`${date}|${slot}|${topic}`);
  return COLUMN_VISUAL_STYLES[seed % COLUMN_VISUAL_STYLES.length];
}

export function columnVisualStylePromptBlock({ date = "", slot = "", topic = "" } = {}) {
  const style = selectColumnVisualStyle({ date, slot, topic });
  return `Column visual style rotation:
- Selected style id: ${style.id}
- Direction: ${style.prompt}
- Palette: ${style.palette}
- Negative constraints: ${style.avoid}
- Use this style for the generated cover and all generated in-article images in this column set.
- Market-news/breaking posts must never use this generated style library; they keep source/official images only.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const date = process.argv[2] || "";
  const slot = process.argv[3] || "";
  const topic = process.argv.slice(4).join(" ");
  console.log(columnVisualStylePromptBlock({ date, slot, topic }));
}
