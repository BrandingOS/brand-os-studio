/**
 * BrandPreview — thin wrapper over BrandBoardCanvas.
 *
 * Kept as a stable export so existing imports keep working. All the
 * rendering logic lives in BrandBoardCanvas; the old SaaS/Portfolio/
 * Ecommerce *webpage* mockups were removed — Brand Board is a branding
 * deliverable (color palette + typography + application mock on one
 * canvas), not a website preview.
 */
import { BrandBoardCanvas } from './BrandBoardCanvas';

export function BrandPreview() {
  return (
    <div className="h-full overflow-y-auto bg-neutral-100 dark:bg-neutral-900">
      <BrandBoardCanvas />
    </div>
  );
}
