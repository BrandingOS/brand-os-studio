/* Preview page for the Chronicle-style editor chrome.
 *
 * Mounted at /_dev/chronicle. Renders the ChronicleShell with a static
 * "Title with glow" canvas page, all four bottom-bar popovers wired with
 * stub handlers, and the brand-sections list pre-populated for Raqm so
 * the sidebar reads like the real editor at /b/raqm/design.
 *
 * Used to iterate on the chrome design without touching the production
 * editor route. Once the chrome is approved, the same components mount
 * inside /b/:slug/design/:designSlug behind a `?ui=chronicle` flag.
 */

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutGrid,
  Palette,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ChronicleShell } from "@/features/editor/shell/chronicle/ChronicleShell";
import { InsertMenu } from "@/features/editor/shell/chronicle/popovers/InsertMenu";
import { RemixMenu } from "@/features/editor/shell/chronicle/popovers/RemixMenu";
import { ThemeMenu } from "@/features/editor/shell/chronicle/popovers/ThemeMenu";
import { BackgroundMenu } from "@/features/editor/shell/chronicle/popovers/BackgroundMenu";
import { useState } from "react";

export default function ChroniclePreviewPage() {
  const navigate = useNavigate();
  const [pageBg, setPageBg] = useState<string>("var(--ch-canvas-bg)");
  const [titleColor, setTitleColor] = useState<string>("var(--ch-text)");
  const [generateImages, setGenerateImages] = useState(false);

  const brandSections = [
    { id: "setup", label: "Setup", icon: <Settings2 size={18} /> },
    { id: "brand-kit", label: "Brand Kit", icon: <Palette size={18} /> },
    { id: "guideline", label: "Guideline", icon: <Sparkles size={18} /> },
    { id: "design", label: "Design", icon: <Wand2 size={18} /> },
    { id: "tools", label: "Tools", icon: <LayoutGrid size={18} /> },
  ];

  const otherBrands = [
    { id: "skam", name: "SKAM", slug: "skam", initial: "S" },
    { id: "vector", name: "Vector", slug: "vector", initial: "V" },
  ];

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
    blankChapter: () => toast("Blank chapter"),
  };

  return (
    <ChronicleShell
      workspaceName="Nedal's workspace"
      workspacePlan="Free plan"
      currentBrandName="Raqm"
      brandSections={brandSections}
      activeSectionId="design"
      onSectionClick={(id) => navigate(`/b/raqm/${id === "design" ? "design" : id}`)}
      otherBrands={otherBrands}
      onBrandClick={(b) => navigate(`/b/${b.slug}/design`)}
      onNewDesign={() => navigate("/b/raqm/design")}
      projectName="Untitled design"
      topAvatar="N"
      onShare={() => toast.success("Share link copied")}
      onExport={() => toast("Open export")}
      onPresent={() => toast("Start presentation")}
      insertPopover={<InsertMenu on={insertActions} />}
      remixPopover={
        <RemixMenu
          generateImages={generateImages}
          onToggleGenerateImages={setGenerateImages}
          onRemix={() => toast.success("Remixed page layout")}
        />
      }
      themePopover={
        <ThemeMenu
          presets={[
            { id: "chronicle", label: "Chronicle", swatch: ["#0a0a0b", "#e8e8e8", "#7a7a7a"] },
            { id: "minimal", label: "Minimal", swatch: ["#ffffff", "#111111", "#999999"] },
            { id: "raqm", label: "Raqm", swatch: ["#0a0a0b", "#f5e4c3", "#d4a83c"] },
            { id: "bold", label: "Bold minimalist", swatch: ["#000", "#fff", "#ffc400"] },
          ]}
          activeId="raqm"
          onPick={(p) => toast(`Applied ${p.label}`)}
          onCreate={() => toast("Create theme")}
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
            "#a14a1f",
            "#8a1a1f",
            "#7a3a3f",
            "#5a2a6a",
            "#ffffff",
          ]}
          gradients={[
            { id: "g1", css: "linear-gradient(135deg, #b07a73 0%, #2b1e1a 100%)" },
            { id: "g2", css: "linear-gradient(135deg, #5a6a9a 0%, #2a2a45 100%)" },
            { id: "g3", css: "linear-gradient(135deg, #7a3a5a 0%, #2a1a25 100%)" },
            { id: "g4", css: "linear-gradient(135deg, #a5811f 0%, #2a1d05 100%)" },
            { id: "g5", css: "linear-gradient(135deg, #1e6a4a 0%, #0a1f17 100%)" },
            { id: "g6", css: "linear-gradient(135deg, #4a2a8a 0%, #0a0517 100%)" },
          ]}
          onPickColor={(c) => {
            setPageBg(c);
            // For very dark or very light bg, swap the title color for contrast.
            const lum = relativeLuminance(c);
            setTitleColor(lum > 0.5 ? "#0a0a0b" : "#f5f5f5");
          }}
          onPickGradient={(g) => setPageBg(g.css)}
          onBlurChange={() => {}}
          onGenerate={(prompt) => toast(`Generating image for: ${prompt}`)}
          onReset={() => {
            setPageBg("var(--ch-canvas-bg)");
            setTitleColor("var(--ch-text)");
          }}
        />
      }
    >
      <article
        className="ch-canvas-page"
        style={{
          background: pageBg,
          color: titleColor,
        }}
      >
        <h1 className="ch-canvas-page-title">
          A new guideline for{" "}
          <span
            style={{
              background:
                "linear-gradient(120deg, var(--ch-accent, #ffb74d) 0%, transparent 70%)",
              padding: "0 0.2em",
              borderRadius: 8,
              boxShadow:
                "0 0 60px 10px color-mix(in srgb, var(--ch-accent, #ffb74d) 35%, transparent)",
            }}
          >
            Raqm
          </span>
          .
        </h1>
        <p className="ch-canvas-page-sub" style={{ color: titleColor, opacity: 0.7 }}>
          This is a Chronicle-style editor preview. Click the floating bar at
          the bottom to try out Insert, Remix, Theme, and Background menus.
          Toggle light/dark from the top-right pill.
        </p>
      </article>
    </ChronicleShell>
  );
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
