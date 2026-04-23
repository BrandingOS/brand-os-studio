import type { ScaleSurface, SemanticRole } from '@/shared/types/typescale';

const ROLES: SemanticRole[] = ['display','h1','h2','h3','h4','h5','h6','bodyLg','body','bodySm','caption','overline','label','button','code'];

interface Props {
  surface: ScaleSurface;
  onChange: (next: ScaleSurface) => void;
}

export function SemanticMap({ surface, onChange }: Props) {
  return (
    <section className="space-y-2 rounded-lg border p-4 text-xs">
      <h3 className="text-sm font-medium">Roles</h3>
      <table className="w-full">
        <thead><tr className="text-muted-foreground"><th className="text-left">role</th><th>step</th><th>font</th><th>weight</th></tr></thead>
        <tbody>
          {ROLES.map(role => {
            const entry = surface.semantic[role];
            if (!entry) return null;
            return (
              <tr key={role} className="border-t">
                <td className="py-1">{role}</td>
                <td>
                  <select
                    value={entry.stepId}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, stepId: e.target.value } } })}
                    className="rounded border px-1"
                  >
                    {surface.steps.map(s => <option key={s.id} value={s.id}>{s.id} ({s.sizePx}px)</option>)}
                  </select>
                </td>
                <td>
                  <select
                    value={entry.font}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, font: e.target.value as 'heading'|'body'|'mono' } } })}
                    className="rounded border px-1"
                  >
                    <option>heading</option><option>body</option><option>mono</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number" min={100} max={900} step={100} value={entry.weight ?? 400}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, weight: Number(e.target.value) } } })}
                    className="w-16 rounded border px-1"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
