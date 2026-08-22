// The floating "finish your brand" card on /b/:slug/setup.
//
// It began life as BrandSetupChecklist, a full-width card rendered ABOVE the
// Brand Kit — which pushed the whole page, WorkspaceShell's sticky navbar
// included, down by its own height. Two things changed: it floats now, so it
// costs no layout at all; and it lives on Setup, because every one of the
// things it names is fixed on Setup.
//
// It is not a second progress meter. SetupSidebar already reports completion
// for all seven sections; this names only what is EMPTY, and each row is a
// shortcut straight into that section's add flow.

import { useEffect, useState } from 'react';
import { DsEyebrow } from '@/shared/ds';
import { CloseIcon } from '@/shared/ds/icons';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  missingBrandSetupSteps,
  type BrandSetupSectionKey,
} from './computeBrandSetupSteps';
import { isNudgeDismissed, dismissNudge } from './nudgeDismissal';
import './brandSetupNudge.css';

interface BrandSetupNudgeProps {
  /** The same projection Setup renders, so both agree on what is missing. */
  brand: MockBrand;
  /** Identity for the dismissal record — the brand id, not the slug, which can change. */
  brandId: string | undefined;
  /** Jump to the section and open its add flow. */
  onPick: (section: BrandSetupSectionKey) => void;
}

/** Long enough that the page has painted first — the nudge arrives after the
 *  board, rather than being part of what loads. */
const APPEAR_DELAY_MS = 700;

export function BrandSetupNudge({ brand, brandId, onPick }: BrandSetupNudgeProps) {
  const missing = missingBrandSetupSteps(brand);
  const key = brandId ?? '';

  const [dismissed, setDismissed] = useState(() => isNudgeDismissed(key));
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setDismissed(isNudgeDismissed(key));
  }, [key]);

  useEffect(() => {
    setShown(false);
    const t = window.setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [key]);

  if (missing.length === 0 || dismissed || !shown) return null;

  const handleDismiss = () => {
    dismissNudge(key);
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
          <li key={step.id}>
            <button
              type="button"
              className="bsn-item"
              data-step-id={step.id}
              onClick={() => onPick(step.section)}
            >
              <span className="bsn-dot" aria-hidden />
              <span className="bsn-item-label">{step.label}</span>
              <span className="bsn-item-add" aria-hidden>
                Add
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
