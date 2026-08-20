/**
 * BrandingOS wordmark (outlined master, no live text).
 *
 * Rendered via CSS mask so it inherits `currentColor` — one component
 * works on paper (ink) and on ink (paper) without duplicate assets.
 * viewBox of the master: 0 0 561.54 88.39 → aspect ≈ 6.3527.
 */
import wordmarkUrl from '@/assets/brand/wordmark.svg';
import { cssUrl } from '@/lib/cssUrl';

const ASPECT = 561.54 / 88.39;

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="BrandingOS"
      className={className}
      style={{
        display: 'inline-block',
        aspectRatio: `${ASPECT}`,
        backgroundColor: 'currentColor',
        WebkitMaskImage: cssUrl(wordmarkUrl),
        maskImage: cssUrl(wordmarkUrl),
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
