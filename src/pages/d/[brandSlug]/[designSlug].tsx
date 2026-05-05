// Phase 8.1 — Public design portal.
//
// Anonymous, read-only view of a saved design at
// /d/:brandSlug/:designSlug. Loads brand + design via the existing
// IBrandsService + IDesignStorage paths (LocalDesignStorage works
// out of the box; Supabase impl needs RLS allowing anon reads on
// design rows — tracked as Phase 8.2). Renders the document via the
// pure-CSS DocumentRenderer — no Fabric, no editor chrome.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';
import { DocumentRenderer } from '@/features/editor/render/DocumentRenderer';

export default function PublicDesignPage() {
  const { brandSlug, designSlug } = useParams<{
    brandSlug: string;
    designSlug: string;
  }>();
  const { brand, isLoading: brandLoading } = useBrandFromSlug(brandSlug);
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const brandKit = useBrandKit(brand);

  const [doc, setDoc] = useState<BrandOSDocument | null>(null);
  const [error, setError] = useState<'not-found' | 'parse-failed' | null>(null);
  const [docLoading, setDocLoading] = useState(true);

  useEffect(() => {
    if (!brand?.id || !designSlug) return;
    let cancelled = false;
    setDocLoading(true);
    setError(null);
    void (async () => {
      try {
        const raw = await designStorage.loadDesign(brand.id, designSlug);
        if (cancelled) return;
        if (!raw) {
          setError('not-found');
          return;
        }
        const parsed = BrandOSDocumentSchema.parse(raw);
        setDoc(parsed);
      } catch (err) {
        if (cancelled) return;
        console.error('[PublicDesignPage] load failed:', err);
        setError('parse-failed');
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand?.id, designSlug, designStorage]);

  if (brandLoading || (!brand && !brandSlug)) {
    return <Centered>Loading…</Centered>;
  }
  if (!brand) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Brand not found</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The link may be wrong, or this brand isn't public.
        </p>
      </Centered>
    );
  }
  if (docLoading) {
    return <Centered>Loading design…</Centered>;
  }
  if (error || !doc) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Design not available</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {error === 'not-found'
            ? "This design doesn't exist or hasn't been published."
            : 'Something went wrong loading this design.'}
        </p>
      </Centered>
    );
  }

  const designName = (doc.metadata?.name as string | undefined) ?? 'Untitled design';

  return (
    <div
      data-public-design-page
      data-brand-slug={brand.slug}
      data-design-id={doc.id}
      className="min-h-screen flex flex-col bg-muted/20"
    >
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3">
        {brandKit?.logos.primary?.url ? (
          <img
            src={brandKit.logos.primary.url}
            alt={brand.name}
            className="h-8 w-auto"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{brand.name}</h1>
          <p className="text-[11px] text-muted-foreground truncate">{designName}</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: 1080 }}>
          <DocumentRenderer doc={doc} brandKit={brandKit} fitToWidth={1080} />
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-border bg-background flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles size={12} />
        <span>Made with</span>
        <Link to="/" className="font-semibold text-foreground hover:underline">
          BrandOS
        </Link>
      </footer>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      {children}
    </div>
  );
}
