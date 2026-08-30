/**
 * Search + tag chips over a wall of kit designs.
 *
 * A library you can only scroll is a pile. Twenty-four business cards with
 * no way to say "the dark ones" is a slower way to find nothing.
 *
 * Two rules the row exists to keep:
 *
 *   1. **The words are the curation's, never invented here.** Every chip is
 *      a tag some designer really filed a design under
 *      (`renderers/curation` `tagsFor`), so a chip can never offer a word
 *      that matches nothing.
 *   2. **A chip has to index MORE THAN ONE design.** A wall of three
 *      designs has nine tags between them, every one unique — nine chips
 *      that each hide two of the three things on screen. That is a worse
 *      index than reading the names, so a tag earns a chip only when it
 *      groups something.
 *
 * It lives here, feature-local, rather than in `shared/ds`: the tags come
 * from the kit's own curation and the empty state speaks about designs.
 * Two consumers wanted the same thing for the same reason — the drilldown
 * (the designs a card is showing) and the picker (every design the family
 * has) — which is why it is one component and not two copies.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DsChip, DsInput } from '@/shared/ds';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { tagsFor } from '../renderers/curation';

export type KitFilter = {
  query: string;
  setQuery: (q: string) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clear: () => void;
  /** `[tag, count]`, most-used first — only tags that group something. */
  chips: Array<[string, number]>;
  /** Whether the row is worth showing at all. */
  filterable: boolean;
  /** The designs that survive the query and every chosen chip. */
  visible: BrandKitTemplate[];
};

/**
 * @param resetKey change it and the filter clears — a chip from the last
 * card would silently hide everything in this one.
 */
export function useKitFilter(
  templates: ReadonlyArray<BrandKitTemplate>,
  resetKey?: string,
): KitFilter {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useEffect(() => {
    setQuery('');
    setActiveTags([]);
  }, [resetKey]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tpl of templates) {
      for (const tag of tagsFor(tpl.id)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    // Most-used first, then alphabetical, so the row is stable and the
    // useful chips are the ones you reach first.
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [templates]);

  const chips = useMemo(() => tagCounts.filter(([, n]) => n >= 2), [tagCounts]);
  const filterable = chips.length > 0 || templates.length >= 6;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && activeTags.length === 0) return templates as BrandKitTemplate[];
    return (templates as BrandKitTemplate[]).filter((tpl) => {
      const tags = tagsFor(tpl.id);
      // Every chosen chip must hold — chips NARROW. Two chips meaning
      // "either" would make the row useless the moment you pick a second.
      if (activeTags.some((t) => !tags.includes(t))) return false;
      if (!q) return true;
      // Name and tags together: "invoice" and "minimal" are the same kind
      // of question to someone looking for one.
      return tpl.name.toLowerCase().includes(q) || tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [templates, query, activeTags]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setActiveTags([]);
  }, []);

  return { query, setQuery, activeTags, toggleTag, clear, chips, filterable, visible };
}

export type KitFilterRowProps = {
  filter: KitFilter;
  /** How many designs the row is sifting — it says so in the placeholder. */
  total: number;
  /** What the user calls this family, lower-cased into the placeholder. */
  noun: string;
  /** Host modifier — the picker needs the modal's own padding. */
  className?: string;
};

export function KitFilterRow({ filter, total, noun, className }: KitFilterRowProps) {
  if (!filter.filterable) return null;
  return (
    <div className={['bk-drilldown-filter', className ?? ''].filter(Boolean).join(' ')}>
      <DsInput
        pill
        type="search"
        className="bk-drilldown-search"
        value={filter.query}
        onChange={(e) => filter.setQuery(e.target.value)}
        placeholder={`Search ${total} ${noun.toLowerCase()} designs`}
        aria-label={`Search ${noun}`}
      />
      {filter.chips.length > 0 && (
        <div className="bk-drilldown-chips" role="group" aria-label="Filter by tag">
          {filter.chips.map(([tag, count]) => {
            const on = filter.activeTags.includes(tag);
            return (
              <DsChip
                key={tag}
                active={on}
                aria-pressed={on}
                onClick={() => filter.toggleTag(tag)}
              >
                {tag}
                <span className="bk-chip-count">{count}</span>
              </DsChip>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Filtered to nothing. Say so and offer the way back — a grid that simply
 * empties looks broken rather than filtered.
 */
export function KitFilterEmpty({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" className="bk-drilldown-empty" onClick={onClear}>
      <span className="bk-drilldown-empty-title">No design matches that</span>
      <span className="bk-drilldown-empty-sub">Clear the search and chips</span>
    </button>
  );
}

export default KitFilterRow;
