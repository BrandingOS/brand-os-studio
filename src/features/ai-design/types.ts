/**
 * AI Design feature — shared types.
 *
 * The agent returns a structured "design spec" — a list of positioned nodes
 * on an infinite canvas. Nodes are intentionally minimal (text / rect /
 * swatch / frame) so they render identically whether the agent is calling
 * a real model or the mock fallback.
 */

export type SkillId =
  | 'design'
  | 'branding'
  | 'illustration'
  | 'social-post'
  | 'ad-creative'
  | 'video';

export interface Skill {
  id: SkillId;
  label: string;
  hint: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  skill?: SkillId;
  createdAt: number;
  /** IDs of nodes the assistant produced in this turn. */
  producedNodeIds?: string[];
}

export type DesignNode =
  | TextNode
  | RectNode
  | SwatchNode
  | FrameNode
  | LogoNode;

interface BaseNode {
  id: string;
  x: number;
  y: number;
  rotation?: number;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  text: string;
  width: number;
  fontSize: number;
  fontWeight: number;
  fontFamily?: string;
  color: string;
  align?: 'left' | 'center' | 'right';
}

export interface RectNode extends BaseNode {
  kind: 'rect';
  width: number;
  height: number;
  fill: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface SwatchNode extends BaseNode {
  kind: 'swatch';
  colors: string[];
  label?: string;
}

export interface LogoNode extends BaseNode {
  kind: 'logo';
  width: number;
  height: number;
  /** Reference to a brand logo variant; resolved by the renderer. */
  variant?: 'full' | 'icon' | 'wordmark' | 'dark' | 'light';
}

export interface FrameNode extends BaseNode {
  kind: 'frame';
  width: number;
  height: number;
  label: string;
  background?: string;
  children: DesignNode[];
}

export interface AgentTurn {
  /** Short message to display in chat. */
  message: string;
  /** Nodes to add to the canvas. */
  nodes: DesignNode[];
  /** Optional suggestions to show the user as follow-up pills. */
  suggestions?: string[];
}
