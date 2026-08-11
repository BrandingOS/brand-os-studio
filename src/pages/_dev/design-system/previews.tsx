import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DsAssetRow,
  DsBadge,
  DsBanner,
  DsButton,
  DsCheckbox,
  DsChip,
  DsConfirmDialog,
  DsDropZone,
  DsEmptyState,
  DsInput,
  DsKbd,
  DsMenu,
  DsMenuDivider,
  DsMenuItem,
  DsModal,
  DsProgress,
  DsRadio,
  DsSegmented,
  DsSelect,
  DsSkeleton,
  DsStatusDot,
  DsSwitch,
  DsTabBar,
  DsTextArea,
  DsToast,
  LoadingPill,
  BrandMark,
} from '@/shared/ds';
import { AlertCircleIcon, ArrowRightIcon, PlusIcon } from '@/shared/ds/icons';
import { FIXED_PROPERTIES, type SectionId } from './registry';

/* ─── Token ↔ preview linking ─────────────────────────────────
 * One context both columns share. Focusing a control on the left sets
 * the active token; TokenAnchors wrapping the matching demo highlight
 * and scroll into view. Hovering an anchor reveals which tokens drive
 * it (title attr — subtle, zero layout noise); clicking it jumps back
 * to the left-hand control. */

interface HighlightApi {
  activeVar: string | null;
  /** Focus a token from the left panel → highlight + scroll the preview. */
  showToken: (cssVar: string | null) => void;
  /** Jump from a preview anchor back to the left-hand control row. */
  focusControl: (cssVar: string) => void;
  registerAnchor: (cssVar: string, el: HTMLElement | null) => void;
  registerControl: (cssVar: string, el: HTMLElement | null) => void;
}

const HighlightContext = createContext<HighlightApi | null>(null);

export function useHighlight(): HighlightApi {
  const ctx = useContext(HighlightContext);
  if (!ctx) throw new Error('useHighlight outside provider');
  return ctx;
}

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [activeVar, setActiveVar] = useState<string | null>(null);
  const anchors = useRef(new Map<string, Set<HTMLElement>>());
  const controls = useRef(new Map<string, HTMLElement>());

  const registerAnchor = useCallback((cssVar: string, el: HTMLElement | null) => {
    let set = anchors.current.get(cssVar);
    if (!set) anchors.current.set(cssVar, (set = new Set()));
    if (el) set.add(el);
  }, []);

  const registerControl = useCallback((cssVar: string, el: HTMLElement | null) => {
    if (el) controls.current.set(cssVar, el);
  }, []);

  const showToken = useCallback((cssVar: string | null) => {
    setActiveVar(cssVar);
    if (!cssVar) return;
    const set = anchors.current.get(cssVar);
    const first = set?.values().next().value;
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const focusControl = useCallback((cssVar: string) => {
    setActiveVar(cssVar);
    const el = controls.current.get(cssVar);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.animate(
      [
        { backgroundColor: 'var(--ds-surface-hover)' },
        { backgroundColor: 'transparent' },
      ],
      { duration: 1200, easing: 'ease-out' },
    );
  }, []);

  const api = useMemo(
    () => ({ activeVar, showToken, focusControl, registerAnchor, registerControl }),
    [activeVar, showToken, focusControl, registerAnchor, registerControl],
  );
  return <HighlightContext.Provider value={api}>{children}</HighlightContext.Provider>;
}

/** Wraps a demo; highlights when any of its tokens is selected on the left. */
export function TokenAnchor({
  vars,
  children,
  block,
}: {
  vars: string[];
  children: React.ReactNode;
  /** Render as block (full width) instead of inline-flex. */
  block?: boolean;
}) {
  const { activeVar, registerAnchor, focusControl } = useHighlight();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const v of vars) registerAnchor(v, ref.current);
  }, [vars, registerAnchor]);
  const active = activeVar !== null && vars.includes(activeVar);
  return (
    <div
      ref={ref}
      title={`Controlled by: ${vars.join(' · ')} — click to jump to the control`}
      onClick={(e) => {
        // Only treat clicks on the wrapper padding as "jump to control" —
        // interactive children keep their own behavior.
        if (e.target === e.currentTarget) focusControl(vars[0]);
      }}
      style={{
        display: block ? 'block' : 'inline-flex',
        flexDirection: block ? undefined : 'column',
        borderRadius: 10,
        outline: active ? '2px dashed var(--ds-accent)' : '2px dashed transparent',
        outlineOffset: 4,
        transition: 'outline-color 200ms var(--ds-ease)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Shared preview scaffolding ──────────────────────────────── */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        borderRadius: 'var(--ds-radius-panel)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Row({ children, gap = 14 }: { children: React.ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', gap, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>;
}

function Mini({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>{children}</span>;
}

/* ─── Section previews (same ids/order as the registry) ───────── */

function SurfacesPreview() {
  const [scrimOpen, setScrimOpen] = useState(false);
  return (
    <Card>
      <div
        style={{
          background: 'var(--ds-bg)',
          borderRadius: 'var(--ds-radius-card)',
          padding: 18,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <TokenAnchor vars={['--ds-bg']}>
          <Mini>Background — the page stage</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-surface', '--ds-surface-hover']}>
          <DsMenu style={{ width: 200 }}>
            <DsMenuItem icon={<ArrowRightIcon size={14} />}>Surface + hover row</DsMenuItem>
            <DsMenuItem icon={<PlusIcon size={14} />}>Hover me</DsMenuItem>
          </DsMenu>
          <Mini>Card = surface · row hover = surface hover</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-surface-subtle']}>
          <div style={{ width: 250 }}>
            <DsAssetRow thumb={<AlertCircleIcon size={15} />} name="logo.svg" meta="Subtle well" />
          </div>
          <Mini>Asset row = surface subtle</Mini>
        </TokenAnchor>
      </div>
      <TokenAnchor vars={['--ds-scrim']}>
        <Row>
          <DsButton tone="secondary" size="sm" onClick={() => setScrimOpen(true)}>
            Show scrim (opens modal)
          </DsButton>
          <div
            style={{
              position: 'relative',
              width: 132,
              height: 56,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--ds-border)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ds-surface)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ds-scrim)' }} />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: 10.5,
                color: '#fff',
              }}
            >
              scrim
            </span>
          </div>
        </Row>
      </TokenAnchor>
      <DsModal
        open={scrimOpen}
        onClose={() => setScrimOpen(false)}
        eyebrow="Surfaces"
        title="The scrim behind this modal"
        actions={<DsButton size="sm" onClick={() => setScrimOpen(false)}>Done</DsButton>}
      >
        <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
          The veil behind this panel is --ds-scrim.
        </span>
      </DsModal>
    </Card>
  );
}

function TextPreview() {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TokenAnchor vars={['--ds-text']} block>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--ds-text)' }}>
            Text — headings and primary copy
          </div>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-text-secondary']} block>
          <div style={{ fontSize: 13.5, color: 'var(--ds-text-secondary)' }}>
            Text secondary — supporting copy that explains the thing above it.
          </div>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-text-muted']} block>
          <div style={{ fontSize: 12, color: 'var(--ds-text-muted)' }}>
            TEXT MUTED — eyebrows, meta rows, timestamps.
          </div>
        </TokenAnchor>
      </div>
      <TokenAnchor vars={['--ds-text-placeholder']} block>
        <div style={{ maxWidth: 340 }}>
          <DsInput placeholder="Placeholder text uses --ds-text-placeholder" aria-label="Placeholder demo" />
        </div>
      </TokenAnchor>
    </Card>
  );
}

function AccentPreview() {
  const [tab, setTab] = useState('setup');
  const [seg, setSeg] = useState('image');
  return (
    <Card>
      <TokenAnchor vars={['--ds-accent', '--ds-accent-fg']} block>
        <Row>
          <DsButton arrow>Primary action</DsButton>
          <DsButton tone="secondary">Secondary</DsButton>
          <DsButton tone="tertiary" arrow>Tertiary</DsButton>
          <DsButton disabled>Disabled = accent at 40%</DsButton>
        </Row>
      </TokenAnchor>
      <TokenAnchor vars={['--ds-accent', '--ds-accent-fg']} block>
        <Row>
          <DsTabBar
            aria-label="Sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'setup', label: 'Setup' },
              { value: 'kit', label: 'Brand Kit' },
              { value: 'design', label: 'Design' },
            ]}
          />
          <DsSegmented
            aria-label="Output"
            options={[
              { value: 'image', label: 'Image' },
              { value: 'design', label: 'Editable' },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <DsChip active>Active chip</DsChip>
          <DsProgress value={0.6} />
        </Row>
      </TokenAnchor>
    </Card>
  );
}

function BordersPreview() {
  return (
    <Card>
      <Row gap={18}>
        <TokenAnchor vars={['--ds-border']}>
          <div
            style={{
              width: 150,
              height: 64,
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-card)',
            }}
          />
          <Mini>Border — every card & field</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-border-strong']}>
          <div
            style={{
              width: 150,
              height: 64,
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border-strong)',
              borderRadius: 'var(--ds-radius-card)',
            }}
          />
          <Mini>Border strong — hover/selected edges</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-hairline']}>
          <div
            style={{
              width: 150,
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-card)',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {['Row one', 'Row two', 'Row three'].map((r, i) => (
              <div
                key={r}
                style={{
                  fontSize: 11.5,
                  color: 'var(--ds-text-secondary)',
                  padding: '5px 0',
                  borderTop: i > 0 ? '1px solid var(--ds-hairline)' : 'none',
                }}
              >
                {r}
              </div>
            ))}
          </div>
          <Mini>Hairline — internal dividers</Mini>
        </TokenAnchor>
      </Row>
      <TokenAnchor vars={['--ds-dash', '--ds-dash-strong']} block>
        <Row gap={18}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <DsDropZone>
              Drop zone — dashed with <strong>--ds-dash</strong>
            </DsDropZone>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 220,
              border: '2px dashed var(--ds-dash-strong)',
              borderRadius: 'var(--ds-radius-panel)',
              padding: 24,
              textAlign: 'center',
              fontSize: 13.5,
              color: 'var(--ds-text-secondary)',
              background: 'var(--ds-surface-hover)',
            }}
          >
            Drag-over state — <strong>--ds-dash-strong</strong> (Studio)
          </div>
        </Row>
      </TokenAnchor>
    </Card>
  );
}

function FormsPreview() {
  const [value, setValue] = useState('Nu');
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        <TokenAnchor vars={['--ds-focus-border', '--ds-focus-ring']} block>
          <DsInput label="Click to focus (live)" placeholder="Focus me — real :focus state" aria-label="Focus demo" />
          <div style={{ height: 8 }} />
          <div className="ds-field">
            <label className="ds-label">Focused (state forced for preview)</label>
            <input
              className="ds-input"
              readOnly
              value="Focus border + 3px focus ring"
              style={{
                borderColor: 'var(--ds-focus-border)',
                boxShadow: '0 0 0 3px var(--ds-focus-ring)',
              }}
            />
          </div>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-error-border', '--ds-error-ring']} block>
          <DsInput
            label="Invalid field (real error state)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error="Brand names need at least 3 characters."
            aria-label="Error demo"
          />
        </TokenAnchor>
      </div>
      <TokenAnchor vars={['--ds-focus-ring']} block>
        <Row>
          <FocusableControls />
          <Mini>Tab through these — every control wears the same 3px focus ring</Mini>
        </Row>
      </TokenAnchor>
    </Card>
  );
}

function FocusableControls() {
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('a');
  const [sel, setSel] = useState('post');
  return (
    <Row>
      <DsSwitch checked={on} onChange={setOn} label="Switch" />
      <DsCheckbox checked={checked} onChange={setChecked} label="Checkbox" />
      <DsRadio checked={radio === 'a'} onChange={() => setRadio('a')} label="Radio" />
      <div style={{ width: 210 }}>
        <DsSelect
          aria-label="Format"
          value={sel}
          onChange={setSel}
          options={[
            { value: 'post', label: 'Post · 1080²' },
            { value: 'story', label: 'Story · 1080×1920' },
          ]}
        />
      </div>
    </Row>
  );
}

function StatusPreview() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card>
      <Row>
        <TokenAnchor vars={['--ds-success', '--ds-success-bg', '--ds-success-fg']}>
          <Row gap={8}>
            <DsBadge tone="success">Published</DsBadge>
            <DsStatusDot label={<strong style={{ color: 'var(--ds-text)' }}>Live</strong>} />
          </Row>
          <Mini>Success · wash · text</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-warning', '--ds-warning-bg', '--ds-warning-fg']}>
          <DsBadge tone="warning">Needs review</DsBadge>
          <Mini>Warning · wash · text</Mini>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-danger', '--ds-danger-bg', '--ds-danger-fg']}>
          <Row gap={8}>
            <DsBadge tone="danger">Failed</DsBadge>
            <DsButton tone="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Delete variant
            </DsButton>
          </Row>
          <Mini>Danger · wash · text</Mini>
        </TokenAnchor>
      </Row>
      <TokenAnchor vars={['--ds-warning-bg', '--ds-warning-border', '--ds-warning-fg']} block>
        <DsBanner tone="warning" actionLabel="Upload a larger file →">
          Warning banner — wash, border and text tokens.
        </DsBanner>
      </TokenAnchor>
      <TokenAnchor vars={['--ds-danger-bg', '--ds-danger-border', '--ds-danger-fg']} block>
        <DsBanner tone="danger" actionLabel="Try again">
          Danger banner — the upload failed.
        </DsBanner>
      </TokenAnchor>
      <Row>
        <DsToast message="Brand kit exported" actionLabel="Undo" onAction={() => {}} />
      </Row>
      <DsConfirmDialog
        open={confirmOpen}
        title="Delete this logo variant?"
        description="This can't be undone."
        confirmLabel="Delete variant"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}

const RADIUS_DEMOS: Array<{ cssVar: string; label: string }> = [
  { cssVar: '--ds-radius-pill', label: 'Pill' },
  { cssVar: '--ds-radius-control', label: 'Control' },
  { cssVar: '--ds-radius-tile', label: 'Tile' },
  { cssVar: '--ds-radius-menu', label: 'Menu' },
  { cssVar: '--ds-radius-card', label: 'Card' },
  { cssVar: '--ds-radius-panel', label: 'Panel' },
];

function ShapePreview() {
  return (
    <Card>
      <Row gap={16}>
        {RADIUS_DEMOS.map((d) => (
          <TokenAnchor key={d.cssVar} vars={[d.cssVar]}>
            <div
              style={{
                width: 84,
                height: 56,
                background: 'var(--ds-surface-hover)',
                border: '1px solid var(--ds-border-strong)',
                borderRadius: `var(${d.cssVar})`,
              }}
            />
            <Mini>{d.label}</Mini>
          </TokenAnchor>
        ))}
      </Row>
      <Row>
        <TokenAnchor vars={['--ds-radius-pill']}>
          <DsButton size="sm">Pill button</DsButton>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-radius-menu']}>
          <DsMenu style={{ width: 170 }}>
            <DsMenuItem>Menu radius</DsMenuItem>
          </DsMenu>
        </TokenAnchor>
        <TokenAnchor vars={['--ds-radius-card']}>
          <div style={{ width: 220 }}>
            <DsInput placeholder="Field = card radius" aria-label="Radius demo" />
          </div>
        </TokenAnchor>
      </Row>
    </Card>
  );
}

const SPACE_DEMOS = [
  '--ds-space-1',
  '--ds-space-2',
  '--ds-space-3',
  '--ds-space-4',
  '--ds-space-5',
  '--ds-space-6',
  '--ds-space-8',
  '--ds-space-12',
  '--ds-space-16',
];

function SpacingPreview() {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SPACE_DEMOS.map((cssVar) => (
          <TokenAnchor key={cssVar} vars={[cssVar]} block>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                className="ds-mono"
                style={{ width: 110, fontSize: 10.5, color: 'var(--ds-text-muted)' }}
              >
                {cssVar.replace('--ds-', '')}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  width: `var(${cssVar})`,
                  height: 14,
                  background: 'var(--ds-accent)',
                  borderRadius: 3,
                  opacity: 0.85,
                }}
              />
            </div>
          </TokenAnchor>
        ))}
      </div>
    </Card>
  );
}

const SHADOW_DEMOS: Array<{ cssVar: string; label: string }> = [
  { cssVar: '--ds-shadow-xs', label: 'xs — small tiles' },
  { cssVar: '--ds-shadow-sm', label: 'sm — cards at rest' },
  { cssVar: '--ds-shadow-md', label: 'md — hovered cards' },
  { cssVar: '--ds-shadow-float', label: 'float — modals' },
];

function ElevationPreview() {
  return (
    <Card style={{ background: 'var(--ds-bg)' }}>
      <Row gap={22}>
        {SHADOW_DEMOS.map((d) => (
          <TokenAnchor key={d.cssVar} vars={[d.cssVar]}>
            <div
              style={{
                width: 132,
                height: 76,
                background: 'var(--ds-surface)',
                borderRadius: 'var(--ds-radius-card)',
                boxShadow: `var(${d.cssVar})`,
              }}
            />
            <Mini>{d.label}</Mini>
          </TokenAnchor>
        ))}
      </Row>
    </Card>
  );
}

function MotionPreview() {
  const [run, setRun] = useState(0);
  return (
    <Card>
      <Row>
        <DsButton tone="secondary" size="sm" onClick={() => setRun((n) => n + 1)}>
          Replay motion
        </DsButton>
        <Mini>Each dot travels with --ds-ease over its duration token</Mini>
      </Row>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(
          [
            ['--ds-duration-state', 'state'],
            ['--ds-duration-panel', 'panel'],
            ['--ds-duration-modal', 'modal'],
          ] as const
        ).map(([cssVar, label]) => (
          <TokenAnchor key={cssVar} vars={[cssVar, '--ds-ease']} block>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="ds-mono" style={{ width: 110, fontSize: 10.5, color: 'var(--ds-text-muted)' }}>
                {label}
              </span>
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  maxWidth: 320,
                  height: 18,
                  background: 'var(--ds-surface-hover)',
                  borderRadius: 999,
                }}
              >
                <div
                  key={run}
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: run % 2 === 0 ? 2 : 'calc(100% - 16px)',
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: 'var(--ds-accent)',
                    transition: `left var(${cssVar}) var(--ds-ease)`,
                  }}
                />
              </div>
            </div>
          </TokenAnchor>
        ))}
      </div>
      <Row>
        <TokenAnchor vars={['--ds-ease', '--ds-duration-state']}>
          <LoadingPill label="Generating…" />
        </TokenAnchor>
        <BrandMark size={22} loading />
        <div style={{ width: 160 }}>
          <DsSkeleton height={14} />
        </div>
      </Row>
    </Card>
  );
}

function TypographyPreview() {
  return (
    <Card>
      <TokenAnchor vars={['--ds-font']} block>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--ds-font)' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ds-text)' }}>Product face — 800</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text)' }}>Semibold 600 for labels</span>
          <span style={{ fontSize: 13.5, color: 'var(--ds-text-secondary)' }}>
            Regular for body copy — the quick brown fox jumps over the lazy dog.
          </span>
        </div>
      </TokenAnchor>
      <TokenAnchor vars={['--ds-font-mono']} block>
        <Row>
          <span className="ds-mono" style={{ fontSize: 12.5 }}>#7231FF · 1080 × 1080 · 84 KB</span>
          <DsKbd>⌘K</DsKbd>
        </Row>
      </TokenAnchor>
    </Card>
  );
}

export const SECTION_PREVIEWS: Record<SectionId, React.ComponentType> = {
  surfaces: SurfacesPreview,
  text: TextPreview,
  accent: AccentPreview,
  borders: BordersPreview,
  forms: FormsPreview,
  status: StatusPreview,
  shape: ShapePreview,
  spacing: SpacingPreview,
  elevation: ElevationPreview,
  motion: MotionPreview,
  typography: TypographyPreview,
};

/* ─── Fixed / component-owned (read-only coverage) ────────────── */

export function FixedPropertiesSection() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--ds-border)' }} />
        <span className="ds-eyebrow">Fixed / component-owned</span>
        <div style={{ flex: 1, height: 1, background: 'var(--ds-border)' }} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ds-text-secondary)', maxWidth: 640 }}>
        Deliberately not tokens. These are component design or system rules — listed here so you
        never hunt for a control that doesn't exist.
      </div>
      <Card style={{ padding: 0, gap: 0 }}>
        {FIXED_PROPERTIES.map((p, i) => (
          <div
            key={`${p.component}-${p.property}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 170px 1fr',
              gap: 14,
              padding: '11px 20px',
              borderTop: i > 0 ? '1px solid var(--ds-hairline)' : 'none',
              fontSize: 12.5,
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{p.component}</span>
            <span style={{ color: 'var(--ds-text-secondary)' }}>
              {p.property} · <span className="ds-mono" style={{ fontSize: 11 }}>{p.value}</span>
            </span>
            <span style={{ color: 'var(--ds-text-muted)', fontSize: 12 }}>{p.reason}</span>
          </div>
        ))}
      </Card>
      <DsEmptyState>
        Something missing here that repeats across components? That's the signal to PROMOTE it to a
        real token — document the reasoning first, never invent tokens just for controller coverage.
      </DsEmptyState>
    </section>
  );
}
