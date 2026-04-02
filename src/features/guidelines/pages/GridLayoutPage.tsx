import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function GridLayoutPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={brand.primaryColor}>06 — Graphic Elements</SectionLabel>
      <PageTitle>Grid &<br />Layout System</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-6 mt-4">
        {/* 12-column grid demo */}
        <div>
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">12-Column Grid</h3>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
            <div className="grid grid-cols-12 gap-0.5 h-20">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-sm" style={{ backgroundColor: `${brand.primaryColor}15` }} />
              ))}
            </div>
            <div className="grid grid-cols-12 gap-0.5 h-4 mt-1.5">
              <div className="col-span-4 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}30` }} />
              <div className="col-span-8 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}15` }} />
            </div>
            <div className="grid grid-cols-12 gap-0.5 h-4 mt-1.5">
              <div className="col-span-6 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}20` }} />
              <div className="col-span-6 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}20` }} />
            </div>
            <div className="grid grid-cols-12 gap-0.5 h-4 mt-1.5">
              <div className="col-span-3 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}25` }} />
              <div className="col-span-3 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}25` }} />
              <div className="col-span-3 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}25` }} />
              <div className="col-span-3 rounded-sm" style={{ backgroundColor: `${brand.primaryColor}25` }} />
            </div>
          </div>
        </div>

        {/* Spacing system */}
        <div>
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Spacing Scale (8px base)</h3>
          <div className="space-y-2">
            {[
              { name: 'xs', px: 4 },
              { name: 'sm', px: 8 },
              { name: 'md', px: 16 },
              { name: 'lg', px: 24 },
              { name: 'xl', px: 32 },
              { name: '2xl', px: 48 },
              { name: '3xl', px: 64 },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-gray-400 w-8 text-right">{s.name}</span>
                <div className="h-3 rounded-sm" style={{ width: `${s.px}px`, backgroundColor: brand.primaryColor, opacity: 0.6 }} />
                <span className="text-[8px] font-mono text-gray-300">{s.px}px</span>
              </div>
            ))}
          </div>

          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2 mt-4">Border Radius</h3>
          <div className="flex gap-2">
            {[
              { name: 'sm', r: 4 },
              { name: 'md', r: 8 },
              { name: 'lg', r: 12 },
              { name: 'xl', r: 16 },
              { name: 'full', r: 999 },
            ].map(r => (
              <div key={r.name} className="text-center">
                <div className="w-8 h-8 border-2 mx-auto" style={{ borderRadius: `${r.r}px`, borderColor: brand.primaryColor, opacity: 0.5 }} />
                <span className="text-[7px] text-gray-400 mt-1 block">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
