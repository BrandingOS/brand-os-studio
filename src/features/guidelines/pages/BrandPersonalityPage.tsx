import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function BrandPersonalityPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const personality = brand.guidelines?.strategy?.personality || ['Professional', 'Innovative', 'Trustworthy', 'Clear'];
  const p = brand.primaryColor;

  // Personality spectrums — "this, not that"
  const spectrums = [
    { trait: personality[0] || 'Confident', left: 'Bold', right: 'Arrogant', position: 70 },
    { trait: personality[1] || 'Clear', left: 'Simple', right: 'Oversimplified', position: 65 },
    { trait: personality[2] || 'Expert', left: 'Knowledgeable', right: 'Condescending', position: 60 },
    { trait: personality[3] || 'Human', left: 'Warm', right: 'Unprofessional', position: 55 },
  ];

  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>01 — Brand Foundation</SectionLabel>
      <PageTitle>Brand<br />Personality</PageTitle>

      <div className="flex-1 mt-4 space-y-5">
        {spectrums.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-semibold" style={{ color: p }}>{s.trait}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/10">
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${s.position}%`, backgroundColor: p, opacity: 0.6 }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white" style={{ left: `${s.position}%`, borderColor: p, transform: `translateX(-50%) translateY(-50%)` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[7px] opacity-30">{s.left}</span>
              <span className="text-[7px] opacity-30">{s.right}</span>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-white/10">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider opacity-40 mb-2">Personality Traits</h3>
          <div className="flex flex-wrap gap-1.5">
            {personality.map(trait => (
              <span key={trait} className="px-2.5 py-1 rounded text-[9px] font-medium" style={{ backgroundColor: `${p}25`, color: p }}>
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
