/**
 * The Download menu — one for every card, tile, drilldown header and editor.
 *
 * *For web* · *For print* first, then Vector · Flattened · Custom size… behind
 * a divider. Options a family cannot honour yet are DISABLED with a reason,
 * never hidden, so the menu has one shape everywhere and people learn it
 * once. Custom size opens a small sheet: width, height (auto keeps the
 * shape), padding, background, trim — the affordance behind every favicon,
 * signature and app-store icon anyone has ever needed.
 */
import { useEffect, useRef, useState } from 'react';
import { DsButton, DsInput, DsMenu, DsMenuDivider, DsMenuItem, DsModal, DsSwitch } from '@/shared/ds';
import type { DownloadFormat, DownloadOption, CustomSize } from '../data/exportFormats';

export type DownloadChoice = { format: DownloadFormat; size?: CustomSize };

export function DownloadMenu({
  options,
  onChoose,
  onClose,
  anchor,
}: {
  options: DownloadOption[];
  onChoose: (choice: DownloadChoice) => void;
  onClose: () => void;
  /** Position relative to the trigger; the menu renders in place, not a portal. */
  anchor?: { top: number; left: number };
}) {
  const [custom, setCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (custom) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [custom, onClose]);

  const primary = options.filter((o) => !o.secondary);
  const secondary = options.filter((o) => o.secondary);

  const item = (o: DownloadOption) => (
    <DsMenuItem
      key={o.format}
      disabled={Boolean(o.disabledReason)}
      title={o.disabledReason}
      aria-label={`${o.label} (${o.chip})`}
      onClick={(e) => {
        e.stopPropagation();
        if (o.format === 'custom') {
          setCustom(true);
          return;
        }
        onChoose({ format: o.format });
        onClose();
      }}
    >
      <span className="bk-dl-label">{o.label}</span>
      <span className="ds-kbd bk-dl-chip">{o.chip}</span>
    </DsMenuItem>
  );

  return (
    <>
      {!custom && (
        <div
          ref={ref}
          className="bk-dl-menu"
          style={anchor ? { position: 'absolute', top: anchor.top, left: anchor.left } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <DsMenu aria-label="Download">
            {primary.map(item)}
            {secondary.length > 0 && <DsMenuDivider />}
            {secondary.map(item)}
          </DsMenu>
        </div>
      )}
      <CustomSizeSheet
        open={custom}
        onClose={() => {
          setCustom(false);
          onClose();
        }}
        onDownload={(size) => {
          onChoose({ format: 'custom', size });
          setCustom(false);
          onClose();
        }}
      />
    </>
  );
}

function CustomSizeSheet({
  open,
  onClose,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  onDownload: (size: CustomSize) => void;
}) {
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('');
  const [padding, setPadding] = useState('0');
  const [background, setBackground] = useState('');
  const [trim, setTrim] = useState(true);
  const w = Number(width);
  const valid = Number.isFinite(w) && w >= 16 && w <= 8192;

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Download"
      title="Custom size"
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            disabled={!valid}
            onClick={() =>
              onDownload({
                width: w,
                height: height.trim() ? Number(height) : undefined,
                padding: Number(padding) || 0,
                background: background.trim() ? background.trim() : 'transparent',
                trim,
              })
            }
          >
            Download PNG
          </DsButton>
        </>
      }
    >
      <div className="bk-dl-custom">
        <DsInput label="Width (px)" inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} />
        <DsInput
          label="Height (px)"
          inputMode="numeric"
          placeholder="Auto"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
        <DsInput label="Padding (px)" inputMode="numeric" value={padding} onChange={(e) => setPadding(e.target.value)} />
        <DsInput
          label="Background"
          placeholder="Transparent"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
        />
        <DsSwitch checked={trim} onChange={setTrim} label="Trim empty space" />
      </div>
    </DsModal>
  );
}
