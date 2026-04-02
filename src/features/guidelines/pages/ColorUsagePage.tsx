import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';
import { contrastRatio } from '@/features/brandkit/engine/brandRules';

export function ColorUsagePage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const combos = [
    { fg: '#ffffff', bg: p, label: 'White on Primary' },
    { fg: p, bg: '#ffffff', label: 'Primary on White' },
    { fg: '#ffffff', bg: '#0A0A0F', label: 'White on Dark' },
    { fg: p, bg: '#0A0A0F', label: 'Primary on Dark' },
    { fg: '#ffffff', bg: s, label: 'White on Secondary' },
    { fg: '#0A0A0F', bg: s, label: 'Dark on Secondary' },
  ];

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>03 — Color System</SectionLabel>
      <PageTitle>Color Usage<br />& Accessibility</PageTitle>

      <div className="flex-1 mt-4">
        <p className="text-[10px] opacity-50 mb-4 max-w-[50%]">
          All color combinations must meet WCAG 2.1 AA contrast standards. Below are approved and cautioned pairings.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {combos.map((c, i) => {
            const cr = contrastRatio(c.fg, c.bg);
            const pass = cr >= 4.5;
            const warn = cr >= 3 && cr < 4.5;
            return (
              <div key={i} className="rounded-lg overflow-hidden border border-gray-100">
                <div className="h-14 flex items-center justify-center px-3" style={{ backgroundColor: c.bg }}>
                  <span className="text-[11px] font-semibold" style={{ color: c.fg }}>Aa Sample Text</span>
                </div>
                <div className="p-2 flex items-center justify-between bg-white">
                  <span className="text-[8px] text-gray-500">{c.label}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${pass ? 'bg-green-100 text-green-700' : warn ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                    {cr.toFixed(1)}:1 {pass ? 'AA ✓' : warn ? 'Large ✓' : 'Fail'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[8px] text-gray-500">AA Pass (≥4.5:1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[8px] text-gray-500">Large Text Only (≥3:1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[8px] text-gray-500">Fail (&lt;3:1)</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
