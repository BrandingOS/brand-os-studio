// Vendor badges for the model picker (badgeFor is a lookup, not a component;
// the fast-refresh warning here is accepted).
// simple-icons where one exists, a small letter chip otherwise.

import { Sparkles } from 'lucide-react';
import { SiFlux, SiOpenai, SiHuggingface, SiGooglegemini, SiCloudflare } from 'react-icons/si';
import type { ImageVendor } from '@/features/editor/ai/imageModels';

export type ModelBadge = (props: { className?: string }) => JSX.Element;

export const AutoBadge: ModelBadge = ({ className }) => (
  <Sparkles className={className} style={{ color: '#7C3AED' }} aria-hidden />
);

const NanoBananaBadge: ModelBadge = ({ className }) => (
  <span
    className={`inline-flex items-center justify-center rounded-sm ${className ?? ''}`}
    style={{ background: '#FBBF24', fontSize: '0.6rem', lineHeight: 1 }}
    aria-hidden
  >
    🍌
  </span>
);
const OpenAiBadge: ModelBadge = ({ className }) => <SiOpenai className={className} style={{ color: '#0F8C5F' }} aria-hidden />;
const FluxBadge: ModelBadge = ({ className }) => <SiFlux className={className} style={{ color: '#E11D48' }} aria-hidden />;
const FalBadge: ModelBadge = ({ className }) => <SiFlux className={className} style={{ color: '#3B82F6' }} aria-hidden />;
const HuggingFaceBadge: ModelBadge = ({ className }) => <SiHuggingface className={className} style={{ color: '#FFCC4D' }} aria-hidden />;
const CloudflareBadge: ModelBadge = ({ className }) => <SiCloudflare className={className} style={{ color: '#F38020' }} aria-hidden />;
const GeminiBadge: ModelBadge = ({ className }) => <SiGooglegemini className={className} style={{ color: '#4285F4' }} aria-hidden />;
const MockBadge: ModelBadge = ({ className }) => (
  <span className={`inline-flex items-center justify-center rounded-sm font-bold text-white ${className ?? ''}`} style={{ background: '#6b7280', fontSize: '0.5rem', lineHeight: 1 }} aria-hidden>M</span>
);

export function badgeFor(vendor: ImageVendor, id?: string): ModelBadge {
  switch (vendor) {
    case 'google': return id?.includes('nano') ? NanoBananaBadge : GeminiBadge;
    case 'openai': return OpenAiBadge;
    case 'fal': return FalBadge;
    case 'pollinations': return FluxBadge;
    case 'huggingface': return HuggingFaceBadge;
    case 'cloudflare': return CloudflareBadge;
    case 'mock': return MockBadge;
    default: return AutoBadge;
  }
}
