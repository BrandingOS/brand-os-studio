/**
 * Logo Presentation Settings Store
 *
 * Uses the shared presentation store factory with logo-specific defaults:
 * - Header/footer OFF by default (slides have their own chrome)
 * - Corner radius 12px for the card feel
 * - Padding 0 (slides handle their own internal padding)
 */
import { createPresentationStore } from '@/shared/presentation';
import type { PresentationTemplate } from '@/shared/presentation';

export const LOGO_PRESENTATION_TEMPLATES: PresentationTemplate[] = [
  {
    id: 'premium',
    name: 'Premium',
    description: 'Full-bleed cinematic slides with bold colors and dramatic reveals',
    category: 'Cinematic',
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'Rounded cards on dark canvas — minimal, calm, premium',
    category: 'Minimal',
  },
];

export const useLogoPresentationStore = createPresentationStore(
  'logo-presentation-settings',
  {
    template: 'premium',
    spacing: { padding: 0, margins: 0, cornerRadius: 12 },
    header: { enabled: false, showDate: false, showProjectName: false },
    footer: { enabled: false, showPageNumbers: false },
  },
);
