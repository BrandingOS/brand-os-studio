/**
 * Presentations Page — Documents pattern.
 *
 * Each generated presentation becomes a saved DOCUMENT (not edits to the
 * template/brand). User flow:
 *  1. List view shows all saved presentations for this brand
 *  2. "Create new" → TemplatePicker → creates a new doc → opens editor
 *  3. Click any saved doc → opens it in the editor
 *  4. Reload → returns directly to the active doc
 *  5. Edits update the doc only — never the brand or the template
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock } from 'lucide-react';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { TemplatePicker } from '@/shared/presentation/TemplatePicker';
import { buildTemplateSlides, type ContentType, CONTENT_TYPES } from '@/shared/presentation/templates';
import { PRESENTATION_STYLES, getStyleById, getStyleSpacingDefaults } from '@/shared/presentation/styles';
import { createPresentationStore } from '@/shared/presentation/store';
import { usePresentationDocsStore, type PresentationDocument } from '@/shared/presentation/presentationDocsStore';
import { buildExtraSlides } from '@/shared/presentation/buildExtraSlides';
import { AddSlidePanel } from '@/shared/presentation/AddSlidePanel';
import { toast } from 'sonner';

const usePresentationSettingsStore = createPresentationStore('presentations-settings', {
  spacing: { padding: 0, margins: 0, cornerRadius: 0 },
  header: { enabled: false, showDate: false, showProjectName: false },
  footer: { enabled: false, showPageNumbers: false },
});

export default function PresentationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const docsStore = usePresentationDocsStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);

  const docId = searchParams.get('doc');
  const docs = brand ? docsStore.docs[brand.id] || [] : [];
  const activeDoc = useMemo(() => {
    if (!brand || !docId) return null;
    return docs.find((d) => d.id === docId) || null;
  }, [brand, docId, docs]);

  // Auto-restore the last-active doc on mount if URL doesn't already have one
  useEffect(() => {
    if (!brand || docId) return;
    const lastActiveId = docsStore.activeDocId[brand.id];
    if (lastActiveId && docs.find((d) => d.id === lastActiveId)) {
      setSearchParams({ doc: lastActiveId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, docs.length]);

  // ── Loading / error ──
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#111] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="fixed inset-0 bg-[#111] flex items-center justify-center text-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
          <button onClick={() => navigate(-1)} className="text-sm text-white/40 hover:text-white">Go back</button>
        </div>
      </div>
    );
  }

  // ── Template picker (creating a new document) ──
  if (showPicker) {
    return (
      <TemplatePicker
        brandName={brand.name}
        brandColor={brand.primaryColor}
        onSelect={(styleId, contentType) => {
          // Create a new document
          const ct = CONTENT_TYPES.find((c) => c.id === contentType);
          const name = ct ? `${ct.name} ${docs.length + 1}` : 'Untitled';
          const newDoc = docsStore.create(brand.id, styleId, contentType, name);
          // Sync settings store to the chosen style
          const style = getStyleById(styleId);
          const defaults = getStyleSpacingDefaults(style);
          const settingsStore = usePresentationSettingsStore.getState();
          settingsStore.setTemplate(styleId);
          settingsStore.updateSpacing(defaults);
          // Open the editor for the new doc
          setSearchParams({ doc: newDoc.id });
          setShowPicker(false);
          toast.success('Presentation created');
        }}
        onClose={() => setShowPicker(false)}
      />
    );
  }

  // ── Documents list view (no active doc) ──
  if (!activeDoc) {
    return (
      <div className="fixed inset-0 bg-[#0c0c0c] flex flex-col text-white">
        {/* Top bar */}
        <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/dashboard/brand/${slug}`)} className="text-sm text-white/30 hover:text-white/60 transition-colors">
              ← Back
            </button>
            <span className="text-white/10">|</span>
            <span className="text-sm text-white/60 font-semibold">{brand.name}</span>
            <span className="text-[10px] text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full">Presentations</span>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-white/90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Presentation
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {docs.length === 0 ? (
            <div className="max-w-md mx-auto mt-32 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-white/30" />
              </div>
              <h2 className="text-lg font-semibold text-white/80">No presentations yet</h2>
              <p className="text-xs text-white/30 mt-2 leading-relaxed">
                Create your first presentation from a style template. Each presentation is saved separately so you can edit it freely.
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create First Presentation
              </button>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white/90">Your Presentations</h1>
                <p className="text-xs text-white/30 mt-1">{docs.length} saved · click any to open in editor</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onOpen={() => setSearchParams({ doc: doc.id })}
                    onDelete={() => {
                      if (confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                        docsStore.remove(brand.id, doc.id);
                        toast.success('Deleted');
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Editor view (active doc loaded) ──
  // Build slides: auto-generated (filtered by hidden) + extras
  const baseSlides = buildTemplateSlides(brand, activeDoc.styleId, activeDoc.contentType, activeDoc.slideOverrides as any);
  const visibleBase = baseSlides.filter((s) => !(activeDoc.hiddenSlideIds || []).includes(s.id));
  const style = getStyleById(activeDoc.styleId);
  const extras = buildExtraSlides(activeDoc.extraSlides || [], style);
  const slides = [...visibleBase, ...extras];

  const styleTemplates = PRESENTATION_STYLES.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  return (
    <>
      <EditorWorkspace
        brand={brand}
        slides={slides}
        onClose={() => {
          // Mark no active doc and return to list
          docsStore.setActive(brand.id, null);
          setSearchParams({});
        }}
        useSettingsStore={usePresentationSettingsStore}
        templates={styleTemplates}
        customizerTitle={activeDoc.name}
        editorKey={`pres-doc-${activeDoc.id}`}
        onTemplateChange={(styleId) => {
          docsStore.updateStyle(brand.id, activeDoc.id, styleId);
        }}
        onOpenTemplatePicker={() => setShowPicker(true)}
        onAddSlide={() => setShowAddSlide(true)}
        onDeleteSlide={(slideId) => {
          // Extras get fully removed; auto-generated slides get hidden
          if ((activeDoc.extraSlides || []).some((e) => e.id === slideId)) {
            docsStore.removeExtraSlide(brand.id, activeDoc.id, slideId);
          } else {
            docsStore.hideSlide(brand.id, activeDoc.id, slideId);
          }
          toast.success('Slide removed');
        }}
      />
      {showAddSlide && (
        <AddSlidePanel
          onAdd={(layout) => {
            docsStore.addExtraSlide(brand.id, activeDoc.id, layout);
            toast.success('Slide added');
          }}
          onClose={() => setShowAddSlide(false)}
        />
      )}
    </>
  );
}

// ── Document card ──

function DocCard({ doc, onOpen, onDelete }: { doc: PresentationDocument; onOpen: () => void; onDelete: () => void }) {
  const style = getStyleById(doc.styleId);
  const ct = CONTENT_TYPES.find((c) => c.id === doc.contentType);
  return (
    <div
      onClick={onOpen}
      className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] cursor-pointer transition-all overflow-hidden"
    >
      {/* Preview swatch using the style's preview gradient */}
      <div
        className="aspect-video w-full"
        style={{ background: style.preview, borderRadius: `${Math.min(style.cornerRadius, 12)}px ${Math.min(style.cornerRadius, 12)}px 0 0` }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white/85 truncate">{doc.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/40">{style.name}</span>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/40">{ct?.name || doc.contentType}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-white/25">
              <Clock className="w-2.5 h-2.5" />
              {formatRelative(doc.updatedAt)}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
