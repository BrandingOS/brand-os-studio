// The setup nudge — replaces the full-width BrandSetupChecklist card that
// used to sit above the Brand Kit and push the entire page, WorkspaceShell's
// sticky navbar included, down by its own height.
//
// Same job, no layout cost: a small floating card in the bottom-right corner
// naming the /setup sections that still have nothing in them, with one way
// in. It takes no space in the flow, it is dismissible, and a dismissal is
// remembered per brand so a user who has said "not now" is not asked again.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DsButton, DsEyebrow } from '@/shared/ds';
import { CloseIcon } from '@/shared/ds/icons';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { missingBrandSetupSteps } from './computeBrandSetupSteps';
import { isNudgeDismissed, dismissNudge } from './nudgeDismissal';
import './brandSetupNudge.css';

interface BrandSetupNudgeProps {
  /** The same projection Setup renders, so both agree on what is missing. */
  brand: MockBrand;
  /** Identity for the dismissal record — the brand id, not the slug, which can change. */
  brandId: string;
  brandSlug: string;
}

/** Long enough that the page has painted first — the nudge arrives after the
 *  Brand Kit, rather than being part of what loads. */
const APPEAR_DELAY_MS = 700;

export function BrandSetupNudge({ brand, brandId, brandSlug }: BrandSetupNudgeProps) {
  const navigate = useNavigate();
  const missing = missingBrandSetupSteps(brand);

  const [dismissed, setDismissed] = useState(() => isNudgeDismissed(brandId));
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setDismissed(isNudgeDismissed(brandId));
  }, [brandId]);

  useEffect(() => {
    setShown(false);
    const t = window.setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [brandId]);

  if (missing.length === 0 || dismissed || !shown) return null;

  const handleDismiss = () => {
    dismissNudge(brandId);
    setDismissed(true);
  };

  return (
    <aside
      className="bsn"
      data-brand-setup-nudge
      data-missing={missing.length}
      role="complementary"
      aria-label="Brand setup"
    >
      <div className="bsn-top">
        <div>
          <DsEyebrow>Brand Setup</DsEyebrow>
          <h2 className="bsn-title">
            {missing.length === 1 ? '1 thing left' : `${missing.length} things left`}
          </h2>
        </div>
        <button
          type="button"
          className="bsn-close"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <p className="bsn-lede">Add these so templates and AI stay on-brand.</p>

      <ul className="bsn-list">
        {missing.map((step) => (
          <li key={step.id} className="bsn-item" data-step-id={step.id}>
            <span className="bsn-dot" aria-hidden />
            {step.label}
          </li>
        ))}
      </ul>

      <DsButton size="sm" arrow onClick={() => navigate(`/b/${brandSlug}/setup`)}>
        Open Setup
      </DsButton>
    </aside>
  );
}
