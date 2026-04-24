/**
 * Core types for the Tools platform.
 *
 * Every tool in `src/features/tools/<slug>/` plugs into this contract:
 * a metadata entry in the registry, a session shape that round-trips
 * through the anonymous-session store, and a `claim` function that
 * materializes the session into a real brand on signup.
 */
import type { ComponentType } from 'react';

/** Public-facing slug. Becomes part of the URL: `/tools/<slug>`. */
export type ToolSlug =
  | 'logo-variant-generator'
  | 'ui-color-system'
  | 'typescale'
  | 'mockup-studio';

/** Where a tool is currently mounted. Drives gates and persistence. */
export type ToolMode = 'in-app' | 'public';

/** What the user is actually doing — for save indicators and telemetry. */
export type ToolFeature =
  | 'export-png-1x'
  | 'export-png-2x'
  | 'export-png-3x'
  | 'export-svg'
  | 'export-pdf'
  | 'export-kit'
  | 'export-typescale'
  | 'save-session'
  | 'add-custom-color'
  | 'add-extra-variant'
  | 'mockup-premium';

/** Metadata for a tool — used by the registry, the landing page, and SEO. */
export interface ToolMeta {
  slug: ToolSlug;
  name: string;
  /** One-liner shown on the landing hero and in the tool directory. */
  tagline: string;
  /** Long-form pitch on the landing page. */
  description: string;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  /** Lucide icon component, used in the directory and chrome. */
  Icon: ComponentType<{ className?: string }>;
}

/**
 * Per-tool feature gate map.
 *
 * `'free'` features are always available. `'auth'` features require a
 * signed-in user; in public mode they trigger the signup modal.
 */
export type GateMap = Partial<Record<ToolFeature, 'free' | 'auth'>>;

/**
 * The portable session shape every tool stores. Each tool puts its
 * tool-specific state in `payload`.
 */
export interface ToolSession<TPayload = unknown> {
  id: string;
  slug: ToolSlug;
  mode: ToolMode;
  /** Anonymous token, present in public mode until claim. */
  anonymousToken?: string;
  /** Set after a logged-in user owns the session. */
  ownerUserId?: string;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
}
