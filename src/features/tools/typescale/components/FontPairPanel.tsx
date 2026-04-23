import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { Typescale, FontRef } from '@/shared/types/typescale';
import { GOOGLE_FONT_CATALOG, SYSTEM_FONT_CATALOG, findCatalogEntry } from '@/shared/typography';

interface Props {
  draft: Typescale;
  onChange: (patch: (prev: Typescale) => Typescale) => void;
  compact?: boolean;
}

/**
 * FontPairPanel — heading + body dropdowns, optional mono, upload CTA.
 *
 * In the `full` variant this is rendered inside the cosmos `.panel`
 * sidebar, so we use `.ts-section` + `.ts-field` + `.ts-select`. The
 * `compact` variant is used inside the EmbeddedTypescaleDialog, where
 * the dialog gives us a card so we stay light-weight.
 */
export function FontPairPanel({ draft, onChange, compact }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  const setFont = (slot: 'heading' | 'body' | 'mono', ref: FontRef) => {
    onChange(p => ({ ...p, fonts: { ...p.fonts, [slot]: ref } }));
  };

  const catalog = [...SYSTEM_FONT_CATALOG, ...GOOGLE_FONT_CATALOG];

  if (compact) {
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
              {catalog.map(f => <option key={`${f.source}:${f.family}`} value={f.family}>{f.family}</option>)}
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
        {(['heading', 'body'] as const).map(slot => (
          <div key={slot} className="ts-field">
            <span className="ts-field-label">{slot}</span>
            <select
              className="ts-select"
              aria-label={`${slot} font`}
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
          </div>
        ))}

        {draft.fonts.mono && (
          <div className="ts-field">
            <span className="ts-field-label">mono</span>
            <select
              className="ts-select"
              aria-label="mono font"
              value={draft.fonts.mono.family}
              onChange={e => {
                const found = findCatalogEntry(e.target.value);
                if (found) setFont('mono', found);
              }}
            >
              {catalog.map(f => (
                <option key={`${f.source}:${f.family}`} value={f.family}>
                  {f.family}
                </option>
              ))}
            </select>
          </div>
        )}

        {!showUpload ? (
          <button
            type="button"
            className="ts-upload-btn"
            onClick={() => setShowUpload(true)}
          >
            <Upload size={13} />
            Upload custom font
          </button>
        ) : (
          <UploadPicker
            onPicked={(ref) => {
              setFont('heading', ref);
              setShowUpload(false);
            }}
            onCancel={() => setShowUpload(false)}
          />
        )}
      </div>
    </div>
  );
}

function UploadPicker({ onPicked, onCancel }: { onPicked: (ref: FontRef) => void; onCancel: () => void }) {
  // Minimal: accept a single file, read via URL.createObjectURL, build a FontRef.
  return (
    <div className="ts-upload-dialog">
      <input
        type="file"
        accept=".woff2,.woff,.ttf"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : 'ttf';
          const ref: FontRef = {
            family: file.name.replace(/\.(woff2|woff|ttf)$/i, ''),
            source: 'upload',
            weights: [400],
            italic: false,
            files: [{ weight: 400, italic: false, url, format }],
            fallback: 'system-ui, sans-serif',
          };
          onPicked(ref);
        }}
      />
      <button type="button" className="ts-upload-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
