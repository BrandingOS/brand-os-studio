/**
 * BrandMockupStudioPage — Mode B: brand-aware editor.
 *
 * Routes:
 *   - `/b/:slug/tools/mockup-studio`
 *   - `/dashboard/brand/:slug/tools/mockup-studio` (legacy prefix)
 *
 * On mount we fetch the brand by slug, pass it through
 * `applyBrandKit(template, brand)`, and seed the editor with the result.
 * User can then override anything.
 */

import { Sparkles, Undo2, Redo2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SERVICE_KEYS, useService } from '@/core';
import type { IBrandsService, IMockupTemplatesService } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';

import { ExportButton } from '../../components/ExportButton';
import { MockupCanvas } from '../../components/MockupCanvas';
import { PropertiesSidebar } from '../../components/PropertiesSidebar';
import { TemplateGallery } from '../../components/TemplateGallery';
import type { TemplateMeta } from '../../engine/types';
import { useMockupStore } from '../../state/mockupStore';
import { useMockupTemplates } from '../../hooks/useMockupTemplates';
import { applyBrandKit } from './applyBrandKit';

export default function BrandMockupStudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const templateParam = params.get('template');

  const brandsService = useService<IBrandsService>(SERVICE_KEYS.BRANDS);
  const templatesService = useService<IMockupTemplatesService>(
    SERVICE_KEYS.MOCKUP_TEMPLATES,
  );
  const templates = useMockupTemplates(templatesService);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const loadTemplate = useMockupStore((s) => s.loadTemplate);
  const setMockupState = useMockupStore((s) => s.setState);
  const undo = useMockupStore((s) => s.undo);
  const redo = useMockupStore((s) => s.redo);
  const historyLen = useMockupStore((s) => s.history.length);
  const futureLen = useMockupStore((s) => s.future.length);

  // Fetch brand by slug.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    brandsService
      .getBySlug(slug)
      .then((b) => {
        if (cancelled) return;
        if (!b) {
          setBrandError(`Brand "${slug}" not found`);
        } else {
          setBrand(b);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setBrandError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug, brandsService]);

  // Seed with brand-kit on first template load (or when template switches).
  const seedFromBrand = (tpl: TemplateMeta) => {
    if (!brand) {
      loadTemplate(tpl);
      return;
    }
    const seeded = applyBrandKit(tpl, brand);
    loadTemplate(tpl);
    setMockupState(seeded);
  };

  // Auto-pick a template once both brand + template list are ready.
  useEffect(() => {
    if (!brand || templates.length === 0) return;
    if (template && template.id === templateParam) return;
    const target = templateParam
      ? templates.find((t) => t.id === templateParam) ?? templates[0]
      : templates[0];
    seedFromBrand(target);
    if (!templateParam) {
      setParams({ template: target.id }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, templates, templateParam]);

  const handlePick = (t: TemplateMeta) => {
    seedFromBrand(t);
    setParams({ template: t.id }, { replace: true });
  };

  const handleReapplyBrand = () => {
    if (!brand || !template) return;
    const seeded = applyBrandKit(template, brand);
    setMockupState(seeded);
    toast.success('Brand reapplied', {
      description: `${brand.name} overrides put back in place.`,
    });
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const activeId = useMemo(() => template?.id ?? null, [template]);

  if (brandError) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-border/60 bg-card p-6 text-center">
          <h2 className="text-lg font-semibold">Can't find that brand</h2>
          <p className="mt-2 text-sm text-muted-foreground">{brandError}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => navigate('/dashboard/brands')}
          >
            Go to brands
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            to={slug ? `/b/${slug}` : '/dashboard'}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← {brand?.name ?? 'Brand'}
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Mockup Studio
          </div>
          {template && (
            <span className="text-xs text-muted-foreground">
              · {template.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReapplyBrand}
            disabled={!brand || !template}
            className="h-8"
            title="Reapply brand kit"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reapply brand
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={historyLen === 0}
            onClick={undo}
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="h-8 w-8"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={futureLen === 0}
            onClick={redo}
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            className="h-8 w-8"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <ExportButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-border/60 bg-background">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Templates
            </h2>
            {brand && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Auto-filled with {brand.name}
              </p>
            )}
          </div>
          <TemplateGallery
            templates={templates}
            activeId={activeId}
            onPick={handlePick}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <MockupCanvas template={template} state={mockup} />
        </main>

        <PropertiesSidebar />
      </div>
    </div>
  );
}
