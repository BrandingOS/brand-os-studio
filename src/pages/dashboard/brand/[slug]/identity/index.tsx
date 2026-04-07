/**
 * Identity — Stage 7 landing page.
 *
 * The Identity section will be a tabbed page (Logo, Colors, Typography,
 * Voice, Strategy) that absorbs the legacy Edit page and the identity-bearing
 * brandkit modules. See docs/ux-redesign/ARCHITECTURE.md §3.1.
 *
 * Stage 7 (this commit): a hub that links to all the existing identity-bearing
 * pages, so the new sidebar item lands somewhere useful.
 *
 * Stage 8 (next): replace this with a real tabbed page that mounts each
 * identity module inline.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import {
  Edit,
  Palette,
  Type,
  MessageCircle,
  Target,
  Image as ImageIcon,
  CircleUser,
} from 'lucide-react';

interface IdentityCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  accent: string;
}

const identityCards: IdentityCard[] = [
  {
    title: 'Logo',
    description: 'Upload, manage, and download your logo variants.',
    icon: ImageIcon,
    path: 'brandkit/logo-files',
    accent: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Profile Icons',
    description: 'Generate icons for social profiles and favicons.',
    icon: CircleUser,
    path: 'brandkit/profile-icons',
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    title: 'Colors',
    description: 'Palette, harmonies, contrast, and accessibility checks.',
    icon: Palette,
    path: 'brandkit/color-system',
    accent: 'from-rose-500 to-pink-600',
  },
  {
    title: 'Typography',
    description: 'Font pairings, scale, and hierarchy.',
    icon: Type,
    path: 'brandkit/typography',
    accent: 'from-gray-700 to-gray-900',
  },
  {
    title: 'Voice',
    description: 'Tone, messaging, and writing rules.',
    icon: MessageCircle,
    path: 'brandkit/brand-voice',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Strategy',
    description: 'Mission, vision, and values.',
    icon: Target,
    path: 'brandkit/brand-strategy',
    accent: 'from-blue-600 to-indigo-600',
  },
  {
    title: 'Edit basics',
    description: 'Brand name, tone, and the legacy edit form.',
    icon: Edit,
    path: 'edit',
    accent: 'from-violet-500 to-purple-600',
  },
];

export default function IdentityPage() {
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
      <div className="space-y-8">
        <PageHeader
          breadcrumb={[
            { label: 'Brands', to: '/dashboard/brands' },
            { label: brand.name, to: `/dashboard/brand/${slug}` },
          ]}
          title="Identity"
          subtitle="Everything that makes this brand recognizable — logo, colors, type, voice, and strategy."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {identityCards.map((card) => (
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
              <p className="relative text-sm text-muted-foreground">{card.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </BrandLayout>
  );
}
