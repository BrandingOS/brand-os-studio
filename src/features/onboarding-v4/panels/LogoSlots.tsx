import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useV4Store } from '../store/onboardingV4Store';
import type { LogoSlot, OnboardingAsset } from '../types';
import { buildAsset, imageAspectRatio, rasterFileToVariants, simulateUpload, svgFileToVariants } from '@/shared/upload/intake';
import { planPrimarySwap } from '@/shared/upload/logoFamily';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';

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

// Only the two slots every brand actually has stay on screen; the rest live
// behind "Add variation" and appear once the user picks them (or once an
// upload is classified as one of them).
const DEFAULT_SLOTS: LogoSlot[] = ['primary', 'wordmark'];
const ADDABLE_SLOTS: LogoSlot[] = ['mark', 'dark', 'light', 'horizontal', 'vertical'];

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

  // Memoized: the auto-router effect depends on this list, and the router can
  // itself add a slot — a fresh array every render would re-trigger it.
  const visibleSlots: LogoSlot[] = useMemo(
    () => [...DEFAULT_SLOTS, ...extraSlots.filter((s) => !DEFAULT_SLOTS.includes(s))],
    [extraSlots],
  );

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
  // Slot each asset was AUTO-assigned — the family resolver may only move
  // assets whose current slot still matches this (i.e. the user hasn't).
  const autoRef = useRef(new Map<string, LogoSlot>());
  // Variant slots the ROUTER revealed (vs. user's "Add variation"). If one
  // ends up empty after the family shuffle, it must close itself — an empty
  // placeholder the user never asked for is clutter, not an invitation.
  const autoAddedSlotsRef = useRef(new Set<LogoSlot>());
  useEffect(() => {
    const taken = new Set<LogoSlot>();
    for (const a of assets) if (a.logoSlot) taken.add(a.logoSlot);

    // Safety net: a logo exported flat on white has no transparency and often
    // no "logo" in its filename, so neither the upload heuristics nor the
    // classifier flags it — and this screen has no other home for an image,
    // so it would vanish and the brand would be created with no logo at all.
    // If nothing claimed a slot, the first uploaded image becomes the Primary.
    //
    // Guards: never rescue while uploads are still classifying, and never
    // rescue when a REAL logo candidate exists — otherwise a palette/photo
    // image that happened to finish first would steal the Primary slot and
    // the actual logo would land in Wordmark (and the photo would stop
    // being a photo).
    const nothingPlaced = !assets.some((a) => a.logoSlot);
    const stillUploading = assets.some((a) => a.uploadStatus === 'uploading');
    const anyLogoCandidate = assets.some((a) => a.kind === 'image' && a.isLogo);
    const firstImage = assets.find(
      (a) => a.kind === 'image' && !a.generated && !a.logoSlot && a.uploadStatus === 'done',
    );
    const rescueId =
      nothingPlaced && !stillUploading && !anyLogoCandidate && firstImage
        ? firstImage.id
        : null;

    (async () => {
      for (const a of assets) {
        if (a.kind !== 'image' || a.logoSlot) continue;
        if (!a.isLogo && a.id !== rescueId) continue;
        if (claimedRef.current.has(a.id)) continue;
        claimedRef.current.add(a.id);

        // Re-read placements from the store each round: an earlier iteration
        // (or a concurrent run of this effect) may have filled a slot since
        // the snapshot above.
        for (const other of useV4Store.getState().assets) {
          if (other.logoSlot) taken.add(other.logoSlot);
        }

        let target: LogoSlot | null = null;
        if (!taken.has('primary')) {
          // The brand's first logo is the Primary, full stop — even when the
          // classifier calls it an icon or a wordmark. Later uploads then fan
          // out by hint.
          target = 'primary';
        } else if (a.aiLogoSlot && !taken.has(a.aiLogoSlot)) {
          // Brand Vision's suggestion — allowed to name a variant that isn't
          // on screen yet; it gets revealed below.
          target = a.aiLogoSlot;
        } else {
          target = inferSlot(a.name, taken);
        }
        if (!target && a._file) {
          // Square-ish uploads bias to the Icon slot.
          const ratio = await imageAspectRatio(a._file);
          if (ratio != null && ratio < 1.35 && !taken.has('mark')) target = 'mark';
        }
        if (!target) target = nextEmpty(taken, visibleSlots);
        if (!target) {
          // Every visible slot is full but the user genuinely uploaded another
          // logo — reveal the next variant slot for it instead of silently
          // dropping it (the group header counts it, so it must show).
          // Neutral-tone slots first; dark/light last since a generic upload
          // probably isn't tone-specific.
          const FALLBACK_ORDER: LogoSlot[] = ['mark', 'horizontal', 'vertical', 'dark', 'light'];
          target = FALLBACK_ORDER.find((s) => !taken.has(s)) ?? null;
        }
        if (!target) continue;
        // Reveal a variant slot the router picked but the user hasn't added.
        if (!visibleSlots.includes(target) && ADDABLE_SLOTS.includes(target)) {
          addLogoSlot(target);
          autoAddedSlotsRef.current.add(target);
        }
        taken.add(target);
        autoRef.current.set(a.id, target);
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

      // Family resolver: classifications land one by one, so the icon can
      // beat the full lockup to the Primary slot. When a better auto-placed
      // candidate exists, swap it in. User-moved logos are never touched.
      const plan = planPrimarySwap(useV4Store.getState().assets, autoRef.current);
      if (plan) {
        const state = useV4Store.getState();
        if (
          !DEFAULT_SLOTS.includes(plan.demoteTo) &&
          !state.extraLogoSlots.includes(plan.demoteTo)
        ) {
          addLogoSlot(plan.demoteTo);
          autoAddedSlotsRef.current.add(plan.demoteTo);
        }
        autoRef.current.set(plan.promoteId, 'primary');
        autoRef.current.set(plan.demoteId, plan.demoteTo);
        updateAsset(plan.promoteId, { logoSlot: 'primary' });
        updateAsset(plan.demoteId, { logoSlot: plan.demoteTo });

        // Regenerate light/dark tonal variants from the TRUE primary —
        // the ones on screen were derived from the demoted logo.
        const promoted = state.assets.find((x) => x.id === plan.promoteId);
        if (promoted?._file) {
          const isSvg =
            /\.svg$/i.test(promoted.name) || promoted._file.type === 'image/svg+xml';
          const variants = isSvg
            ? await svgFileToVariants(promoted._file)
            : await rasterFileToVariants(promoted._file);
          if (variants) {
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
      }

      // Close auto-revealed slots that ended up empty after the shuffle —
      // only uploads should show; the user never asked for that placeholder.
      const finals = useV4Store.getState();
      for (const slot of [...autoAddedSlotsRef.current]) {
        const occupied = finals.assets.some((x) => x.logoSlot === slot);
        if (!occupied && finals.extraLogoSlots.includes(slot)) {
          removeLogoSlot(slot);
          autoAddedSlotsRef.current.delete(slot);
        }
      }
    })();
  }, [assets, updateAsset, uploadToSlot, visibleSlots, addLogoSlot, removeLogoSlot]);

  /** Move a logo to a different slot. If the target slot is occupied the two
   *  logos swap places; a hidden variant slot gets revealed first. */
  const reassignSlot = useCallback(
    (assetId: string, target: LogoSlot) => {
      const state = useV4Store.getState();
      const moving = state.assets.find((a) => a.id === assetId);
      if (!moving || moving.logoSlot === target) return;
      const from = moving.logoSlot;
      const occupant = state.assets.find((a) => a.logoSlot === target && a.id !== assetId);
      if (!DEFAULT_SLOTS.includes(target) && !state.extraLogoSlots.includes(target)) {
        addLogoSlot(target);
      }
      updateAsset(assetId, { logoSlot: target });
      if (occupant && from) updateAsset(occupant.id, { logoSlot: from });
    },
    [addLogoSlot, updateAsset],
  );

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
    // The menu can be opened from the slot itself (right-click) OR from the
    // role chip (left-click) — anchor the active state to the slot card
    // either way.
    const anchorEl =
      ((e.currentTarget as HTMLElement).closest('.logo-slot') as HTMLElement | null) ??
      (e.currentTarget as HTMLElement);
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = anchorEl;
    anchorEl.classList.add('is-ctx-active');

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
      // "This is actually the …" — reassign the logo to another slot.
      // Only the three core roles here; the rest are reachable through
      // "Add variation". Occupied targets swap the two logos.
      const state = useV4Store.getState();
      const REASSIGN_TARGETS: LogoSlot[] = ['primary', 'mark', 'wordmark'];
      for (const targetSlot of REASSIGN_TARGETS) {
        if (targetSlot === slot) continue;
        const targetDef = SLOT_DEFS[targetSlot];
        const occupied = state.assets.some((a) => a.logoSlot === targetSlot);
        items.push({
          label: `Set as ${targetDef.label.toLowerCase()}${occupied ? ' (swap)' : ''}`,
          onSelect: () => reassignSlot(asset.id, targetSlot),
          icon: (
            <span className="ctx-menu-slot-preview" aria-hidden="true">
              {VARIANT_PREVIEW[targetSlot]}
            </span>
          ),
        });
      }
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
    // Keyboard-opened (Enter on the chip) has no pointer coords — anchor to
    // the chip's corner instead.
    const rect = anchorEl.getBoundingClientRect();
    setCtxMenu({ x: e.clientX || rect.left + 16, y: e.clientY || rect.bottom - 10, items });
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
                      <span className="logo-variant-card-label">{def.label}</span>
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
      {asset && (
        <span
          className="logo-slot-name"
          role="button"
          tabIndex={0}
          title="Logo options"
          onClick={
            onContextMenu
              ? (e) => {
                  e.stopPropagation();
                  onContextMenu(e as unknown as React.MouseEvent<HTMLDivElement>, onClick);
                }
              : undefined
          }
          onKeyDown={
            onContextMenu
              ? (e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e as unknown as React.MouseEvent<HTMLDivElement>, onClick);
                }
              : undefined
          }
        >
          {def.label}
        </span>
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
