/**
 * Block-based editor types.
 * Every element on a guideline slide is a "block" that can be
 * selected, edited, moved, and transformed.
 */

export type BlockType = 'text' | 'heading' | 'image' | 'card' | 'chart' | 'table' | 'mockup' | 'embed' | 'sticky' | 'shape' | 'logo';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  // Position (percentage of slide)
  x: number;
  y: number;
  width: number;
  height: number;
  // Styling
  style: BlockStyle;
}

export interface BlockStyle {
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  borderRadius?: number;
  padding?: number;
}

export interface ToolbarAction {
  id: string;
  icon?: string;
  label: string;
  type: 'dropdown' | 'button' | 'color' | 'separator';
  options?: { value: string; label: string }[];
  value?: string;
}

export function getToolbarForBlock(type: BlockType): ToolbarAction[] {
  switch (type) {
    case 'text':
    case 'heading':
      return [
        { id: 'blockType', label: type === 'heading' ? 'Heading' : 'Paragraph', type: 'dropdown', options: [
          { value: 'heading', label: 'Heading' }, { value: 'text', label: 'Paragraph' },
        ]},
        { id: 'fontWeight', label: 'Medium', type: 'dropdown', options: [
          { value: 'light', label: 'Light' }, { value: 'regular', label: 'Regular' },
          { value: 'medium', label: 'Medium' }, { value: 'semibold', label: 'Semibold' },
          { value: 'bold', label: 'Bold' }, { value: 'black', label: 'Black' },
        ]},
        { id: 'fontSize', label: 'Aa', type: 'dropdown' },
        { id: 'sep1', label: '', type: 'separator' },
        { id: 'color', label: '', type: 'color' },
        { id: 'align', label: '≡', type: 'dropdown', options: [
          { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
        ]},
        { id: 'container', label: '▢', type: 'dropdown' },
        { id: 'sep2', label: '', type: 'separator' },
        { id: 'effects', label: '✏', type: 'dropdown' },
        { id: 'more', label: '···', type: 'button' },
      ];

    case 'image':
    case 'logo':
      return [
        { id: 'blockType', label: 'Image', type: 'dropdown', options: [
          { value: 'image', label: 'Image' }, { value: 'logo', label: 'Logo' },
        ]},
        { id: 'replace', label: '🖼', type: 'button' },
        { id: 'effects', label: '⚙', type: 'dropdown' },
        { id: 'crop', label: '✂', type: 'dropdown' },
        { id: 'fit', label: '📐', type: 'dropdown' },
        { id: 'more', label: '···', type: 'button' },
        { id: 'sep1', label: '', type: 'separator' },
        { id: 'fullscreen', label: '⛶', type: 'button' },
      ];

    case 'card':
      return [
        { id: 'blockType', label: 'Card', type: 'dropdown' },
        { id: 'style', label: 'Style', type: 'dropdown' },
        { id: 'more', label: '···', type: 'button' },
      ];

    default:
      return [
        { id: 'blockType', label: type, type: 'dropdown' },
        { id: 'more', label: '···', type: 'button' },
      ];
  }
}

export const TURN_INTO_OPTIONS: { type: BlockType; label: string; icon: string }[] = [
  { type: 'text', label: 'Paragraph', icon: 'T' },
  { type: 'heading', label: 'Heading', icon: 'H₁' },
  { type: 'image', label: 'Media', icon: '🖼' },
  { type: 'card', label: 'Card', icon: '▢' },
  { type: 'chart', label: 'Chart', icon: '📊' },
  { type: 'table', label: 'Table', icon: '▦' },
  { type: 'mockup', label: 'Mockup', icon: '📱' },
  { type: 'embed', label: 'Embed / link', icon: '🔗' },
  { type: 'sticky', label: 'Sticky note', icon: '📝' },
];
