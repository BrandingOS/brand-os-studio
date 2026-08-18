/**
 * The brand, as this guideline sees it.
 *
 * The rule this panel exists to enforce: **editing here changes the guideline,
 * not the brand.** A guideline is a document about the brand, and a user trying
 * a different accent on page 12 has not decided to repaint every design, deck
 * and export in the workspace. So every control writes a guideline-scoped
 * override, the panel says plainly when a value differs from the brand, and
 * pushing that value onto the brand is a separate action behind a confirmation
 * that names what it will affect.
 *
 * The logo is deliberately read-only. Setup owns the logo board — roles,
 * variants, promotion, the primary-protection rule — and a second, thinner
 * logo editor here would be a place to get that wrong.
 *
 * The confirmation itself is raised to the builder rather than rendered here.
 * `.gl-sidebar` is `position: sticky`, which creates a stacking context, so a
 * modal scrim mounted inside it is trapped under the document — it dimmed the
 * panel and painted behind the pages.
 */
import { Link } from 'react-router-dom';
import { DsButton, DsInput } from '@/shared/ds';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineOverrides } from '../../model/document';
import { OVERRIDE_LABEL, brandValueFor } from '../../model/effectiveBrand';

type OverrideKey = keyof GuidelineOverrides;

const COLOR_KEYS: OverrideKey[] = ['primaryColor', 'secondaryColor'];
const FONT_KEYS: OverrideKey[] = ['headingFont', 'bodyFont'];

export function BrandPanel({
  brand,
  slug,
  overrides,
  onSetOverride,
  onRequestApply,
}: {
  /** The real brand record — never the merged one, or "differs" is always false. */
  brand: Brand;
  slug: string;
  overrides: GuidelineOverrides;
  onSetOverride: (key: OverrideKey, value: string | undefined) => void;
  onRequestApply: (key: OverrideKey) => void;
}) {
  const logo = pickLogoOnBackground(brand, '#ffffff');

  return (
    <div className="gl-panel-body">
      <p className="gl-panel-note">
        Changes here apply to <strong>this guideline only</strong>. Updating the
        brand itself is a separate step.
      </p>

      <section className="gl-field-group">
        <h3 className="gl-field-group-title">Logo</h3>
        <div className="gl-logo-preview">
          {logo?.url ? (
            <img src={logo.url} alt={`${brand.name} logo`} />
          ) : (
            <span className="gl-logo-letter">{brand.name?.charAt(0) ?? 'B'}</span>
          )}
        </div>
        <p className="gl-field-hint">
          Logo variants live in <Link to={`/b/${slug}/setup`}>Setup</Link>, where roles
          and fallbacks are handled together.
        </p>
      </section>

      <section className="gl-field-group">
        <h3 className="gl-field-group-title">Colours</h3>
        {COLOR_KEYS.map((key) => (
          <BrandValueRow
            key={key}
            fieldKey={key}
            kind="color"
            brand={brand}
            overrides={overrides}
            onSetOverride={onSetOverride}
            onRequestApply={() => onRequestApply(key)}
          />
        ))}
      </section>

      <section className="gl-field-group">
        <h3 className="gl-field-group-title">Typography</h3>
        {FONT_KEYS.map((key) => (
          <BrandValueRow
            key={key}
            fieldKey={key}
            kind="font"
            brand={brand}
            overrides={overrides}
            onSetOverride={onSetOverride}
            onRequestApply={() => onRequestApply(key)}
          />
        ))}
      </section>
    </div>
  );
}

function BrandValueRow({
  fieldKey,
  kind,
  brand,
  overrides,
  onSetOverride,
  onRequestApply,
}: {
  fieldKey: OverrideKey;
  kind: 'color' | 'font';
  brand: Brand;
  overrides: GuidelineOverrides;
  onSetOverride: (key: OverrideKey, value: string | undefined) => void;
  onRequestApply: () => void;
}) {
  const fromBrand = brandValueFor(brand, fieldKey);
  const override = overrides[fieldKey];
  const value = override ?? fromBrand ?? '';
  const differs = Boolean(override && override !== fromBrand);

  return (
    <div className="gl-field" data-differs={differs || undefined}>
      <label className="gl-field-label" htmlFor={`gl-field-${fieldKey}`}>
        {OVERRIDE_LABEL[fieldKey]}
      </label>

      {kind === 'color' ? (
        <div className="gl-color-row">
          <input
            id={`gl-field-${fieldKey}`}
            type="color"
            className="gl-color-chip"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
            onChange={(e) => onSetOverride(fieldKey, e.target.value)}
            aria-label={`${OVERRIDE_LABEL[fieldKey]} colour`}
          />
          <DsInput
            value={value}
            onChange={(e) => onSetOverride(fieldKey, e.target.value)}
            placeholder="#000000"
            aria-label={`${OVERRIDE_LABEL[fieldKey]} hex`}
          />
        </div>
      ) : (
        <>
          <DsInput
            id={`gl-field-${fieldKey}`}
            value={value}
            onChange={(e) => onSetOverride(fieldKey, e.target.value)}
            placeholder="Typeface name"
          />
          <p className="gl-font-sample" style={{ fontFamily: value || undefined }}>
            The quick brown fox
          </p>
        </>
      )}

      {differs && (
        <div className="gl-field-scope">
          <span className="gl-field-scope-tag">Guideline only</span>
          <div className="gl-field-scope-actions">
            {/* Secondary, not tertiary: a bare text button next to an
                underlined link gives two identical-looking affordances for two
                very different consequences. */}
            <DsButton tone="secondary" size="sm" onClick={onRequestApply}>
              Update brand…
            </DsButton>
            <button type="button" className="gl-link-btn" onClick={() => onSetOverride(fieldKey, undefined)}>
              Reset to brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
