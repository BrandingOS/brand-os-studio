import { PageShell, SectionLabel, PageTitle, Divider, type GuidelinePageProps } from './PageShell';

export function VoiceTonePage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const voice = brand.guidelines?.voiceAndTone;
  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={brand.primaryColor} theme={theme}>05 — Voice & Tone</SectionLabel>
      <PageTitle theme={theme}>Brand<br />Tone & Voice</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-8 mt-4">
        <div>
          <p className="text-[clamp(10px,1vw,14px)] leading-relaxed opacity-70">
            {voice?.brandVoice || `${brand.name} speaks with confidence and clarity. Every word earns its place.`}
          </p>
        </div>
        <div>
          {voice?.toneAttributes && voice.toneAttributes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {voice.toneAttributes.map(a => (
                <span key={a} className="px-2.5 py-1 rounded text-[9px] font-semibold" style={{ backgroundColor: `${brand.primaryColor}25`, color: brand.primaryColor }}>
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[brand.tone || 'Professional', 'Clear', 'Confident'].map(a => (
                <span key={a} className="px-2.5 py-1 rounded text-[9px] font-semibold" style={{ backgroundColor: `${brand.primaryColor}25`, color: brand.primaryColor }}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export function DosDontsPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const voice = brand.guidelines?.voiceAndTone;
  const dos = voice?.doAndDonts?.do || ['Be clear and direct', 'Use active voice', 'Lead with the benefit'];
  const donts = voice?.doAndDonts?.dont || ['Use jargon', 'Exaggerate claims', 'Sound robotic'];

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={brand.primaryColor} theme={theme}>05 — Voice & Tone</SectionLabel>
      <PageTitle theme={theme}>Do's &<br />Don'ts</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-6 mt-4">
        {/* Do's */}
        <div className="rounded-xl p-4" style={{ backgroundColor: `${brand.secondaryColor || '#10B981'}12` }}>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: brand.secondaryColor || '#10B981' }}>✓ Do</h3>
          <div className="space-y-2">
            {dos.slice(0, 5).map((d, i) => (
              <p key={i} className="text-[10px] leading-relaxed flex gap-2">
                <span style={{ color: brand.secondaryColor || '#10B981' }}>•</span>
                {d}
              </p>
            ))}
          </div>
        </div>

        {/* Don'ts */}
        <div className="rounded-xl p-4 bg-red-50">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-3">✕ Don't</h3>
          <div className="space-y-2">
            {donts.slice(0, 5).map((d, i) => (
              <p key={i} className="text-[10px] leading-relaxed flex gap-2">
                <span className="text-red-400">•</span>
                {d}
              </p>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
