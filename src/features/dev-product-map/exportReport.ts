/**
 * Markdown export of the owner's review decisions — designed to be pasted back
 * to an AI later to execute cleanup decisions.
 */
import type { ReviewDecision, SurfaceEntry } from './types';

const DECISION_ORDER: ReviewDecision[] = ['keep', 'remove', 'merge', 'review', 'undecided'];
const DECISION_TITLE: Record<ReviewDecision, string> = {
  keep: 'KEEP',
  remove: 'REMOVE',
  merge: 'MERGE (duplicate — consolidate)',
  review: 'REVIEW (needs a closer look)',
  undecided: 'UNDECIDED',
};

export function buildMarkdownReport(
  entries: SurfaceEntry[],
  decisions: Record<string, ReviewDecision>,
): string {
  const lines: string[] = [
    '# BrandingOS — Product Surface Review',
    '',
    `_Exported ${new Date().toISOString()} from /_dev/product-map. ${entries.length} surfaces._`,
    '',
  ];

  for (const d of DECISION_ORDER) {
    const group = entries.filter((e) => (decisions[e.id] ?? 'undecided') === d);
    if (group.length === 0) continue;
    lines.push(`## ${DECISION_TITLE[d]} (${group.length})`, '');
    for (const e of group) {
      const where = e.route ?? `(no route — ${e.entryHint ?? 'in-page'})`;
      const dup = e.duplicateGroup ? ` · possible-duplicate:${e.duplicateGroup}` : '';
      lines.push(
        `- **${e.name}** — \`${where}\``,
        `  - ${e.type} · ${e.status} · ${e.namespace} · ${e.area}${dup}`,
        `  - ${e.description}`,
        `  - source: \`${e.source}\``,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
