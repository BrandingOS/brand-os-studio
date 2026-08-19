// A/B harness — OLD prompt pipeline vs NEW, on identical real briefs.
//
// Not a unit test: a controlled experiment that writes its findings to
// `/tmp/brandos-ab/prompts.md`. It calls the REAL anthropic-proxy so the
// comparison is of what ships, not of a mock. Free — no image is generated.
//
//   AB=1 npx vitest run --project unit src/features/editor/ai/imagePrompt/__ab__
//
// Skipped without AB=1: it costs ~50 s and calls the network, so it must not
// run on the ordinary gate.
//
// The OLD compiler is reconstructed here verbatim from git history rather than
// imported, because the file it lived in is the thing under test.

import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { uniexBrand } from '@/data/brands/uniex';
import type { Brand } from '@/shared/types/brand';
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';
import { compileImagePrompt } from '../compileImagePrompt';
import { buildBrandImageContext, describeBrandForPrompt } from '../brandImageContext';

const OUT = '/tmp/brandos-ab';

/** The briefs a real user types. Chosen to expose the reported failures. */
const BRIEFS = [
  {
    id: 'launch-post',
    label: 'Social post with exact copy',
    prompt: 'Instagram post announcing our new same-day delivery service in Riyadh',
    copy: { headline: 'Same day. Every day.', subhead: 'Now live in Riyadh', cta: 'Book a pickup' },
  },
  {
    id: 'ad-no-copy',
    label: 'Ad with NO copy (the invented-discount trap)',
    prompt: 'An ad creative for our fleet tracking product',
    copy: undefined,
  },
  {
    id: 'plain-photo',
    label: 'A plain photograph (must NOT become a design)',
    prompt: 'a photo of a delivery van on a coastal road at sunrise',
    copy: undefined,
  },
] as const;

// ─── The OLD pipeline, reconstructed ─────────────────────────────────────────

const OLD_SYSTEM = `You compile IMAGE-GENERATION prompts for a brand design tool. You receive the user's request and a brand summary. Return ONLY a JSON object: {"prompt": string, "negativePrompt": string|null, "useLogo": boolean, "paletteHexes": string[], "notes": string}.

Rules (binding):
1. Preserve the user's original creative intent. The subject, scene, mood and any explicit instruction they wrote stay exactly as meant. Rewrite for clarity and richness (composition, lighting, materials, camera/style words), never for a different idea.
2. Use brand context to ENRICH and CONSTRAIN — never to replace. Do not force every brand attribute into every image; pick only what serves THIS request.
3. LOGO: set useLogo=true ONLY if the user asks for the logo/branding, or the subject clearly requires branding (packaging, signage, ads, business cards, merch, storefronts, mockups, brand social posts). A cat on a sofa, a landscape, a portrait, abstract art → useLogo=false and NO logo language in the prompt. If useLogo=true and a logo file exists, describe it as "the brand logo exactly as in the reference image, undistorted, placed naturally" — never invent a logo shape.
4. COLORS: do not force every brand color. Choose 0–3 hexes that genuinely fit the scene as accents/backdrop and list them in paletteHexes; if the user gave a color direction (e.g. "black and white", "in red"), obey it and leave paletteHexes empty unless it agrees.
5. Explicit user instructions override brand defaults, always.
6. Keep the prompt one paragraph, ≤ 120 words, concrete, no marketing fluff, no hex codes spelled in the prompt unless the model benefits (you may say "deep navy (#0B1F3A)"). No text-in-image instructions unless the user asked for text.
7. negativePrompt: short comma list of things to avoid for this request (or null).
8. notes: one short sentence for the user explaining what brand context you used and what you deliberately left out.
Return JSON only. No markdown fences.`;

function extractJson(text: string): Record<string, unknown> {
  const t = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const c = fenced ? fenced[1] : t;
  return JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1));
}

async function oldCompile(brief: { prompt: string }, brand: Brand, formatLabel: string) {
  const ctx = buildBrandImageContext(brand)!;
  const userMsg = [
    `USER REQUEST: ${brief.prompt}`,
    `BRAND: ${describeBrandForPrompt(ctx)}`,
    `FORMAT: ${formatLabel}`,
    `MODEL: text rendering strong; accepts 8 reference images (a logo reference will be attached only if useLogo=true).`,
    `HINTS: explicit logo words=false; branded subject=true; user color direction=false.`,
  ].join('\n');
  const res = await callAnthropic({
    model: 'haiku', max_tokens: 600, system: OLD_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });
  return extractJson(firstText(res) ?? '{}');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

describe.skipIf(!process.env.AB)('prompt pipeline A/B', () => {
  it('compiles every brief through both pipelines and writes the comparison', async () => {
    mkdirSync(OUT, { recursive: true });
    const brand = uniexBrand as unknown as Brand;
    const md: string[] = [
      '# Prompt pipeline A/B — OLD vs NEW',
      '',
      `Brand: **${brand.name}** (seed brand, complete identity + logo system)`,
      'Both pipelines called the real `anthropic-proxy`. No images generated — this isolates PROMPT quality.',
      '',
    ];

    const cells: Array<Record<string, unknown>> = [];

    for (const brief of BRIEFS) {
      const formatLabel = brief.id === 'plain-photo' ? '3:2 Landscape' : '1:1 Square';
      const aspectRatio = brief.id === 'plain-photo' ? '3:2' : '1:1';
      md.push(`\n---\n\n## ${brief.label}\n`, '**User typed:**', '```', brief.prompt, '```');
      if (brief.copy) {
        md.push('**Copy supplied:**', '```json', JSON.stringify(brief.copy, null, 2), '```');
      } else {
        md.push('**Copy supplied:** _none_');
      }

      let oldOut: Record<string, unknown> = {};
      try { oldOut = await oldCompile(brief, brand, formatLabel); } catch (e) { oldOut = { prompt: `ERROR ${String(e)}` }; }

      const neu = await compileImagePrompt({
        userPrompt: brief.prompt,
        brand,
        formatLabel,
        copy: brief.copy,
        modelCaps: {
          supportsReferenceImages: true, maxReferenceImages: 8,
          supportedAspectRatios: ['1:1'], supportedSizes: [1024, 2048], supportedQualities: [],
          supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
          supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
          supportsImageToImage: true, textRendering: 'strong',
        },
      });

      md.push(
        '',
        '### OLD — what actually went to the image model',
        '```text', String(oldOut.prompt ?? ''), '```',
        `\`useLogo\`: **${oldOut.useLogo}** · \`paletteHexes\`: \`${JSON.stringify(oldOut.paletteHexes ?? [])}\` · \`negativePrompt\`: \`${oldOut.negativePrompt ?? 'null'}\``,
        '',
        '### NEW — what goes to the image model now',
        '```text', neu.prompt, '```',
        `\`kind\`: **${neu.kind}** (${neu.deliverable}) — _${neu.kindReason}_`,
        `\`useLogo\`: **${neu.useLogo}** · \`paletteHexes\`: \`${JSON.stringify(neu.paletteHexes)}\` · \`source\`: \`${neu.source}\``,
        '',
        `**negativePrompt:** \`${neu.negativePrompt ?? ''}\``,
      );

      // One row per (pipeline × model) for the image runner.
      for (const [pipeline, text, neg] of [
        ['old', String(oldOut.prompt ?? ''), (oldOut.negativePrompt as string) ?? undefined],
        ['new', neu.prompt, neu.negativePrompt],
      ] as const) {
        for (const [tier, model] of [
          ['free', 'pollinations:turbo'],
          ['paid', 'google:nano-banana'],
          // The Pro tier costs 14 credits an image, so it runs on the single
          // most diagnostic brief rather than all three. 6×0 + 6×4 + 1×14 = 38,
          // inside the 50-credit budget with room for one retry.
          ...(pipeline === 'new' && brief.id === 'launch-post'
            ? [['best', 'google:nano-banana-pro'] as const] : []),
        ] as const) {
          cells.push({
            id: `${brief.id}--${pipeline}--${tier}`,
            label: `${brief.label} · ${pipeline.toUpperCase()} prompt · ${tier}`,
            brief: brief.id, pipeline, tier, model, aspectRatio,
            userPrompt: brief.prompt,
            prompt: text,
            negativePrompt: neg,
          });
        }
      }

      // Machine-checkable signals, so the comparison is not just vibes.
      const oldP = String(oldOut.prompt ?? '');
      const sig = (p: string) => ({
        wordCount: p.split(/\s+/).filter(Boolean).length,
        saysFinished: /finished|publication-ready|complete/i.test(p),
        // Only count it when the brief ASKS for empty space, not when it forbids it.
        asksForEmptySpace: /(leave|leaving|with|generous)\s+(negative\s+)?space\s+(at|for|in)[^.]*\b(headline|text|copy)\b|room for a short line of copy|designed to sit behind text/i.test(p),
        quotesExactCopy: brief.copy ? p.includes(brief.copy.headline) : null,
        bansInventedCopy: /do not invent|invented slogans/i.test(p),
        bansDiscounts: /discount|percentage offers|sale sticker/i.test(p),
        namesTypography: /typograph|font|letterform|type hierarchy|set .{0,12}type\b/i.test(p),
        hasSafeMargin: /safe margin|margin on every edge/i.test(p),
        hasLogoRule: /logo/i.test(p),
      });
      md.push(
        '',
        '### Signals',
        '',
        '| signal | OLD | NEW |',
        '|---|---|---|',
        ...Object.keys(sig(oldP)).map((k) => {
          const o = sig(oldP)[k as keyof ReturnType<typeof sig>];
          const n = sig(neu.prompt)[k as keyof ReturnType<typeof sig>];
          return `| ${k} | ${o} | ${n} |`;
        }),
      );
    }

    writeFileSync(`${OUT}/prompts.md`, md.join('\n'), 'utf8');

    // The image runner's input: the same briefs, crossed with model and
    // pipeline, so `scripts/image-ab.mjs` can generate without re-deciding
    // anything. Free models first — a failure there costs nothing.
    writeFileSync(`${OUT}/cells.json`, JSON.stringify(cells, null, 2), 'utf8');
    console.log(`\n[A/B] wrote ${OUT}/prompts.md and ${OUT}/cells.json (${cells.length} cells)\n`);
  }, 180_000);
});
