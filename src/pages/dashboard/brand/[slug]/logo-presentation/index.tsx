/**
 * Logo Presentation Page — documents pattern.
 *
 * Three views, controlled by URL query params:
 *   1. List view (no params) — shows all saved logo presentations for this brand
 *   2. Setup view (?new=1 or ?edit={docId}) — configure concepts before generating
 *   3. Editor view (?doc={docId}) — full editor for an existing document
 *
 * Each generated logo presentation is its own DOCUMENT (independent of the
 * brand and the template). Picking a template never edits the template —
 * it creates a new document the user owns.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock, Pencil, Copy } from 'lucide-react';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { LogoPresentationSetup, type LogoPresentationDraft } from '@/features/logo-presentation/components/LogoPresentationSetup';
import { LogoConceptInspector } from '@/features/logo-presentation/components/LogoConceptInspector';
import { buildLogoSlides } from '@/features/logo-presentation/buildLogoSlides';
import { buildSimpleLogoSlides } from '@/features/logo-presentation/buildSimpleLogoSlides';
import { useLogoPresentationStore, LOGO_PRESENTATION_TEMPLATES } from '@/features/logo-presentation/store';
import { useLogoPresentationDocsStore, type LogoPresentationDoc } from '@/features/logo-presentation/docsStore';
import { buildExtraSlides } from '@/shared/presentation/buildExtraSlides';
import { AddSlidePanel } from '@/shared/presentation/AddSlidePanel';
import { getStyleById } from '@/shared/presentation/styles';
import type { LogoPresentationData, LogoConcept } from '@/features/logo-presentation/types';
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { toast } from 'sonner';

/**
 * Build a fully-resolved LogoPresentationData object from a doc + brand context.
 * This is what feeds into the slide builders.
 */
function buildPresentationData(brand: Brand, doc: LogoPresentationDoc): LogoPresentationData {
  const filledConcepts: LogoConcept[] = doc.concepts.map(c => ({
    ...c,
    logoUrl: c.logoUrl || logoUrl(brand) || '',
    rationale: c.rationale || `A distinctive mark that captures ${brand.name}'s identity.`,
    whyItWorks: c.whyItWorks.filter(Boolean).length > 0
      ? c.whyItWorks.filter(Boolean)
      : ['Distinctive and memorable', 'Scalable across applications', 'Aligned with brand positioning'],
  }));

  return {
    brandName: brand.name,
    brandBrief: doc.brief || `${brand.name} - building something meaningful.`,
    brandPersonality: doc.personality.split(',').map(s => s.trim()).filter(Boolean),
    primaryColor: brand.primaryColor,
    clientName: doc.clientName || undefined,
    concepts: filledConcepts,
    template: doc.template,
    designGoals: brand.guidelines?.strategy?.values || ['Modern and distinctive', 'Clean and scalable', 'Unique but timeless'],
    keywords: brand.guidelines?.strategy?.personality || ['geometric', 'minimal', 'innovative'],
    version: 'v1',
  };
}

export default function LogoPresentationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const docsStore = useLogoPresentationDocsStore();
  const docs = brand ? docsStore.docs[brand.id] || [] : [];
  const [showAddSlide, setShowAddSlide] = useState(false);

  const docIdParam = searchParams.get('doc');
  const newParam = searchParams.get('new');
  const editParam = searchParams.get('edit');

  // Active doc for editor view
  const activeDoc = useMemo(() => {
    if (!brand || !docIdParam) return null;
    return docs.find((d) => d.id === docIdParam) || null;
  }, [brand, docIdParam, docs]);

  // Doc being edited in setup (when ?edit={docId})
  const editingDoc = useMemo(() => {
    if (!brand || !editParam) return null;
    return docs.find((d) => d.id === editParam) || null;
  }, [brand, editParam, docs]);

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

  // ── Setup view (new doc or editing existing) ──
  if (newParam || editingDoc) {
    const initialDraft: LogoPresentationDraft | undefined = editingDoc ? {
      concepts: editingDoc.concepts,
      brief: editingDoc.brief,
      personality: editingDoc.personality,
      clientName: editingDoc.clientName,
      template: editingDoc.template,
    } : undefined;

    return (
      <LogoPresentationSetup
        brand={brand}
        initialDraft={initialDraft}
        title={editingDoc ? `Edit Setup — ${editingDoc.name}` : 'New Logo Presentation'}
        onClose={() => setSearchParams({})}
        onDraftChange={editingDoc ? (draft) => {
          // Live-sync edits to the existing doc
          docsStore.update(brand.id, editingDoc.id, {
            concepts: draft.concepts,
            brief: draft.brief,
            personality: draft.personality,
            clientName: draft.clientName,
            template: draft.template,
          });
        } : undefined}
        onStart={(_data, draft) => {
          if (editingDoc) {
            // Update the existing doc with new draft data
            docsStore.update(brand.id, editingDoc.id, {
              concepts: draft.concepts,
              brief: draft.brief,
              personality: draft.personality,
              clientName: draft.clientName,
              template: draft.template,
            });
            // Open the editor for this doc
            setSearchParams({ doc: editingDoc.id });
            toast.success('Setup updated');
          } else {
            // Create a new doc
            const name = `Logo Presentation ${docs.length + 1}`;
            const newDoc = docsStore.create(brand.id, {
              name,
              concepts: draft.concepts,
              brief: draft.brief,
              personality: draft.personality,
              clientName: draft.clientName,
              template: draft.template,
            });
            setSearchParams({ doc: newDoc.id });
            toast.success('Logo presentation created');
          }
        }}
      />
    );
  }

  // ── Editor view (active doc loaded) ──
  if (activeDoc) {
    const presentationData = buildPresentationData(brand, activeDoc);
    const baseSlides = activeDoc.template === 'simple'
      ? buildSimpleLogoSlides(presentationData)
      : buildLogoSlides(presentationData);

    const visibleBase = baseSlides.filter((s) => !(activeDoc.hiddenSlideIds || []).includes(s.id));
    // Use the brand's primary color via the minimal style (extras follow brand colors)
    const extraStyle = getStyleById('minimal');
    const extras = buildExtraSlides(activeDoc.extraSlides || [], extraStyle);
    const slides = [...visibleBase, ...extras];

    return (
      <>
        <EditorWorkspace
          brand={brand}
          slides={slides}
          onClose={() => {
            docsStore.setActive(brand.id, null);
            setSearchParams({});
          }}
          useSettingsStore={useLogoPresentationStore}
          templates={LOGO_PRESENTATION_TEMPLATES}
          customizerTitle={activeDoc.name}
          editorKey={`logo-pres-doc-${activeDoc.id}`}
          onTemplateChange={(templateId) => {
            docsStore.update(brand.id, activeDoc.id, { template: templateId as 'premium' | 'simple' });
          }}
          inspectorLabel="Edit Concept"
          inspectorPanel={(slideId, close) => (
            <LogoConceptInspector
              brand={brand}
              docId={activeDoc.id}
              currentSlideId={slideId}
              onClose={close}
            />
          )}
          onAddSlide={() => setShowAddSlide(true)}
          onDeleteSlide={(slideId) => {
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

  // ── List view ──
  return (
    <div className="fixed inset-0 bg-[#0c0c0c] flex flex-col text-white">
      {/* Top bar */}
      <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/b/${slug}`)} className="text-sm text-white/30 hover:text-white/60 transition-colors">
            ← Back
          </button>
          <span className="text-white/10">|</span>
          <span className="text-sm text-white/60 font-semibold">{brand.name}</span>
          <span className="text-[10px] text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full">Logo Presentations</span>
        </div>
        <button
          onClick={() => setSearchParams({ new: '1' })}
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
            <h2 className="text-lg font-semibold text-white/80">No logo presentations yet</h2>
            <p className="text-xs text-white/30 mt-2 leading-relaxed">
              Create your first presentation. You will configure your concepts, generate the deck, then edit anything you want — all changes save to this presentation only, never to your brand.
            </p>
            <button
              onClick={() => setSearchParams({ new: '1' })}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-black bg-white hover:bg-white/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create First Presentation
            </button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white/90">Your Logo Presentations</h1>
              <p className="text-xs text-white/30 mt-1">{docs.length} saved · click any to open in editor</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  brand={brand}
                  onOpen={() => setSearchParams({ doc: doc.id })}
                  onEditSetup={() => setSearchParams({ edit: doc.id })}
                  onDuplicate={() => {
                    const dup = docsStore.duplicate(brand.id, doc.id);
                    if (dup) toast.success('Duplicated');
                  }}
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

// ── Document Card ──

function DocCard({ doc, brand, onOpen, onEditSetup, onDuplicate, onDelete }: {
  doc: LogoPresentationDoc;
  brand: Brand;
  onOpen: () => void;
  onEditSetup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const firstLogo = doc.concepts.find(c => c.logoUrl)?.logoUrl;
  const accentColor = doc.concepts[0]?.color || brand.primaryColor;

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] cursor-pointer transition-all overflow-hidden"
    >
      {/* Preview */}
      <div className="aspect-video w-full flex items-center justify-center relative overflow-hidden" style={{ background: doc.template === 'simple' ? '#0A0A0F' : accentColor }}>
        {firstLogo ? (
          <img src={firstLogo} alt="" className="max-w-[50%] max-h-[55%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        ) : (
          <FileText className="w-10 h-10 text-white/20" />
        )}
        <span className="absolute bottom-2 right-2 text-[9px] text-white/40 uppercase tracking-wider">
          {doc.template === 'simple' ? 'Simple' : 'Premium'}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white/85 truncate">{doc.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/40">{doc.concepts.length} concepts</span>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/40 capitalize">{doc.template}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-white/25">
              <Clock className="w-2.5 h-2.5" />
              {formatRelative(doc.updatedAt)}
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEditSetup(); }}
              title="Edit setup"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              title="Duplicate"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
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
