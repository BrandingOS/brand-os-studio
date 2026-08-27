/**
 * Public Bento view — read-only.
 *
 * Unauthenticated route. For v1 this is a stub: it attempts to load the
 * brand and, if the brand has a `bentos` array with the matching id, it
 * renders that design via BentoCanvas in read-only mode. If not, it
 * shows a friendly empty state inviting the owner to publish a bento.
 *
 * This is intentionally minimal — the full "social media for brands"
 * feed hooks onto the same data shape (`brand.bentos[]`) when that
 * phase lands.
 */
import { useParams, Link } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBentoStore } from '@/features/bento/store';
import { BentoCanvas } from '@/features/bento/components/BentoCanvas';
import { useEffect } from 'react';

export default function PublicBentoPage() {
  const { slug, bentoId } = useParams<{ slug: string; bentoId: string }>();
  const { brand } = useBrandBySlug(slug);

  // Bentos are stored on the brand (optional field) — the editor
  // writes there when the user hits Save. Missing for now in v1 data,
  // which is why we also render an empty-state.
  const bentos = ((brand as unknown as { bentos?: Array<{ id: string; isPublic?: boolean; design: unknown }> })?.bentos) ?? [];
  const entry = bentos.find((b) => b.id === bentoId && b.isPublic !== false);

  const init = useBentoStore((s) => s.init);
  useEffect(() => {
    if (entry?.design) {
      init(brand, entry.design as Parameters<typeof init>[1]);
    }
  }, [entry, brand, init]);

  const design = useBentoStore((s) => s.design);

  if (!brand) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Brand not found</div>
          <Link to="/" className="text-sm text-primary underline">Back to BrandingOS</Link>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-3xl font-bold tracking-tight">{brand.name}</div>
          <div className="text-muted-foreground">
            This brand hasn't published a bento yet.
          </div>
          <Link to="/" className="inline-block text-sm text-primary underline">Visit BrandingOS</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <header className="h-12 shrink-0 border-b flex items-center justify-between px-4">
        <div className="font-semibold text-sm">{brand.name}</div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Made with BrandingOS</Link>
      </header>
      <BentoCanvas
        design={design}
        brand={brand}
        selectedTileId={null}
        onSelectTile={() => {}}
        onImageDropped={() => {}}
        interactive={false}
      />
    </div>
  );
}
