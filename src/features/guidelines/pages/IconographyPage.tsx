import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function IconographyPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const p = brand.primaryColor;
  const iconStyle = brand.guidelines?.iconography;

  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>06 — Imagery & Icons</SectionLabel>
      <PageTitle>Iconography</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-8 mt-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Style</h3>
            <p className="text-[11px] leading-relaxed opacity-70">
              {iconStyle?.style || 'Rounded outline icons with consistent stroke weight. Simple, recognizable forms.'}
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Stroke Weight</h3>
            <p className="text-[11px] opacity-70">{iconStyle?.weight || '1.5px consistent stroke'}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Corner Radius</h3>
            <p className="text-[11px] opacity-70">{iconStyle?.cornerRadius || '2px rounded corners'}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Usage</h3>
            <p className="text-[10px] leading-relaxed opacity-50">
              {iconStyle?.usage || 'Use consistent icon style throughout all applications. Icons should complement typography and maintain hierarchy.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Icon grid preview */}
          <div className="grid grid-cols-4 gap-2">
            {['⬚', '◯', '△', '▽', '◇', '⬡', '⊞', '⊕', '⊗', '⊘', '⊙', '⊛'].map((icon, i) => (
              <div key={i} className="aspect-square rounded-lg bg-white/5 flex items-center justify-center">
                <span className="text-lg opacity-60">{icon}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] opacity-30 text-center">Icon grid — 24px base size, 1.5px stroke</p>
        </div>
      </div>
    </PageShell>
  );
}
