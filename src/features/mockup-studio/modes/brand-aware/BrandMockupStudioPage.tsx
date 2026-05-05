/**
 * BrandMockupStudioPage — Mode B: brand-aware editor.
 *
 * Routes:
 *   - `/b/:slug/tools/mockup-studio`
 *   - `/dashboard/brand/:slug/tools/mockup-studio` (legacy prefix)
 *
 * On mount we fetch the brand by slug, pass it through
 * `applyBrandKit(template, brand)`, and seed the editor with the result.
 *
 * Shares the exact same chrome as the standalone page (cosmos shell +
 * 3-col `ms-shell` grid). The cosmos shell auto-detects `/b/:slug/*` and
 * swaps the top-left BrandOS mark for a BrandSwitcher, so brand context
 * comes for free.
 */

import { RefreshCw, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SERVICE_KEYS, useService } from '@/core';
import type { IBrandsService, IMockupTemplatesService } from '@/core/types/services';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import type { Brand } from '@/shared/types/brand';

import { ExportButton } from '../../components/ExportButton';
import { MockupCanvas } from '../../components/MockupCanvas';
import { PropertiesSidebar } from '../../components/PropertiesSidebar';
import { TemplateGallery } from '../../components/TemplateGallery';
import type { TemplateMeta } from '../../engine/types';
import { useMockupStore } from '../../state/mockupStore';
import { useMockupTemplates } from '../../hooks/useMockupTemplates';
import { applyBrandKit } from './applyBrandKit';
import '../standalone/mockup-studio.css';

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
  const replaceMockupState = useMockupStore((s) => s.replaceState);
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
    replaceMockupState(seeded);
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
    replaceMockupState(seeded);
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
      <WorkspaceShell>
        <div className="ms-shell" style={{ gridTemplateColumns: '1fr', placeItems: 'center' }}>
          <div className="panel" style={{ padding: 24, maxWidth: 420, textAlign: 'center' }}>
            <h2 className="panel-heading-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Can't find that brand
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              {brandError}
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard/brands')}>
              Go to brands
            </Button>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      rightActions={
        <button
          type="button"
          className="ms-pill-btn ms-pill-btn--ghost"
          onClick={handleReapplyBrand}
          disabled={!brand || !template}
          title="Reapply brand kit"
        >
          <RefreshCw size={13} />
          <span>Reapply brand</span>
        </button>
      }
    >
      <div className="ms-shell">
        <aside className="panel ms-panel" aria-label="Templates">
          <div className="panel-top">
            <div className="panel-heading">
              <span className="panel-heading-eyebrow">Mockup Studio</span>
              <h1 className="panel-heading-title">Pick a template</h1>
            </div>
            <p className="ms-panel-blurb">
              {brand
                ? `Auto-filled with ${brand.name}'s kit. Swap any zone freely.`
                : 'Drop your design onto a real product photo. Surface masks, lighting and displacement bake in automatically.'}
            </p>
          </div>
          <div className="panel-list ms-template-list">
            <TemplateGallery
              templates={templates}
              activeId={activeId}
              onPick={handlePick}
            />
          </div>
        </aside>

        <main className="ms-board">
          <div className="ms-board-toolbar">
            <div className="ms-board-toolbar-meta">
              <span className="panel-heading-eyebrow">Active</span>
              <span className="ms-board-toolbar-name">
                {template?.name ?? 'No template selected'}
              </span>
            </div>
            <div className="ms-board-toolbar-actions">
              <button
                type="button"
                className="ms-icon-btn"
                disabled={historyLen === 0}
                onClick={undo}
                aria-label="Undo"
                title="Undo (⌘Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                disabled={futureLen === 0}
                onClick={redo}
                aria-label="Redo"
                title="Redo (⇧⌘Z)"
              >
                <Redo2 size={14} />
              </button>
              <span className="ms-toolbar-divider" aria-hidden />
              <ExportButton />
            </div>
          </div>
          <div className="ms-board-canvas">
            <MockupCanvas template={template} state={mockup} />
          </div>
        </main>

        <PropertiesSidebar />
      </div>
    </WorkspaceShell>
  );
}
