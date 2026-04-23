import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ScaleSurface, SemanticRole } from '@/shared/types/typescale';

const ROLES: SemanticRole[] = ['display','h1','h2','h3','h4','h5','h6','bodyLg','body','bodySm','caption','overline','label','button','code'];

interface Props {
  surface: ScaleSurface;
  onChange: (next: ScaleSurface) => void;
}

/**
 * SemanticMap — maps semantic roles (display, h1, body, caption, …) to
 * a specific step + font + weight. Collapsible to keep the left rail
 * scannable. Uses `.ts-roles-table` for cosmos-toned rows.
 */
export function SemanticMap({ surface, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ts-section">
      <button
        type="button"
        className="ts-section-head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="ts-section-title">Roles</span>
        <ChevronRight
          size={14}
          className={`ts-section-chevron${open ? ' is-open' : ''}`}
        />
      </button>

      {open && (
        <div className="ts-section-body">
          <table className="ts-roles-table">
            <thead>
              <tr>
                <th>role</th>
                <th>step</th>
                <th>font</th>
                <th>wt</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(role => {
                const entry = surface.semantic[role];
                if (!entry) return null;
                return (
                  <tr key={role}>
                    <td>{role}</td>
                    <td>
                      <select
                        className="ts-select"
                        aria-label={`${role} step`}
                        value={entry.stepId}
                        onChange={e =>
                          onChange({
                            ...surface,
                            semantic: { ...surface.semantic, [role]: { ...entry, stepId: e.target.value } },
                          })
                        }
                      >
                        {surface.steps.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.id} ({s.sizePx}px)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="ts-select"
                        aria-label={`${role} font`}
                        value={entry.font}
                        onChange={e =>
                          onChange({
                            ...surface,
                            semantic: {
                              ...surface.semantic,
                              [role]: { ...entry, font: e.target.value as 'heading' | 'body' | 'mono' },
                            },
                          })
                        }
                      >
                        <option>heading</option>
                        <option>body</option>
                        <option>mono</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ts-input-number"
                        min={100}
                        max={900}
                        step={100}
                        aria-label={`${role} weight`}
                        value={entry.weight ?? 400}
                        onChange={e =>
                          onChange({
                            ...surface,
                            semantic: {
                              ...surface.semantic,
                              [role]: { ...entry, weight: Number(e.target.value) },
                            },
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
