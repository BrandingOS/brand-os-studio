// Phase B port — Settings mounted at /b/:slug/settings (Studio).
//
// BrandSettingsV2Page wraps itself in BrandLayout (legacy chrome). For
// Studio we render its content (BrandSettingsHub) directly inside
// StudioBrandShell so we get cosmos chrome AND the BrandSettingsProvider
// the hub needs.
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { BrandSettingsHub } from '@/features/brand-kit-alt/BrandSettingsHub';
import { StudioBrandShell } from './_studioBrandShell';

export default function StudioSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();

  useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  return (
    <StudioBrandShell>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          eyebrow="Brand Hub"
          title="Brand Settings"
          subtitle="The single source of truth — every change here updates every asset, every page, every export."
          breadcrumb={[
            { label: 'Brand Kit', to: `/b/${slug}/brand-kit` },
            { label: 'Settings' },
          ]}
          actions={
            <Link
              to={`/b/${slug}/brand-kit#settings`}
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
                  Editing the canonical brand for {current.name}. Same source as
                  the Brand Kit settings panel; changes propagate everywhere.
                </p>
              </div>
            </div>
            <BrandSettingsHub />
          </div>
        )}
      </div>
    </StudioBrandShell>
  );
}
