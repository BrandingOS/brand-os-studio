/**
 * The raw browser snapshot.
 *
 * The collector runs inside the page and produces ONLY plain data — no
 * interpretation. Everything that decides meaning happens in `toIR.ts`, which is
 * pure and therefore testable without a browser. Trapping that logic inside
 * `page.evaluate` would make the most important rules in the pipeline
 * (sizing intent, token provenance) untestable.
 */

/** The computed properties the collector reads. Kept explicit so the cost is visible. */
export const COLLECTED_PROPS = [
  'display', 'position', 'flex-direction', 'flex-wrap', 'gap', 'row-gap', 'column-gap',
  'justify-content', 'align-items', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'background-color', 'color', 'opacity', 'overflow',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-radius',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'font-family', 'font-size', 'font-weight',
  'line-height', 'letter-spacing', 'text-align', 'direction',
  'transform', 'visibility',
] as const;

export type CollectedProp = (typeof COLLECTED_PROPS)[number];

export interface RawRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RawNode {
  tag: string;
  classes: string[];
  /** data-fx-* attributes, without the prefix: { component, sid, variant, pseudo, subject, role } */
  fx: Record<string, string>;
  aria: Record<string, string>;
  style: Record<string, string>;
  rect: RawRect;
  /** Own text, only when this node's sole content is text. */
  text?: string;
  /** The text came from a form control's PLACEHOLDER, not from its value. */
  isPlaceholder?: boolean;
  /** outerHTML of an <svg>, already colour-resolved. */
  svg?: string;
  children: RawNode[];
}

export interface RawCapture {
  theme: 'light' | 'dark';
  direction: 'ltr' | 'rtl';
  viewport: { w: number; h: number };
  url: string;
  capturedAt: string;
  /** Resolved value -> token name, for THIS theme. Built from the live stylesheet. */
  tokens: Record<string, string>;
  /** One entry per cell: the subject root plus the semantics the harness declared. */
  cells: Array<{
    component: string;
    sidRoot: string;
    variant: Record<string, string>;
    pseudo: string;
    root: RawNode;
  }>;
}
