/**
 * What gets exported — asked, not assumed.
 *
 * The same shape as the Brand Kit's `ExportKitDialog`, because it is the same
 * moment: the user is about to commit to a file, and the product's answer to
 * that moment is a sheet that states what it will produce, lets them change
 * it, and prices it before they press the button. Bento used to fire a single
 * 1080px PNG straight at the download folder with a toast — no format, no
 * resolution, no way to get a transparent one, and nothing said beforehand.
 *
 * The options are only the ones that actually change the file. There is no
 * "quality" slider and no colour-profile picker, because neither would be
 * honoured by the html2canvas path that renders it — a control that does
 * nothing is worse than an absent one.
 */
import { useMemo, useState } from 'react';
import { DsButton, DsCheckbox, DsEyebrow, DsModal, DsSegmented } from '@/shared/ds';
import { resolveSize } from '../sizes';
import type { BentoDesign } from '../types';

export type BentoExportFormat = 'png' | 'jpg';

export interface BentoExportOptions {
  format: BentoExportFormat;
  /** 1 or 2. The artboard is authored at its preset size; 2 doubles it. */
  scale: number;
  /** PNG only — a JPG has no alpha channel to leave empty. */
  transparent: boolean;
}

/**
 * Roughly what the file will weigh.
 *
 * Deliberately coarse: an order of magnitude measured on real exports, not a
 * promise. A number that is roughly right and present beats an exact one that
 * only exists after the work is done.
 */
function estimateMb(w: number, h: number, format: BentoExportFormat): number {
  const px = w * h;
  // A bento is flat colour and type — it compresses far better than a photo.
  const perPx = format === 'png' ? 0.0000012 : 0.0000004;
  return Math.max(0.05, px * perPx);
}

export function BentoExportDialog({
  open,
  design,
  brandName,
  busy,
  onClose,
  onExport,
}: {
  open: boolean;
  design: BentoDesign;
  brandName?: string;
  busy?: boolean;
  onClose: () => void;
  onExport: (options: BentoExportOptions) => void;
}) {
  const [format, setFormat] = useState<BentoExportFormat>('png');
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(false);

  const base = resolveSize(design.sizeId, design.customSize);
  const out = useMemo(
    () => ({ w: base.width * scale, h: base.height * scale }),
    [base.width, base.height, scale],
  );
  const mb = estimateMb(out.w, out.h, format);

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Export"
      title="Export this bento"
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </DsButton>
          <DsButton onClick={() => onExport({ format, scale, transparent })} disabled={busy}>
            {busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </DsButton>
        </>
      }
    >
      <div className="bento-export">
        <section className="bento-export-group">
          <DsEyebrow>Format</DsEyebrow>
          <DsSegmented
            aria-label="File format"
            value={format}
            onChange={(v) => setFormat(v as BentoExportFormat)}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpg', label: 'JPG' },
            ]}
          />
          <p className="bento-export-hint">
            {format === 'png'
              ? 'Lossless, and the only format that can carry a transparent background.'
              : 'Smaller file, no transparency — the background is always painted.'}
          </p>
        </section>

        <section className="bento-export-group">
          <DsEyebrow>Resolution</DsEyebrow>
          <DsSegmented
            aria-label="Resolution"
            value={String(scale)}
            onChange={(v) => setScale(Number(v))}
            options={[
              { value: '1', label: `1× · ${base.width}×${base.height}` },
              { value: '2', label: `2× · ${base.width * 2}×${base.height * 2}` },
            ]}
          />
          <p className="bento-export-hint">
            {scale === 1
              ? `${base.name} at its authored size — right for anywhere it is posted.`
              : 'Double resolution, for print or a retina screen. Slower, and four times the pixels.'}
          </p>
        </section>

        {format === 'png' && (
          <section className="bento-export-group">
            <DsEyebrow>Background</DsEyebrow>
            <DsCheckbox
              label="Transparent background"
              checked={transparent}
              onChange={setTransparent}
            />
            <p className="bento-export-hint">
              Leaves the canvas ground empty so the tiles can sit on something else.
              Gaps and edge padding become transparent too.
            </p>
          </section>
        )}

        <p className="bento-export-estimate">
          {out.w}×{out.h} · about {mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(1)} MB`}
          {brandName ? ` · ${brandName}` : ''}
        </p>
      </div>
    </DsModal>
  );
}
