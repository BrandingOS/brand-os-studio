/**
 * LogoConceptInspector — context-aware content panel for the logo presentation editor.
 *
 * Reads the slide id from EditorWorkspace, parses out which concept it
 * belongs to (if any), and renders editable fields for that concept.
 * Every change goes through the persisted draft store, so the slides
 * automatically rebuild and persist across reloads.
 */
import { useRef, useMemo } from 'react';
import { Upload, Palette, Pencil, X, Check } from 'lucide-react';
import { useLogoPresentationDataStore } from '../dataStore';
import { PaletteGenerator } from './PaletteGenerator';
import { useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { LogoConcept } from '../types';

interface Props {
  brand: Brand;
  currentSlideId: string | undefined;
  onClose: () => void;
}

/**
 * Slide ids look like:
 *  - cover, brief, personality                  (brand-level)
 *  - {conceptId}-title, -idea, -reveal, etc.    (per-concept)
 *  - compare, thankyou                          (closing)
 *
 * For per-concept slides we extract the concept id (e.g. concept-vector-1).
 */
function getConceptIdFromSlideId(slideId: string | undefined): string | null {
  if (!slideId) return null;
  // Concept slide ids are formatted: `{conceptId}-{kind}` where conceptId itself
  // can contain hyphens (e.g. concept-vector-1-reveal). We match the suffixes:
  const suffixes = ['-title', '-idea', '-reveal', '-construction', '-why', '-variations', '-colormono', '-context', '-hero-dark', '-hero-light', '-breakdown', '-rationale', '-grid', '-brand-hero'];
  for (const suffix of suffixes) {
    if (slideId.endsWith(suffix)) {
      return slideId.slice(0, -suffix.length);
    }
  }
  return null;
}

export function LogoConceptInspector({ brand, currentSlideId, onClose }: Props) {
  const draft = useLogoPresentationDataStore((s) => s.drafts[brand.id]);
  const updateDraft = useLogoPresentationDataStore((s) => s.updateDraft);
  const updateConcept = useLogoPresentationDataStore((s) => s.updateConcept);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const logotypeFileRef = useRef<HTMLInputElement>(null);
  const [showPaletteGen, setShowPaletteGen] = useState(false);

  const conceptId = useMemo(() => getConceptIdFromSlideId(currentSlideId), [currentSlideId]);

  // Find the concept and its index in the array
  const conceptInfo = useMemo(() => {
    if (!draft || !conceptId) return null;
    const index = draft.concepts.findIndex(c => c.id === conceptId);
    if (index === -1) return null;
    return { concept: draft.concepts[index], index };
  }, [draft, conceptId]);

  if (!draft) {
    return (
      <div className="p-6 text-center text-white/30 text-xs">
        No saved presentation data
      </div>
    );
  }

  // ── Brand-level slide (cover, brief, personality, thank you) ──
  if (!conceptInfo) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-white/40" />
            <h3 className="text-sm font-semibold text-white/80">Presentation Info</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <p className="text-[10px] text-white/25 mb-2">
            Edits here update brand-level slides (cover, brief, personality).
            For concept slides, click a concept slide first.
          </p>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Brand Brief / Positioning</label>
            <textarea
              value={draft.brief}
              onChange={(e) => updateDraft(brand.id, { brief: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 resize-none"
              placeholder="What does this brand stand for?"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Brand Personality</label>
            <input
              type="text"
              value={draft.personality}
              onChange={(e) => updateDraft(brand.id, { personality: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/80 focus:outline-none focus:border-white/20"
              placeholder="Bold, Precise, Human"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Client Name</label>
            <input
              type="text"
              value={draft.clientName}
              onChange={(e) => updateDraft(brand.id, { clientName: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/80 focus:outline-none focus:border-white/20"
              placeholder="Optional client name"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Concept slide ──
  const { concept, index } = conceptInfo;

  const updateField = (patch: Partial<LogoConcept>) => {
    updateConcept(brand.id, index, { ...concept, ...patch });
  };

  const handleFileUpload = (field: 'logoUrl' | 'iconUrl' | 'logotypeUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField({ [field]: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateWhyPoint = (i: number, value: string) => {
    const points = [...concept.whyItWorks];
    points[i] = value;
    updateField({ whyItWorks: points });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: concept.color || brand.primaryColor }}
          >
            {String.fromCharCode(65 + index)}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white/80 leading-tight">{concept.name || `Concept ${index + 1}`}</h3>
            <p className="text-[10px] text-white/30">Concept {String.fromCharCode(65 + index)}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <p className="text-[10px] text-white/25">
          All edits save automatically and update the slides instantly.
        </p>

        {/* Concept Name */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Concept Name</label>
          <input
            type="text"
            value={concept.name}
            onChange={(e) => updateField({ name: e.target.value })}
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Direction */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Direction / Style</label>
          <input
            type="text"
            value={concept.direction}
            onChange={(e) => updateField({ direction: e.target.value })}
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Rationale */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Rationale</label>
          <textarea
            value={concept.rationale}
            onChange={(e) => updateField({ rationale: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/80 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Primary Logo</label>
          <input ref={logoFileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload('logoUrl')} />
          {concept.logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center p-2">
                <img src={concept.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => logoFileRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors text-left">Replace</button>
                <button onClick={() => updateField({ logoUrl: '' })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors text-left">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => logoFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="text-xs">Upload Logo</span>
            </button>
          )}
        </div>

        {/* Icon */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Icon (Optional)</label>
          <input ref={iconFileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload('iconUrl')} />
          {concept.iconUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center p-1.5">
                <img src={concept.iconUrl} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => iconFileRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors text-left">Replace</button>
                <button onClick={() => updateField({ iconUrl: '' })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors text-left">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => iconFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span className="text-xs">Upload Icon</span>
            </button>
          )}
        </div>

        {/* Logotype */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Logotype (Optional)</label>
          <input ref={logotypeFileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload('logotypeUrl')} />
          {concept.logotypeUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-20 h-12 rounded-lg bg-white flex items-center justify-center p-1.5">
                <img src={concept.logotypeUrl} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => logotypeFileRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors text-left">Replace</button>
                <button onClick={() => updateField({ logotypeUrl: '' })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors text-left">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => logotypeFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span className="text-xs">Upload Logotype</span>
            </button>
          )}
        </div>

        {/* Colors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Colors</label>
            <button
              onClick={() => setShowPaletteGen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-white/35 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
            >
              <Palette className="w-2.5 h-2.5" />
              Browse
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-white/25">Primary</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={concept.color || brand.primaryColor}
                  onChange={(e) => updateField({ color: e.target.value })}
                  className="w-7 h-7 rounded-md border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                />
                <input
                  type="text"
                  value={concept.color || brand.primaryColor}
                  onChange={(e) => updateField({ color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-white/60 font-mono uppercase focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div>
              <span className="text-[9px] text-white/25">Accent</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={concept.colorAccent || brand.primaryColor}
                  onChange={(e) => updateField({ colorAccent: e.target.value })}
                  className="w-7 h-7 rounded-md border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                />
                <input
                  type="text"
                  value={concept.colorAccent || brand.primaryColor}
                  onChange={(e) => updateField({ colorAccent: e.target.value })}
                  className="flex-1 px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-white/60 font-mono uppercase focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Why It Works */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Why It Works</label>
          <div className="space-y-1.5">
            {concept.whyItWorks.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-white/15 w-3 mt-2 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={point}
                  onChange={(e) => updateWhyPoint(i, e.target.value)}
                  placeholder={`Point ${i + 1}`}
                  className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded text-xs text-white/70 focus:outline-none focus:border-white/15"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Palette Generator modal */}
      {showPaletteGen && (
        <PaletteGenerator
          currentPrimary={concept.color || brand.primaryColor}
          currentAccent={concept.colorAccent || brand.primaryColor}
          onSelect={(primary, accent) => updateField({ color: primary, colorAccent: accent })}
          onClose={() => setShowPaletteGen(false)}
        />
      )}
    </div>
  );
}
