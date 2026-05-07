import { useCallback, useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useV4Store } from '../store/onboardingV4Store';
import type { LogoSlot, OnboardingAsset } from '../types';
import { buildAsset, imageAspectRatio, rasterFileToVariants, simulateUpload, svgFileToVariants } from '../utils/assetUpload';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';

async function copyTextLogo(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

interface SlotDef {
  key: LogoSlot;
  label: string;
  hint: string;
  tone: 'neutral' | 'light' | 'dark';
}

const SLOT_DEFS: Record<LogoSlot, SlotDef> = {
  primary: { key: 'primary', label: 'Primary', hint: 'Your main logo', tone: 'neutral' },
  dark: { key: 'dark', label: 'On dark', hint: 'Light logo for dark backgrounds', tone: 'dark' },
  mark: { key: 'mark', label: 'Icon', hint: 'Just the icon / monogram', tone: 'neutral' },
  wordmark: { key: 'wordmark', label: 'Wordmark', hint: 'Text-only logotype', tone: 'neutral' },
  light: { key: 'light', label: 'On light', hint: 'Dark logo for light backgrounds', tone: 'light' },
  horizontal: { key: 'horizontal', label: 'Horizontal', hint: 'Wide lockup', tone: 'neutral' },
  vertical: { key: 'vertical', label: 'Vertical', hint: 'Stacked lockup', tone: 'neutral' },
};

const DEFAULT_SLOTS: LogoSlot[] = ['primary', 'dark', 'mark', 'wordmark'];
const ADDABLE_SLOTS: LogoSlot[] = ['light', 'horizontal', 'vertical'];

const VARIANT_PREVIEW: Record<LogoSlot, JSX.Element> = {
  primary: <PreviewPrimary />,
  dark: <PreviewDark />,
  mark: <PreviewMark />,
  wordmark: <PreviewWordmark />,
  light: <PreviewLight />,
  horizontal: <PreviewHorizontal />,
  vertical: <PreviewVertical />,
};

function PreviewPrimary() {
  return (
    <svg viewBox="0 0 60 30" fill="currentColor">
      <circle cx="12" cy="15" r="5" />
      <rect x="22" y="11" width="30" height="8" rx="2" />
    </svg>
  );
}
function PreviewDark() {
  return (
    <svg viewBox="0 0 60 30">
      <rect x="0" y="0" width="60" height="30" rx="4" fill="#0e0e0e" />
      <circle cx="12" cy="15" r="5" fill="#fff" />
      <rect x="22" y="11" width="30" height="8" rx="2" fill="#fff" />
    </svg>
  );
}
function PreviewMark() {
  return (
    <svg viewBox="0 0 30 30" fill="currentColor">
      <circle cx="15" cy="15" r="8" />
    </svg>
  );
}
function PreviewWordmark() {
  return (
    <svg viewBox="0 0 60 30" fill="currentColor">
      <rect x="6" y="11" width="48" height="8" rx="2" />
    </svg>
  );
}
function PreviewLight() {
  return (
    <svg viewBox="0 0 60 30" fill="currentColor">
      <rect x="6" y="11" width="34" height="8" rx="2" />
      <circle cx="50" cy="15" r="5" />
    </svg>
  );
}
function PreviewHorizontal() {
  return (
    <svg viewBox="0 0 60 30" fill="currentColor">
      <circle cx="10" cy="15" r="5" />
      <rect x="20" y="11" width="34" height="8" rx="2" />
    </svg>
  );
}
function PreviewVertical() {
  return (
    <svg viewBox="0 0 60 50" fill="currentColor">
      <circle cx="30" cy="14" r="6" />
      <rect x="14" y="28" width="32" height="8" rx="2" />
    </svg>
  );
}

function inferSlot(name: string, current: Set<LogoSlot>): LogoSlot | null {
  const n = name.toLowerCase();
  if (!current.has('mark') && /(?:^|[\s_\-/.])(mark|symbol|icon|monogram|emblem)(?:[\s_\-/.]|$)/.test(n)) return 'mark';
  if (!current.has('horizontal') && /(?:^|[\s_\-/.])(horizontal|wide|landscape|lockup)(?:[\s_\-/.]|$)/.test(n)) return 'horizontal';
  if (!current.has('vertical') && /(?:^|[\s_\-/.])(vertical|stacked|portrait)(?:[\s_\-/.]|$)/.test(n)) return 'vertical';
  if (!current.has('wordmark') && /(?:^|[\s_\-/.])(wordmark|logotype|type)(?:[\s_\-/.]|$)/.test(n)) return 'wordmark';
  if (!current.has('dark') && /(?:white|reverse|on[\s_\-]?dark|inverse)/.test(n)) return 'dark';
  if (!current.has('light') && /(?:black|on[\s_\-]?light|primary[-_ ]?black)/.test(n)) return 'light';
  return null;
}

function nextEmpty(current: Set<LogoSlot>, visible: LogoSlot[]): LogoSlot | null {
  for (const s of visible) if (!current.has(s)) return s;
  return null;
}

interface Props {
  assets: OnboardingAsset[];
}

export function LogoSlots({ assets }: Props) {
  const extraSlots = useV4Store((s) => s.extraLogoSlots);
  const addLogoSlot = useV4Store((s) => s.addLogoSlot);
  const removeLogoSlot = useV4Store((s) => s.removeLogoSlot);
  const addAsset = useV4Store((s) => s.addAsset);
  const updateAssetProgress = useV4Store((s) => s.updateAssetProgress);
  const markAssetDone = useV4Store((s) => s.markAssetDone);
  const removeAsset = useV4Store((s) => s.removeAsset);
  const updateAsset = useV4Store((s) => s.updateAsset);

  const visibleSlots: LogoSlot[] = [
    ...DEFAULT_SLOTS,
    ...extraSlots.filter((s) => !DEFAULT_SLOTS.includes(s)),
  ];

  /** Upload a single file to a specific slot. Replaces any existing asset there. */
  const uploadToSlot = useCallback(
    async (slot: LogoSlot, file: File, opts?: { generated?: boolean; allowAutoGenerate?: boolean }) => {
      const state = useV4Store.getState();
      const existing = state.assets.find((a) => a.logoSlot === slot);
      if (existing) removeAsset(existing.id);

      const asset = buildAsset(file);
      asset.kind = 'image';
      asset.isLogo = true;
      asset.logoSlot = slot;
      if (opts?.generated) asset.generated = true;

      let previewUrl: string | null = null;
      if (file.type.startsWith('image/') || /\.svg$/i.test(file.name)) {
        previewUrl = URL.createObjectURL(file);
      }
      addAsset(asset);
      simulateUpload(
        (p) => updateAssetProgress(asset.id, p),
        () => markAssetDone(asset.id, previewUrl)
      );

      if (opts?.allowAutoGenerate !== false && slot === 'primary') {
        const isSvg = /\.svg$/i.test(file.name) || file.type === 'image/svg+xml';
        const variants = isSvg ? await svgFileToVariants(file) : await rasterFileToVariants(file);
        if (variants) {
          const next = useV4Store.getState();
          // Only fill variants for slots currently visible (default + user-added)
          const currentVisible = [
            ...DEFAULT_SLOTS,
            ...next.extraLogoSlots.filter((s) => !DEFAULT_SLOTS.includes(s)),
          ];
          const lightAsset = next.assets.find((a) => a.logoSlot === 'light');
          const darkAsset = next.assets.find((a) => a.logoSlot === 'dark');
          if (currentVisible.includes('light') && (!lightAsset || lightAsset.generated)) {
            uploadToSlot('light', variants.light, { generated: true, allowAutoGenerate: false });
          }
          if (currentVisible.includes('dark') && (!darkAsset || darkAsset.generated)) {
            uploadToSlot('dark', variants.dark, { generated: true, allowAutoGenerate: false });
          }
        }
      }
    },
    [addAsset, updateAssetProgress, markAssetDone, removeAsset]
  );

  // Auto-route any unassigned logo image into the next free visible slot.
  const claimedRef = useRef(new Set<string>());
  useEffect(() => {
    const taken = new Set<LogoSlot>();
    for (const a of assets) if (a.logoSlot) taken.add(a.logoSlot);

    (async () => {
      for (const a of assets) {
        if (a.kind !== 'image' || !a.isLogo || a.logoSlot) continue;
        if (claimedRef.current.has(a.id)) continue;
        claimedRef.current.add(a.id);

        let target = inferSlot(a.name, taken);
        if (target && !visibleSlots.includes(target)) target = null;
        if (!target && a._file) {
          const ratio = await imageAspectRatio(a._file);
          if (ratio != null && ratio < 1.35 && visibleSlots.includes('mark') && !taken.has('mark')) target = 'mark';
        }
        if (!target) target = nextEmpty(taken, visibleSlots);
        if (!target) continue;
        taken.add(target);
        updateAsset(a.id, { logoSlot: target });

        if (target === 'primary' && a._file) {
          const isSvg = /\.svg$/i.test(a.name) || a._file.type === 'image/svg+xml';
          const variants = isSvg ? await svgFileToVariants(a._file) : await rasterFileToVariants(a._file);
          if (!variants) continue;
          const next = useV4Store.getState();
          const currentVisible = [
            ...DEFAULT_SLOTS,
            ...next.extraLogoSlots.filter((s) => !DEFAULT_SLOTS.includes(s)),
          ];
          const lightAsset = next.assets.find((x) => x.logoSlot === 'light');
          const darkAsset = next.assets.find((x) => x.logoSlot === 'dark');
          if (currentVisible.includes('light') && (!lightAsset || lightAsset.generated)) {
            uploadToSlot('light', variants.light, { generated: true, allowAutoGenerate: false });
          }
          if (currentVisible.includes('dark') && (!darkAsset || darkAsset.generated)) {
            uploadToSlot('dark', variants.dark, { generated: true, allowAutoGenerate: false });
          }
        }
      }
    })();
  }, [assets, updateAsset, uploadToSlot, visibleSlots]);

  // Variant picker — opens visual chooser, then immediately triggers file upload
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<LogoSlot | null>(null);
  const remaining = ADDABLE_SLOTS.filter((s) => !extraSlots.includes(s));

  // Right-click menu state (shared across all slot cards in this group).
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  const openSlotMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    slot: LogoSlot,
    asset: OnboardingAsset | undefined,
    pickFile: () => void,
    isExtra: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    const items: ContextMenuState['items'] = [];
    if (asset) {
      items.push({
        label: 'Replace…',
        onSelect: pickFile,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
        ),
      });
      if (asset.previewUrl) {
        items.push({
          label: 'Open preview',
          onSelect: () => window.open(asset.previewUrl!, '_blank', 'noopener,noreferrer'),
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          ),
        });
      }
      items.push({
        label: 'Copy filename',
        onSelect: () => {
          void copyTextLogo(asset.name);
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        ),
      });
      items.push({
        label: 'Remove logo',
        destructive: true,
        onSelect: () => removeAsset(asset.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    } else {
      items.push({
        label: `Add ${SLOT_DEFS[slot].label.toLowerCase()}…`,
        onSelect: pickFile,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ),
      });
    }
    if (isExtra) {
      items.push({
        label: 'Remove this variant',
        destructive: true,
        onSelect: () => removeLogoSlot(slot),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ),
      });
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const startUploadFor = (slot: LogoSlot) => {
    pendingSlotRef.current = slot;
    addLogoSlot(slot);
    setPickerOpen(false);
    // Defer the click so the popover unmount completes first
    window.setTimeout(() => fileInputRef.current?.click(), 30);
  };

  const onPendingFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slot = pendingSlotRef.current;
    if (file && slot) uploadToSlot(slot, file);
    e.target.value = '';
    pendingSlotRef.current = null;
  };

  return (
    <>
      <div className="logo-slots">
        {visibleSlots.map((slot) => {
          const def = SLOT_DEFS[slot];
          const asset = assets.find((a) => a.logoSlot === slot);
          const isExtra = !DEFAULT_SLOTS.includes(slot);
          return (
            <SlotCard
              key={slot}
              def={def}
              asset={asset}
              isExtra={isExtra}
              onPick={(file) => uploadToSlot(slot, file)}
              onRemove={() => asset && removeAsset(asset.id)}
              onRemoveSlot={isExtra ? () => removeLogoSlot(slot) : undefined}
              onContextMenu={(e, pickFile) => openSlotMenu(e, slot, asset, pickFile, isExtra)}
            />
          );
        })}
      </div>

      {remaining.length > 0 && (
        <div className="review-group-foot">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="add-more-btn">
                <span className="add-more-plus" aria-hidden="true">+</span>
                Add variation
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="logo-variant-picker">
              <div className="logo-variant-grid">
                {remaining.map((slot) => {
                  const def = SLOT_DEFS[slot];
                  return (
                    <button
                      key={slot}
                      type="button"
                      className="logo-variant-card"
                      onClick={() => startUploadFor(slot)}
                      title={def.label}
                      aria-label={`Add ${def.label} variant`}
                    >
                      <div className="logo-variant-card-stage">{VARIANT_PREVIEW[slot]}</div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*,.svg"
        onChange={onPendingFile}
      />

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />
      )}
    </>
  );
}

interface SlotCardProps {
  def: SlotDef;
  asset?: OnboardingAsset;
  isExtra?: boolean;
  onPick(file: File): void;
  onRemove(): void;
  onRemoveSlot?(): void;
  onContextMenu?(e: React.MouseEvent<HTMLDivElement>, pickFile: () => void): void;
}

function SlotCard({ def, asset, isExtra, onPick, onRemove, onRemoveSlot, onContextMenu }: SlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onClick = () => inputRef.current?.click();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) onPick(file);
  };

  return (
    <div
      className={`logo-slot tone-${def.tone}${asset ? ' is-filled' : ''}${isExtra ? ' is-extra' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, onClick) : undefined}
      title={def.hint}
    >
      {asset?.previewUrl ? (
        <>
          <img className="logo-slot-image" src={asset.previewUrl} alt={asset.name} />
          <div className="logo-slot-overlay">
            <button type="button" className="logo-slot-overlay-btn" onClick={onClick} title="Replace" aria-label="Replace">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v5h-5" />
              </svg>
            </button>
            <button type="button" className="logo-slot-overlay-btn is-danger" onClick={onRemove} title="Remove" aria-label="Remove">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="logo-slot-empty" onClick={onClick}>
          <span aria-hidden="true">+</span>
          <span>Add {def.label.toLowerCase()}</span>
        </button>
      )}
      {asset?.generated && <span className="logo-slot-badge">Auto</span>}
      {isExtra && onRemoveSlot && !asset && (
        <button
          type="button"
          className="logo-slot-remove-slot"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveSlot();
          }}
          title="Remove this variant"
          aria-label="Remove this variant"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*,.svg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
