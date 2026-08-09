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

/** Block kinds the Insert menu can add to the document for real. */
export type GuidelineInsertKind =
  | "paragraph"
  | "heading"
  | "quote"
  | "card"
  | "stickyNote"
  | "blankChapter";

export interface GuidelineEditorApi {
  /** Append a content block to the last chapter (or a new chapter). */
  insertBlock: (kind: GuidelineInsertKind) => boolean;
  /** Append an image block (data URL) to the last chapter. */
  insertImage: (src: string) => boolean;
}

interface Props {
  brand: Brand;
  /** Optional accent override forwarded to the document renderer. */
  accent?: string;
  /** Extra CSS custom properties applied to the document container —
   *  the Theme popover flips --ch-* tokens through this. */
  themeVars?: Record<string, string>;
  /** Receives the imperative insert API once the surface is live. */
  apiRef?: { current: GuidelineEditorApi | null };
}

interface SavedGuideline {
  html: string;
  brandId: string;
  updatedAt: string;
}

export function ChronicleGuidelineEditor({ brand, accent, themeVars, apiRef }: Props) {
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

  // Imperative Insert API (GDL-04). The frozen-HTML DOM is
  // authoritative and observed by the MutationObserver above, so
  // appending real nodes both renders immediately AND autosaves.
  useEffect(() => {
    if (!apiRef) return;
    const blockHtml = (kind: GuidelineInsertKind): string => {
      const P_STYLE =
        'font-size:15px;line-height:1.7;color:var(--ch-text-muted);max-width:560px;';
      switch (kind) {
        case "paragraph":
          return `<p style="${P_STYLE}">New paragraph — double-click to edit.</p>`;
        case "heading":
          return `<h2 style="font-size:28px;font-weight:600;letter-spacing:-0.02em;color:var(--ch-text);margin:24px 0 8px;">New heading</h2>`;
        case "quote":
          return `<blockquote style="margin:24px 0;padding:16px 22px;border-left:3px solid var(--brand-primary, var(--ch-border-strong));font-size:18px;font-style:italic;color:var(--ch-text);">“A quote worth remembering — double-click to edit.”</blockquote>`;
        case "card":
          return `<div style="margin:20px 0;padding:20px 22px;border:1px solid var(--ch-border-strong);border-radius:14px;background:var(--ch-surface, rgba(127,127,127,0.06));"><h3 style="font-size:16px;font-weight:600;color:var(--ch-text);margin:0 0 6px;">Card title</h3><p style="${P_STYLE}margin:0;">Card body — double-click to edit.</p></div>`;
        case "stickyNote":
          return `<div style="margin:20px 0;padding:18px 20px;max-width:320px;background:#f7e07f;color:#3a3005;border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.18);font-size:14px;line-height:1.55;transform:rotate(-1deg);">Sticky note — double-click to edit.</div>`;
        case "blankChapter":
          return "";
      }
    };
    const api: GuidelineEditorApi = {
      insertBlock: (kind) => {
        const node = containerRef.current;
        if (!node) return false;
        if (kind === "blankChapter") {
          const article = document.createElement("article");
          article.className = "ch-canvas-page";
          article.innerHTML =
            `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ch-text-faint);margin-bottom:16px;">New chapter</div>` +
            `<h2 style="font-size:34px;font-weight:600;letter-spacing:-0.02em;color:var(--ch-text);margin:0 0 12px;">Untitled chapter</h2>` +
            `<p style="font-size:15px;line-height:1.7;color:var(--ch-text-muted);max-width:560px;">Double-click any text to edit it.</p>`;
          const lastArticle = node.querySelector("article:last-of-type");
          if (lastArticle?.parentElement) {
            lastArticle.parentElement.appendChild(article);
          } else {
            node.appendChild(article);
          }
          article.scrollIntoView({ behavior: "smooth", block: "start" });
          return true;
        }
        const target = node.querySelector("article:last-of-type") ?? node;
        const wrap = document.createElement("div");
        wrap.innerHTML = blockHtml(kind);
        const el = wrap.firstElementChild;
        if (!el) return false;
        target.appendChild(el);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      },
      insertImage: (src) => {
        const node = containerRef.current;
        if (!node) return false;
        const target = node.querySelector("article:last-of-type") ?? node;
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.style.cssText =
          "display:block;max-width:100%;border-radius:12px;margin:20px 0;";
        target.appendChild(img);
        img.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      },
    };
    apiRef.current = api;
    return () => {
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [apiRef, loaded]);

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
          ...(themeVars as Record<string, string> | undefined),
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
