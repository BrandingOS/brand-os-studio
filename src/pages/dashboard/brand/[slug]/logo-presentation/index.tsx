import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { LogoPresentationViewer } from '@/features/logo-presentation/components/LogoPresentationViewer';
import type { LogoPresentationData } from '@/features/logo-presentation/types';

export default function LogoPresentationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#141414] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="fixed inset-0 bg-[#141414] flex items-center justify-center text-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
          <button onClick={() => navigate(-1)} className="text-sm text-white/40 hover:text-white">Go back</button>
        </div>
      </div>
    );
  }

  // Build presentation data from brand
  const presentationData: LogoPresentationData = {
    brandName: brand.name,
    brandBrief: brand.guidelines?.strategy?.positioning || brand.strategy || `${brand.name} — building something meaningful.`,
    brandPersonality: brand.guidelines?.strategy?.personality?.slice(0, 4) || [brand.tone || 'Professional'],
    primaryColor: brand.primaryColor,
    clientName: brand.name,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    concepts: [
      {
        id: 'concept-a',
        name: 'The Prism',
        rationale: `A geometric mark that reflects ${brand.name}'s precision and clarity. The angular forms suggest structured thinking and systematic approach.`,
        logoUrl: `/brands/${slug}/concept-a.svg`,
        direction: 'Geometric & Angular',
        whyItWorks: [
          `Reflects ${brand.name}'s analytical, data-driven approach`,
          'Angular geometry conveys precision and structure',
          'Scalable from favicon to billboard',
          'Distinctive in the industry landscape',
        ],
        colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
      },
      {
        id: 'concept-b',
        name: 'The Signal',
        rationale: `A dynamic mark inspired by growth and momentum. The flowing forms capture ${brand.name}'s forward-thinking energy and upward trajectory.`,
        logoUrl: `/brands/${slug}/concept-b.svg`,
        direction: 'Dynamic & Growth-Oriented',
        whyItWorks: [
          'Communicates growth and forward momentum',
          'Fluid forms balance the brand\'s technical nature with humanity',
          'Memorable and distinctive silhouette',
          'Works across digital and print contexts',
        ],
        colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
      },
      {
        id: 'concept-c',
        name: 'The Grid',
        rationale: `A structured mark built on systematic precision. Every element is intentional, reflecting ${brand.name}'s commitment to measurable outcomes.`,
        logoUrl: `/brands/${slug}/concept-c.svg`,
        direction: 'Structured & Systematic',
        whyItWorks: [
          'Grid-based construction mirrors systematic thinking',
          'Clean geometry ensures readability at any size',
          'Timeless design that won\'t need updating',
          `Aligns with ${brand.name}'s positioning as an infrastructure partner`,
        ],
        colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
      },
    ],
  };

  // Use the actual brand logo if concept SVGs don't exist
  if (brand.logo) {
    presentationData.concepts.forEach(c => {
      // Check if concept SVG exists by attempting to load it
      // Fallback to brand logo
      const img = new Image();
      img.onerror = () => { c.logoUrl = brand.logo!; };
      img.src = c.logoUrl;
    });
  }

  return (
    <LogoPresentationViewer
      data={presentationData}
      onClose={() => navigate(`/dashboard/brand/${slug}`)}
    />
  );
}
