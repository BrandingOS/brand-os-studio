/**
 * Assets — Stage 7 landing page.
 *
 * The Assets section will be a categorized hub (Print, Social, Screen,
 * Utility) over the brandkit deliverable modules. See
 * docs/ux-redesign/ARCHITECTURE.md §3.1.
 *
 * Stage 7 (this commit): cards grouped by category, linking to existing
 * brandkit modules. Stage 9 will flesh this out with previews and inline
 * generation flows.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import {
  CreditCard,
  RectangleHorizontal,
  Square,
  Smartphone,
  Presentation,
  Play,
  QrCode,
  FileText,
  Monitor,
  PenTool,
  Share2,
  FolderOpen,
} from 'lucide-react';

interface AssetCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  accent: string;
}

interface AssetCategory {
  label: string;
  cards: AssetCard[];
}

const categories: AssetCategory[] = [
  {
    label: 'Print',
    cards: [
      {
        title: 'Business Cards',
        description: 'Print-ready business card templates.',
        icon: CreditCard,
        path: 'brandkit/business-cards',
        accent: 'from-indigo-500 to-blue-600',
      },
      {
        title: 'Invoices',
        description: 'Branded invoice templates.',
        icon: FileText,
        path: 'brandkit/invoices',
        accent: 'from-slate-500 to-gray-700',
      },
    ],
  },
  {
    label: 'Social',
    cards: [
      {
        title: 'Instagram Posts',
        description: 'Square post templates with brand colors.',
        icon: Square,
        path: 'brandkit/instagram-posts',
        accent: 'from-teal-400 to-cyan-500',
      },
      {
        title: 'Instagram Stories',
        description: 'Vertical story templates.',
        icon: Smartphone,
        path: 'brandkit/instagram-stories',
        accent: 'from-pink-500 to-rose-600',
      },
      {
        title: 'Facebook Covers',
        description: 'Page cover image templates.',
        icon: RectangleHorizontal,
        path: 'brandkit/facebook-covers',
        accent: 'from-blue-500 to-indigo-600',
      },
      {
        title: 'Social Media Hub',
        description: 'Cross-platform post manager.',
        icon: Share2,
        path: 'social-media',
        accent: 'from-violet-500 to-purple-600',
      },
    ],
  },
  {
    label: 'Screen',
    cards: [
      {
        title: 'Presentations',
        description: 'Branded slide decks.',
        icon: Presentation,
        path: 'presentations',
        accent: 'from-purple-500 to-violet-600',
      },
      {
        title: 'Mockup Designs',
        description: 'Device & product mockups.',
        icon: Monitor,
        path: 'brandkit/mockups',
        accent: 'from-emerald-500 to-teal-600',
      },
      {
        title: 'Animations',
        description: 'Animated logo & loop templates.',
        icon: Play,
        path: 'brandkit/animations',
        accent: 'from-orange-500 to-amber-500',
      },
      {
        title: 'Design Tool',
        description: 'Free-form canvas editor.',
        icon: PenTool,
        path: 'brandkit/design-tool',
        accent: 'from-fuchsia-500 to-pink-600',
      },
    ],
  },
  {
    label: 'Utility',
    cards: [
      {
        title: 'QR Code',
        description: 'Brand-styled QR generator.',
        icon: QrCode,
        path: 'brandkit/qr-code',
        accent: 'from-blue-400 to-blue-600',
      },
      {
        title: 'Brand Assets',
        description: 'Upload & manage files.',
        icon: FolderOpen,
        path: 'brandkit/assets',
        accent: 'from-emerald-500 to-teal-600',
      },
    ],
  },
];

export default function AssetsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <BrandLayout brandName="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand.name}>
      <div className="space-y-10">
        <PageHeader
          breadcrumb={[
            { label: 'Brands', to: '/dashboard/brands' },
            { label: brand.name, to: `/dashboard/brand/${slug}` },
          ]}
          title="Assets"
          subtitle="Generated deliverables built from your brand identity — print, social, screen, and utility."
        />

        {categories.map((category) => (
          <section key={category.label} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {category.cards.map((card) => (
                <Card
                  key={card.path}
                  onClick={() => navigate(`/dashboard/brand/${slug}/${card.path}`)}
                  className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <div
                    className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${card.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
                  />
                  <div
                    className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-3`}
                  >
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="relative text-base font-semibold mb-1">{card.title}</h3>
                  <p className="relative text-xs text-muted-foreground">{card.description}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </BrandLayout>
  );
}
