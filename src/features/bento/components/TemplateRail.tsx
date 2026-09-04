import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DsInput } from '@/shared/ds';
import { TEMPLATES } from '../templates';

interface Props {
  /** Named in the header, exactly as every other Studio sidebar names it. */
  brandName: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Left rail — neutral wireframe thumbnails. No colour blocks; the previews
 * communicate the GEOMETRY of each template, letting the actual brand content
 * speak through the artboard on the right.
 *
 * The header is the one every Studio sidebar carries — an eyebrow naming the
 * panel over the brand's name set in the serif — so this rail and
 * SetupSidebar / ToolsSidebar are visibly the same furniture. It used to show
 * the eyebrow alone, which is the half that says the least.
 *
 * The markup is the workspace shell's own panel vocabulary — `.panel`,
 * `.panel-top`, `.panel-heading`, `.panel-list`, and a row of
 * `.panel-item > .panel-item-body > .panel-item-thumb + .panel-item-meta` —
 * the same structure SetupSidebar, ToolsSidebar and the Guideline builder use.
 * Those rules live under `[data-workspace]`, which the editor root sets. Only
 * the thumbnail's grid is Bento's own, because no other panel draws one.
 */
export function TemplateRail({ brandName, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter((t) => t.name.toLowerCase().includes(q) || t.id.includes(q));
  }, [query]);

  return (
    <aside className="panel bento-rail" aria-label="Templates">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Templates</span>
          <h1 className="panel-heading-title">{brandName}</h1>
        </div>
        <div className="bento-search">
          <Search size={14} className="bento-search-icon" aria-hidden />
          <DsInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layouts"
            aria-label="Search layouts"
          />
        </div>
      </div>

      <nav className="panel-list">
        {filtered.map((tpl) => {
          const active = tpl.id === selectedId;
          return (
            <div key={tpl.id} className={`panel-item${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="panel-item-body"
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(tpl.id)}
              >
                <span className="panel-item-thumb bento-thumb" aria-hidden>
                  <span
                    className="bento-thumb-grid"
                    style={{
                      gridTemplateColumns: `repeat(${tpl.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${tpl.rows}, 1fr)`,
                    }}
                  >
                    {tpl.tiles.map((t) => (
                      <span
                        key={t.id}
                        style={{
                          gridRow: `${t.row} / span ${t.rowSpan}`,
                          gridColumn: `${t.col} / span ${t.colSpan}`,
                        }}
                      />
                    ))}
                  </span>
                </span>
                <span className="panel-item-meta">
                  <span className="panel-item-name">{tpl.name}</span>
                  <span className="panel-item-sub">
                    {tpl.cols}×{tpl.rows} · {tpl.tiles.length} tiles
                  </span>
                </span>
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="bento-rail-empty">No layout matches “{query.trim()}”.</p>
        )}
      </nav>
    </aside>
  );
}
