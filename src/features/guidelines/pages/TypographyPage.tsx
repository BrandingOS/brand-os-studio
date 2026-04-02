import { PageShell, SectionLabel, PageTitle, Divider, type GuidelinePageProps } from './PageShell';

export function TypographyPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const typo = brand.guidelines?.typography;
  const primary = typo?.primary?.family || brand.fonts.primary;
  const secondary = typo?.secondary?.family || brand.fonts.secondary;

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={brand.primaryColor}>04 — Typography</SectionLabel>
      <PageTitle>Primary<br />Typeface</PageTitle>

      <div className="flex-1 flex flex-col justify-center mt-2">
        <div className="mb-6">
          <p className="text-[clamp(48px,6vw,80px)] font-bold leading-none tracking-tight" style={{ fontFamily: primary }}>
            Aa
          </p>
          <p className="text-[clamp(20px,2.5vw,36px)] font-semibold mt-2" style={{ fontFamily: primary }}>
            {primary}
          </p>
          <p className="text-[clamp(9px,0.9vw,12px)] opacity-40 mt-1">
            {typo?.primary?.usage || 'Primary typeface for all UI text, body content, and interface elements.'}
          </p>
        </div>

        <Divider />

        <div className="mt-4 grid grid-cols-4 gap-4">
          {[
            { weight: 'Regular', w: 400, sample: 'The quick brown fox jumps over the lazy dog' },
            { weight: 'Medium', w: 500, sample: 'The quick brown fox jumps over the lazy dog' },
            { weight: 'SemiBold', w: 600, sample: 'The quick brown fox jumps over the lazy dog' },
            { weight: 'Bold', w: 700, sample: 'The quick brown fox jumps over the lazy dog' },
          ].map(s => (
            <div key={s.weight}>
              <p className="text-[8px] uppercase tracking-wider opacity-30 mb-1">{s.weight} {s.w}</p>
              <p className="text-[10px] leading-relaxed" style={{ fontFamily: primary, fontWeight: s.w }}>
                {s.sample}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export function TypeScalePage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const primary = brand.fonts.primary;
  const secondary = brand.fonts.secondary || primary;
  const scale = [
    { name: 'Display', size: '48px', weight: 700, font: secondary },
    { name: 'H1', size: '36px', weight: 700, font: secondary },
    { name: 'H2', size: '28px', weight: 600, font: secondary },
    { name: 'H3', size: '22px', weight: 600, font: primary },
    { name: 'Body Large', size: '18px', weight: 400, font: primary },
    { name: 'Body', size: '16px', weight: 400, font: primary },
    { name: 'Small', size: '14px', weight: 400, font: primary },
    { name: 'Caption', size: '12px', weight: 500, font: primary },
  ];

  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={brand.primaryColor}>04 — Typography</SectionLabel>
      <PageTitle>Type<br />Scale</PageTitle>

      <div className="flex-1 flex flex-col justify-center space-y-1 mt-2">
        {scale.map(s => (
          <div key={s.name} className="flex items-baseline gap-4 py-1 border-b border-white/5">
            <span className="text-[8px] font-mono opacity-30 w-16 shrink-0 text-right">{s.name}</span>
            <span style={{ fontSize: `clamp(8px, ${parseInt(s.size) * 0.5}px, ${s.size})`, fontFamily: s.font, fontWeight: s.weight }}>
              {brand.name}
            </span>
            <span className="text-[8px] font-mono opacity-20 ml-auto">{s.size} / {s.weight}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
