/**
 * The brand package — every deliverable, in the right formats, organised.
 *
 * The catalog (`packageCatalog`) is PURE: given the system it says what files
 * exist, in which folders, in which formats. Each file carries its own
 * builder, which runs only when that file is asked for — so the hub can list
 * forty files instantly and the zip, the per-file download and the build step
 * all produce the same bytes from the same code.
 *
 * Formats follow the job, not the habit:
 *   logos       SVG when the upload was vector (true vectors), PNG always, PDF for print
 *   colour      tokens a developer pastes (CSS/JSON/Tailwind/Figma) and an .ase for designers
 *   type        a written system (Markdown) and a specimen image
 *   graphics    SVG + PNG
 *   board       PNG + PDF
 *   guidelines  the product's own brand book PDF (`brandBook.ts`) — one guideline family
 *   deck        PPTX through the kit's own exporter (`deckPptx.ts`)
 *   social      PNG (and JPG for the post, where platforms recompress anyway)
 *
 * Reuse is deliberate: the guideline PDF, the token files, the ASE swatches
 * and the deck are the same builders the Brand Kit exports with, so this
 * package and a later Brand Kit export describe the brand identically.
 */
import type { Brand } from '@/shared/types/brand';
import type { DeckContent } from '@/features/brandkit/content';
import { labelOf } from '@/features/onboarding/bridge/v4Bridge';
import type { BrandContext, BrandSystem, LogoSource } from '../model/types';
import { graphicElements, patternSwatchSvg, PATTERN_LABEL } from '../engine/graphics';
import { lockupPng, lockupSvg, logoOnGroundSvg, logoPng, logoVariations, markPatternPng, primaryInk, recolorSvg, toBlob, ensureFont, loadImage } from '../engine/logoArt';
import { cmykString, rgbString, ROLE_LABEL, ROLE_RATIO, ROLE_USAGE } from '../engine/palette';
import { svgDataUrl } from '../engine/logoRead';
import { SOCIAL_FORMATS, renderSocial } from './social';

export type FileFormat = 'SVG' | 'PNG' | 'JPG' | 'PDF' | 'PPTX' | 'CSS' | 'JSON' | 'JS' | 'ASE' | 'MD' | 'ZIP';

export interface PackageContext {
  logo: LogoSource;
  system: BrandSystem;
  context: BrandContext;
  /** The created brand. Guidelines and the deck read it. */
  brand?: Brand | null;
  /** The mounted brand board, for the board export. */
  board?: () => HTMLElement | null;
}

export interface DeliverableFile {
  format: FileFormat;
  /** File name inside the group folder. */
  name: string;
  /** Button text when the format alone is ambiguous (two PNGs in one row). */
  label?: string;
  build(ctx: PackageContext): Promise<Blob>;
}

export type GroupId = 'logo' | 'colour' | 'type' | 'graphics' | 'board' | 'guidelines' | 'deck' | 'social';

export interface Deliverable {
  id: string;
  group: GroupId;
  name: string;
  description: string;
  files: DeliverableFile[];
}

export const GROUPS: Array<{ id: GroupId; title: string; folder: string; description: string }> = [
  { id: 'logo', title: 'Logo system', folder: '01 Logo', description: 'Every sanctioned version of the mark, with clear space built in.' },
  { id: 'colour', title: 'Colour', folder: '02 Colour', description: 'The palette with print and screen values, and tokens for code and design tools.' },
  { id: 'type', title: 'Typography', folder: '03 Typography', description: 'The typefaces, where to get them, and the hierarchy.' },
  { id: 'graphics', title: 'Patterns & graphics', folder: '04 Graphics', description: 'The pattern and the shape language, ready to drop into layouts.' },
  { id: 'board', title: 'Brand board', folder: '05 Brand board', description: 'The whole identity on one page — for sharing and sign-off.' },
  { id: 'guidelines', title: 'Brand guidelines', folder: '06 Guidelines', description: 'The brand book: logo use, colour, type, voice and applications.' },
  { id: 'deck', title: 'Brand presentation', folder: '07 Presentation', description: 'An editable deck introducing the brand.' },
  { id: 'social', title: 'Social starter kit', folder: '08 Social', description: 'Profile, post, story and cover, sized for the platforms.' },
];

/* ── Small builders ────────────────────────────────────────────────── */

const svgBlob = (svg: string) => new Blob([svg], { type: 'image/svg+xml' });
const textBlob = (text: string, type = 'text/plain;charset=utf-8') => new Blob([text], { type });

export async function svgToPng(svg: string, scale = 1): Promise<Blob> {
  const img = await loadImage(svgDataUrl(svg));
  const w = (img.naturalWidth || 1200) * scale;
  const h = (img.naturalHeight || 1200) * scale;
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return toBlob(c);
}

/** A one-page PDF of an image, sized to the image. */
export async function pngToPdf(png: Blob): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const url = URL.createObjectURL(png);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] });
    const data = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(png);
    });
    // Compressed: jsPDF otherwise embeds the raw pixels, and a print logo came out at 49 MB.
    pdf.addImage(data, 'PNG', 0, 0, w, h, undefined, 'FAST');
    return pdf.output('blob') as Blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
}

/* ── Colour ────────────────────────────────────────────────────────── */

const ROLES = ['primary', 'secondary', 'accent', 'dark', 'light'] as const;

export function paletteSheetSvg(system: BrandSystem, name: string): string {
  const p = system.palette;
  const W = 1600;
  const H = 900;
  const total = ROLES.reduce((n, r) => n + ROLE_RATIO[r], 0);
  let x = 0;
  const bars = ROLES.map((role) => {
    const w = (ROLE_RATIO[role] / total) * W;
    const fg = role === 'light' ? p.dark : '#ffffff';
    const bar = `<rect x="${x}" y="0" width="${w}" height="${H}" fill="${p[role]}"/>
<text x="${x + 32}" y="${H - 150}" fill="${fg}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600">${ROLE_LABEL[role]}</text>
<text x="${x + 32}" y="${H - 112}" fill="${fg}" font-family="Inter, Arial, sans-serif" font-size="20">${p[role].toUpperCase()}</text>
<text x="${x + 32}" y="${H - 80}" fill="${fg}" fill-opacity="0.8" font-family="Inter, Arial, sans-serif" font-size="15">RGB ${rgbString(p[role])}</text>
<text x="${x + 32}" y="${H - 54}" fill="${fg}" fill-opacity="0.8" font-family="Inter, Arial, sans-serif" font-size="15">CMYK≈ ${cmykString(p[role])}</text>`;
    x += w;
    return bar;
  }).join('');
  const title = `<text x="32" y="64" fill="${p.light}" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600">${name.replace(/&/g, '&amp;').replace(/</g, '&lt;')} — colour palette</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}${title}</svg>`;
}

async function paletteColors(system: BrandSystem) {
  return ROLES.map((role) => ({ hex: system.palette[role], name: ROLE_LABEL[role], role: role === 'dark' ? 'Neutral' : role === 'light' ? 'Background' : ROLE_LABEL[role] }));
}

/* ── Type ──────────────────────────────────────────────────────────── */

export function typeSystemMarkdown(system: BrandSystem, name: string): string {
  const t = system.type;
  const link = (f: string) => `https://fonts.google.com/specimen/${f.replace(/ /g, '+')}`;
  return `# ${name} — Typography

## Typefaces

| Role | Family | Weight | Get it |
|---|---|---|---|
| Headings & display | ${t.heading} | ${t.headingWeight} | ${link(t.heading)} |
| Body & interface | ${t.body} | 400 / 500 / 600 | ${link(t.body)} |

Both families are free under the SIL Open Font License via Google Fonts.

## Hierarchy (web, px)

| Level | Family | Size / line height | Weight |
|---|---|---|---|
| Display | ${t.heading} | 64 / 1.05 | ${t.headingWeight} |
| H1 | ${t.heading} | 48 / 1.1 | ${t.headingWeight} |
| H2 | ${t.heading} | 32 / 1.15 | ${t.headingWeight} |
| H3 | ${t.body} | 22 / 1.3 | 600 |
| Body | ${t.body} | 16 / 1.55 | 400 |
| Small | ${t.body} | 13 / 1.5 | 500 |

## Rules

- Headlines are set in ${t.heading}; never set body copy in it.
- Keep line length between 55 and 80 characters for body text.
- Use sentence case for headlines. Reserve uppercase for short labels.
- Text on the primary colour is white; on the light ground it is the ink colour.
`;
}

async function typeSpecimenPng(system: BrandSystem, name: string): Promise<Blob> {
  const t = system.type;
  const p = system.palette;
  await Promise.all([ensureFont(t.heading, t.headingWeight), ensureFont(t.body, 400)]);
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 1000;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = p.light;
  ctx.fillRect(0, 0, 1600, 1000);
  ctx.fillStyle = p.primary;
  ctx.font = `${t.headingWeight} 320px "${t.heading}", serif`;
  ctx.fillText('Aa', 90, 380);
  ctx.fillStyle = p.dark;
  ctx.font = `${t.headingWeight} 56px "${t.heading}", serif`;
  ctx.fillText(t.heading, 820, 200);
  ctx.font = `400 28px "${t.body}", sans-serif`;
  ctx.fillText(`Headings · ${t.headingWeight}`, 820, 250);
  ctx.font = `600 44px "${t.body}", sans-serif`;
  ctx.fillText(t.body, 820, 360);
  ctx.font = `400 28px "${t.body}", sans-serif`;
  ctx.fillText('Body · 400 / 500 / 600', 820, 405);
  ctx.font = `${t.headingWeight} 64px "${t.heading}", serif`;
  ctx.fillText(system.voice.samples[0] ?? name, 90, 620);
  ctx.font = `400 30px "${t.body}", sans-serif`;
  ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ  abcdefghijklmnopqrstuvwxyz  0123456789', 90, 720);
  ctx.fillText(system.voice.principles[0]?.detail ?? '', 90, 790);
  return toBlob(c);
}

/* ── Deck ──────────────────────────────────────────────────────────── */

export function deckContent(system: BrandSystem, context: BrandContext): DeckContent {
  const slide = (id: string, kind: DeckContent['slides'][number]['kind'], heading: string, body = '', bullets: string[] = [], quote = { text: '', by: '' }) => ({
    id,
    kind,
    heading,
    body,
    bullets,
    stat: { value: '', label: '' },
    quote,
  });
  const v = system.voice;
  const personality = context.personality.map((p) => labelOf('personality', p) ?? p);
  return {
    title: context.name,
    subtitle: context.oneLiner || `${system.directionName} — the brand, introduced`,
    presenter: context.name,
    date: new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    slides: [
      slide('title', 'title', context.name, context.oneLiner || system.directionName),
      slide('who', 'content', 'Who we are', context.oneLiner, [
        context.industry ? `Industry: ${labelOf('industry', context.industry)}` : '',
        context.audience ? `For: ${labelOf('audience', context.audience)}` : '',
        context.positioning ? `Position: ${labelOf('positioning', context.positioning)}` : '',
      ].filter(Boolean)),
      slide('personality', 'content', 'Our personality', `The ${system.directionName} direction.`, personality),
      slide('voice-section', 'section', 'How we sound'),
      slide('voice', 'content', 'Voice principles', '', v.principles.map((p) => `${p.title} — ${p.detail}`)),
      slide('sample', 'quote', 'In our words', '', [], { text: v.samples[0] ?? context.name, by: context.name }),
      slide('look-section', 'section', 'How we look'),
      slide('colour', 'content', 'Colour', 'Use the primary with confidence; the accent sparingly.', ROLES.map((r) => `${ROLE_LABEL[r]} ${system.palette[r].toUpperCase()} — ${ROLE_USAGE[r]}`)),
      slide('type', 'content', 'Typography', '', [`${system.type.heading} for headlines`, `${system.type.body} for body and interface`]),
      slide('closing', 'closing', 'Thank you', context.name),
    ],
  };
}

/* ── The catalog ───────────────────────────────────────────────────── */

export function packageCatalog(ctx: Pick<PackageContext, 'logo' | 'system' | 'context'>): Deliverable[] {
  const { logo, system, context } = ctx;
  const vector = !!logo.svgText;
  const ratio = logo.width / logo.height;
  const slug = slugify(context.name);
  const out: Deliverable[] = [];

  /* Logo */
  for (const v of logoVariations(system)) {
    const files: DeliverableFile[] = [];
    if (vector) {
      files.push({
        format: 'SVG',
        name: `${slug}-logo-${v.id}.svg`,
        build: async () => svgBlob(v.ground ? logoOnGroundSvg(logo.svgText!, v.ink, v.ground, ratio, system.logo.clearSpace) : recolorSvg(logo.svgText!, v.ink)),
      });
    }
    files.push({
      format: 'PNG',
      name: `${slug}-logo-${v.id}.png`,
      build: () => logoPng(logo, { color: v.ink, height: 1200, ground: v.ground, pad: v.ground ? system.logo.clearSpace : 0 }),
    });
    if (v.id === 'primary' || v.id === 'black') {
      files.push({
        format: 'PDF',
        name: `${slug}-logo-${v.id}.pdf`,
        build: async () => pngToPdf(await logoPng(logo, { color: v.ink, height: 1200, ground: null, pad: system.logo.clearSpace })),
      });
    }
    out.push({ id: `logo-${v.id}`, group: 'logo', name: `Logo — ${v.name}`, description: v.usage, files });
  }
  if (system.logo.lockup) {
    for (const layout of ['horizontal', 'stacked'] as const) {
      const files: DeliverableFile[] = [
        {
          format: 'PNG',
          name: `${slug}-lockup-${layout}.png`,
          build: () => lockupPng(logo, { name: context.name, layout, ink: primaryInk(system), font: system.type.heading, weight: system.type.headingWeight, height: 600 }),
        },
      ];
      if (vector) {
        files.unshift({
          format: 'SVG',
          name: `${slug}-lockup-${layout}.svg`,
          build: async () => svgBlob(lockupSvg(logo.svgText!, ratio, { name: context.name, layout, ink: primaryInk(system), font: system.type.heading, weight: system.type.headingWeight })),
        });
      }
      out.push({
        id: `lockup-${layout}`,
        group: 'logo',
        name: `Lockup — ${layout === 'horizontal' ? 'Horizontal' : 'Stacked'}`,
        description: `Symbol and name in ${system.type.heading}.${vector ? ' The SVG keeps the name as live text.' : ''}`,
        files,
      });
    }
  }
  out.push({
    id: 'app-icon',
    group: 'logo',
    name: 'App icon & favicon',
    description: 'The reversed mark on the primary colour, at app-store and browser sizes.',
    files: [1024, 180, 32].map((size) => ({
      format: 'PNG' as const,
      label: `${size}px`,
      name: size === 180 ? 'apple-touch-icon-180.png' : size === 32 ? 'favicon-32.png' : 'app-icon-1024.png',
      build: async () => {
        const mark = await logoPng(logo, { color: '#ffffff', height: 600 });
        const img = await loadImage(URL.createObjectURL(mark));
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const g = c.getContext('2d')!;
        g.fillStyle = system.palette.primary;
        g.fillRect(0, 0, size, size);
        const box = size * 0.62;
        const w = ratio >= 1 ? box : box * ratio;
        const h = ratio >= 1 ? box / ratio : box;
        g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        return toBlob(c);
      },
    })),
  });

  /* Colour */
  out.push({
    id: 'palette',
    group: 'colour',
    name: 'Palette sheet',
    description: 'The five colours at their intended proportions, with HEX, RGB and approximate CMYK.',
    files: [
      { format: 'SVG', name: `${slug}-palette.svg`, build: async () => svgBlob(paletteSheetSvg(system, context.name)) },
      { format: 'PNG', name: `${slug}-palette.png`, build: () => svgToPng(paletteSheetSvg(system, context.name)) },
    ],
  });
  out.push({
    id: 'tokens',
    group: 'colour',
    name: 'Colour tokens',
    description: 'Paste-ready for developers (CSS, Tailwind, JSON) and designers (Figma tokens, Adobe swatches).',
    files: [
      ...(['tokens.css', 'tailwind.colors.js', 'tokens.json', 'figma.tokens.json'] as const).map((file) => ({
        format: (file.endsWith('.css') ? 'CSS' : file.endsWith('.js') ? 'JS' : 'JSON') as FileFormat,
        name: file,
        build: async () => {
          const { buildTokenFiles } = await import('@/features/brand-kit/data/tokensExport');
          const found = buildTokenFiles(await paletteColors(system), context.name).find((f) => f.path === file);
          return textBlob(found?.text ?? '');
        },
      })),
      {
        format: 'ASE',
        name: `${slug}-swatches.ase`,
        build: async () => {
          const { buildAseBlob } = await import('@/features/brand-kit/data/tokensExport');
          return buildAseBlob(await paletteColors(system)) ?? new Blob([]);
        },
      },
    ],
  });

  /* Type */
  out.push({
    id: 'typography',
    group: 'type',
    name: 'Type system',
    description: `${system.type.heading} + ${system.type.body}, with the hierarchy and usage rules.`,
    files: [
      { format: 'MD', name: 'typography.md', build: async () => textBlob(typeSystemMarkdown(system, context.name), 'text/markdown;charset=utf-8') },
      { format: 'PNG', name: `${slug}-type-specimen.png`, build: () => typeSpecimenPng(system, context.name) },
    ],
  });

  /* Graphics */
  const pc = { fg: system.palette.primary, bg: system.palette.secondary, accent: system.palette.accent };
  out.push({
    id: 'pattern',
    group: 'graphics',
    name: `Pattern — ${PATTERN_LABEL[system.pattern]}`,
    description: 'A seamless brand pattern for backgrounds, packaging and covers.',
    files:
      system.pattern === 'mark'
        ? [{ format: 'PNG', name: `${slug}-pattern.png`, build: () => markPatternPng(logo, system.palette.light, system.palette.secondary) }]
        : [
            { format: 'SVG', name: `${slug}-pattern.svg`, build: async () => svgBlob(patternSwatchSvg(system.pattern as Exclude<typeof system.pattern, 'mark'>, pc)) },
            { format: 'PNG', name: `${slug}-pattern.png`, build: () => svgToPng(patternSwatchSvg(system.pattern as Exclude<typeof system.pattern, 'mark'>, pc)) },
          ],
  });
  const elements = graphicElements(system.motif, system.palette, system.corner);
  out.push({
    id: 'elements',
    group: 'graphics',
    name: 'Graphic elements',
    description: `${elements.length} shapes in the brand’s shape language and corner style.`,
    // Downloaded singly as a set; inside the package zip each shape is its own file.
    files: (['SVG', 'PNG'] as const).map((fmt) => ({
      format: 'ZIP' as const,
      label: `${fmt} set`,
      name: `${slug}-graphic-elements-${fmt.toLowerCase()}.zip`,
      build: async () => {
        const { default: JSZip } = await import('jszip');
        const z = new JSZip();
        for (const el of elements) {
          z.file(`${slug}-${el.id}.${fmt.toLowerCase()}`, fmt === 'SVG' ? el.svg : await svgToPng(el.svg, 2));
        }
        return z.generateAsync({ type: 'blob' });
      },
    })),
  });

  /* Board */
  const boardPng = async (c: PackageContext) => {
    const node = c.board?.();
    if (!node) throw new Error('The brand board is not on screen.');
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
    return toBlob(canvas);
  };
  out.push({
    id: 'board',
    group: 'board',
    name: 'Brand board',
    description: 'The identity on one page.',
    files: [
      { format: 'PNG', name: `${slug}-brand-board.png`, build: boardPng },
      { format: 'PDF', name: `${slug}-brand-board.pdf`, build: async (c) => pngToPdf(await boardPng(c)) },
    ],
  });

  /* Guidelines */
  out.push({
    id: 'guidelines',
    group: 'guidelines',
    name: 'Brand guidelines',
    description: 'The brand book — logo use, colour, type, voice and the brand applied.',
    files: [
      {
        format: 'PDF',
        name: `${slug}-brand-guidelines.pdf`,
        build: async (c) => {
          if (!c.brand) throw new Error('The brand is not saved yet.');
          const [{ buildBrandBookPdf }, { brandToMockBrand }] = await Promise.all([
            import('@/features/brand-kit/data/brandBook'),
            import('@/features/setup/data/brandToMockBrand'),
          ]);
          return buildBrandBookPdf(brandToMockBrand(c.brand), c.brand);
        },
      },
    ],
  });

  /* Deck */
  out.push({
    id: 'deck',
    group: 'deck',
    name: 'Brand presentation',
    description: 'Ten editable slides in your colours and type names. Opens in PowerPoint, Keynote and Google Slides.',
    files: [
      {
        format: 'PPTX',
        name: `${slug}-brand-presentation.pptx`,
        build: async (c) => {
          if (!c.brand) throw new Error('The brand is not saved yet.');
          const { buildDeckPptx } = await import('@/features/brand-kit/exporters/deckPptx');
          const white = await logoPng(logo, { color: '#ffffff', height: 400 });
          const [file] = await buildDeckPptx(deckContent(system, context), c.brand, { logo: white });
          return file.blob;
        },
      },
    ],
  });

  /* Social */
  for (const f of SOCIAL_FORMATS) {
    const files: DeliverableFile[] = [
      { format: 'PNG', name: `${slug}-${f.id}-${f.w}x${f.h}.png`, build: () => renderSocial(f, logo, system, context) },
    ];
    if (f.id === 'post') files.push({ format: 'JPG', name: `${slug}-${f.id}-${f.w}x${f.h}.jpg`, build: () => renderSocial(f, logo, system, context, 'image/jpeg') });
    out.push({ id: `social-${f.id}`, group: 'social', name: f.name, description: `${f.w} × ${f.h}px`, files });
  }

  return out;
}

/* ── Building and zipping ──────────────────────────────────────────── */

export interface BuildReport {
  /** Files that could not be produced, named, with the reason. */
  skipped: Array<{ name: string; reason: string }>;
  count: number;
}

export function readme(ctx: Pick<PackageContext, 'system' | 'context' | 'logo'>): string {
  const lines = [
    `${ctx.context.name} — brand package`,
    '',
    `Direction: ${ctx.system.directionName}`,
    `Typefaces: ${ctx.system.type.heading} (headings), ${ctx.system.type.body} (body) — Google Fonts`,
    `Colours: ${ROLES.map((r) => `${ROLE_LABEL[r]} ${ctx.system.palette[r].toUpperCase()}`).join(' · ')}`,
    '',
    'Folders',
    ...GROUPS.map((g) => `  ${g.folder} — ${g.description}`),
    '',
    ctx.logo.svgText
      ? 'Logo files are true vectors (SVG) recoloured from your original.'
      : 'Your logo was supplied as a raster image, so logo files are high-resolution PNGs. Upload an SVG to get vector files.',
    'CMYK values are approximate device conversions — confirm against your printer’s profile.',
  ];
  return lines.join('\n');
}

export async function buildZip(
  ctx: PackageContext,
  catalog: Deliverable[],
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<{ blob: Blob; report: BuildReport }> {
  const { default: JSZip } = await import('jszip');
  const { zipAdd } = await import('@/features/brand-kit/data/zipFile');
  const zip = new JSZip();
  const root = zip.folder(`${slugify(ctx.context.name)}-brand`)!;
  zipAdd(root, 'README.txt', readme(ctx));
  const files = catalog.flatMap((d) => d.files.map((f) => ({ d, f })));
  const skipped: BuildReport['skipped'] = [];
  let done = 0;
  for (const { d, f } of files) {
    onProgress?.(done, files.length, d.name);
    try {
      const blob = await f.build(ctx);
      const folder = root.folder(GROUPS.find((g) => g.id === d.group)!.folder)!;
      if (f.format === 'ZIP') {
        // A set is a zip on its own; inside the package its files sit loose.
        const inner = await JSZip.loadAsync(blob);
        for (const entry of Object.values(inner.files)) {
          if (!entry.dir) zipAdd(folder, entry.name, await entry.async('blob'));
        }
      } else {
        zipAdd(folder, f.name, blob);
      }
    } catch (err) {
      skipped.push({ name: f.name, reason: err instanceof Error ? err.message : 'failed' });
    }
    done++;
    // Let the page paint between files — html2canvas and the PDF are heavy.
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress?.(done, files.length, 'Compressing');
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, report: { skipped, count: files.length - skipped.length } };
}
