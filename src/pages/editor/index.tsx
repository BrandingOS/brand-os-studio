/**
 * Standalone editor page — works without a brand context.
 * Creates a minimal brand object for the editor to use.
 */
import { OptimizedDesignEditor } from '@/features/editor/components/OptimizedDesignEditor';
import type { Brand } from '@/shared/types/brand';

const STANDALONE_BRAND: Brand = {
  id: 'standalone',
  slug: 'standalone',
  name: 'Quick Design',
  primaryColor: '#6366f1',
  secondaryColor: '#a855f7',
  fonts: { primary: 'Inter', secondary: 'Inter' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function StandaloneEditorPage() {
  return <OptimizedDesignEditor brand={STANDALONE_BRAND} brandId="standalone" />;
}
