// DesignTemplateGallery — brand-scoped templates section on the
// Design landing page.
//
// Reads ITemplatesService for categories + templates and renders a
// chip filter + 3-column grid with real thumbnails. Click → seed
// brand-bound doc (mirrors TemplatesPanel.openTemplate) → navigate
// to the unified editor.
//
// Behavior parity with TemplatesPanel.openTemplate:
//   • SlotRefs resolved against the active BrandKit before save
//   • new uuid for the persisted design (template stays untouched)
//   • IDesignStorage meta hydrated for the My Designs grid
//   • incrementUseCount fires after a successful save
//
// Empty / loading / error states are inline so the section never
// disappears when service responses are slow or sparse.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core/types/services';
import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type { Template, TemplateCategory } from '@/features/templates/types';
import { applyBrandToDocument } from '@/features/editor/brand/applyBrandToDocument';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';

interface Props {
  brand: Brand;
  templates: ITemplatesService;
  designStorage: IDesignStorage;
}

const ALL_FILTER_ID = '__all__';
const VISIBLE_LIMIT = 12;

export function DesignTemplateGallery({ brand, templates, designStorage }: Props) {
  const navigate = useNavigate();
  const brandKit = useBrandKit(brand);

  const [categories, setCategories] = useState<TemplateCategory[] | null>(null);
  const [items, setItems] = useState<Template[] | null>(null);
  const [activeCat, setActiveCat] = useState<string>(ALL_FILTER_ID);
  const [opening, setOpening] = useState<string | null>(null);

  // Load categories once; load templates whenever the active filter changes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await templates.listCategories();
        if (!cancelled) setCategories(cats);
      } catch (err) {
        console.error('[DesignTemplateGallery] listCategories failed:', err);
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templates]);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    void (async () => {
      try {
        const list = await templates.listTemplates({
          categoryId: activeCat === ALL_FILTER_ID ? undefined : activeCat,
          visibility: 'public',
          sort: 'useCount-desc',
          limit: VISIBLE_LIMIT,
        });
        if (!cancelled) setItems(list);
      } catch (err) {
        console.error('[DesignTemplateGallery] listTemplates failed:', err);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templates, activeCat]);

  const onOpenTemplate = useCallback(
    async (template: Template) => {
      if (opening) return;
      if (!template.document) {
        toast('Coming soon', {
          description: 'This is an AI-generated preview — the editable template lands in a follow-up.',
        });
        return;
      }
      setOpening(template.id);
      try {
        const seeded = brandKit
          ? applyBrandToDocument(template.document, brandKit, { mode: 'apply' })
          : template.document;
        const newDesignId = crypto.randomUUID();
        const next = { ...seeded, id: newDesignId };
        await designStorage.saveDesign(brand.id, newDesignId, next, {
          id: newDesignId,
          name: template.name,
          thumbnailUrl: template.thumbnailUrl,
          contentType: next.contentType,
          width: next.pages[0]?.width,
          height: next.pages[0]?.height,
          sourceTemplateId: template.id,
        });
        void templates.incrementUseCount(template.id);
        navigate(`/b/${brand.slug}/design/${newDesignId}`);
      } catch (err) {
        console.error('[DesignTemplateGallery] open failed:', err);
        toast.error('Could not open template — please try again.');
        setOpening(null);
      }
    },
    [opening, brandKit, brand, designStorage, templates, navigate],
  );

  const sortedCats = useMemo(
    () => (categories ? [...categories].sort((a, b) => a.displayOrder - b.displayOrder) : []),
    [categories],
  );

  return (
    <section className="dh-section" aria-labelledby="dh-templates-title">
      <header className="dh-section-head">
        <div>
          <h2 id="dh-templates-title" className="dh-section-title">
            Templates for {brand.name}
          </h2>
          <p className="dh-section-sub">
            Curated, brand-bound. Click to open with your colors and type baked in.
          </p>
        </div>
        <button
          type="button"
          className="dh-section-link"
          onClick={() => navigate(`/b/${brand.slug}/templates`)}
        >
          Browse all <ArrowRight size={13} aria-hidden />
        </button>
      </header>

      <div className="dh-cat-chips" role="tablist" aria-label="Template categories">
        <CategoryChip
          label="All"
          active={activeCat === ALL_FILTER_ID}
          onClick={() => setActiveCat(ALL_FILTER_ID)}
        />
        {sortedCats.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
          />
        ))}
      </div>

      {items === null ? (
        <div className="dh-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="dh-tpl dh-tpl--skeleton" aria-hidden>
              <span className="dh-tpl-thumb dh-tpl-thumb--skeleton" />
              <span className="dh-tpl-meta dh-tpl-meta--skeleton" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="dh-empty">
          <ImageOff size={20} aria-hidden />
          <p className="dh-empty-title">No templates in this category yet.</p>
          <p className="dh-empty-sub">
            Try a different category, or browse the full library.
          </p>
        </div>
      ) : (
        <div className="dh-grid">
          {items.map((tpl) => {
            const aspect = tpl.width && tpl.height ? tpl.width / tpl.height : 1;
            return (
              <button
                key={tpl.id}
                type="button"
                className="dh-tpl"
                onClick={() => void onOpenTemplate(tpl)}
                disabled={opening === tpl.id}
                aria-label={`Open template "${tpl.name}"`}
                data-template-id={tpl.id}
              >
                <span
                  className="dh-tpl-thumb"
                  style={{ aspectRatio: `${aspect}` }}
                >
                  {tpl.thumbnailUrl ? (
                    <img
                      src={tpl.thumbnailUrl}
                      alt=""
                      className="dh-tpl-img"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={20} aria-hidden />
                  )}
                  {opening === tpl.id ? (
                    <span className="dh-tpl-loading" aria-hidden>
                      <span className="dh-tpl-spinner" />
                    </span>
                  ) : null}
                </span>
                <span className="dh-tpl-meta">
                  <span className="dh-tpl-name">{tpl.name}</span>
                  {tpl.mood ? (
                    <span className="dh-tpl-mood">{tpl.mood}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? 'dh-cat-chip dh-cat-chip--active' : 'dh-cat-chip'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default DesignTemplateGallery;
