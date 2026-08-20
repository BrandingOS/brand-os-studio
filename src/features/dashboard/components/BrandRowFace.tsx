/**
 * A brand's face at row size.
 *
 * The DECISION — which logo, on which ground — is `useBrandCardFace`, shared
 * with the 240px card at /dashboard. Only the box differs, which is why this is
 * a few lines of markup rather than a second opinion about brands.
 */
import { useBrandCardFace } from '@/shared/brand/workspaceCard';
import type { Brand } from '@/shared/types/brand';

export function BrandRowFace({ brand }: { brand: Brand }) {
  const face = useBrandCardFace(brand);

  return (
    <div
      className="w-12 h-12 rounded-md shrink-0 grid place-items-center overflow-hidden transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover/slot:scale-105"
      style={{ background: face.background, color: face.color }}
      aria-hidden="true"
    >
      {face.logoUrl ? (
        // CONTAIN, never crop: a wide lockup in a 48px square keeps its
        // proportions or it stops being the logo.
        <img src={face.logoUrl} alt="" className="w-[82%] h-[82%] object-contain" />
      ) : (
        <span className="text-lg font-semibold leading-none">{face.letter}</span>
      )}
    </div>
  );
}
