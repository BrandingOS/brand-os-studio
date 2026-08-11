/**
 * Visual language for relationship types — one definition shared by the diagram
 * edges and the legend, so the legend can never describe a style the graph
 * doesn't draw.
 */
import type { RelationKind } from '../types';

export interface RelationStyle {
  label: string;
  color: string;
  dash?: string;
  animated?: boolean;
  hint: string;
}

export const RELATION_STYLE: Record<RelationKind, RelationStyle> = {
  hierarchy: {
    label: 'Route hierarchy',
    color: 'var(--ds-border-strong)',
    hint: 'parent route contains child route',
  },
  navigation: {
    label: 'Navigation',
    color: '#3f7d5c',
    animated: true,
    hint: 'page links or navigates to another route (proven in source)',
  },
  redirect: {
    label: 'Redirect',
    color: '#b07a2b',
    dash: '6 4',
    hint: 'route forwards to another route',
  },
  import: {
    label: 'Imports',
    color: 'var(--ds-text-placeholder)',
    dash: '2 4',
    hint: 'page depends on a module (level 1 only)',
  },
};
