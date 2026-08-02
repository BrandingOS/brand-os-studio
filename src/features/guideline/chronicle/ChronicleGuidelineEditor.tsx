/* ChronicleGuidelineEditor — unified editing surface that combines:
 *
 *   • The case-study editor's DOM-based editing UX
 *     (EditableSlide → click-to-select, double-click contentEditable,
 *      drag-to-move, resize handles, FloatingToolbar formatting).
 *
 *   • The design editor's data layer
 *     (IDesignStorage persistence, brand kit re-application, schema-
 *      shaped save metadata so the unified design grid can list
 *      this guideline like any other document).
 *
 *   • The Chronicle visual chrome (provided by the host
 *     `ChronicleShell` — sidebar + top pill + bottom action bar).
 *
 * Save model — copied from CaseStudySlideEditorPage:
 *   The slide DOM is treated as authoritative. A MutationObserver
 *   captures every edit, debounced through `useAutoSave`, and persisted
 *   as a "frozen HTML" snapshot via IDesignStorage. On reload we render
 *   the snapshot in place of the React composition via
 *   `EditableSlide`'s `frozenHtml` prop so React doesn't reconcile the
 *   user's mutations away.
 *
 * Why this replaces the Fabric-backed surface from the previous round:
 *   The user explicitly asked for "an editor closer to the case-study
 *   one" — meaning DOM-driven, click-to-edit, no Fabric canvas. Fabric
 *   was the wrong primitive for a multi-page guidelines document where
 *   most edits are text + image swaps. The case-study UX maps 1:1 to
 *   what users actually do here.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Brand } from "@/shared/types/brand";
import { useService, SERVICE_KEYS } from "@/core";
import type { IDesignStorage } from "@/core/types/services";
import { EditableSlide } from "@/shared/editor/blocks/EditableSlide";
import { EditorContext } from "@/shared/editor/EditorContext";
import { useAutoSave } from "@/features/editor/core";
import { GuidelineDocument } from "./GuidelineDocument";

const DESIGN_SLUG = "brand-guideline";

interface Props {
  brand: Brand;
  /** Optional accent override forwarded to the document renderer. */
  accent?: string;
}

interface SavedGuideline {
  html: string;
  brandId: string;
  updatedAt: string;
}

export function ChronicleGuidelineEditor({ brand, accent }: Props) {
  const storage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);

  // Render the React document once into static HTML — this is the seed
  // the first time a user opens the page. After that, the persisted
  // frozen HTML wins.
  const seedHtml = useStaticHtml(() => (
    <GuidelineDocument brand={brand} accent={accent} />
  ), [brand.id, brand.updatedAt, accent]);

  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load persisted snapshot once. If none exists yet, seed with the
  // static React render so subsequent edits have something to mutate.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = (await storage.loadDesign(brand.id, DESIGN_SLUG)) as
          | SavedGuideline
          | null;
        if (cancelled) return;
        if (raw?.html && raw.brandId === brand.id) {
          setSavedHtml(raw.html);
        } else {
          // First visit — seed with the freshly-rendered React HTML.
          setSavedHtml(seedHtml);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[ChronicleGuidelineEditor] load failed:", err);
          setSavedHtml(seedHtml);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We deliberately ignore `seedHtml` here — the first load decides
    // which source wins. Re-seeding when the React render changes
    // (e.g. brand swatch update) would clobber the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id, storage]);

  // Track latest DOM HTML for debounced save. Observe ANY mutation
  // (typing in contentEditable, dragging, resizing) and stamp the
  // current innerHTML through useAutoSave.
  const [dirtyHtml, setDirtyHtml] = useState<string | null>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node || !loaded) return;
    const observer = new MutationObserver(() => {
      const next = node.innerHTML;
      setDirtyHtml(next);
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, [loaded]);

  const handleSave = useCallback(
    async (html: string) => {
      if (!html) return;
      const payload: SavedGuideline = {
        html,
        brandId: brand.id,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveDesign(brand.id, DESIGN_SLUG, payload, {
        id: DESIGN_SLUG,
        name: `${brand.name} Guidelines`,
        contentType: "brand-guideline",
      });
    },
    [brand.id, brand.name, storage],
  );

  useAutoSave<string>({
    value: dirtyHtml ?? "",
    save: handleSave,
    debounceMs: 1200,
    savedFadeMs: 2500,
    enabled: !!dirtyHtml,
  });

  if (!loaded || !savedHtml) {
    return (
      <div
        style={{
          padding: 60,
          color: "var(--ch-text-muted)",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        Loading guideline…
      </div>
    );
  }

  return (
    <EditorContext.Provider value={{ brand }}>
      <div
        ref={containerRef}
        data-chronicle-guideline-editor
        style={{
          width: 920,
          maxWidth: "100%",
          minHeight: "70vh",
          /* Brand-aware CSS variables so the rendered HTML's
             var(--bp-*) references resolve. The Theme popover can flip
             these to retheme the entire document in one swap. */
          ["--brand-primary" as never]: brand.primaryColor ?? accent ?? "#d4a83c",
        }}
      >
        <EditableSlide frozenHtml={savedHtml} />
      </div>
    </EditorContext.Provider>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────── */

/**
 * Render a React node to a static HTML string. Memoized by the deps
 * array so a re-render of the host doesn't rebuild the string on every
 * keystroke. Used to seed the editable surface on first visit.
 */
function useStaticHtml(
  factory: () => ReactElement,
  deps: DependencyList,
): string {
  return useMemoizedSync(() => renderToStaticMarkup(factory()), deps);
}

function useMemoizedSync<T>(compute: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T } | null>(null);
  if (!ref.current || !sameDeps(ref.current.deps, deps)) {
    ref.current = { deps, value: compute() };
  }
  return ref.current.value;
}

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
