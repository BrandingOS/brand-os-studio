/**
 * Block type registry — defines the available block types, their metadata,
 * and their default initial state for the block picker.
 */
import {
  Heading1,
  Pilcrow,
  Quote,
  Minus,
  Image as ImageIcon,
  Grid3x3,
  Palette,
  Type,
  Hexagon,
  CheckCircle,
  Video,
  Code,
  Download,
  Info,
} from 'lucide-react';
import type { BlockTypeMeta, BlockType, Block } from './types';

export const BLOCK_REGISTRY: Record<BlockType, BlockTypeMeta & { icon: typeof Heading1 }> = {
  heading: {
    type: 'heading',
    label: 'Heading',
    description: 'Section title',
    group: 'text',
    icon: Heading1,
    defaultProps: () => ({ type: 'heading', level: 2, text: 'New heading' }),
  },
  paragraph: {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Body copy',
    group: 'text',
    icon: Pilcrow,
    defaultProps: () => ({
      type: 'paragraph',
      text: 'Write your paragraph here. Plain prose with sensible defaults — no rich text yet.',
    }),
  },
  quote: {
    type: 'quote',
    label: 'Quote',
    description: 'Pulled quote',
    group: 'text',
    icon: Quote,
    defaultProps: () => ({ type: 'quote', text: 'Design is intelligence made visible.', author: 'Alina Wheeler' }),
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    description: 'Section break',
    group: 'utility',
    icon: Minus,
    defaultProps: () => ({ type: 'divider', variant: 'line' }),
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Single image with caption',
    group: 'media',
    icon: ImageIcon,
    defaultProps: () => ({
      type: 'image',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
      caption: 'Caption goes here',
      layout: 'contained',
    }),
  },
  'image-grid': {
    type: 'image-grid',
    label: 'Image grid',
    description: 'Multiple images in a grid',
    group: 'media',
    icon: Grid3x3,
    defaultProps: () => ({
      type: 'image-grid',
      images: [
        { url: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=600', caption: '' },
        { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', caption: '' },
        { url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600', caption: '' },
      ],
      columns: 3,
    }),
  },
  'color-swatch': {
    type: 'color-swatch',
    label: 'Color swatch',
    description: 'Single brand color',
    group: 'identity',
    icon: Palette,
    defaultProps: () => ({ type: 'color-swatch', hex: '#7c3aed', name: 'Primary', usage: 'Headlines, primary actions' }),
  },
  'color-palette': {
    type: 'color-palette',
    label: 'Color palette',
    description: 'Full palette grid',
    group: 'identity',
    icon: Palette,
    defaultProps: () => ({
      type: 'color-palette',
      swatches: [
        { hex: '#7c3aed', name: 'Primary' },
        { hex: '#06b6d4', name: 'Accent' },
        { hex: '#0a0a0f', name: 'Ink' },
        { hex: '#fafafa', name: 'Paper' },
      ],
    }),
  },
  'type-specimen': {
    type: 'type-specimen',
    label: 'Type specimen',
    description: 'Font sample at scale',
    group: 'identity',
    icon: Type,
    defaultProps: () => ({
      type: 'type-specimen',
      fontFamily: 'Plus Jakarta Sans',
      sampleText: 'Aa',
      weights: [400, 600, 700],
    }),
  },
  'logo-card': {
    type: 'logo-card',
    label: 'Logo card',
    description: 'Brand logo display',
    group: 'identity',
    icon: Hexagon,
    defaultProps: () => ({
      type: 'logo-card',
      logoUrl: '',
      variant: 'primary',
      background: '#fafafa',
      caption: 'Primary logo · use on light backgrounds',
    }),
  },
  'do-dont': {
    type: 'do-dont',
    label: 'Do / Don\'t',
    description: 'Side-by-side guidance',
    group: 'identity',
    icon: CheckCircle,
    defaultProps: () => ({
      type: 'do-dont',
      do: { text: 'Use the logo with at least 1x clear space on all sides.' },
      dont: { text: 'Don\'t place the logo on busy photographic backgrounds.' },
    }),
  },
  video: {
    type: 'video',
    label: 'Video',
    description: 'Embedded video',
    group: 'media',
    icon: Video,
    defaultProps: () => ({
      type: 'video',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      caption: 'Brand reel',
    }),
  },
  code: {
    type: 'code',
    label: 'Code embed',
    description: 'Snippet block',
    group: 'utility',
    icon: Code,
    defaultProps: () => ({
      type: 'code',
      language: 'typescript',
      code: '// Brand color tokens\nexport const colors = {\n  primary: "#7c3aed",\n  accent: "#06b6d4",\n};',
    }),
  },
  download: {
    type: 'download',
    label: 'Download',
    description: 'File download CTA',
    group: 'utility',
    icon: Download,
    defaultProps: () => ({
      type: 'download',
      label: 'Brand kit (zip)',
      url: '#',
      fileSize: '12.4 MB',
      format: 'ZIP',
    }),
  },
  callout: {
    type: 'callout',
    label: 'Callout',
    description: 'Highlighted note',
    group: 'utility',
    icon: Info,
    defaultProps: () => ({
      type: 'callout',
      variant: 'info',
      title: 'Important',
      text: 'Always use the latest logo files from the asset library.',
    }),
  },
};

export const BLOCK_GROUPS: Array<{ id: 'text' | 'media' | 'identity' | 'utility'; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'identity', label: 'Brand identity' },
  { id: 'media', label: 'Media' },
  { id: 'utility', label: 'Utility' },
];

export function newBlock(type: BlockType): Block {
  const meta = BLOCK_REGISTRY[type];
  return { id: crypto.randomUUID(), ...meta.defaultProps() } as Block;
}
