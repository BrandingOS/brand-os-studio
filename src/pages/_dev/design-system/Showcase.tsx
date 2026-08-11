import React, { useState } from 'react';
import {
  BrandMark,
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
  DsLogoTile,
  DsLogoTileEmpty,
  DsMenu,
  DsMenuDivider,
  DsMenuItem,
  DsModal,
  DsProgress,
  DsRadio,
  DsRail,
  DsSegmented,
  DsSelect,
  DsSkeleton,
  DsStatusDot,
  DsSwatchRow,
  DsSwitch,
  DsTabBar,
  DsTextArea,
  DsToast,
  DsTooltip,
  LoadingPill,
} from '@/shared/ds';
import { AlertCircleIcon, ArrowRightIcon, PlusIcon } from '@/shared/ds/icons';
import { DS_TOKENS } from './registry';

/**
 * The component showcase — the DS Controller's live preview surface.
 * Everything here reads --ds-* tokens, so draft overrides applied to the
 * wrapper element restyle it instantly. The color-token grid paints
 * straight from the live CSS variables (not tokens.ts constants) for the
 * same reason.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--ds-text)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-panel)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Row({ children, wrap = true }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </div>
  );
}

export function Showcase() {
  const [tab, setTab] = useState('setup');
  const [seg, setSeg] = useState('image');
  const [railItem, setRailItem] = useState<string | null>('insert');
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('letter');
  const [selectValue, setSelectValue] = useState('post');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [brandName, setBrandName] = useState('Nu');

  const colorTokens = DS_TOKENS.filter(
    (d) => (d.group === 'Core colors' || d.group === 'Status colors' || d.group === 'Borders') && d.kind === 'color',
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <Section title="Color tokens">
        <Row>
          {colorTokens.map((def) => (
            <div key={def.cssVar} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 92 }}>
              <div
                style={{
                  height: 36,
                  borderRadius: 'var(--ds-radius-tile)',
                  background: `var(${def.cssVar})`,
                  border: '1px solid var(--ds-border)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--ds-text-secondary)' }}>{def.label}</span>
              <span className="ds-mono" style={{ fontSize: 10 }}>{def.cssVar}</span>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="Buttons">
        <Row>
          <DsButton arrow>Set up</DsButton>
          <DsButton tone="secondary">Add color</DsButton>
          <DsButton tone="tertiary" arrow>Open</DsButton>
          <DsButton disabled>Continue</DsButton>
          <DsButton tone="danger" size="sm">Delete variant</DsButton>
          <DsButton size="sm" arrow>Export brand</DsButton>
        </Row>
      </Section>

      <Section title="Inputs">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <DsInput
            label="Brand name"
            placeholder="Enter your brand name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            error={brandName.length > 0 && brandName.length < 3 ? 'Brand names need at least 3 characters.' : undefined}
          />
          <DsTextArea
            label="Describe your brand"
            placeholder="Tell us about your brand — your vision, your style, your system…"
            style={{ height: 72 }}
          />
        </div>
        <DsInput pill placeholder="Paste a URL or @handle" aria-label="Paste a URL" />
        <DsDropZone>
          Drag &amp; drop image here,{' '}
          <span style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--ds-text)' }}>
            upload file
          </span>{' '}
          or paste the URL
        </DsDropZone>
      </Section>

      <Section title="Select">
        <div style={{ maxWidth: 320 }}>
          <DsSelect
            aria-label="Format"
            value={selectValue}
            onChange={setSelectValue}
            options={[
              { value: 'post', label: 'Instagram post · 1080 × 1080' },
              { value: 'story', label: 'Story · 1080 × 1920' },
              { value: 'cover', label: 'Cover · 1920 × 1080' },
            ]}
          />
        </div>
      </Section>

      <Section title="Selection controls">
        <Row>
          <DsSwitch checked={switchOn} onChange={setSwitchOn} label="Auto-generate kit on publish" />
          <DsCheckbox checked={checked} onChange={setChecked} label="Include social templates" />
          <DsRadio checked={radio === 'letter'} onChange={() => setRadio('letter')} label="Letter (8.5 × 11)" />
          <DsRadio checked={radio === 'a4'} onChange={() => setRadio('a4')} label="A4" />
        </Row>
        <Row>
          <DsSegmented
            aria-label="Output"
            options={[
              { value: 'image', label: 'Image' },
              { value: 'design', label: 'Editable design' },
            ]}
            value={seg}
            onChange={setSeg}
          />
        </Row>
      </Section>

      <Section title="Chips, badges, kbd & status">
        <Row>
          <DsChip active>All</DsChip>
          <DsChip>Social posts</DsChip>
          <DsChip>Invoices</DsChip>
          <DsChip dashed>
            <PlusIcon size={12} /> Add color
          </DsChip>
        </Row>
        <Row>
          <DsBadge>Draft</DsBadge>
          <DsBadge tone="success">Published</DsBadge>
          <DsBadge tone="warning">Needs review</DsBadge>
          <DsBadge tone="danger">Failed</DsBadge>
          <DsKbd>⌘K</DsKbd>
          <DsStatusDot
            label={
              <>
                <strong style={{ color: 'var(--ds-text)' }}>Live</strong>&nbsp;preview
              </>
            }
          />
          <DsTooltip>Download all logo variants</DsTooltip>
        </Row>
      </Section>

      <Section title="Status & feedback">
        <Row>
          <DsToast message="Brand kit exported" actionLabel="Undo" onAction={() => {}} />
        </Row>
        <DsBanner tone="warning" actionLabel="Upload a larger file →">
          Your logo is low resolution — exports above 1080px may look soft.
        </DsBanner>
        <DsBanner tone="danger" actionLabel="Try again">
          The upload failed — the file is over 25 MB.
        </DsBanner>
        <Row>
          <DsButton tone="secondary" size="sm" onClick={() => setModalOpen(true)}>
            Open modal
          </DsButton>
          <DsButton tone="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
            Open confirm dialog
          </DsButton>
        </Row>
      </Section>

      <Section title="Menu">
        <DsMenu style={{ width: 220 }}>
          <DsMenuItem icon={<ArrowRightIcon size={14} />}>Rename brand</DsMenuItem>
          <DsMenuItem icon={<PlusIcon size={14} />}>Duplicate</DsMenuItem>
          <DsMenuItem icon={<ArrowRightIcon size={14} />} kbd="⌘E">
            Export
          </DsMenuItem>
          <DsMenuDivider />
          <DsMenuItem danger icon={<AlertCircleIcon size={14} />}>
            Delete brand
          </DsMenuItem>
        </DsMenu>
      </Section>

      <Section title="Loading & progress">
        <Row>
          <BrandMark size={20} loading />
          <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>Loading brands…</span>
          <LoadingPill label="Generating your kit…" />
          <BrandMark size={48} loading />
        </Row>
        <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DsProgress value={6 / 7} label="Completion" meta="6 / 7" />
          <DsSkeleton height={84} radius={10} />
          <DsSkeleton height={12} width="60%" />
        </div>
      </Section>

      <Section title="Tab bar & rail">
        <Row>
          <DsTabBar
            aria-label="Brand sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'setup', label: 'Setup' },
              { value: 'brand-kit', label: 'Brand Kit' },
              { value: 'guideline', label: 'Guideline' },
              { value: 'design', label: 'Design' },
              { value: 'tools', label: 'Tools' },
            ]}
          />
        </Row>
        <Row>
          <DsRail
            value={railItem}
            onChange={setRailItem}
            items={[
              { value: 'generate', label: 'Generate', icon: <PlusIcon size={15} /> },
              { value: 'templates', label: 'Templates', icon: <PlusIcon size={15} /> },
              { value: 'insert', label: 'Insert', icon: <PlusIcon size={15} /> },
              { value: 'brand', label: 'Brand', icon: <PlusIcon size={15} /> },
            ]}
          />
          <DsRail
            compact
            value={railItem}
            onChange={setRailItem}
            items={[
              { value: 'generate', label: 'Generate', icon: <PlusIcon size={15} /> },
              { value: 'insert', label: 'Insert', icon: <PlusIcon size={15} /> },
            ]}
          />
        </Row>
      </Section>

      <Section title="Brand-content containers">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <DsLogoTile variant="Primary">
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-text)' }}>
                Wordmark
              </span>
            </DsLogoTile>
            <DsLogoTileEmpty />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DsSwatchRow
              swatches={[
                { hex: '#23283b', label: 'Primary', weight: 2 },
                { hex: '#8a877e', weight: 1.2 },
                { hex: '#d4d1c7', weight: 1.2 },
                { hex: '#f1f0ea', weight: 1 },
              ]}
            />
            <DsSwatchRow swatches={[]} emptyHint="No colors yet — extract from your logos." />
          </div>
          <DsAssetRow
            thumb={<AlertCircleIcon size={15} />}
            name="brand-reference.jpg"
            meta="JPG · 84.0 KB"
            actions={[
              { icon: <ArrowRightIcon size={13} />, label: 'Edit', onClick: () => {} },
              { icon: <AlertCircleIcon size={13} />, label: 'Delete', onClick: () => {}, danger: true },
            ]}
          />
        </div>
        <DsAssetRow thumb={<AlertCircleIcon size={15} />} name="logo-primary.svg" progress={0.62} />
        <DsEmptyState
          actions={
            <>
              <DsChip dashed>
                <PlusIcon size={12} /> Add color
              </DsChip>
              <DsButton tone="tertiary" size="sm">Extract from logos</DsButton>
            </>
          }
        >
          No colors yet — extract from your logos, or pick a color below.
        </DsEmptyState>
      </Section>

      <DsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow="Stationery"
        title="Business card"
        secondaryActions={
          <>
            <DsButton tone="tertiary" size="sm" onClick={() => setModalOpen(false)}>Skip</DsButton>
            <DsButton tone="secondary" size="sm">Show me more</DsButton>
          </>
        }
        actions={
          <>
            <DsButton tone="secondary" size="sm">Use &amp; customize</DsButton>
            <DsButton size="sm" onClick={() => setModalOpen(false)}>Use this design</DsButton>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                aspectRatio: '16 / 10',
                background: 'var(--ds-surface-hover)',
                borderRadius: 10,
                border: i === 0 ? '2px solid var(--ds-accent)' : '1px solid var(--ds-border)',
              }}
            />
          ))}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirmOpen}
        title="Delete this logo variant?"
        description={
          <>
            "Wordmark · Original" will be removed from the kit and every generated asset that uses
            it. This can't be undone.
          </>
        }
        confirmLabel="Delete variant"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
