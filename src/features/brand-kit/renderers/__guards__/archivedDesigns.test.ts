/**
 * An archived id must not be a design nobody can see any more.
 *
 * Curation hides an id; it does not delete the artwork. That distinction
 * is the whole safety of the mechanism — until a curation pass ALSO
 * removes the drawing, at which point the id is not "hidden", it is gone,
 * and the record that it was ever a design is a comment.
 *
 * That is what happened. Measured 2026-09-09 across every card the kit
 * offers: of 512 archived ids, 510 rendered a picture that was already on
 * the shelf under a different number, because their own artwork had been
 * deleted and the renderer falls through to its first design. Restoring
 * them "as they were" was therefore impossible — there was nothing left
 * to restore. Two (`invoices-ext-18`, `invoices-ext-22`) still had their
 * drawings and were culled on taste alone; both are back.
 *
 * So this test pins the property the restore leaves behind:
 *
 *   **Every id that is still archived draws a design the kit already
 *   offers.** Nothing is hidden that a customer cannot otherwise see.
 *
 * The one exemption is structural rather than editorial: a LEGACY id
 * (`<type>-N`, no `-ext-` suffix) reaches its artwork through
 * `renderTemplateDesign`, which is handed no `content` at all. That is
 * the third condition in `rendererBindsContent`, so Use Template and Edit
 * Template are dark on every one of them by construction — un-archiving
 * one would put a design on the shelf that the customer cannot put their
 * own words on. They are listed by NAME below, so adding one is a
 * decision somebody has to write down.
 *
 * If it fails, someone archived a design that is genuinely distinct.
 * Un-archive it, or delete its artwork and say why in the family's
 * curation file — but do not leave a drawing nobody can reach.
 *
 * It runs in jsdom on purpose: the comparison is STRUCTURAL (tags,
 * classes and inline styles, with the words removed), and structure is
 * exactly what React emits without a cascade.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, Fragment } from 'react';
import { render, cleanup } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { contentKindForTemplateType, hydrateContent } from '@/features/brandkit/content/kinds';
import { variantsForCard, variantsForCardUncurated } from '../../data/legacy-mapping';
import { isArchived } from '../curation';
import { renderCosmosTemplate } from '../index';
import { SWEEP_BRAND } from './bindSweep';

afterEach(cleanup);

/** Every card the kit offers, as `resolveLegacyCard` keys them. */
export const ALL_CARDS: Array<[string, string]> = [
  ['stationery', 'Business Card'],
  ['stationery', 'Letterhead'],
  ['stationery', 'Envelope'],
  ['stationery', 'Invoice'],
  ['social', 'Profile'],
  ['social', 'Cover'],
  ['social', 'Post'],
  ['social', 'Story'],
  ['web', 'Favicon'],
  ['web', 'Website'],
  ['web', 'Email Signature'],
  ['web', 'Landing Page'],
  ['brand-guides', 'Logo Guide'],
  ['brand-guides', 'Color Guide'],
  ['brand-guides', 'Typography Guide'],
  ['brand-guides', 'Voice Guide'],
  ['brand-guides', 'Imagery Guide'],
  ['presentations', 'Pitch Deck'],
  ['presentations', 'Business Plan'],
  ['presentations', 'Proposal'],
  ['presentations', 'Case Studies'],
  ['animations', 'Logo Reveal'],
  ['animations', 'Slide In'],
  ['animations', 'Fade'],
  ['animations', 'Rotate'],
  ['mockups', 'Signage'],
  ['mockups', 'Apparel'],
  ['mockups', 'Mug'],
  ['mockups', 'Tote'],
  ['mockups', 'Sticker'],
  ['mockups', 'Business Card Stack'],
  ['mockups', 'Device Screen'],
  ['mockups', 'Billboard'],
];

/**
 * A legacy id — `business-cards-7`, `invoices-3` — as opposed to a
 * `<type>-ext-N` one. The dispatch has no content route for these.
 */
function isLegacyId(id: string): boolean {
  return !/-ext-\d+$/.test(id);
}

/**
 * The design's STRUCTURE, with the words removed.
 *
 * Text has to go: a legacy id reaches its renderer with no `content`, so
 * it paints the brand's defaults while the `-ext-` id beside it paints
 * hydrated content. Comparing the words would call those two different
 * designs when they are the same drawing.
 */
function signature(html: string): string {
  return html.replace(/>[^<>]*</g, '><').replace(/\s+/g, ' ').trim();
}

type Row = {
  card: string;
  id: string;
  name: string;
  binds: number;
  twin: string | null;
};

function measureCard(sectionKey: string, label: string): Row[] {
  const raw = variantsForCardUncurated(sectionKey as never, label, mockBrand);
  const keptIds = new Set(variantsForCard(sectionKey as never, label, mockBrand).map((t) => t.id));
  const bySignature = new Map<string, string[]>();
  const binds = new Map<string, number>();
  const signatureOf = new Map<string, string>();

  for (const template of raw) {
    const kind = contentKindForTemplateType(template.type as string);
    const content = kind ? hydrateContent(kind, mockBrand, undefined) : undefined;
    const { container } = render(
      createElement(Fragment, null, renderCosmosTemplate(template, SWEEP_BRAND, mockBrand, content)),
    );
    const sig = signature(container.innerHTML);
    binds.set(template.id, container.querySelectorAll('[data-bind]').length);
    cleanup();
    signatureOf.set(template.id, sig);
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig)!.push(template.id);
  }

  const rows: Row[] = [];
  for (const template of raw) {
    if (!isArchived(template.id)) continue;
    const twins = bySignature.get(signatureOf.get(template.id)!)!.filter((i) => i !== template.id);
    rows.push({
      card: `${sectionKey}::${label}`,
      id: template.id,
      name: template.name,
      binds: binds.get(template.id) ?? 0,
      twin: twins.find((i) => keptIds.has(i)) ?? null,
    });
  }
  return rows;
}

describe('archived designs', () => {
  it('every archived id draws a design the kit still offers', () => {
    const rows = ALL_CARDS.flatMap(([sectionKey, label]) => measureCard(sectionKey, label));
    const orphans = rows.filter((r) => r.twin === null && !isLegacyId(r.id));

    mkdirSync('.audit/designs', { recursive: true });
    writeFileSync(
      '.audit/designs/archived-measurements.tsv',
      ['card\tid\tname\tbind-regions\tdraws-the-design-of', ...rows.map(
        (r) =>
          `${r.card}\t${r.id}\t${r.name}\t${r.binds}\t` +
          (r.twin ?? (isLegacyId(r.id) ? 'its own artwork (legacy id — no content route)' : 'ITS OWN ARTWORK')),
      )].join('\n') + '\n',
    );

    expect(
      orphans.length,
      orphans.length === 0
        ? ''
        : [
            '',
            'These ids are archived AND draw artwork of their own, so a design',
            'exists that nothing can reach. Un-archive it, or remove the drawing',
            'and record the measured reason in the family’s curation file.',
            '',
            ...orphans.map((r) => `  ${r.id} (${r.name}) — ${r.card}`),
            '',
          ].join('\n'),
    ).toBe(0);
  });
});
