import { PageShell, SectionLabel, PageTitle, Divider, type GuidelinePageProps } from './PageShell';

export function BrandIntroPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const strategy = brand.guidelines?.strategy;
  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={brand.primaryColor} theme={theme}>01 — Brand Introduction</SectionLabel>
      <PageTitle theme={theme}>Brand<br />Introduction</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-8 mt-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Mission</h3>
            <p className="text-[clamp(10px,1vw,14px)] leading-relaxed opacity-70">
              {strategy?.mission || `${brand.name} exists to deliver exceptional value through innovation and design.`}
            </p>
          </div>
          <Divider />
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Vision</h3>
            <p className="text-[clamp(10px,1vw,14px)] leading-relaxed opacity-70">
              {strategy?.vision || `To become the leading force in our industry through relentless quality and purpose.`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Positioning</h3>
            <p className="text-[clamp(10px,1vw,14px)] leading-relaxed opacity-70">
              {strategy?.positioning || brand.strategy || `${brand.name} — built for those who demand excellence.`}
            </p>
          </div>
          <Divider />
          {strategy?.values && strategy.values.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2">Core Values</h3>
              <div className="flex flex-wrap gap-1.5">
                {strategy.values.map(v => (
                  <span key={v} className="px-2 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${brand.primaryColor}30`, color: brand.primaryColor }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
