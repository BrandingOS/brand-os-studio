/**
 * GuidelinesDocument — renders a complete brand guidelines document
 * as a scrollable series of pages. Each page is a React component
 * using the brand data. Fully customizable, all code-based.
 */
import { useState } from 'react';
import { Download, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { CoverPage } from './CoverPage';
import { TableOfContentsPage } from './TableOfContentsPage';
import { BrandIntroPage } from './BrandIntroPage';
import { LogoSystemPage, LogoClearSpacePage } from './LogoSystemPage';
import { ColorSystemPage, ColorNeutralsPage } from './ColorSystemPage';
import { TypographyPage, TypeScalePage } from './TypographyPage';
import { VoiceTonePage, DosDontsPage } from './VoiceTonePage';
import { BusinessCardPage, SocialMediaPage, ClosingPage } from './ApplicationsPage';
import type { GuidelinePageProps } from './PageShell';
import { toast } from 'sonner';

interface GuidelinesDocumentProps {
  brand: Brand;
}

type PageEntry = {
  id: string;
  name: string;
  component: React.FC<GuidelinePageProps>;
};

const ALL_PAGES: PageEntry[] = [
  { id: 'cover', name: 'Cover', component: CoverPage },
  { id: 'toc', name: 'Table of Contents', component: TableOfContentsPage },
  { id: 'intro', name: 'Brand Introduction', component: BrandIntroPage },
  { id: 'logo-system', name: 'Logo System', component: LogoSystemPage },
  { id: 'logo-clearspace', name: 'Clear Space & Size', component: LogoClearSpacePage },
  { id: 'colors', name: 'Color System', component: ColorSystemPage },
  { id: 'neutrals', name: 'Neutral Palette', component: ColorNeutralsPage },
  { id: 'typography', name: 'Primary Typeface', component: TypographyPage },
  { id: 'type-scale', name: 'Type Scale', component: TypeScalePage },
  { id: 'voice', name: 'Voice & Tone', component: VoiceTonePage },
  { id: 'dos-donts', name: "Do's & Don'ts", component: DosDontsPage },
  { id: 'business-card', name: 'Business Cards', component: BusinessCardPage },
  { id: 'social', name: 'Social Media', component: SocialMediaPage },
  { id: 'closing', name: 'Closing', component: ClosingPage },
];

export function GuidelinesDocument({ brand }: GuidelinesDocumentProps) {
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const totalPages = ALL_PAGES.length;

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      const container = document.querySelector('[data-guidelines-pages]');
      if (!container) { toast.error('Pages not found'); return; }

      const pages = container.querySelectorAll('[data-guideline-page]');

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2, backgroundColor: null, useCORS: true, logging: false,
        });
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1920, 1080);
      }

      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      pdf.save(`${slug}-brand-guidelines.pdf`);
      toast.success('Brand Guidelines exported as PDF');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  // Presentation mode
  if (presentationMode) {
    const Page = ALL_PAGES[currentSlide].component;
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <Page brand={brand} pageNumber={currentSlide + 1} totalPages={totalPages} />
          </div>
        </div>
        <div className="h-14 bg-black/80 flex items-center justify-between px-6">
          <button onClick={() => setPresentationMode(false)} className="text-white/60 text-sm hover:text-white">
            <Minimize2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="text-white/60 hover:text-white disabled:opacity-20">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white/60 text-sm font-mono">{currentSlide + 1} / {totalPages}</span>
            <button onClick={() => setCurrentSlide(Math.min(totalPages - 1, currentSlide + 1))} disabled={currentSlide === totalPages - 1} className="text-white/60 hover:text-white disabled:opacity-20">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <span className="text-white/30 text-xs">{ALL_PAGES[currentSlide].name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Guidelines</h2>
          <p className="text-muted-foreground">{totalPages} pages — fully customizable</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCurrentSlide(0); setPresentationMode(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Present
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Page Grid Navigator */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {ALL_PAGES.map((page, i) => (
          <button
            key={page.id}
            onClick={() => {
              document.querySelector(`[data-page-id="${page.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted transition-colors whitespace-nowrap"
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* Pages */}
      <div className="space-y-6" data-guidelines-pages>
        {ALL_PAGES.map((page, i) => {
          const Page = page.component;
          return (
            <div key={page.id} data-guideline-page data-page-id={page.id} className="rounded-xl overflow-hidden shadow-lg border border-border">
              <Page brand={brand} pageNumber={i + 1} totalPages={totalPages} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
