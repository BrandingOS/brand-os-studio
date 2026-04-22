/**
 * Public API for the UI Color System tool.
 *
 * Consumers (the public landing page, the in-app page, the claim flow)
 * import only from this barrel so the internal layout can move freely.
 */
export { ColorSystemGenerator } from './components/ColorSystemGenerator';
export { useToolContext } from './hooks/useToolContext';
export type {
  ToolMode,
  ToolPermissions,
  ToolContext,
} from './hooks/useToolContext';
