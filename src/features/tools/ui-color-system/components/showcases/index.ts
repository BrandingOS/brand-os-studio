/**
 * Barrel for the showcase tabs plus the ordered tab list the main
 * board iterates over. Adding a showcase is a two-line change here.
 */
import type { ComponentType } from 'react';
import type { ShowcaseProps } from './showcase-shared';
import { CardsShowcase } from './CardsShowcase';
import { WebsiteShowcase } from './WebsiteShowcase';
import { DashboardShowcase } from './DashboardShowcase';
import { ComponentsShowcase } from './ComponentsShowcase';
import { AppsShowcase } from './AppsShowcase';
import { ChartsShowcase } from './ChartsShowcase';
import { GradientsShowcase } from './GradientsShowcase';
import { LogosShowcase } from './LogosShowcase';
import { HeadingsShowcase } from './HeadingsShowcase';

export type ShowcaseKey =
  | 'cards'
  | 'website'
  | 'dashboard'
  | 'components'
  | 'apps'
  | 'charts'
  | 'gradients'
  | 'logos'
  | 'headings';

export interface ShowcaseEntry {
  key: ShowcaseKey;
  label: string;
  Component: ComponentType<ShowcaseProps>;
}

export const SHOWCASES: ShowcaseEntry[] = [
  { key: 'cards', label: 'Cards', Component: CardsShowcase },
  { key: 'website', label: 'Website', Component: WebsiteShowcase },
  { key: 'dashboard', label: 'Dashboard', Component: DashboardShowcase },
  { key: 'components', label: 'Components', Component: ComponentsShowcase },
  { key: 'apps', label: 'Apps', Component: AppsShowcase },
  { key: 'charts', label: 'Charts', Component: ChartsShowcase },
  { key: 'gradients', label: 'Gradients', Component: GradientsShowcase },
  { key: 'logos', label: 'Logos', Component: LogosShowcase },
  { key: 'headings', label: 'Headings', Component: HeadingsShowcase },
];

export type { ShowcaseProps } from './showcase-shared';
