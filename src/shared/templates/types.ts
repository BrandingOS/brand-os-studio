/**
 * Variable-Based Template System — Core Types
 *
 * A TemplateDefinition is the portable JSON format that describes any
 * design in BrandOS. Every visual property can be bound to a variable
 * (brand color, font, logo, user-editable text). The resolution engine
 * takes a template + brand → resolved design ready to render.
 */

// ─── Template Definition ──────────────────────────────────────────

export interface TemplateDefinition {
  id: string;
  version: 1;
  meta: TemplateMeta;
  canvas: TemplateCanvas;
  pages: TemplatePage[];
  variables: TemplateVariable[];
  author?: TemplateAuthor;
}

export interface TemplateMeta {
  name: string;
  description?: string;
  type: TemplateType;
  category: string;
  tags: string[];
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TemplateType =
  | 'business-card'
  | 'social-post'
  | 'social-story'
  | 'social-cover'
  | 'presentation'
  | 'invoice'
  | 'brand-guide'
  | 'profile-icon'
  | 'mockup'
  | 'letterhead'
  | 'poster'
  | 'custom';

export interface TemplateCanvas {
  width: number;
  height: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface TemplatePage {
  id: string;
  name?: string;
  background: TemplateBackground;
  elements: TemplateElement[];
}

export interface TemplateBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string;
  gradientTo?: string;
  gradientAngle?: number;
  opacity?: number;
}

// ─── Elements ─────────────────────────────────────────────────────

export type TemplateElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | LogoElement
  | DividerElement;

export interface BaseElement {
  id: string;
  type: string;
  /** Position as percentage of canvas (0-100) */
  position: { x: number; y: number };
  /** Size as percentage of canvas (0-100) */
  size: { width: number; height: number };
  rotation?: number;
  opacity?: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  style: TextStyle;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  color: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'circle' | 'line';
  style: ShapeStyle;
}

export interface ShapeStyle {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface LogoElement extends BaseElement {
  type: 'logo';
  variant: 'full' | 'icon' | 'wordmark' | 'monogram' | 'auto';
  src: string;
  adaptToBackground?: boolean;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  style: { color: string; thickness: number };
}

// ─── Variables ────────────────────────────────────────────────────

export interface TemplateVariable {
  path: string;
  label: string;
  type: 'text' | 'color' | 'image' | 'font' | 'number';
  defaultValue: string;
  source: 'brand' | 'content';
  placeholder?: string;
  group?: string;
}

export interface TemplateAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

// ─── Resolved Template (output of resolution) ─────────────────────

export interface ResolvedTemplate {
  meta: TemplateMeta;
  canvas: TemplateCanvas;
  pages: TemplatePage[];
}
