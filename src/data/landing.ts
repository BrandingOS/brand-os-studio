import { 
  FileStack, 
  Layout, 
  Download, 
  Palette, 
  Printer, 
  Globe, 
  Wand2,
  Play,
  Rocket
} from "lucide-react";

import { 
  Feature, 
  StatItem, 
  MarqueeItem, 
  FloatingTile, 
  ProductModule, 
  SectionContent, 
  HeroContent 
} from "@/shared/types";

import illusUploadCoreAssets from "@/assets/illus-upload-core-assets.webp";
import illusAutoGenerate from "@/assets/illus-auto-generate.webp";
import illusUseAnywhere from "@/assets/illus-use-anywhere.webp";
import illusGuidelines from "@/assets/illus-guidelines.webp";
import illusDesignStudio from "@/assets/illus-design-studio.webp";
import illusPrintCollateral from "@/assets/illus-print-collateral.webp";
import illusBrandExport from "@/assets/illus-brand-export.webp";
import illusWebsiteBuilder from "@/assets/illus-website-builder.webp";
import illusSmartAI from "@/assets/illus-smart-ai.webp";

// Hero content
export const heroContent: HeroContent = {
  badge: {
    text: "Set → Sync → Shine",
    className: "badge-orbit"
  },
  headline: "Save hours of repetitive boring work",
  description: "Create your brand system once—our platform syncs it across every asset automatically.",
  cta: {
    primary: {
      text: "Start Now",
      variant: "hero"
    }
  },
  heroImageUrl: "https://i.pinimg.com/1200x/18/ec/a2/18eca28a85c40aa0b255742cbe3a0656.jpg",
  heroImageAlt: "Brand OS dashboard mockup"
};

// Marquee items
export const marqueeItems: MarqueeItem[] = [
  { id: "1", text: "One source of truth", order: 1 },
  { id: "2", text: "On‑brand, every time", order: 2 },
  { id: "3", text: "Auto‑generated assets", order: 3 },
  { id: "4", text: "Export anywhere", order: 4 },
  { id: "5", text: "Share live guidelines", order: 5 },
  { id: "6", text: "Design faster", order: 6 }
];

// Pain point features
export const painPointFeatures: Feature[] = [
  {
    id: "pain-1",
    icon: FileStack,
    title: "Assets Everywhere",
    description: "Logos in email, fonts on a drive, colors in your head.",
    category: "pain-point"
  },
  {
    id: "pain-2",
    icon: Layout,
    title: "Inconsistent Look",
    description: "Each designer interprets your brand differently.",
    category: "pain-point"
  },
  {
    id: "pain-3",
    icon: Download,
    title: "Rework on Repeat",
    description: "New color? Change it in 20 files manually.",
    category: "pain-point"
  }
];

// Section split content for setup process
export const sectionContent: SectionContent[] = [
  {
    id: "setup-1",
    title: "Upload Core Assets",
    subtitle: "Logo, colors, fonts, voice — your source of truth.",
    imageUrl: illusUploadCoreAssets,
    altText: "Grayscale illustration of uploading core brand assets",
    order: 1
  },
  {
    id: "setup-2",
    title: "Auto‑Generate Everything",
    subtitle: "Guidelines, templates, print files, even a website.",
    imageUrl: illusAutoGenerate,
    altText: "Grayscale illustration of auto-generating brand outputs",
    order: 2
  },
  {
    id: "setup-3",
    title: "Use Anywhere",
    subtitle: "Download, export, or publish instantly.",
    imageUrl: illusUseAnywhere,
    altText: "Grayscale illustration of publishing and exporting brand assets",
    order: 3
  }
];

// Product modules
export const productModules: ProductModule[] = [
  {
    id: "guidelines",
    icon: Layout,
    title: "Live Brand Guidelines",
    description: "Instantly updated, shareable, beautiful.",
    imageUrl: illusGuidelines,
    category: "documentation",
    features: ["Real-time updates", "Shareable links", "Beautiful design"],
    isAvailable: true
  },
  {
    id: "design-studio",
    icon: Palette,
    title: "Design Studio",
    description: "Create on‑brand designs without leaving the OS.",
    imageUrl: illusDesignStudio,
    category: "design",
    features: ["Built-in design tools", "Brand consistency", "Template library"],
    isAvailable: true
  },
  {
    id: "print-collateral",
    icon: Printer,
    title: "Print & Collateral",
    description: "Auto‑generate business cards, letterheads, packaging.",
    imageUrl: illusPrintCollateral,
    category: "print",
    features: ["Auto-generation", "Print-ready files", "Multiple formats"],
    isAvailable: true
  },
  {
    id: "brand-export",
    icon: Download,
    title: "Brand Export",
    description: "One‑click full brand folder, perfectly organized.",
    imageUrl: illusBrandExport,
    category: "export",
    features: ["One-click export", "Organized structure", "Multiple formats"],
    isAvailable: true
  },
  {
    id: "website-builder",
    icon: Globe,
    title: "Website Builder",
    description: "Launch a branded site in hours, not weeks.",
    imageUrl: illusWebsiteBuilder,
    category: "web",
    features: ["Quick deployment", "Brand consistency", "Responsive design"],
    isAvailable: true
  },
  {
    id: "smart-ai",
    icon: Wand2,
    title: "Smart AI Assist",
    description: "Suggestions for colors, layouts, and copy.",
    imageUrl: illusSmartAI,
    category: "ai",
    features: ["Smart suggestions", "Color analysis", "Layout optimization"],
    isAvailable: true
  }
];

// Floating tiles for hero section
export const floatingTiles: FloatingTile[] = [
  {
    id: "tile-1",
    icon: Layout,
    label: "Guidelines",
    position: { right: "-0.5rem", top: "-1.5rem" },
    animationDelay: "0ms"
  },
  {
    id: "tile-2",
    icon: Printer,
    label: "Business Card",
    position: { left: "1rem", bottom: "-1.5rem" },
    animationDelay: "600ms"
  },
  {
    id: "tile-3",
    icon: Globe,
    label: "Website",
    position: { right: "2.5rem", bottom: "0" },
    animationDelay: "1200ms"
  }
];

// Statistics
export const statistics: StatItem[] = [
  {
    id: "stat-1",
    value: "80%",
    label: "Brand Recognition Boost",
    description: "Increase in brand recognition with consistent visual identity"
  },
  {
    id: "stat-2",
    value: "10–20%",
    label: "Revenue Growth through Consistency",
    description: "Average revenue increase from consistent branding"
  },
  {
    id: "stat-3",
    value: "87%",
    label: "Consumer Trust for Consistent Brands",
    description: "Percentage of consumers who trust consistent brands more"
  }
];

// Final CTA content
export const finalCTA = {
  headline: "Brand Once. Use Forever.",
  description: "Upload your brand today — never worry about consistency again.",
  buttons: [
    {
      id: "cta-primary",
      text: "Start Free",
      icon: Rocket,
      variant: "hero"
    },
    {
      id: "cta-secondary", 
      text: "Watch Demo",
      icon: Play,
      variant: "outline"
    }
  ]
};

// Section metadata
export const sectionMetadata = {
  hero: {
    id: "hero",
    title: "Hero Section",
    className: "section bg-dot-grid"
  },
  marquee: {
    id: "marquee",
    title: "Feature Marquee",
    className: "py-6"
  },
  painPoints: {
    id: "pain",
    title: "Pain Points",
    className: "section",
    headline: "Before Brand OS — Chaos. After — Control."
  },
  setup: {
    id: "setup",
    title: "Setup Process",
    className: "section bg-dot-grid",
    headline: "Set It Up Once. Brand Everything."
  },
  features: {
    id: "features",
    title: "Product Features",
    className: "section panel-dark bg-dot-grid",
    headline: "All‑in‑One Branding Powerhouse",
    subtitle: "More than guidelines — your brand OS.",
    description: "Live brand logic that auto‑applies to every output — from slides and posts to print and your website. One source of truth, used everywhere."
  },
  stats: {
    id: "stats",
    title: "Statistics",
    className: "section bg-secondary bg-dot-grid"
  },
  finalCTA: {
    id: "final-cta",
    title: "Final Call to Action",
    className: "section bg-dot-grid"
  }
};