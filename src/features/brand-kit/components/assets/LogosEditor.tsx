/**
 * Editing the brand's logo SYSTEM, from inside the Brand Kit.
 *
 * The Logos card's editor opened with an empty side panel and zero fields,
 * and Save did nothing (`.audit/OURS.md` D7). This panel is what that card
 * always needed, and the four things it changes are exactly the four a
 * measurement cannot decide:
 *
 *  • **The name of a variant.** Onboarding writes a 400-character
 *    description where a name goes, so the tile captions and the export
 *    filenames were paragraphs (D25 / D57). A name is a name.
 *  • **Which variant a piece of artwork IS.** The role is what every other
 *    surface asks for — the avatar wants the icon, an export wants the
 *    wordmark — so it is a decision about the file, not about this page.
 *  • **Which grounds the logo may be published on.**
 *  • **Which mono cuts the system offers.**
 *
 * Everything else the drilldown shows stays DERIVED. Which variant reads on
 * which colour is contrast, not taste, and storing the pairings would let a
 * saved list disagree with the palette that produced it the moment a colour
 * changed. The two lists here are the half derivation cannot reach: a ground
 * the brand has ruled out anyway, and a cut it does not publish. Both are
 * absent by default, so a brand that never opens this panel keeps exactly the
 * system it had.
 *
 * Three rules it exists to keep, and they are the ones the sibling asset
 * editors keep too:
 *
 *  • **A role is a single seat, so choosing one TRADES.** Two tiles cannot
 *    both be the wordmark. Taking a role hands its old holder the seat you
 *    left — the same rule `setup/data/logoBoard.ts` keeps for Setup's board,
 *    and nothing is ever dropped.
 *  • **Every write goes down the Setup chain**: `brandToMockBrand` → mutate
 *    the whole MockBrand → `mockBrandToPatch(next, brand)` →
 *    `useBrandStore.update`. `mockBrandToPatch` diffs a WHOLE MockBrand, so
 *    the draft always starts from `brandToMockBrand`; a hand-built partial
 *    emits destructive diffs.
 *  • **Nothing is written without a confirmation that NAMES the change.** A
 *    logo is the one asset every other surface in the product reaches for, so
 *    the dialog lists each change in the user's own words rather than asking
 *    "Save?".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DsButton, DsCheckbox, DsConfirmDialog, DsInput, DsModal, DsSelect } from '@/shared/ds';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { BrandLogo, MockBrand } from '@/features/setup/data/mockBrand';
import { TILE_ID_BY_ROLE, TILE_LABEL, reground } from '@/features/setup/data/logoBoard';
import { LOGO_ROLE_DEFS, type LogoRoleDef } from '@/shared/brand/logoRoles';
import type { LogoRole } from '@/shared/types/brandAssets';
import { logoSourceForTemplate } from './logoVariants';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import {
  allBrandGrounds,
  contrastRatio,
  extractWrappedImageUrl,
  logoCombosFor,
  stripLogoBackground,
  type BrandGround,
  type LogoTreatment,
} from '../../data/recolorLogo';
import './assets.css';

/** The two cuts, in the order the system offers them. */
const TREATMENTS: Array<{ id: LogoTreatment; label: string; hex: string; hint: string }> = [
  {
    id: 'black',
    label: 'Black cut',
    hex: '#000000',
    hint: 'Light grounds',
  },
  {
    id: 'white',
    label: 'White cut',
    hex: '#FFFFFF',
    hint: 'Dark grounds',
  },
];

/** One row of the variant list. `key` is stable across edits so a rename
 *  does not cost the field its focus while the role trades underneath it. */
type Row = {
  key: string;
  /** Index into the brand's own `logos`, so the artwork never moves. */
  source: number;
  name: string;
  role: LogoRole;
};

export type LogosEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
  /**
   * The drilldown tile the user pressed ✎ on, when they came from one.
   *
   * A tile's pencil used to open the legacy card editor with an empty right
   * panel (QA Q6). It opens THIS panel now — the same one the card opens,
   * because the answer to "edit this logo" is the logo system — and the
   * variant the tile was drawn from is scrolled to and marked, so arriving
   * from a wall of fifteen tiles does not mean hunting for the row again.
   */
  focusVariantId?: string | null;
};

const DEF_BY_ROLE = new Map(LOGO_ROLE_DEFS.map((d) => [d.role, d]));

/** The name a role is offered under. Setup's own wording wins where the two
 *  vocabularies differ ("Icon", not "Brand Icon"), because that is what the
 *  board beside this one says. */
function roleLabel(def: LogoRoleDef): string {
  return TILE_LABEL[def.role] ?? def.label;
}

/** A free role for a tile that arrived without one — only the generated
 *  lettermark placeholder ever does. */
function firstFreeRole(taken: Set<LogoRole>): LogoRole {
  return LOGO_ROLE_DEFS.find((d) => !taken.has(d.role))?.role ?? 'primary';
}

function rowsFrom(brand: MockBrand): Row[] {
  const taken = new Set<LogoRole>();
  return (brand.logos ?? []).map((logo, i) => {
    const role = logo.role ?? (i === 0 ? 'primary' : firstFreeRole(taken));
    taken.add(role);
    return { key: `${logo.id || 'logo'}-${i}`, source: i, name: logo.label ?? '', role };
  });
}

/**
 * The board the rows describe.
 *
 * Every tile carries its role, which is what makes the write AUTHORITATIVE in
 * `mockBrandToPatch` — a board whose tiles all know what they are IS the
 * answer, and a slot a swap has just emptied is really emptied. The artwork
 * is only re-GROUNDED, never recoloured: moving a logo into the On-dark slot
 * previews it on black; it does not make a light logo out of a dark one.
 */
function boardFromRows(logos: BrandLogo[], rows: Row[]): BrandLogo[] {
  const next = rows.map((row) => {
    const src = logos[row.source];
    const def = DEF_BY_ROLE.get(row.role);
    const tone = def?.tone ?? src?.variant ?? 'light';
    return {
      ...src,
      id: TILE_ID_BY_ROLE[row.role] ?? row.role,
      label: row.name.trim() || roleLabel(def ?? LOGO_ROLE_DEFS[0]),
      variant: tone,
      role: row.role,
      svg: reground(src?.svg ?? '', tone),
    } as BrandLogo;
  });
  // The primary renders and persists first — `logosToAssetsDict` anchors
  // `brand.logo` on it.
  const at = next.findIndex((l) => l.role === 'primary');
  if (at > 0) next.unshift(...next.splice(at, 1));
  return next;
}

/** The artwork on its own, at thumbnail size. An uploaded raster is an
 *  `<img>`; a true vector is inlined with Setup's preview ground stripped, so
 *  the row shows the drawing rather than a grey square. */
function LogoThumb({ logo }: { logo: BrandLogo | undefined }) {
  if (!logo) return <span className="bka-logos-thumb" />;
  const url = extractWrappedImageUrl(logo.svg);
  // The well follows the artwork's own GROUND, which is what `variant` records
  // — the On-dark tile holds light artwork, and on the panel's ordinary
  // surface it was a blank box. Same rule the Library grid keeps in
  // `folders/artworkTone.ts`: the artwork is fixed, so the background moves.
  const dark = logo.variant === 'dark';
  return (
    <span className="bka-logos-thumb" data-tone={dark ? 'dark' : 'light'}>
      {url ? (
        <img src={url} alt="" />
      ) : (
        <span
          className="bka-logos-thumb-art"
          dangerouslySetInnerHTML={{ __html: stripLogoBackground(logo.svg) }}
        />
      )}
    </span>
  );
}

export function LogosEditor({
  open,
  onClose,
  brand,
  sourceBrand,
  onBrandChange,
  focusVariantId,
}: LogosEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(brand));
  // A SNAPSHOT with the same keys as `rows`. Re-deriving it from the brand
  // mints new keys, so every row would read as newly added.
  const [original, setOriginal] = useState<Row[]>(rows);

  const offered = useMemo(() => allBrandGrounds(brand), [brand]);
  const [grounds, setGrounds] = useState<string[]>(() => pickGrounds(brand, offered));
  const [cuts, setCuts] = useState<LogoTreatment[]>(() => pickCuts(brand));
  const [startGrounds, setStartGrounds] = useState<string[]>(grounds);
  const [startCuts, setStartCuts] = useState<LogoTreatment[]>(cuts);

  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the panel opens: it must show the brand as it is NOW,
  // not the draft someone abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    const seeded = rowsFrom(brand);
    const seededGrounds = pickGrounds(brand, allBrandGrounds(brand));
    const seededCuts = pickCuts(brand);
    setRows(seeded);
    setOriginal(seeded);
    setGrounds(seededGrounds);
    setStartGrounds(seededGrounds);
    setCuts(seededCuts);
    setStartCuts(seededCuts);
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * The row the tile that opened this panel is drawn from.
   *
   * Held as the row's SOURCE index rather than its key, because the keys are
   * re-minted on every re-seed and a stale key would mark nothing.
   */
  const focusSource = useMemo(
    () => (open && focusVariantId ? logoSourceForTemplate(brand, focusVariantId) : null),
    // `brand` is read once, at open — a live repaint must not move the mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, focusVariantId],
  );
  const focusRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!open || focusSource === null) return;
    // One frame, so the modal has laid out before anything is scrolled.
    const id = requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [open, focusSource]);

  /** The brand as this panel would leave it. Everything below reads it, so
   *  the preview, the ground list and the save all describe one thing. */
  const preview = useMemo<MockBrand>(() => {
    const next: MockBrand = { ...brand, logos: boardFromRows(brand.logos ?? [], rows) };
    // Absent stays absent: a policy that rules nothing out is not a policy,
    // and storing "all of them" freezes today's palette into tomorrow's.
    if (grounds.length < offered.length) next.logoGrounds = grounds;
    else delete next.logoGrounds;
    if (cuts.length < TREATMENTS.length) next.logoTreatments = cuts;
    else delete next.logoTreatments;
    return next;
  }, [brand, rows, grounds, cuts, offered.length]);

  useEffect(() => {
    if (!open) return;
    onBrandChange?.(preview);
  }, [open, preview, onBrandChange]);

  /** The system the preview produces — the tiles the drilldown will show. */
  const system = useMemo(() => logoCombosFor(preview), [preview]);
  const placed = useMemo(
    () => system.filter((t) => t.kind === 'pairing' || t.kind === 'treatment'),
    [system],
  );

  /**
   * What each OFFERED ground gets, whether or not it is currently on.
   *
   * The FIRST tile on a ground, not the last: a ground can carry a pairing and
   * a mono treatment, and `logoCombosFor` emits every pairing before any
   * treatment. Reading the last one told a brand whose blue lockup reads at
   * 11:1 on white that white carries "Black · 21.0:1" — true of a tile on that
   * ground, and not the answer to "what goes here".
   */
  const groundState = useMemo(() => {
    const byHex = new Map<string, (typeof placed)[number]>();
    for (const t of placed) {
      const key = t.bg.hex.toLowerCase();
      if (!byHex.has(key)) byHex.set(key, t);
    }
    return offered.map((g) => ({ ground: g, tile: byHex.get(g.hex.toLowerCase()) }));
  }, [offered, placed]);

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    for (const row of rows) {
      const before = original.find((o) => o.key === row.key);
      if (!before) continue;
      if (before.name.trim() !== row.name.trim()) {
        out.push(`Rename “${before.name || 'this variant'}” to “${row.name.trim()}”`);
      }
      if (before.role !== row.role) {
        out.push(
          `“${row.name.trim() || roleWord(row.role)}” becomes the ${roleWord(row.role)} (was the ${roleWord(before.role)})`,
        );
      }
    }
    for (const g of offered) {
      const was = startGrounds.some((h) => h.toLowerCase() === g.hex.toLowerCase());
      const now = grounds.some((h) => h.toLowerCase() === g.hex.toLowerCase());
      if (was && !now) out.push(`Stop publishing the logo on ${g.name}`);
      if (!was && now) out.push(`Publish the logo on ${g.name} again`);
    }
    for (const t of TREATMENTS) {
      const was = startCuts.includes(t.id);
      const now = cuts.includes(t.id);
      if (was && !now) out.push(`Stop offering the ${t.label.toLowerCase()}`);
      if (!was && now) out.push(`Offer the ${t.label.toLowerCase()} again`);
    }
    return out;
  }, [rows, original, offered, grounds, startGrounds, cuts, startCuts]);

  const rename = useCallback((key: string, name: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
  }, []);

  /** A role is a single seat: taking one hands its old holder the seat you
   *  left, so the two variants TRADE and neither drawing is dropped. */
  const assignRole = useCallback((key: string, role: LogoRole) => {
    setRows((prev) => {
      const mover = prev.find((r) => r.key === key);
      if (!mover || mover.role === role) return prev;
      return prev.map((r) => {
        if (r.key === key) return { ...r, role };
        if (r.role === role) return { ...r, role: mover.role };
        return r;
      });
    });
  }, []);

  const toggleGround = useCallback((hex: string) => {
    setGrounds((prev) => {
      const on = prev.some((h) => h.toLowerCase() === hex.toLowerCase());
      if (!on) return [...prev, hex];
      // A system with nowhere to place the logo is not a system. The last
      // ground stays on rather than the panel saving an empty wall.
      if (prev.length <= 1) return prev;
      return prev.filter((h) => h.toLowerCase() !== hex.toLowerCase());
    });
  }, []);

  const toggleCut = useCallback((id: LogoTreatment) => {
    setCuts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }, []);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand) return;
    setSaving(true);
    setError(null);
    try {
      // The Setup chain, exactly. The draft starts from the WHOLE projection
      // so the patch diffs a whole brand — see the header.
      const draft = brandToMockBrand(sourceBrand);
      const next: MockBrand = { ...draft, logos: boardFromRows(draft.logos ?? [], rows) };
      if (grounds.length < offered.length) next.logoGrounds = grounds;
      else delete next.logoGrounds;
      if (cuts.length < TREATMENTS.length) next.logoTreatments = cuts;
      else delete next.logoTreatments;
      const patch = mockBrandToPatch(next, sourceBrand);
      await useBrandStore.getState().update(sourceBrand.id, patch);
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The logo system could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [rows, grounds, cuts, offered.length, sourceBrand, onClose]);

  const roleOptions = useMemo(
    () => LOGO_ROLE_DEFS.map((d) => ({ value: d.role, label: roleLabel(d) })),
    [],
  );

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Logos"
        actions={
          <>
            <DsButton tone="secondary" size="sm" onClick={onClose}>
              Cancel
            </DsButton>
            <DsButton
              tone="primary"
              size="sm"
              disabled={!canWrite || changes.length === 0 || saving}
              onClick={() => setConfirming(true)}
            >
              {saving ? 'Saving…' : 'Save logo system'}
            </DsButton>
          </>
        }
      >
        <div className="bka-logos">
          {/* The system as it will be, above the controls that change it —
              the whole point of the panel is that the change is visible
              before it is saved. */}
          <div className="bka-logos-preview" data-testid="logos-preview">
            {placed.map((tile) => (
              <span
                key={`${tile.kind}-${tile.mark.hex}-${tile.bg.hex}`}
                className="bka-logos-placed"
                style={{ backgroundColor: tile.bg.hex }}
                title={`${tile.mark.name} on ${tile.bg.name} — ${tile.contrast.toFixed(1)}:1`}
              >
                <span
                  className="bka-logos-placed-ink"
                  style={{ backgroundColor: tile.mark.hex }}
                  aria-hidden
                />
              </span>
            ))}
          </div>
          <p className="bka-logos-note">
            {placed.length} approved placement{placed.length === 1 ? '' : 's'} ·{' '}
            {system.length - placed.length} rule{system.length - placed.length === 1 ? '' : 's'}.
            Every pairing here clears the contrast floor; the kit exports exactly these.
          </p>

          <section className="bka-logos-section">
            <h3 className="bka-logos-heading">Variants</h3>
            <ul className="bka-logos-list">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="bka-logos-row"
                  data-focused={row.source === focusSource || undefined}
                  ref={row.source === focusSource ? focusRef : undefined}
                >
                  <LogoThumb logo={brand.logos?.[row.source]} />
                  <span className="bka-logos-meta">
                    <DsInput
                      value={row.name}
                      aria-label={`Name for ${roleWord(row.role)}`}
                      onChange={(e) => rename(row.key, e.target.value)}
                    />
                    <span className="bka-logos-sub">shown as {roleWord(row.role)}</span>
                  </span>
                  <DsSelect
                    options={roleOptions}
                    value={row.role}
                    aria-label={`Variant for ${row.name || roleWord(row.role)}`}
                    onChange={(v) => assignRole(row.key, v as LogoRole)}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="bka-logos-section">
            <h3 className="bka-logos-heading">Grounds</h3>
            <p className="bka-logos-note">
              The colours the logo may be published on. The kit still decides WHICH variant
              goes on each — that is contrast, not taste.
            </p>
            <ul className="bka-logos-grounds">
              {groundState.map(({ ground, tile }) => {
                const on = grounds.some((h) => h.toLowerCase() === ground.hex.toLowerCase());
                return (
                  <li key={ground.hex} className="bka-logos-ground" data-off={!on}>
                    <DsCheckbox checked={on} onChange={() => toggleGround(ground.hex)} />
                    <span
                      className="bka-logos-swatch"
                      style={{ backgroundColor: ground.hex }}
                      aria-hidden
                    />
                    <span className="bka-logos-meta">
                      <span className="bka-logos-ground-name">{ground.name}</span>
                      <span className="bka-logos-sub">
                        {!on
                          ? 'Not published'
                          : tile
                            ? `${tile.mark.name} · ${tile.contrast.toFixed(1)}:1`
                            : 'Nothing reads here'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bka-logos-section">
            <h3 className="bka-logos-heading">Mono treatments</h3>
            <p className="bka-logos-note">
              The same drawing in one flat colour, for the grounds no coloured variant reads on.
            </p>
            <ul className="bka-logos-grounds">
              {TREATMENTS.map((t) => {
                const on = cuts.includes(t.id);
                const used = placed.filter(
                  (p) => p.kind === 'treatment' && contrastRatio(p.mark.hex, t.hex) < 1.05,
                ).length;
                /*
                 * A GENERATED CUT IS NOT DRAWN WHERE THE BRAND OWNS ONE.
                 *
                 * `logoCombosFor` skips a treatment on any ground where the
                 * brand already holds artwork in that ink — flat-filling the
                 * silhouette there would ship a second, generated copy of a
                 * file the brand uploaded. For a brand with a real black and a
                 * real white cut (raqm, skam) that is EVERY ground, so the
                 * count was 0 beside a ticked checkbox and read as a fault
                 * (QA Q31). The count is not the interesting fact; WHY it is
                 * zero is.
                 */
                const ownsCut = placed.some(
                  (p) => p.kind === 'pairing' && contrastRatio(p.mark.hex, t.hex) < 1.05,
                );
                const usage = !on
                  ? 'Not offered'
                  : used > 0
                    ? `${t.hint} · on ${used} ground${used === 1 ? '' : 's'}`
                    : ownsCut
                      // Short, because this row is one of two in a narrow
                      // column and a truncated explanation explains nothing.
                      ? `${t.hint} · the brand owns this cut`
                      : `${t.hint} · not needed on any ground`;
                return (
                  <li key={t.id} className="bka-logos-ground" data-off={!on}>
                    <DsCheckbox checked={on} onChange={() => toggleCut(t.id)} />
                    <span
                      className="bka-logos-swatch"
                      style={{ backgroundColor: t.hex }}
                      aria-hidden
                    />
                    <span className="bka-logos-meta">
                      <span className="bka-logos-ground-name">{t.label}</span>
                      <span className="bka-logos-sub">
                        {/* The section's own line already says what a
                            treatment is FOR; a row that repeated it was
                            ellipsised into nonsense at panel width. */}
                        {usage}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {!canWrite ? (
            <p className="bka-logos-note">
              This brand is not stored yet, so the logo system can be previewed here but not
              saved.
            </p>
          ) : null}
          {error ? (
            <p className="bka-logos-note" role="alert" style={{ color: 'var(--ds-danger-fg)' }}>
              {error}
            </p>
          ) : null}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's logo system?"
        description={
          <>
            The logo is used everywhere the brand appears — the kit, the guideline, every
            template and every export.
            <ul className="bka-logos-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the logo system"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** The grounds currently in force: the brand's own list, or all of them. */
function pickGrounds(brand: MockBrand, offered: BrandGround[]): string[] {
  const held = brand.logoGrounds;
  if (!held) return offered.map((g) => g.hex);
  const kept = offered.filter((g) => held.some((h) => h.toLowerCase() === g.hex.toLowerCase()));
  // A stored list that matches nothing in today's palette is a list about a
  // brand that has since changed colour. Falling back to everything is the
  // honest reading — the alternative is a wall with no grounds at all.
  return kept.length > 0 ? kept.map((g) => g.hex) : offered.map((g) => g.hex);
}

function pickCuts(brand: MockBrand): LogoTreatment[] {
  const held = brand.logoTreatments;
  if (!held) return TREATMENTS.map((t) => t.id);
  return TREATMENTS.filter((t) => held.includes(t.id)).map((t) => t.id);
}

function roleWord(role: LogoRole): string {
  const def = DEF_BY_ROLE.get(role);
  return def ? roleLabel(def) : String(role);
}
