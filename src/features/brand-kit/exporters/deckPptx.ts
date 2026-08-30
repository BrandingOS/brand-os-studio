/**
 * A deck as a real PowerPoint file.
 *
 * A PNG of a slide is a picture of a presentation; nobody can present it,
 * nobody can fix a typo in it, and pasting it into the company template
 * produces a screenshot inside a slide. The reference kit ships PPTX for
 * exactly this reason and it is the single most-asked-for native format we
 * did not have.
 *
 * What travels: one slide per `DeckContent.slides[i]`, laid out by its
 * `kind`, wearing the brand's own colours and typeface NAMES (a pptx names
 * a font family; it cannot carry a CSS stack), with the body as speaker
 * notes and a slide number in the corner. Nothing a customer reads is a
 * literal — every string on every slide comes out of the content object.
 *
 * Two rules the layout keeps:
 *
 *   • Ground and text are chosen TOGETHER. Title and closing slides sit on
 *     the brand's own colour with `fgOn` deciding the ink; every other kind
 *     asks `surface()` for a role and uses the pair it hands back. A hex
 *     typed into this file would be somebody else's brand for ever.
 *   • The logo is only drawn where a ground was chosen for it. It is
 *     handed in already rasterized (see `RasterInput`) because an exporter
 *     has no document to rasterize in.
 */
import type { DeckContent, DeckSlide } from '@/features/brandkit/content';
import {
  contrastOk,
  fgOn,
  fontFamily,
  surface,
  type BrandStyleSource,
} from '../renderers/brandStyle';
import { dataUrlOf } from './bytes';
import type { ExportFile, RasterInput } from './types';

export type DeckPptxOptions = {
  /**
   * The brand's logo as a PNG — `rasterizeLogo`'s data URL, or a Blob.
   * Absent means the title and closing slides simply carry no mark, which
   * is the honest outcome for a brand with no readable variant.
   */
  logo?: RasterInput | null;
  /** File name for the single file returned. */
  fileName?: string;
};

/** 16:9 at PowerPoint's own inch scale. */
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.62;
const CONTENT_W = SLIDE_W - MARGIN * 2;

/** pptx wants `RRGGBB`; every colour we hold is `#rrggbb`. */
function hex6(color: string): string {
  return (color || '').replace(/^#/, '').toUpperCase().slice(0, 6) || '000000';
}

/** A family NAME, not a CSS stack — a pptx font face is a single family. */
function faceOf(brand: BrandStyleSource, role: 'heading' | 'body'): string {
  return fontFamily(brand, role) ?? 'Arial';
}

type Ground = { bg: string; fg: string; muted: string; accent: string };

/**
 * The ground each slide kind sits on.
 *
 * Six kinds, four grounds: the deck reads as a rhythm rather than six
 * unrelated designs, and every pair is contrast-checked by construction
 * because it came from `surface()` or from `fgOn`.
 */
function groundFor(brand: BrandStyleSource, kind: DeckSlide['kind']): Ground {
  if (kind === 'title' || kind === 'closing') {
    const tokens = surface(brand, 'brand');
    const fg = fgOn(tokens.bg);
    return { bg: tokens.bg, fg, muted: fg, accent: fg };
  }
  if (kind === 'section') {
    const tokens = surface(brand, 'inverted');
    return { bg: tokens.bg, fg: tokens.text, muted: tokens.textMuted, accent: tokens.accent };
  }
  const tokens = surface(brand, kind === 'quote' ? 'subtle' : 'card');
  // An accent that cannot be read on its own ground is not an accent.
  const accent = contrastOk(tokens.accent, tokens.bg) ? tokens.accent : tokens.text;
  return { bg: tokens.bg, fg: tokens.text, muted: tokens.textMuted, accent };
}

/** Non-empty lines only — a blank bullet is a bullet nobody meant. */
function lines(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => (v ?? '').trim()).filter(Boolean);
}

function joinMeta(parts: Array<string | undefined>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join('  ·  ');
}

/**
 * Build the deck.
 *
 * Returns exactly one file. Async because `pptxgenjs` is a heavy dependency
 * and is imported on demand — the kit page must not carry it.
 */
export async function buildDeckPptx(
  content: DeckContent,
  brand: BrandStyleSource,
  options: DeckPptxOptions = {},
): Promise<ExportFile[]> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = content.title || '';
  pptx.subject = content.subtitle || '';
  pptx.author = content.presenter || '';

  const heading = faceOf(brand, 'heading');
  const body = faceOf(brand, 'body');
  const logoUrl = options.logo ? await dataUrlOf(options.logo) : null;

  const slides = content.slides ?? [];
  slides.forEach((slide, index) => {
    const ground = groundFor(brand, slide.kind);
    const s = pptx.addSlide();
    s.background = { color: hex6(ground.bg) };
    s.color = hex6(ground.fg);

    // The number is chrome, not content: muted, out of the way, and never
    // on the first slide, where it reads as a page count of one.
    if (index > 0) {
      s.slideNumber = {
        x: SLIDE_W - MARGIN - 0.6,
        y: SLIDE_H - 0.52,
        w: 0.6,
        h: 0.3,
        align: 'right',
        fontFace: body,
        fontSize: 9,
        color: hex6(ground.muted),
      };
    }

    switch (slide.kind) {
      case 'title':
        drawTitle(s, slide, content, ground, { heading, body }, logoUrl);
        break;
      case 'closing':
        drawClosing(s, slide, ground, { heading, body }, logoUrl);
        break;
      case 'section':
        drawSection(s, slide, index, slides.length, ground, { heading, body });
        break;
      case 'stat':
        drawStat(s, slide, ground, { heading, body });
        break;
      case 'quote':
        drawQuote(s, slide, ground, { heading, body });
        break;
      default:
        drawContent(s, slide, ground, { heading, body });
        break;
    }

    // Speaker notes are the slide's body — the one place a presenter looks
    // and the one field a picture of a slide can never carry.
    const notes = (slide.body ?? '').trim();
    if (notes) s.addNotes(notes);
  });

  const bytes = (await pptx.write({ outputType: 'uint8array' })) as Uint8Array;
  const blob = new Blob([bytes.slice()], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  return [{ path: options.fileName ?? 'presentation.pptx', blob }];
}

/* ── The six layouts ──────────────────────────────────────────────── */

type Faces = { heading: string; body: string };
// pptxgenjs' Slide type is structural and huge; the six drawers below use
// only `addText` / `addImage`, so this is the honest surface of what they
// touch rather than a cast to `any`.
type SlideLike = {
  addText: (text: string, options: Record<string, unknown>) => unknown;
  addImage: (options: Record<string, unknown>) => unknown;
};

function drawLogo(s: SlideLike, url: string | null, x: number, y: number, w: number, h: number) {
  if (!url) return;
  s.addImage({ data: url, x, y, w, h, sizing: { type: 'contain', w, h } });
}

function drawTitle(
  s: SlideLike,
  slide: DeckSlide,
  content: DeckContent,
  ground: Ground,
  faces: Faces,
  logoUrl: string | null,
) {
  drawLogo(s, logoUrl, MARGIN, MARGIN - 0.1, 1.9, 0.68);
  s.addText(slide.heading || content.title || '', {
    x: MARGIN,
    y: 1.9,
    w: CONTENT_W,
    h: 1.5,
    fontFace: faces.heading,
    fontSize: 40,
    bold: true,
    color: hex6(ground.fg),
    valign: 'bottom',
    lineSpacingMultiple: 1.05,
  });
  const subtitle = (content.subtitle ?? '').trim();
  if (subtitle) {
    s.addText(subtitle, {
      x: MARGIN,
      y: 3.5,
      w: CONTENT_W,
      h: 0.5,
      fontFace: faces.body,
      fontSize: 17,
      color: hex6(ground.muted),
    });
  }
  const meta = joinMeta([content.presenter, content.date]);
  if (meta) {
    s.addText(meta, {
      x: MARGIN,
      y: SLIDE_H - MARGIN - 0.42,
      w: CONTENT_W,
      h: 0.36,
      fontFace: faces.body,
      fontSize: 11,
      color: hex6(ground.muted),
    });
  }
}

function drawSection(
  s: SlideLike,
  slide: DeckSlide,
  index: number,
  total: number,
  ground: Ground,
  faces: Faces,
) {
  // A section divider's only number is its position, which is structure —
  // not a claim, and not something a customer has to maintain.
  s.addText(`${index + 1} / ${total}`, {
    x: MARGIN,
    y: 1.8,
    w: CONTENT_W,
    h: 0.34,
    fontFace: faces.body,
    fontSize: 11,
    charSpacing: 2,
    color: hex6(ground.accent),
  });
  s.addText(slide.heading || '', {
    x: MARGIN,
    y: 2.25,
    w: CONTENT_W,
    h: 1.4,
    fontFace: faces.heading,
    fontSize: 34,
    bold: true,
    color: hex6(ground.fg),
    valign: 'top',
  });
}

function drawContent(s: SlideLike, slide: DeckSlide, ground: Ground, faces: Faces) {
  s.addText(slide.heading || '', {
    x: MARGIN,
    y: MARGIN,
    w: CONTENT_W,
    h: 0.8,
    fontFace: faces.heading,
    fontSize: 26,
    bold: true,
    color: hex6(ground.fg),
    valign: 'top',
  });
  const bullets = lines(slide.bullets);
  const paragraph = (slide.body ?? '').trim();
  let y = 1.55;
  if (paragraph) {
    s.addText(paragraph, {
      x: MARGIN,
      y,
      w: CONTENT_W,
      h: bullets.length > 0 ? 0.95 : 3,
      fontFace: faces.body,
      fontSize: 14,
      color: hex6(ground.muted),
      valign: 'top',
      lineSpacingMultiple: 1.3,
    });
    y += bullets.length > 0 ? 1.1 : 0;
  }
  if (bullets.length > 0) {
    s.addText(bullets.join('\n'), {
      x: MARGIN,
      y,
      w: CONTENT_W,
      h: SLIDE_H - y - MARGIN,
      fontFace: faces.body,
      fontSize: 14,
      color: hex6(ground.fg),
      valign: 'top',
      bullet: { characterCode: '2022' },
      lineSpacingMultiple: 1.4,
    });
  }
}

function drawStat(s: SlideLike, slide: DeckSlide, ground: Ground, faces: Faces) {
  const heading = (slide.heading ?? '').trim();
  if (heading) {
    s.addText(heading, {
      x: MARGIN,
      y: MARGIN,
      w: CONTENT_W,
      h: 0.6,
      fontFace: faces.heading,
      fontSize: 18,
      color: hex6(ground.muted),
      valign: 'top',
    });
  }
  s.addText(slide.stat?.value ?? '', {
    x: MARGIN,
    y: 1.85,
    w: CONTENT_W,
    h: 1.7,
    fontFace: faces.heading,
    fontSize: 68,
    bold: true,
    color: hex6(ground.accent),
    align: 'center',
    valign: 'middle',
  });
  s.addText(slide.stat?.label ?? '', {
    x: MARGIN,
    y: 3.6,
    w: CONTENT_W,
    h: 0.6,
    fontFace: faces.body,
    fontSize: 15,
    color: hex6(ground.fg),
    align: 'center',
    valign: 'top',
  });
}

function drawQuote(s: SlideLike, slide: DeckSlide, ground: Ground, faces: Faces) {
  // A quote slide may still be ABOUT something. The heading used to be
  // dropped here, which meant typing one on a quote slide silently threw
  // it away — the deck showed it, the export did not.
  const heading = (slide.heading ?? '').trim();
  if (heading) {
    s.addText(heading, {
      x: MARGIN,
      y: MARGIN,
      w: CONTENT_W,
      h: 0.5,
      fontFace: faces.body,
      fontSize: 15,
      color: hex6(ground.muted),
      valign: 'top',
    });
  }
  s.addText(slide.quote?.text ?? '', {
    x: MARGIN,
    y: 1.3,
    w: CONTENT_W,
    h: 2.3,
    fontFace: faces.heading,
    fontSize: 28,
    italic: true,
    color: hex6(ground.fg),
    valign: 'middle',
    lineSpacingMultiple: 1.25,
  });
  const by = (slide.quote?.by ?? '').trim();
  if (by) {
    s.addText(by, {
      x: MARGIN,
      y: 3.85,
      w: CONTENT_W,
      h: 0.4,
      fontFace: faces.body,
      fontSize: 13,
      color: hex6(ground.muted),
    });
  }
}

function drawClosing(
  s: SlideLike,
  slide: DeckSlide,
  ground: Ground,
  faces: Faces,
  logoUrl: string | null,
) {
  drawLogo(s, logoUrl, (SLIDE_W - 2.2) / 2, 1.35, 2.2, 0.85);
  s.addText(slide.heading || '', {
    x: MARGIN,
    y: 2.5,
    w: CONTENT_W,
    h: 0.9,
    fontFace: faces.heading,
    fontSize: 32,
    bold: true,
    color: hex6(ground.fg),
    align: 'center',
    valign: 'middle',
  });
  const body = (slide.body ?? '').trim();
  if (body) {
    s.addText(body, {
      x: MARGIN + 0.8,
      y: 3.45,
      w: CONTENT_W - 1.6,
      h: 1,
      fontFace: faces.body,
      fontSize: 14,
      color: hex6(ground.muted),
      align: 'center',
      valign: 'top',
    });
  }
}
