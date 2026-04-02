import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function ColorSystemPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const palette = brand.guidelines?.colorPalette;
  const colors = [
    { hex: palette?.primary?.hex || brand.primaryColor, name: palette?.primary?.name || 'Primary', role: 'Primary' },
    ...(palette?.secondary ? [{ hex: palette.secondary.hex, name: palette.secondary.name, role: 'Secondary' }] : brand.secondaryColor ? [{ hex: brand.secondaryColor, name: 'Secondary', role: 'Secondary' }] : []),
    ...(palette?.accent ? [{ hex: palette.accent.hex, name: palette.accent.name, role: 'Accent' }] : []),
  ];

  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={brand.primaryColor} theme={theme}>03 — Color System</SectionLabel>
      <PageTitle theme={theme}>Color<br />System</PageTitle>

      <div className="flex-1 flex gap-3 mt-4">
        {colors.map((c, i) => (
          <div key={i} className="flex-1 rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 min-h-[60%] rounded-t-xl" style={{ backgroundColor: c.hex }} />
            <div className="py-2">
              <p className="text-[11px] font-semibold">{c.name}</p>
              <p className="text-[9px] font-mono opacity-40 mt-0.5">{c.hex.toUpperCase()}</p>
              <p className="text-[8px] opacity-30 mt-0.5 uppercase tracking-wider">{c.role}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function ColorNeutralsPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const neutrals = brand.guidelines?.colorPalette?.neutral || [
    { hex: '#F8FAFC', name: 'Light' }, { hex: '#E2E8F0', name: 'Border' },
    { hex: '#94A3B8', name: 'Muted' }, { hex: '#475569', name: 'Body' }, { hex: '#0F172A', name: 'Dark' },
  ];

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={brand.primaryColor} theme={theme}>03 — Color System</SectionLabel>
      <PageTitle theme={theme}>Neutral<br />Palette</PageTitle>

      <div className="flex-1 flex gap-2 mt-4">
        {neutrals.map((n, i) => (
          <div key={i} className="flex-1 flex flex-col">
            <div className="flex-1 rounded-lg border border-gray-100" style={{ backgroundColor: n.hex }} />
            <div className="mt-2">
              <p className="text-[10px] font-medium">{n.name}</p>
              <p className="text-[8px] font-mono text-gray-400">{n.hex}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
