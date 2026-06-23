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
  },
  {
    id: "editorial-poster-signal-map",
    label: "editorial poster signal map",
    prompt:
      "A bold editorial poster system for an AI business argument: one oversized symbolic object, layered signal paths, restrained graphic blocks, and magazine-quality negative space. It should feel like a commissioned technology poster, not a prompt demo.",
    palette: "bone white, black ink, signal green, muted cobalt, one red alert accent",
    avoid:
      "No readable headline text inside the image, no copied poster franchise style, no generic neural-network mesh, no fake event branding."
  },
  {
    id: "interface-less-product-mockup",
    label: "interface-less product mockup",
    prompt:
      "A product-mockup-inspired editorial scene without real UI: translucent workflow cards, empty safe panels, versioned decision tokens, and device-like surfaces that imply software behavior while staying abstract.",
    palette: "graphite, porcelain white, soft lime, cool silver, small violet accent",
    avoid:
      "No fake dashboards, no readable labels, no app screenshots, no brand logos, no busy icon grids."
  },
  {
    id: "comparison-diptych-audit",
    label: "comparison diptych audit",
    prompt:
      "A high-end comparison diptych visual: left side shows a messy AI workflow artifact, right side shows the repaired operating system, both built from physical objects and clean editorial lighting.",
    palette: "left side muted rust and gray, right side clean teal and ivory, shared charcoal linework",
    avoid:
      "No before/after text, no obvious checklist graphic, no cheap split-screen template, no stock office scene."
  },
  {
    id: "foresight-documentary-tech-photo",
    label: "documentary technology photo",
    prompt:
      "A serious documentary-style technology editorial image anchored in one real-world object or scene from the article: device, access card, source document, server detail, product surface, event artifact, or operator desk. It should feel reported and concrete, not generated as abstract AI wallpaper.",
    palette: "natural blacks, muted steel, deep green, warm paper, one controlled highlight",
    avoid:
      "No stock handshake, no readable words, no brand logo, no face close-up, no slanted source-image crop, no generic AI icon."
  },
  {
    id: "foresight-finance-object-still-life",
    label: "finance object still life",
    prompt:
      "A finance-and-technology still life using concrete objects from the story: card, ledger, phone, custody token, compliance folder, pricing sheet, or market-access device. Make the abstract business model visible through physical props and editorial lighting.",
    palette: "charcoal, ivory, muted gold, dark green, small cobalt accent",
    avoid:
      "No stock chart screenshot, no K-line display, no fake dashboard, no readable numbers, no crypto-coin cliché pile."
  },
  {
    id: "foresight-brand-report-asset",
    label: "brand report asset",
    prompt:
      "A clean report-cover-inspired editorial asset with one strong symbolic cover object, restrained graphic blocks, premium print texture, and clear negative space. It should resemble a commissioned research feature cover without using any real logo or readable title.",
    palette: "off-white, black ink, signal green, muted blue, one warm accent",
    avoid:
      "No copied publication cover, no readable headline, no fake sponsor logo, no template poster clutter."
  },
  {
    id: "pinterest-editorial-product-photo",
    label: "editorial product photo",
    prompt:
      "A Pinterest-inspired editorial product photograph built around one concrete object from the story, with real-world context, strong negative space, and a saveable magazine feel. The image should suggest something useful the reader can act on, not just decorate an AI topic.",
    palette: "natural black, warm paper, muted steel, fresh green, one small high-contrast accent",
    avoid:
      "No generic AI icon, no workflow arrows, no floating cards, no logo, no readable text, no fake app screen."
  },
  {
    id: "pinterest-tactile-material-still-life",
    label: "tactile material still life",
    prompt:
      "A tactile still life with paper, metal, translucent material, notes, access objects, and one unusual prop that makes the article's operating tension visible. Use macro/editorial lighting and material contrast.",
    palette: "ivory, graphite, muted green, brushed metal, one warm accent",
    avoid:
      "No plastic toy look, no repeated glass cube, no checkpoint-arrow map, no readable notes, no brand marks."
  },
  {
    id: "pinterest-scrapbook-signal-collage",
    label: "scrapbook signal collage",
    prompt:
      "A clean scrapbook-style editorial collage: cropped source-like artifacts, blank note fragments, abstract signal paths, and layered paper texture. It should feel curated and human, with one clear focal decision.",
    palette: "off-white paper, black ink, muted teal, clay red, soft yellow",
    avoid:
      "No readable words, no messy wall of notes, no meme template, no fake screenshots, no dense icon clutter."
  },
  {
    id: "pinterest-real-world-action-scene",
    label: "real-world action scene",
    prompt:
      "A real-world action-oriented editorial scene without identifiable people: hands, tools, desks, access cards, devices, or workspace objects arranged to imply how the idea becomes operational. Use documentary lighting and a clear before/after object relationship.",
    palette: "neutral daylight, dark green, muted blue, warm wood or paper, one orange accent",
    avoid:
      "No face likeness, no stock office handshake, no generic dashboard, no logo, no readable screen or document text."
  }
];

const STYLE_FAMILY_BY_ID = {
  "cyberpunk-neon-operations": "surreal-editorial",
  "anime-inspired-product-lab": "illustration",
  "satirical-prime-time-cartoon": "illustration",
  "technical-blueprint-lab": "diagram",
  "magazine-documentary-still-life": "photo-still-life",
  "retro-futurist-riso": "print-collage",
  "monochrome-manga-ink": "illustration",
  "clay-paper-systems": "tactile-system",
  "editorial-poster-signal-map": "poster-data",
  "interface-less-product-mockup": "abstract-product",
  "comparison-diptych-audit": "comparison",
  "foresight-documentary-tech-photo": "photo-documentary",
  "foresight-finance-object-still-life": "photo-still-life",
  "foresight-brand-report-asset": "poster-report",
  "pinterest-editorial-product-photo": "photo-documentary",
  "pinterest-tactile-material-still-life": "photo-still-life",
  "pinterest-scrapbook-signal-collage": "print-collage",
  "pinterest-real-world-action-scene": "photo-documentary"
};

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

function styleFamily(style) {
  return STYLE_FAMILY_BY_ID[style.id] || style.id;
}

function pickDistinctStyle(seed, usedFamilies) {
  for (let offset = 0; offset < COLUMN_VISUAL_STYLES.length; offset += 1) {
    const style = COLUMN_VISUAL_STYLES[(seed + offset) % COLUMN_VISUAL_STYLES.length];
    const family = styleFamily(style);
    if (!usedFamilies.has(family)) {
      usedFamilies.add(family);
      return style;
    }
  }
  return COLUMN_VISUAL_STYLES[seed % COLUMN_VISUAL_STYLES.length];
}

export function selectColumnVisualStyleSet({ date = "", slot = "", topic = "" } = {}) {
  const seed = hashText(`${date}|${slot}|${topic}`);
  const cover = COLUMN_VISUAL_STYLES[seed % COLUMN_VISUAL_STYLES.length];
  const usedFamilies = new Set([styleFamily(cover)]);
  const opening = pickDistinctStyle(seed + 3, usedFamilies);
  const mechanism = pickDistinctStyle(seed + 7, usedFamilies);
  return { cover, opening, mechanism };
}

export function columnVisualStylePromptBlock({ date = "", slot = "", topic = "" } = {}) {
  const { cover, opening, mechanism } = selectColumnVisualStyleSet({ date, slot, topic });
  return `Column visual style rotation:
- Cover style id: ${cover.id}
  Direction: ${cover.prompt}
  Palette: ${cover.palette}
  Negative constraints: ${cover.avoid}
- Opening image style id: ${opening.id}
  Direction: ${opening.prompt}
  Palette: ${opening.palette}
  Negative constraints: ${opening.avoid}
- Mechanism/evidence image style id: ${mechanism.id}
  Direction: ${mechanism.prompt}
  Palette: ${mechanism.palette}
  Negative constraints: ${mechanism.avoid}
- Pinterest-style learning: each image needs a clear focal object, story role, and saveable composition. Do not rely on abstract workflow cards as the default answer.
- The three generated images must not reuse the same camera angle, material palette, central object, paper-card metaphor, checkmark/arrow language, or beige workflow-board composition. Do not use the 3D workflow/checkpoint/card/arrow family for more than one image in the same article set. Keep article identity coherent through topic and palette accents, not by repeating the same layout.
- Every prompt must include subject, composition, camera/layout, material-lighting, color, crop-safe zone, and negative prompt.
- Every prompt must name the concrete article object or scene it is visualizing. Generic "AI workflow", "dashboard", "abstract network", "glass cards", or "control board" prompts are invalid unless the story itself is about those physical objects.
- Captions must say what the image adds to the argument. Never use generic repair wording such as "opening image", "mechanism image", "first image pulls the topic back", or "second image shows the decision".
- If a visual idea feels safe but predictable, choose a different style family before generation. The goal is commissioned editorial art with topic memory, not reusable template decoration.
- Market-news/breaking posts must never use this generated style library; they keep source/official images only.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const date = process.argv[2] || "";
  const slot = process.argv[3] || "";
  const topic = process.argv.slice(4).join(" ");
  console.log(columnVisualStylePromptBlock({ date, slot, topic }));
}
