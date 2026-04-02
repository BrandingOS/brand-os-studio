import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

const sections = [
  { num: '01', title: 'Brand Introduction', desc: 'Mission, vision, values & positioning' },
  { num: '02', title: 'Logo System', desc: 'Primary, secondary, monochrome & usage rules' },
  { num: '03', title: 'Color System', desc: 'Primary, secondary, accent & neutral palettes' },
  { num: '04', title: 'Typography', desc: 'Typefaces, hierarchy & scale' },
  { num: '05', title: 'Voice & Tone', desc: 'Personality, messaging & writing rules' },
  { num: '06', title: 'Imagery & Icons', desc: 'Photography, illustration & iconography' },
  { num: '07', title: 'Applications', desc: 'Business cards, social media & digital' },
  { num: '08', title: 'Do\'s & Don\'ts', desc: 'Usage guidelines & common mistakes' },
];

export function TableOfContentsPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel>Contents</SectionLabel>
      <PageTitle>Table of<br />Contents</PageTitle>

      <div className="flex-1 mt-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {sections.map((s) => (
            <div key={s.num} className="flex gap-3 group">
              <span className="text-[clamp(18px,2.2vw,28px)] font-bold opacity-15 group-hover:opacity-40 transition-opacity" style={{ color: brand.primaryColor }}>
                {s.num}
              </span>
              <div>
                <p className="text-[clamp(11px,1.1vw,15px)] font-semibold">{s.title}</p>
                <p className="text-[clamp(9px,0.9vw,12px)] opacity-40 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
