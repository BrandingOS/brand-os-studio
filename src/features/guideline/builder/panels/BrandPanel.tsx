/**
 * The brand, as a compact entry point into the real Brand System.
 *
 * Not four text fields. The sections are the brand's actual sections — Logo,
 * Colours, Typography, Iconography, Voice & Tone, Strategy, Website — showing
 * the brand's real values, and editing goes through the editors Setup already
 * owns: `ColorPickerHSV`, `StrategyEditorModal`, the typescale editor. Nothing
 * here reimplements a brand control that exists.
 *
 * Two scopes, and the difference is never implicit:
 *
 *   GUIDELINE — colour and typeface can be tried in this document alone. That
 *   is what a layout wants: someone testing an accent on page 12 has not
 *   decided to repaint every design and export in the workspace.
 *
 *   BRAND — everything else edits the brand itself, and so does promoting a
 *   guideline value. Every one of those is raised to the builder as a
 *   `BrandChange` and lands behind a confirmation naming what it affects.
 *   Nothing on this panel writes to the brand without that step.
 *
 * The confirmation and the modals are raised rather than rendered here because
 * `.panel` is `position: sticky`, which creates a stacking context — a scrim
 * mounted inside it paints under the document instead of over it.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, ChevronRight, Globe2, MessageCircle, Palette, PenTool, Shapes, Sparkles, Type,
} from 'lucide-react';
import { DsButton, DsInput, DsSwatchRow } from '@/shared/ds';
import { ColorPickerHSV } from '@/features/setup/components/ColorPickerHSV';
import { setPrimary as setPrimaryLogo } from '@/features/setup/data/logoBoard';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { BRAND_SECTION_LABEL, type BrandSection } from '../../model/brandSections';
import type { GuidelineOverrides } from '../../model/document';
import { OVERRIDE_LABEL, brandValueFor } from '../../model/effectiveBrand';
import { editBrand, type BrandChange } from '../../model/brandWrites';
import type { StrategyCard } from '@/features/setup/data/strategyCards';

const SECTION_ICON: Record<BrandSection, typeof PenTool> = {
  logo: PenTool,
  colors: Palette,
  typography: Type,
  iconography: Shapes,
  voice: MessageCircle,
  strategy: Sparkles,
  website: Globe2,
};

type OverrideKey = keyof GuidelineOverrides;

interface Props {
  /** The real brand record — never the merged one, or "differs" is always false. */
  brand: Brand;
  /** The brand's Setup projection, for rendering real values. */
  view: MockBrand;
  slug: string;
  overrides: GuidelineOverrides;
  section: BrandSection | null;
  onSection: (section: BrandSection | null) => void;
  onSetOverride: (key: OverrideKey, value: string | undefined) => void;
  /** Raise a brand write for confirmation. Nothing here writes directly. */
  onRequestBrandChange: (change: BrandChange) => void;
  onEditStrategy: (card: StrategyCard) => void;
  onOpenTypeEditor: () => void;
}

export function BrandPanel(props: Props) {
  if (props.section === null) return <SectionList {...props} />;
  switch (props.section) {
    case 'colors': return <ColorsSection {...props} />;
    case 'typography': return <TypographySection {...props} />;
    case 'logo': return <LogoSection {...props} />;
    case 'strategy': return <StrategySection {...props} />;
    case 'voice': return <VoiceSection {...props} />;
    default: return <AssetSection {...props} section={props.section} />;
  }
}

// ─── The section list ────────────────────────────────────────

function SectionList({ brand, view, overrides, onSection }: Props) {
  const rows: Array<{ id: BrandSection; sub: string; changed?: boolean }> = [
    { id: 'logo', sub: count(view.logos.length, 'variant') },
    {
      id: 'colors',
      sub: [overrides.primaryColor ?? brand.primaryColor, overrides.secondaryColor ?? brand.secondaryColor]
        .filter(Boolean).join(' · ') || 'Not set',
      changed: Boolean(overrides.primaryColor || overrides.secondaryColor),
    },
    {
      id: 'typography',
      sub: [overrides.headingFont ?? brand.fonts?.primary, overrides.bodyFont ?? brand.fonts?.secondary]
        .filter(Boolean).join(' · ') || 'Not set',
      changed: Boolean(overrides.headingFont || overrides.bodyFont),
    },
    { id: 'iconography', sub: count(view.icons.length, 'icon') },
    { id: 'voice', sub: view.strategy.tone || 'Not set' },
    {
      id: 'strategy',
      sub: count(STRATEGY_CARDS.filter((c) => contentOf(c, view.strategy).trim()).length, 'answer'),
    },
    { id: 'website', sub: view.websites[0]?.url ?? 'Not set' },
  ];

  return (
    <nav className="panel-list" aria-label="Brand sections">
      {rows.map((row) => {
        const Icon = SECTION_ICON[row.id];
        return (
          <div key={row.id} className="panel-item">
            <button type="button" className="panel-item-body" onClick={() => onSection(row.id)}>
              <span className="panel-item-thumb"><Icon size={16} strokeWidth={1.6} aria-hidden /></span>
              <span className="panel-item-meta">
                <span className="panel-item-name">{BRAND_SECTION_LABEL[row.id]}</span>
                <span className="panel-item-sub">{row.sub}</span>
              </span>
              {row.changed && <span className="gl-scope-tag" title="Changed in this guideline only">GL</span>}
              <ChevronRight size={14} strokeWidth={1.8} className="gl-row-chevron" aria-hidden />
            </button>
          </div>
        );
      })}
    </nav>
  );
}

function count(n: number, noun: string): string {
  return n === 0 ? '—' : `${n} ${noun}${n === 1 ? '' : 's'}`;
}

// ─── Colours ─────────────────────────────────────────────────

function ColorsSection({ brand, view, overrides, onSetOverride, onRequestBrandChange }: Props) {
  const [editing, setEditing] = useState<OverrideKey | null>(null);
  // No labels: at panel width a colour name truncates to a letter, which reads
  // as a rendering fault. This row is a reference — the names live in Setup.
  const palette = [...view.colors.core, ...view.colors.accent].map((c) => ({ hex: c.hex }));

  return (
    <div className="gl-panel-body">
      {(['primaryColor', 'secondaryColor'] as OverrideKey[]).map((key) => {
        const value = overrides[key] ?? brandValueFor(brand, key) ?? '#000000';
        return (
          <div className="gl-field" key={key}>
            <label className="gl-field-label">{OVERRIDE_LABEL[key]}</label>
            <button
              type="button"
              className="gl-color-row-btn"
              onClick={() => setEditing(editing === key ? null : key)}
              aria-expanded={editing === key}
            >
              <span className="gl-brand-swatch is-lg" style={{ background: value }} />
              <span className="gl-color-hex">{value}</span>
            </button>
            {editing === key && (
              // Setup's picker, in its compact form — the same control the
              // brand's own colours are edited with everywhere else.
              <ColorPickerHSV
                hex={value}
                compact
                commitLabel="Use"
                onCommit={(hex) => { onSetOverride(key, hex); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            )}
            <ScopeRow
              fieldKey={key}
              brand={brand}
              overrides={overrides}
              onSetOverride={onSetOverride}
              onRequestBrandChange={onRequestBrandChange}
            />
          </div>
        );
      })}

      <div className="gl-field">
        <label className="gl-field-label">Brand palette</label>
        <DsSwatchRow swatches={palette} height={44} emptyHint="No palette yet" />
      </div>
    </div>
  );
}

// ─── Typography ──────────────────────────────────────────────

function TypographySection({
  brand, view, overrides, onSetOverride, onRequestBrandChange, onOpenTypeEditor,
}: Props) {
  return (
    <div className="gl-panel-body">
      {(['headingFont', 'bodyFont'] as OverrideKey[]).map((key) => {
        const value = overrides[key] ?? brandValueFor(brand, key) ?? '';
        return (
          <div className="gl-field" key={key}>
            <label className="gl-field-label" htmlFor={`gl-${key}`}>{OVERRIDE_LABEL[key]}</label>
            <DsInput
              id={`gl-${key}`}
              value={value}
              list="gl-brand-fonts"
              placeholder="Typeface"
              onChange={(e) => onSetOverride(key, e.target.value)}
            />
            <p className="gl-specimen" style={{ fontFamily: value || undefined }}>
              The quick brown fox
            </p>
            <ScopeRow
              fieldKey={key}
              brand={brand}
              overrides={overrides}
              onSetOverride={onSetOverride}
              onRequestBrandChange={onRequestBrandChange}
            />
          </div>
        );
      })}

      {/* The brand's own families, so the field completes rather than guesses. */}
      <datalist id="gl-brand-fonts">
        {view.fonts.map((f) => <option key={f.id} value={f.family} />)}
      </datalist>

      <DsButton tone="secondary" size="sm" onClick={onOpenTypeEditor}>
        Open type editor
      </DsButton>
    </div>
  );
}

// ─── Logo ────────────────────────────────────────────────────

function LogoSection({ brand, view, slug, onRequestBrandChange }: Props) {
  return (
    <div className="gl-panel-body">
      <div className="gl-logo-grid">
        {view.logos.map((logo, index) => (
          <div key={logo.id} className="gl-logo-cell">
            <div
              className="gl-logo-stage"
              data-tone={logo.variant}
              dangerouslySetInnerHTML={{ __html: logo.svg }}
            />
            <div className="gl-logo-foot">
              <span className="gl-logo-label">{logo.label}</span>
              {index === 0 ? (
                <span className="gl-scope-tag">Primary</span>
              ) : (
                <button
                  type="button"
                  className="gl-link-btn"
                  onClick={() => onRequestBrandChange(editBrand(
                    brand,
                    {
                      title: `Make this ${brand.name}’s primary logo?`,
                      detail: (
                        <>This changes the brand. Every surface that shows the primary
                        logo — designs, exports, the brand kit — uses{' '}
                        <strong>{logo.label}</strong> from now on.</>
                      ),
                    },
                    // The two tiles TRADE places; Setup's rule, not a reimplementation.
                    (draft) => ({ ...draft, logos: setPrimaryLogo(draft.logos, logo.id) }),
                  ))}
                >
                  Make primary
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="gl-field-hint">
        Adding, removing and re-roling variants happens in{' '}
        <Link to={`/b/${slug}/setup`}>Setup</Link>, where the primary-protection
        rule lives.
      </p>
    </div>
  );
}

// ─── Strategy + Voice ────────────────────────────────────────

function StrategySection({ view, onEditStrategy }: Props) {
  return (
    <nav className="panel-list" aria-label="Brand strategy">
      {STRATEGY_CARDS.map((card) => (
        <div key={card.key} className="panel-item">
          <button type="button" className="panel-item-body" onClick={() => onEditStrategy(card)}>
            <span className="panel-item-meta">
              <span className="panel-item-name">{card.name}</span>
              <span className="panel-item-sub">{contentOf(card, view.strategy) || 'Not set'}</span>
            </span>
            <ChevronRight size={14} strokeWidth={1.8} className="gl-row-chevron" aria-hidden />
          </button>
        </div>
      ))}
    </nav>
  );
}

function VoiceSection({ view, onEditStrategy }: Props) {
  const cards = STRATEGY_CARDS.filter((c) => c.key === 'tone' || c.key === 'personality');
  return (
    <nav className="panel-list" aria-label="Voice and tone">
      {cards.map((card) => (
        <div key={card.key} className="panel-item">
          <button type="button" className="panel-item-body" onClick={() => onEditStrategy(card)}>
            <span className="panel-item-meta">
              <span className="panel-item-name">{card.name}</span>
              <span className="panel-item-sub">{contentOf(card, view.strategy) || 'Not set'}</span>
            </span>
            <ChevronRight size={14} strokeWidth={1.8} className="gl-row-chevron" aria-hidden />
          </button>
        </div>
      ))}
    </nav>
  );
}

// ─── Iconography / Website ───────────────────────────────────

function AssetSection({ view, slug, section }: Props & { section: BrandSection }) {
  const isIcons = section === 'iconography';
  return (
    <div className="gl-panel-body">
      {isIcons ? (
        <div className="gl-icon-grid">
          {view.icons.slice(0, 24).map((name) => (
            <span key={name} className="gl-icon-cell" title={name}>
              <Camera size={14} strokeWidth={1.6} aria-hidden />
            </span>
          ))}
          {view.icons.length === 0 && <p className="gl-field-hint">No icons in this brand yet.</p>}
        </div>
      ) : (
        <ul className="gl-link-list">
          {view.websites.map((site) => <li key={site.id}>{site.url}</li>)}
          {view.links.map((link) => <li key={link.id}>{link.url}</li>)}
          {view.websites.length === 0 && view.links.length === 0 && (
            <p className="gl-field-hint">No links on this brand yet.</p>
          )}
        </ul>
      )}
      <p className="gl-field-hint">
        Managed in <Link to={`/b/${slug}/setup`}>Setup</Link>.
      </p>
    </div>
  );
}

// ─── The guideline / brand scope control ─────────────────────

function ScopeRow({
  fieldKey, brand, overrides, onSetOverride, onRequestBrandChange,
}: {
  fieldKey: OverrideKey;
  brand: Brand;
  overrides: GuidelineOverrides;
  onSetOverride: (key: OverrideKey, value: string | undefined) => void;
  onRequestBrandChange: (change: BrandChange) => void;
}) {
  const fromBrand = brandValueFor(brand, fieldKey);
  const override = overrides[fieldKey];
  if (!override || override === fromBrand) return null;

  const label = OVERRIDE_LABEL[fieldKey].toLowerCase();

  return (
    <div className="gl-scope-row">
      <span className="gl-scope-tag">Guideline only</span>
      <DsButton
        tone="secondary"
        size="sm"
        onClick={() => onRequestBrandChange(editBrand(
          brand,
          {
            title: `Update ${brand.name}’s ${label}?`,
            detail: (
              <>This changes the brand itself, not just this guideline. Every design,
              template, export and page that uses {label} will pick up{' '}
              <strong>{override}</strong> in place of{' '}
              <strong>{fromBrand ?? 'nothing'}</strong>.</>
            ),
          },
          (draft) => applyToDraft(draft, fieldKey, override),
        ))}
      >
        Update brand…
      </DsButton>
      <button type="button" className="gl-link-btn" onClick={() => onSetOverride(fieldKey, undefined)}>
        Reset
      </button>
    </div>
  );
}

/**
 * Put one guideline value into the brand's Setup projection.
 *
 * Colours are positional in `colors.core` — index 0 is primary and index 1 is
 * secondary, which is exactly how `mockBrandToPatch` reads them back out.
 * Fonts are matched by role for the same reason.
 */
function applyToDraft(draft: MockBrand, key: OverrideKey, value: string): MockBrand {
  switch (key) {
    case 'primaryColor':
    case 'secondaryColor': {
      const index = key === 'primaryColor' ? 0 : 1;
      const core = [...draft.colors.core];
      if (core[index]) core[index] = { ...core[index], hex: value };
      else core[index] = { hex: value, name: key === 'primaryColor' ? 'Primary' : 'Secondary' };
      return { ...draft, colors: { ...draft.colors, core } };
    }
    case 'headingFont':
    case 'bodyFont': {
      const index = key === 'headingFont' ? 0 : 1;
      const fonts = [...draft.fonts];
      if (fonts[index]) fonts[index] = { ...fonts[index], family: value };
      return { ...draft, fonts };
    }
    default:
      return draft;
  }
}
