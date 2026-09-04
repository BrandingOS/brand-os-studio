/**
 * Bento Grid — standalone / workspace-scope page.
 *
 * Same editor as `/b/:slug/bento` but without a required brand. Users can
 * pick one of their brands to pull identity from, or start blank. Lives
 * under `/tools/bento` so it's discoverable from the features index and
 * from outside a brand context.
 */
import { useState } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { BentoEditor } from '@/features/bento/BentoEditor';
import { BrandSourcePicker } from '@/features/bento/components/BrandSourcePicker';

export default function StandaloneBentoPage() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const brand = useBrandStore((s) => s.list.find((b) => b.id === brandId) ?? null);

  return (
    <BentoEditor
      brand={brand}
      extraLeft={<BrandSourcePicker brandId={brandId} onChange={setBrandId} />}
    />
  );
}
