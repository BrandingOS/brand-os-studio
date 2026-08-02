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

import { useCallback, useState } from "react";
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
import { ChronicleGuidelineEditor } from "@/features/guideline/chronicle/ChronicleGuidelineEditor";

export default function BrandGuidelineTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading } = useBrandFromSlug(slug);
  const brands = useBrandStore((s) => s.brands);

  const [generateImages, setGenerateImages] = useState(false);
  const [accent, setAccent] = useState<string | undefined>(undefined);

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
    paragraph: () => toast("Insert paragraph"),
    heading: () => toast("Insert heading"),
    image: () => toast("Insert image"),
    card: () => toast("Insert card"),
    embed: () => toast("Insert embed"),
    mockup: () => toast("Insert mockup"),
    quote: () => toast("Insert quote"),
    stickyNote: () => toast("Insert sticky note"),
    diagram: () => toast("Insert diagram"),
    template: () => toast("Choose template"),
    blankChapter: () => toast("New chapter"),
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
      onExport={() => toast("Export — coming soon")}
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
          activeId="brand"
          onPick={(p) => toast(`Applied ${p.label}`)}
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
      <ChronicleGuidelineEditor brand={brand} />
    </ChronicleShell>
  );
}
