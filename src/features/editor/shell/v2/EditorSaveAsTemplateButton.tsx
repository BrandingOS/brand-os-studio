// EditorSaveAsTemplateButton — Phase 4.2.
//
// Lives in the editor's top chrome between Save indicator and Export.
// Click → inline popover with name + category + visibility →
// convertToTemplate(doc, kit) → ITemplatesService.createTemplate.
//
// "Submit to community" (visibility: public, status: pending) is the
// 4.4 community-upload entry point; in 4.2 we ship the surface but
// admin approval queue lands in 4.4. Saving as 'private' bypasses
// approval entirely (auto-approved per spec).

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type {
  Template,
  TemplateCategory,
  TemplateMood,
  TemplateVisibility,
} from '@/features/templates/types';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import { convertToTemplate } from '@/features/templates/convertToTemplate';

const MOODS: TemplateMood[] = [
  'professional', 'minimal', 'modern', 'bold', 'elegant',
  'playful', 'vintage', 'natural', 'tech', 'maximalist',
];

interface Props {
  /** Lazy doc accessor — read fresh on submit. */
  getDoc: () => BrandOSDocument;
  /** Active brand kit; needed for convertToTemplate. */
  brandKit: BrandKit | null;
  /** Optional thumbnail data URI captured by the caller (e.g.
   *  from a canvas snapshot). When absent, save uses a tiny
   *  placeholder so the template list still renders something. */
  getThumbnailUrl?: () => string | undefined;
}

const PLACEHOLDER_THUMB =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#e5e5e5'/><text x='50' y='55' text-anchor='middle' font-family='sans-serif' font-size='10' fill='#737373'>SAVED</text></svg>",
  );

export function EditorSaveAsTemplateButton({
  getDoc, brandKit, getThumbnailUrl,
}: Props) {
  const templates = serviceContainer.has(SERVICE_KEYS.TEMPLATES)
    ? serviceContainer.get<ITemplatesService>(SERVICE_KEYS.TEMPLATES)
    : null;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [mood, setMood] = useState<TemplateMood>('professional');
  const [visibility, setVisibility] = useState<TemplateVisibility>('private');
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load categories when popover opens.
  useEffect(() => {
    if (!open || !templates) return;
    void templates.listCategories().then((rows) => {
      setCategories(rows);
      // Default category — best guess from current doc's contentType.
      try {
        const doc = getDoc();
        const match = rows.find((c) => c.contentTypeConfigId === doc.contentType);
        if (match) setCategoryId(match.id);
        else if (rows[0]) setCategoryId(rows[0].id);
      } catch {
        if (rows[0]) setCategoryId(rows[0].id);
      }
    });
  }, [open, templates, getDoc]);

  // Focus input when popover opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Click-outside / Esc to close.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = useCallback(async () => {
    if (!templates) {
      toast.error('Templates service not configured.');
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.error('Give the template a name first.');
      return;
    }
    if (!categoryId) {
      toast.error('Pick a category.');
      return;
    }
    setBusy(true);
    try {
      const doc = getDoc();
      const converted = brandKit ? convertToTemplate(doc, brandKit) : doc;
      const slug = `user-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}-${Date.now().toString(36)}`;
      const widthPx = doc.pages[0]?.width ?? 1080;
      const heightPx = doc.pages[0]?.height ?? 1080;
      const created: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'useCount'> = {
        slug, name: trimmed,
        description: null,
        source: 'user_uploaded',
        categoryId,
        document: converted,
        thumbnailUrl: getThumbnailUrl?.() ?? PLACEHOLDER_THUMB,
        previewImageUrl: null,
        width: widthPx,
        height: heightPx,
        tags: [],
        mood,
        promptText: null,
        promptSystemHints: null,
        rasterImageUrl: null,
        uploadedByUserId: null,
        // Private = auto-approved (only visible to creator). Public
        // = pending; admin approval queue ships in Phase 4.4.
        uploadStatus: visibility === 'private' ? 'approved' : 'pending',
        uploadedAt: new Date().toISOString(),
        approvedAt: visibility === 'private' ? new Date().toISOString() : null,
        approvedByUserId: null,
        rejectionReason: null,
        visibility,
        isPremium: false,
        requiredPlan: null,
      };
      await templates.createTemplate(created);
      toast.success(
        visibility === 'private'
          ? 'Saved to your personal templates.'
          : "Submitted! We'll review it for the community library — usually within 1–2 days.",
      );
      setName('');
      setOpen(false);
    } catch (err) {
      console.error('[SaveAsTemplate] failed:', err);
      toast.error('Could not save template. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [templates, name, categoryId, mood, visibility, getDoc, brandKit, getThumbnailUrl]);

  return (
    <div ref={wrapRef} className="relative" data-save-as-template-wrap>
      <button
        type="button"
        data-save-as-template-trigger
        onClick={() => setOpen((v) => !v)}
        aria-label="Save as template"
        title="Save as template"
        className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30"
        style={{ borderColor: 'var(--border)' }}
      >
        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Save as template</span>
      </button>

      {open ? (
        <div
          data-save-as-template-popover
          role="dialog"
          aria-label="Save as template"
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-background shadow-xl"
          style={{ borderColor: 'var(--border)', padding: 12 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium">Save as template</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] flex flex-col gap-1">
              Name
              <input
                ref={inputRef}
                type="text"
                data-save-as-template-name
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My branded post"
                disabled={busy}
                className="rounded-md border px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ borderColor: 'var(--border)' }}
              />
            </label>
            <label className="text-[11px] flex flex-col gap-1">
              Category
              <select
                data-save-as-template-category
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={busy}
                className="rounded-md border px-2 py-1 text-[12px]"
                style={{ borderColor: 'var(--border)' }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] flex flex-col gap-1">
              Mood
              <select
                data-save-as-template-mood
                value={mood}
                onChange={(e) => setMood(e.target.value as TemplateMood)}
                disabled={busy}
                className="rounded-md border px-2 py-1 text-[12px] capitalize"
                style={{ borderColor: 'var(--border)' }}
              >
                {MOODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] flex flex-col gap-1">
              Visibility
              <select
                data-save-as-template-visibility
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as TemplateVisibility)}
                disabled={busy}
                className="rounded-md border px-2 py-1 text-[12px]"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="private">Private — only you</option>
                <option value="public">Submit to community — pending review</option>
              </select>
            </label>
            <button
              type="button"
              data-save-as-template-submit
              onClick={() => void submit()}
              disabled={busy || name.trim().length === 0}
              className="rounded-md bg-primary text-primary-foreground px-2 py-1.5 text-[12px] font-medium disabled:opacity-50 hover:bg-primary/90"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
