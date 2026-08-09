/* Brand-scoped Guideline tab at `/b/:slug/guideline`.
 *
 * Phase B (2026-05-19): rewritten on top of the Chronicle-style editor
 * chrome. The previous WorkspaceShell + GuidelineSidebar + GuidelineBoard
 * combo is replaced by `ChronicleShell` wrapping a multi-page
 * `GuidelineDocument` (Cover · Strategy · Logo · Color · Typography ·
 * Voice). The canvas-based legacy guidelines editor still lives at
 * `/b/:slug/guidelines/canvas` and is reachable from the top-right
 * "Open Canvas" pill via the Present action.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutGrid,
  Palette,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useBrandFromSlug } from "@/shared/hooks/useBrandFromSlug";
import { useBrandStore } from "@/shared/store/brandStore";
import { ChronicleShell } from "@/features/editor/shell/chronicle/ChronicleShell";
import { InsertMenu } from "@/features/editor/shell/chronicle/popovers/InsertMenu";
import { RemixMenu } from "@/features/editor/shell/chronicle/popovers/RemixMenu";
import { ThemeMenu } from "@/features/editor/shell/chronicle/popovers/ThemeMenu";
import { BackgroundMenu } from "@/features/editor/shell/chronicle/popovers/BackgroundMenu";
import {
  ChronicleGuidelineEditor,
  type GuidelineEditorApi,
} from "@/features/guideline/chronicle/ChronicleGuidelineEditor";

/** Theme presets (GDL-05) — each maps to the --ch-* token set the
 *  document articles actually read, so picking one re-themes the
 *  whole document. Persisted per brand. */
const THEME_VARS: Record<string, Record<string, string>> = {
  chronicle: {
    "--ch-canvas-bg": "#131316",
    "--ch-text": "#ededed",
    "--ch-text-muted": "rgba(255,255,255,0.55)",
    "--ch-text-faint": "rgba(255,255,255,0.4)",
    "--ch-border": "rgba(255,255,255,0.08)",
    "--ch-border-strong": "rgba(255,255,255,0.14)",
  },
  minimal: {
    "--ch-canvas-bg": "#ffffff",
    "--ch-text": "#111111",
    "--ch-text-muted": "rgba(0,0,0,0.6)",
    "--ch-text-faint": "rgba(0,0,0,0.4)",
    "--ch-border": "rgba(0,0,0,0.08)",
    "--ch-border-strong": "rgba(0,0,0,0.16)",
  },
  // "brand" applies no overrides — the document's own brand-aware
  // rendering (accented with --brand-primary) is the default look.
  brand: {},
  bold: {
    "--ch-canvas-bg": "#000000",
    "--ch-text": "#ffffff",
    "--ch-text-muted": "rgba(255,255,255,0.72)",
    "--ch-text-faint": "rgba(255,255,255,0.5)",
    "--ch-border": "rgba(255,255,255,0.14)",
    "--ch-border-strong": "#ffc400",
    "--brand-primary": "#ffc400",
  },
};

const themeStorageKey = (brandId: string) => `brandos:guideline-theme:${brandId}`;

export default function BrandGuidelineTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading } = useBrandFromSlug(slug);
  const brands = useBrandStore((s) => s.brands);

  const [generateImages, setGenerateImages] = useState(false);
  const [accent, setAccent] = useState<string | undefined>(undefined);
  const [themeId, setThemeId] = useState<string>("brand");
  const editorApiRef = useRef<GuidelineEditorApi | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);

  // Restore the saved theme when the brand resolves.
  useEffect(() => {
    if (!brand?.id) return;
    try {
      const saved = localStorage.getItem(themeStorageKey(brand.id));
      if (saved && THEME_VARS[saved]) setThemeId(saved);
    } catch {
      // Storage unavailable — keep the default.
    }
  }, [brand?.id]);

  const applyTheme = useCallback(
    (id: string, label: string) => {
      setThemeId(id);
      if (brand?.id) {
        try {
          localStorage.setItem(themeStorageKey(brand.id), id);
        } catch {
          // Non-fatal.
        }
      }
      toast.success(`Theme: ${label}`);
    },
    [brand?.id],
  );

  // Real insert actions (GDL-04) — routed through the editor's
  // imperative API so the block lands in the persisted document.
  const insertViaApi = useCallback(
    (kind: Parameters<GuidelineEditorApi["insertBlock"]>[0], label: string) => {
      const ok = editorApiRef.current?.insertBlock(kind) ?? false;
      if (ok) toast.success(`${label} added`);
      else toast.error(`Couldn't add ${label.toLowerCase()} — document not ready`);
    },
    [],
  );

  const handleInsertImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      if (!src) return;
      const ok = editorApiRef.current?.insertImage(src) ?? false;
      if (ok) toast.success("Image added");
      else toast.error("Couldn't add image — document not ready");
    };
    reader.readAsDataURL(file);
  }, []);

  // Real export (GDL-06): rasterize every chapter and bind a
  // multi-page PDF sized to each capture.
  const handleExport = useCallback(async () => {
    if (exporting) return;
    const host = document.querySelector<HTMLElement>(
      "[data-chronicle-guideline-editor]",
    );
    const articles = host
      ? Array.from(host.querySelectorAll<HTMLElement>("article"))
      : [];
    if (articles.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    setExporting(true);
    const id = toast.loading(`Exporting ${articles.length} pages…`);
    try {
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      let pdf: InstanceType<typeof JsPDF> | null = null;
      for (const article of articles) {
        const canvas = await html2canvas(article, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor:
            getComputedStyle(article).backgroundColor || "#131316",
        });
        const w = canvas.width / 2;
        const h = canvas.height / 2;
        if (!pdf) {
          pdf = new JsPDF({
            orientation: w >= h ? "landscape" : "portrait",
            unit: "px",
            format: [w, h],
          });
        } else {
          pdf.addPage([w, h], w >= h ? "landscape" : "portrait");
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
      }
      const name = `${(brand?.name ?? "brand").toLowerCase().replace(/\s+/g, "-")}-guidelines.pdf`;
      pdf?.save(name);
      toast.success("Guideline exported", { id, description: name });
    } catch (err) {
      toast.error("Export failed", {
        id,
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setExporting(false);
    }
  }, [brand?.name, exporting]);

  const brandSections = [
    { id: "setup", label: "Setup", icon: <Settings2 size={18} /> },
    { id: "brand-kit", label: "Brand Kit", icon: <Palette size={18} /> },
    { id: "guideline", label: "Guideline", icon: <Sparkles size={18} /> },
    { id: "design", label: "Design", icon: <Wand2 size={18} /> },
    { id: "tools", label: "Tools", icon: <LayoutGrid size={18} /> },
  ];

  const otherBrands = (brands ?? [])
    .filter((b) => b.slug && b.slug !== slug)
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug!,
      initial: b.name?.slice(0, 1).toUpperCase() ?? "•",
    }));

  const onSectionClick = useCallback(
    (id: string) => {
      if (!slug) return;
      navigate(`/b/${slug}/${id}`);
    },
    [slug, navigate],
  );

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Guideline link copied");
    } catch {
      toast.message(`Copy this link: ${window.location.href}`);
    }
  }, []);

  const onPresent = useCallback(() => {
    if (!slug) return;
    navigate(`/b/${slug}/guidelines/canvas`);
  }, [slug, navigate]);

  const insertActions = {
    paragraph: () => insertViaApi("paragraph", "Paragraph"),
    heading: () => insertViaApi("heading", "Heading"),
    image: () => imageInputRef.current?.click(),
    card: () => insertViaApi("card", "Card"),
    embed: () => {
      const url = window.prompt("Link URL");
      if (!url) return;
      const ok = editorApiRef.current?.insertBlock("paragraph") ?? false;
      if (ok) {
        // Turn the just-inserted paragraph into a link block.
        const host = document.querySelector("[data-chronicle-guideline-editor]");
        const p = host?.querySelector("article:last-of-type p:last-of-type");
        if (p) {
          p.innerHTML = `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noreferrer" style="color:var(--brand-primary,#7aa2ff);text-decoration:underline;">${url}</a>`;
        }
        toast.success("Link added");
      } else {
        toast.error("Couldn't add link — document not ready");
      }
    },
    mockup: () => toast("Mockup blocks — coming soon"),
    quote: () => insertViaApi("quote", "Quote"),
    stickyNote: () => insertViaApi("stickyNote", "Sticky note"),
    diagram: () => toast("Diagram blocks — coming soon"),
    template: () => toast("Chapter templates — coming soon"),
    blankChapter: () => insertViaApi("blankChapter", "New chapter"),
  };

  if (!brand) {
    return (
      <ChronicleShell
        workspaceName="Workspace"
        brandSections={brandSections}
        activeSectionId="guideline"
        onSectionClick={onSectionClick}
        otherBrands={[]}
        onBrandClick={() => {}}
        onNewDesign={() => navigate("/dashboard/brands")}
        projectName="Brand Guidelines"
        topAvatar="•"
      >
        <article className="ch-canvas-page">
          <h1 className="ch-canvas-page-title">
            {isLoading ? "Loading…" : "Brand not found"}
          </h1>
          <p className="ch-canvas-page-sub">
            {isLoading
              ? "Pulling brand data from the vault."
              : "We couldn't find a brand for this URL. Try choosing one from the switcher."}
          </p>
        </article>
      </ChronicleShell>
    );
  }

  return (
    <ChronicleShell
      workspaceName="Workspace"
      workspacePlan={brand.tagline ?? "Brand workspace"}
      currentBrandName={brand.name}
      brandSections={brandSections}
      activeSectionId="guideline"
      onSectionClick={onSectionClick}
      otherBrands={otherBrands}
      onBrandClick={(b) => navigate(`/b/${b.slug}/guideline`)}
      onNewDesign={() => navigate(`/b/${slug}/design`)}
      projectName={`${brand.name} · Guidelines`}
      topAvatar={brand.name?.slice(0, 1).toUpperCase() ?? "•"}
      onShare={onShare}
      onExport={handleExport}
      onPresent={onPresent}
      insertPopover={<InsertMenu on={insertActions} />}
      remixPopover={
        <RemixMenu
          generateImages={generateImages}
          onToggleGenerateImages={setGenerateImages}
          onRemix={() => toast.success("Layout remixed")}
        />
      }
      themePopover={
        <ThemeMenu
          presets={[
            { id: "chronicle", label: "Chronicle", swatch: ["#0a0a0b", "#e8e8e8", "#7a7a7a"] },
            { id: "minimal", label: "Minimal", swatch: ["#ffffff", "#111111", "#999999"] },
            {
              id: "brand",
              label: brand.name,
              swatch: [
                "#0a0a0b",
                "#f5f5f4",
                brand.primaryColor ?? "#d4a83c",
              ],
            },
            { id: "bold", label: "Bold minimalist", swatch: ["#000", "#fff", "#ffc400"] },
          ]}
          activeId={themeId}
          onPick={(p) => applyTheme(p.id, p.label)}
          onCreate={() => toast("Create theme — coming soon")}
        />
      }
      backgroundPopover={
        <BackgroundMenu
          colors={[
            "#000000",
            "#0a2a6c",
            "#0e3a32",
            "#1b3a17",
            "#5a4f1f",
            brand.primaryColor ?? "#a14a1f",
            "#8a1a1f",
            "#7a3a3f",
            "#5a2a6a",
            "#ffffff",
          ]}
          gradients={[
            { id: "g1", css: "linear-gradient(135deg, #b07a73 0%, #2b1e1a 100%)" },
            { id: "g2", css: `linear-gradient(135deg, ${brand.primaryColor ?? "#d4a83c"} 0%, #2a1d05 100%)` },
            { id: "g3", css: "linear-gradient(135deg, #7a3a5a 0%, #2a1a25 100%)" },
            { id: "g4", css: "linear-gradient(135deg, #5a6a9a 0%, #2a2a45 100%)" },
            { id: "g5", css: "linear-gradient(135deg, #1e6a4a 0%, #0a1f17 100%)" },
            { id: "g6", css: "linear-gradient(135deg, #4a2a8a 0%, #0a0517 100%)" },
          ]}
          onPickColor={(c) => {
            setAccent(c);
            toast(`Accent set to ${c}`);
          }}
          onPickGradient={(g) => toast(`Gradient ${g.id} applied`)}
          onBlurChange={() => {}}
          onGenerate={(prompt) => toast(`Generating image for: ${prompt}`)}
          onReset={() => setAccent(undefined)}
        />
      }
    >
      <ChronicleGuidelineEditor
        brand={brand}
        accent={accent}
        themeVars={THEME_VARS[themeId]}
        apiRef={editorApiRef}
      />
      {/* Hidden picker backing the Insert → Image action. */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleInsertImageFile(f);
          e.currentTarget.value = "";
        }}
      />
    </ChronicleShell>
  );
}
