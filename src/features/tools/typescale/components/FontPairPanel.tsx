import { useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { Typescale, FontRef } from '@/shared/types/typescale';
import {
  GOOGLE_FONT_CATALOG,
  SYSTEM_FONT_CATALOG,
  ensureLoaded,
  findCatalogEntry,
} from '@/shared/typography';
import { FontPicker } from './FontPicker';

type Slot = 'heading' | 'body' | 'mono';

interface Props {
  draft: Typescale;
  onChange: (patch: (prev: Typescale) => Typescale) => void;
  compact?: boolean;
}

/**
 * FontPairPanel — heading + body (+ optional mono) pickers with a
 * per-slot upload flow.
 *
 * `full` variant uses the FontPicker popover with live previews.
 * `compact` (used inside EmbeddedTypescaleDialog) keeps the lightweight
 * native <select> so the dialog stays simple.
 */
export function FontPairPanel({ draft, onChange, compact }: Props) {
  const [uploadTarget, setUploadTarget] = useState<Slot | null>(null);

  const setFont = (slot: Slot, ref: FontRef) => {
    onChange(p => ({ ...p, fonts: { ...p.fonts, [slot]: ref } }));
  };

  const customFonts = useMemo<FontRef[]>(() => {
    const arr: FontRef[] = [];
    for (const slot of ['heading', 'body', 'mono'] as const) {
      const r = draft.fonts[slot];
      if (r && r.source === 'upload') arr.push(r);
    }
    return arr;
  }, [draft.fonts]);

  if (compact) {
    const catalog = [...SYSTEM_FONT_CATALOG, ...GOOGLE_FONT_CATALOG];
    return (
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Font pair</h3>
        {(['heading', 'body'] as const).map(slot => (
          <label key={slot} className="block space-y-1">
            <span className="text-xs capitalize text-muted-foreground">{slot}</span>
            <select
              className="w-full rounded border px-2 py-1 text-sm"
              value={draft.fonts[slot].family}
              onChange={e => {
                const found = findCatalogEntry(e.target.value);
                if (found) setFont(slot, found);
              }}
            >
              {catalog.map(f => (
                <option key={`${f.source}:${f.family}`} value={f.family}>
                  {f.family}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>
    );
  }

  return (
    <div className="ts-section">
      <div className="ts-section-head" aria-hidden>
        <span className="ts-section-title">Font pair</span>
      </div>
      <div className="ts-section-body">
        <FontPicker
          label="Heading"
          value={draft.fonts.heading}
          onChange={ref => setFont('heading', ref)}
          customFonts={customFonts}
        />
        <FontPicker
          label="Body"
          value={draft.fonts.body}
          onChange={ref => setFont('body', ref)}
          customFonts={customFonts}
        />
        {draft.fonts.mono && (
          <FontPicker
            label="Mono"
            value={draft.fonts.mono}
            onChange={ref => setFont('mono', ref)}
            customFonts={customFonts}
          />
        )}

        <div className="ts-upload-row">
          {(['heading', 'body', 'mono'] as const).map(slot => (
            <button
              key={slot}
              type="button"
              className={`ts-upload-chip${uploadTarget === slot ? ' is-active' : ''}`}
              onClick={() => setUploadTarget(uploadTarget === slot ? null : slot)}
            >
              <Upload size={11} />
              <span>Upload {slot}</span>
            </button>
          ))}
        </div>

        {uploadTarget && (
          <UploadPicker
            slot={uploadTarget}
            onPicked={ref => {
              setFont(uploadTarget, ref);
              setUploadTarget(null);
            }}
            onCancel={() => setUploadTarget(null)}
          />
        )}
      </div>
    </div>
  );
}

function UploadPicker({
  slot,
  onPicked,
  onCancel,
}: {
  slot: Slot;
  onPicked: (ref: FontRef) => void;
  onCancel: () => void;
}) {
  return (
    <div className="ts-upload-dialog">
      <div className="ts-upload-dialog-head">
        <span className="ts-upload-dialog-title">Upload for {slot}</span>
        <button
          type="button"
          className="ts-upload-cancel"
          onClick={onCancel}
          aria-label="Cancel upload"
        >
          <X size={12} />
        </button>
      </div>
      <input
        type="file"
        accept=".woff2,.woff,.ttf"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const format = file.name.endsWith('.woff2')
            ? 'woff2'
            : file.name.endsWith('.woff')
            ? 'woff'
            : 'ttf';
          const ref: FontRef = {
            family: file.name.replace(/\.(woff2|woff|ttf)$/i, ''),
            source: 'upload',
            weights: [400],
            italic: false,
            files: [{ weight: 400, italic: false, url, format }],
            fallback: 'system-ui, sans-serif',
          };
          // Inject @font-face immediately so it renders before any re-render.
          ensureLoaded(ref);
          onPicked(ref);
        }}
      />
      <p className="ts-upload-dialog-hint">
        .woff2, .woff or .ttf — the file stays local to this session.
      </p>
    </div>
  );
}
