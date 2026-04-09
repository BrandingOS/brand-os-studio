/**
 * Tools platform — public API.
 *
 * Tools live in `src/features/tools/<slug>/`. They consume only what's
 * exported here. The platform's job is to take care of:
 *
 *  - The three-pane shell (ToolShell)
 *  - The public landing page template (ToolLanding)
 *  - Anonymous-session persistence (useToolSession)
 *  - The signup gate modal (ToolGate)
 *  - Anon → brand claim on signup (claimSession + registerMaterializer)
 *  - The shared registry / metadata
 */
export { ToolShell } from './ToolShell';
export { ToolLanding } from './ToolLanding';
export type { LandingSource } from './ToolLanding';
export { ToolGate } from './ToolGate';
export { useToolSession } from './useToolSession';
export type { UseToolSessionResult } from './useToolSession';
export { TOOL_REGISTRY, getTool, listTools } from './toolRegistry';
export { claimSession, registerMaterializer } from './claim';
export type { Materializer, MaterializedSession } from './claim';
export type {
  ToolSlug,
  ToolMode,
  ToolFeature,
  ToolMeta,
  ToolSession,
  GateMap,
} from './types';
