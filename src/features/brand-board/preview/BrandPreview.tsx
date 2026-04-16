import React from 'react';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { SaaSTemplate } from './templates/SaaSTemplate';
import { PortfolioTemplate } from './templates/PortfolioTemplate';
import { EcommerceTemplate } from './templates/EcommerceTemplate';
import { DeviceFrame } from './DeviceFrame';
import { SHADOW_MAP } from '../engine/uiPresets';

const TEMPLATE_MAP = {
  saas: SaaSTemplate,
  portfolio: PortfolioTemplate,
  ecommerce: EcommerceTemplate,
} as const;

export function BrandPreview() {
  const { draft, previewDevice: device, previewTemplate: template } = useBrandBoardStore();

  const vars: Record<string, string> = {
    '--bb-primary': draft.colors.primary,
    '--bb-secondary': draft.colors.secondary,
    '--bb-accent': draft.colors.accent,
    '--bb-bg': draft.colors.background,
    '--bb-fg': draft.colors.foreground,
    '--bb-neutral-50': draft.colors.neutrals[0] || '#fafafa',
    '--bb-neutral-100': draft.colors.neutrals[1] || '#f5f5f5',
    '--bb-neutral-200': draft.colors.neutrals[2] || '#e5e5e5',
    '--bb-neutral-300': draft.colors.neutrals[3] || '#d4d4d4',
    '--bb-neutral-400': draft.colors.neutrals[4] || '#a3a3a3',
    '--bb-neutral-500': draft.colors.neutrals[5] || '#737373',
    '--bb-font-heading': draft.typography.heading,
    '--bb-font-body': draft.typography.body,
    '--bb-radius': `${draft.uiStyle.borderRadius}px`,
    '--bb-shadow': SHADOW_MAP[draft.uiStyle.shadowIntensity] || SHADOW_MAP.medium,
  };

  const TemplateComponent = TEMPLATE_MAP[template];

  return (
    <div
      className="h-full overflow-y-auto bg-neutral-100"
      style={vars as React.CSSProperties}
    >
      <DeviceFrame device={device}>
        <TemplateComponent brandName={draft.brandName} />
      </DeviceFrame>
    </div>
  );
}
