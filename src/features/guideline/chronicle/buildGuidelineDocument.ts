/* Seed a multi-page Brand Guideline document from a Brand.
 *
 * Each page is A4 portrait (1240 × 1754) — matches the
 * `brand-guideline-slide` content type's A4 portrait preset. Layers are
 * brand-bound where possible (heading font, primary color, logo
 * variant) so the existing brand engine can re-apply on brand changes.
 *
 * This is the minimum-viable seed: enough pages to demonstrate
 * editing across a real multi-page doc. AI-driven generation of richer
 * layouts is a follow-up. The page list is intentionally short — the
 * user can add pages from the bottom action bar's "Insert" menu.
 */

import type {
  BrandOSDocument,
  Layer,
  Page,
} from "@/features/editor/schema";
import type { Brand } from "@/shared/types/brand";

const PAGE_W = 1240;
const PAGE_H = 1754;
const PADDING_X = 96;

export function buildGuidelineDocument(brand: Brand | null | undefined): BrandOSDocument {
  const brandName = brand?.name ?? "Brand";
  const tagline = brand?.tagline ?? brand?.description ?? "How to look, sound, and feel like us.";

  const pages: Page[] = [
    coverPage(brandName, tagline),
    strategyPage(brand),
    logoPage(brandName),
    colorPage(brand),
    typographyPage(),
    voicePage(brand),
  ];

  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType: "brand-guideline-slide",
    brandId: brand?.id ?? null,
    masterPages: [],
    pages,
    metadata: {
      name: `${brandName} Guidelines`,
      kind: "brand-guideline",
    },
  };
}

/* ─── individual page seeds ───────────────────────────────────────────── */

function coverPage(brandName: string, tagline: string): Page {
  return {
    id: crypto.randomUUID(),
    name: "Cover",
    width: PAGE_W,
    height: PAGE_H,
    background: "#0a0a0b",
    masterPageId: null,
    layers: [
      textLayer({
        text: "BRAND GUIDELINES · 2026",
        x: PADDING_X,
        y: 120,
        width: PAGE_W - PADDING_X * 2,
        height: 24,
        fontSize: 16,
        fontWeight: 500,
        color: "#a0a0a0",
        letterSpacing: 2,
      }),
      textLayer({
        text: `A guideline for\n${brandName}.`,
        x: PADDING_X,
        y: PAGE_H / 2 - 200,
        width: PAGE_W - PADDING_X * 2,
        height: 400,
        fontSize: 110,
        fontWeight: 600,
        color: "#ffffff",
        fontFamily: { type: "brand.font.heading" },
        lineHeight: 1.05,
      }),
      textLayer({
        text: tagline,
        x: PADDING_X,
        y: PAGE_H - 280,
        width: 720,
        height: 100,
        fontSize: 22,
        fontWeight: 400,
        color: "#cfcfcf",
        fontFamily: { type: "brand.font.body" },
        lineHeight: 1.45,
      }),
    ],
  };
}

function strategyPage(brand: Brand | null | undefined): Page {
  const mission = brand?.guidelines?.strategy?.mission ?? brand?.mission ?? "—";
  const vision = brand?.guidelines?.strategy?.vision ?? brand?.vision ?? "—";
  return {
    id: crypto.randomUUID(),
    name: "Strategy",
    width: PAGE_W,
    height: PAGE_H,
    background: "#ffffff",
    masterPageId: null,
    layers: [
      sectionHead("01", "STRATEGY"),
      textLayer({
        text: "Why we exist.",
        x: PADDING_X,
        y: 200,
        width: PAGE_W - PADDING_X * 2,
        height: 80,
        fontSize: 56,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
      }),
      textLayer({
        text: "MISSION",
        x: PADDING_X,
        y: 340,
        width: 460,
        height: 24,
        fontSize: 13,
        fontWeight: 500,
        color: "#8a8a8a",
        letterSpacing: 1.5,
      }),
      textLayer({
        text: mission,
        x: PADDING_X,
        y: 380,
        width: 460,
        height: 200,
        fontSize: 18,
        fontWeight: 400,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.body" },
        lineHeight: 1.5,
      }),
      textLayer({
        text: "VISION",
        x: PADDING_X + 520,
        y: 340,
        width: 460,
        height: 24,
        fontSize: 13,
        fontWeight: 500,
        color: "#8a8a8a",
        letterSpacing: 1.5,
      }),
      textLayer({
        text: vision,
        x: PADDING_X + 520,
        y: 380,
        width: 460,
        height: 200,
        fontSize: 18,
        fontWeight: 400,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.body" },
        lineHeight: 1.5,
      }),
    ],
  };
}

function logoPage(brandName: string): Page {
  return {
    id: crypto.randomUUID(),
    name: "Logo",
    width: PAGE_W,
    height: PAGE_H,
    background: "#ffffff",
    masterPageId: null,
    layers: [
      sectionHead("02", "LOGO"),
      textLayer({
        text: "The mark.",
        x: PADDING_X,
        y: 200,
        width: PAGE_W - PADDING_X * 2,
        height: 80,
        fontSize: 56,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
      }),
      logoLayer({
        x: PADDING_X,
        y: 360,
        width: PAGE_W - PADDING_X * 2,
        height: 540,
      }),
      textLayer({
        text: brandName,
        x: PADDING_X,
        y: 940,
        width: PAGE_W - PADDING_X * 2,
        height: 32,
        fontSize: 14,
        fontWeight: 500,
        color: "#8a8a8a",
        letterSpacing: 1,
      }),
    ],
  };
}

function colorPage(brand: Brand | null | undefined): Page {
  const primary = brand?.primaryColor ?? brand?.colorSystem?.primary?.hex ?? "#d4a83c";
  const secondary = brand?.secondaryColor ?? brand?.colorSystem?.secondary?.hex ?? "#0a0a0b";
  const accent = brand?.accentColor ?? "#f5f5f4";
  return {
    id: crypto.randomUUID(),
    name: "Color",
    width: PAGE_W,
    height: PAGE_H,
    background: "#ffffff",
    masterPageId: null,
    layers: [
      sectionHead("03", "COLOR"),
      textLayer({
        text: "Our palette.",
        x: PADDING_X,
        y: 200,
        width: PAGE_W - PADDING_X * 2,
        height: 80,
        fontSize: 56,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
      }),
      colorSwatch({ x: PADDING_X, y: 360, color: primary, label: "Primary" }),
      colorSwatch({ x: PADDING_X + 360, y: 360, color: secondary, label: "Secondary" }),
      colorSwatch({ x: PADDING_X + 720, y: 360, color: accent, label: "Accent" }),
    ],
  };
}

function typographyPage(): Page {
  return {
    id: crypto.randomUUID(),
    name: "Typography",
    width: PAGE_W,
    height: PAGE_H,
    background: "#ffffff",
    masterPageId: null,
    layers: [
      sectionHead("04", "TYPOGRAPHY"),
      textLayer({
        text: "How we read.",
        x: PADDING_X,
        y: 200,
        width: PAGE_W - PADDING_X * 2,
        height: 80,
        fontSize: 56,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
      }),
      textLayer({
        text: "Aa",
        x: PADDING_X,
        y: 360,
        width: PAGE_W - PADDING_X * 2,
        height: 240,
        fontSize: 220,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
        lineHeight: 1,
      }),
      textLayer({
        text: "The quick brown fox jumps over the lazy dog.",
        x: PADDING_X,
        y: 660,
        width: PAGE_W - PADDING_X * 2,
        height: 60,
        fontSize: 28,
        fontWeight: 400,
        color: "#3a3a3a",
        fontFamily: { type: "brand.font.body" },
      }),
    ],
  };
}

function voicePage(brand: Brand | null | undefined): Page {
  const voice =
    brand?.guidelines?.voiceAndTone?.brandVoice ??
    brand?.tone ??
    "Confident. Warm. Direct. We speak like a thoughtful friend who knows the craft.";
  return {
    id: crypto.randomUUID(),
    name: "Voice",
    width: PAGE_W,
    height: PAGE_H,
    background: "#ffffff",
    masterPageId: null,
    layers: [
      sectionHead("05", "VOICE & TONE"),
      textLayer({
        text: "How we sound.",
        x: PADDING_X,
        y: 200,
        width: PAGE_W - PADDING_X * 2,
        height: 80,
        fontSize: 56,
        fontWeight: 600,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.heading" },
      }),
      textLayer({
        text: voice,
        x: PADDING_X,
        y: 360,
        width: PAGE_W - PADDING_X * 2,
        height: 600,
        fontSize: 32,
        fontWeight: 400,
        color: "#0a0a0b",
        fontFamily: { type: "brand.font.body" },
        lineHeight: 1.4,
      }),
    ],
  };
}

/* ─── layer helpers ───────────────────────────────────────────────────── */

interface TextLayerInput {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight?: number;
  color: string | { type: string };
  fontFamily?: string | { type: string };
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
}

function textLayer(p: TextLayerInput): Layer {
  return {
    id: crypto.randomUUID(),
    name: p.text.slice(0, 24),
    kind: "text",
    transform: { x: p.x, y: p.y, width: p.width, height: p.height, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    text: p.text,
    fontFamily: p.fontFamily ?? "Inter",
    fontSize: p.fontSize,
    fontWeight: p.fontWeight ?? 400,
    lineHeight: p.lineHeight ?? 1.2,
    letterSpacing: p.letterSpacing ?? 0,
    textAlign: p.textAlign ?? "left",
    direction: "auto",
    color: p.color,
  } as Layer;
}

function logoLayer(p: { x: number; y: number; width: number; height: number }): Layer {
  return {
    id: crypto.randomUUID(),
    name: "Logo",
    kind: "logo",
    transform: { ...p, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    variant: "auto",
  } as Layer;
}

function colorSwatch({
  x,
  y,
  color,
  label,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
}): Layer {
  // Use a shape — the rectangle is the swatch, the label is implicit in
  // the layer name. Per-swatch labels can be added later as separate
  // text layers; keeping it lean for the seed.
  return {
    id: crypto.randomUUID(),
    name: `${label} · ${color}`,
    kind: "shape",
    transform: { x, y, width: 280, height: 400, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    shape: "rectangle",
    fill: color,
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 16,
  } as Layer;
}

function sectionHead(index: string, label: string): Layer {
  return textLayer({
    text: `${index}   ${label}`,
    x: PADDING_X,
    y: 120,
    width: PAGE_W - PADDING_X * 2,
    height: 24,
    fontSize: 13,
    fontWeight: 600,
    color: "#8a8a8a",
    letterSpacing: 2,
  });
}
