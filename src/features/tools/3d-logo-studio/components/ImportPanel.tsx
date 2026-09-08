/**
 * The empty state: bring in an SVG.
 *
 * Import diagnostics are shown *here*, next to the file that produced them,
 * rather than as a toast. The PRD's rule is that unsupported content must never
 * disappear silently, and a notice that vanishes after four seconds is a
 * slower kind of silence.
 */
import { useCallback, useRef, useState } from 'react';
import { DsBanner, DsButton, DsEyebrow } from '@/shared/ds';

import type { ImportDiagnostic, ImportResult } from '../render/svgImport';
import { describeDiagnostic } from './diagnosticText';

export interface ImportPanelProps {
  onFile: (file: File) => void;
  busy?: boolean;
  result?: ImportResult | null;
  error?: string | null;
}

export function ImportPanel({ onFile, busy, result, error }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className={`l3d-import${over ? ' is-over' : ''}`}>
      <DsEyebrow>3D Logo Studio</DsEyebrow>
      <div
        className="ds-dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer?.files ?? null);
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          {busy ? 'Reading your logo…' : 'Drop an SVG logo here'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
          Everything happens in this browser. Your logo is never uploaded.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,.svg"
        hidden
        onChange={(e) => {
          take(e.target.files);
          // Clearing lets the same file be chosen twice in a row, which is
          // exactly what someone does after editing it in another application.
          e.target.value = '';
        }}
      />
      <DsButton tone="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
        Choose a file
      </DsButton>

      {error && <DsBanner tone="danger">{error}</DsBanner>}
      {result && result.diagnostics.length > 0 && (
        <div className="l3d-diagnostics">
          {result.diagnostics.map((d, i) => (
            <DiagnosticBanner key={i} diagnostic={d} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DiagnosticBanner({ diagnostic }: { diagnostic: ImportDiagnostic }) {
  const { tone, message } = describeDiagnostic(diagnostic);
  // The DS calls the quietest tone `neutral`; this module's severities are
  // named for what they mean to the import, not for how they are painted.
  const banner = tone === 'blocking' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral';
  return <DsBanner tone={banner}>{message}</DsBanner>;
}
