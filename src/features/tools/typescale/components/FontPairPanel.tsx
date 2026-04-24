import { useMemo, useRef, useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
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
  const [uploadTarget, setUploadTarget] = useState<'heading' | 'body' | null>(null);

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

        <div className="ts-upload-row">
          {(['heading', 'body'] as const).map(slot => (
            <button
              key={slot}
              type="button"
              className={`ts-upload-chip${uploadTarget === slot ? ' is-active' : ''}`}
              onClick={() => setUploadTarget(uploadTarget === slot ? null : slot)}
            >
              <Upload size={13} />
              <span>Upload {slot === 'heading' ? 'Heading' : 'Body'}</span>
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

function detectFormat(name: string): 'woff2' | 'woff' | 'ttf' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  // CSS `truetype` format covers both .ttf AND .otf in practice.
  return 'ttf';
}

function stripFontExt(name: string): string {
  return name.replace(/\.(woff2|woff|ttf|otf)$/i, '');
}

function buildUploadRef(file: File): FontRef {
  return {
    family: stripFontExt(file.name),
    source: 'upload',
    weights: [400],
    italic: false,
    files: [
      {
        weight: 400,
        italic: false,
        url: URL.createObjectURL(file),
        format: detectFormat(file.name),
      },
    ],
    fallback: 'system-ui, sans-serif',
  };
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<FontRef | null>(null);

  const loadFile = (file: File) => {
    const ref = buildUploadRef(file);
    // Inject @font-face immediately so the preview below renders in the
    // newly-uploaded family, not the fallback.
    ensureLoaded(ref);
    setStaged(ref);
  };

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

      <label
        className={`ts-upload-drop${dragging ? ' is-dragging' : ''}${staged ? ' is-staged' : ''}`}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          className="ts-upload-drop-input"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
          }}
        />
        {!staged ? (
          <>
            <Upload size={18} className="ts-upload-drop-icon" />
            <span className="ts-upload-drop-label">Click or drop a font file</span>
            <span className="ts-upload-drop-hint">.woff2 · .woff · .ttf · .otf</span>
          </>
        ) : (
          <>
            <Check size={18} className="ts-upload-drop-icon is-success" />
            <span className="ts-upload-drop-label">{staged.family}</span>
            <span
              className="ts-upload-drop-preview"
              style={{ fontFamily: `"${staged.family}", ${staged.fallback}` }}
              aria-hidden
            >
              The quick brown fox
            </span>
          </>
        )}
      </label>

      {staged && (
        <div className="ts-upload-actions">
          <button
            type="button"
            className="ts-upload-secondary"
            onClick={() => {
              setStaged(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            Replace
          </button>
          <button
            type="button"
            className="ts-upload-primary"
            onClick={() => onPicked(staged)}
          >
            Apply to {slot}
          </button>
        </div>
      )}
    </div>
  );
}
