/**
 * BrandSettingsPage — standalone page that mounts the canonical
 * BrandSettingsHub. Same component as the one inside the Brand Kit page,
 * so editing here propagates everywhere.
 *
 * Mounted at /b/:slug/settings (and /dashboard/brand/:slug/settings).
 */
import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { BrandSettingsHub } from './BrandSettingsHub';

export default function BrandSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  return (
    <BrandLayout maxWidth="6xl">
      <PageHeader
        eyebrow="Brand Hub"
        title="Brand Settings"
        subtitle="The single source of truth — every change here updates every asset, every page, every export."
        breadcrumb={[
          { label: 'Brand Kit', to: `/b/${slug}/kit` },
          { label: 'Settings' },
        ]}
        actions={
          <Link
            to={`/b/${slug}/kit#settings`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Brand Kit
          </Link>
        }
      />

      {current && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <p className="text-xs text-foreground">
                This is the <strong>main hub</strong> for {current.name}. The same form is embedded inside the Brand Kit page and is
                wired to every other surface — Identity tabs, public portal, brand assistant, exports, brand guide PDF.
                One place. One source of truth.
              </p>
            </div>
          </div>
          <BrandSettingsHub />
        </div>
      )}
    </BrandLayout>
  );
}
