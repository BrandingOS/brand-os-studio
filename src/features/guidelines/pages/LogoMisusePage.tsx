import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function LogoMisusePage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const p = brand.primaryColor;
  const misuses = [
    { label: 'Don\'t stretch or distort', style: { transform: 'scaleX(1.5)' } },
    { label: 'Don\'t rotate', style: { transform: 'rotate(15deg)' } },
    { label: 'Don\'t add shadows', style: { filter: 'drop-shadow(4px 4px 6px rgba(0,0,0,0.5))' } },
    { label: 'Don\'t change colors', style: { filter: 'hue-rotate(90deg)' } },
    { label: 'Don\'t add outlines', style: { filter: 'drop-shadow(0 0 1px red) drop-shadow(0 0 1px red)' } },
    { label: 'Don\'t reduce opacity', style: { opacity: 0.25 } },
  ];

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>02 — Logo System</SectionLabel>
      <PageTitle>Incorrect<br />Usage</PageTitle>

      <div className="flex-1 grid grid-cols-3 gap-3 mt-4">
        {misuses.map((m, i) => (
          <div key={i} className="rounded-lg border border-red-200 bg-red-50/50 p-4 flex flex-col items-center justify-center relative">
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-500 text-xs font-bold">✕</span>
            </div>
            <div style={m.style} className="mb-3">
              {brand.logo ? (
                <img src={brand.logo} alt="" className="h-6 object-contain" />
              ) : (
                <span className="text-sm font-bold" style={{ color: p }}>{brand.name}</span>
              )}
            </div>
            <p className="text-[8px] text-red-600 text-center font-medium">{m.label}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
