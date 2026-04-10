import {
  FileStack,
  Layout,
  Download,
  Palette,
  Wand2,
  Globe,
  Printer,
} from 'lucide-react';
// User-supplied named photos. Each filename in src/assets/landing/
// matches the section it belongs to. Replacing the generic webp
// illustrations that were here before.
import illusUploadCoreAssets from '@/assets/landing/upload-core-assets.png';
import illusAutoGenerate from '@/assets/landing/auto-generate-everything.png';
import illusUseAnywhere from '@/assets/landing/use-anywhere.png';
import illusGuidelines from '@/assets/landing/live-brand-guidelines.png';
import illusDesignStudio from '@/assets/landing/design-studio.png';
import illusPrintCollateral from '@/assets/landing/print-collateral.png';
import illusBrandExport from '@/assets/landing/brand-export.png';
import illusWebsiteBuilder from '@/assets/landing/website-builder.png';
import illusSmartAI from '@/assets/landing/smart-ai-assist.png';
import type { FeatureCardData, StatData, ProductModuleData } from '@/types';

export const painPoints: FeatureCardData[] = [
  { icon: FileStack, title: 'Assets Everywhere', desc: 'Logos in email, fonts on a drive, colors in your head.' },
  { icon: Layout, title: 'Inconsistent Look', desc: 'Each designer interprets your brand differently.' },
  { icon: Download, title: 'Rework on Repeat', desc: 'New color? Change it in 20 files manually.' },
];

export const stats: StatData[] = [
  { value: '80%', label: 'Brand Recognition Boost' },
  { value: '10–20%', label: 'Revenue Growth through Consistency' },
  { value: '87%', label: 'Consumer Trust for Consistent Brands' },
];

export const productModules: ProductModuleData[] = [
  {
    icon: Layout,
    title: 'Live Brand Guidelines',
    description: 'Instantly updated, shareable, beautiful.',
    image: illusGuidelines,
  },
  {
    icon: Palette,
    title: 'Design Studio',
    description: 'Create on‑brand designs without leaving the OS.',
    image: illusDesignStudio,
  },
  {
    icon: Printer,
    title: 'Print & Collateral',
    description: 'Auto‑generate business cards, letterheads, packaging.',
    image: illusPrintCollateral,
  },
  {
    icon: Download,
    title: 'Brand Export',
    description: 'One‑click full brand folder, perfectly organized.',
    image: illusBrandExport,
  },
  {
    icon: Globe,
    title: 'Website Builder',
    description: 'Launch a branded site in hours, not weeks.',
    image: illusWebsiteBuilder,
  },
  {
    icon: Wand2,
    title: 'Smart AI Assist',
    description: 'Suggestions for colors, layouts, and copy.',
    image: illusSmartAI,
  },
];

export const setupSteps = [
  {
    title: 'Upload Core Assets',
    subtitle: 'Logo, colors, fonts, voice — your source of truth.',
    image: illusUploadCoreAssets,
  },
  {
    title: 'Auto‑Generate Everything',
    subtitle: 'Guidelines, templates, print files, even a website.',
    image: illusAutoGenerate,
  },
  {
    title: 'Use Anywhere',
    subtitle: 'Download, export, or publish instantly.',
    image: illusUseAnywhere,
  },
];
