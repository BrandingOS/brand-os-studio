/**
 * Step 1 — the mark and the name.
 *
 * Nothing else is asked here. The owner has a logo and a name; everything
 * else is the product's job to propose.
 */
import { useCallback, useRef, useState } from 'react';
import { DsButton, DsInput } from '@/shared/ds';
import { useLogoFlow } from '../model/flowStore';
import { refuseLogo, sourceFromFile } from '../engine/logoRead';
import { LogoMark } from '../components/LogoMark';

export function UploadStep({ onSubmit }: { onSubmit(): void }) {
  const logo = useLogoFlow((s) => s.logo);
  const name = useLogoFlow((s) => s.context.name);
  const setLogo = useLogoFlow((s) => s.setLogo);
  const updateContext = useLogoFlow((s) => s.updateContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const refusal = refuseLogo(file);
      if (refusal) {
        setError(refusal);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const source = await sourceFromFile(file);
        setLogo(source);
        // A file called "acme-logo-black" is a strong hint at the name.
        if (!useLogoFlow.getState().context.name.trim()) {
          const guess = source.name
            .replace(/[-_]+/g, ' ')
            .replace(/\b(logo|mark|icon|black|white|final|v\d+|copy|\d+x?)\b/gi, '')
            .trim();
          if (guess) updateContext({ name: guess.replace(/\b\w/g, (c) => c.toUpperCase()) });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That file could not be read.');
      } finally {
        setBusy(false);
      }
    },
    [setLogo, updateContext],
  );

  return (
    <div className="lf-stack lf-narrow">
      <DsInput
        label="Brand name"
        placeholder="e.g. Northwind"
        value={name}
        autoFocus
        onChange={(e) => updateContext({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && logo && name.trim()) onSubmit();
        }}
      />

      <div
        className={`ds-dropzone lf-drop${drag ? ' is-drag' : ''}${logo ? ' has-logo' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={logo ? 'Replace logo' : 'Upload your logo'}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void accept(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
          hidden
          data-testid="logo-input"
          onChange={(e) => {
            void accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {logo ? (
          <div className="lf-drop-preview">
            <div className="lf-checker">
              <LogoMark logo={logo} color="#111111" height={96} style={{ maxWidth: '100%' }} />
            </div>
            <div className="lf-drop-meta">
              <strong>{logo.name}</strong>
              <span>{logo.svgText ? 'Vector (SVG) — every file we make stays vector.' : 'Raster image — we’ll make high-resolution PNGs. An SVG would give vectors.'}</span>
            </div>
          </div>
        ) : (
          <div className="lf-drop-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4" />
              <path d="m6 10 6-6 6 6" />
              <path d="M4 20h16" />
            </svg>
            <strong>{busy ? 'Reading your logo…' : 'Drop your logo here'}</strong>
            <span>SVG works best. PNG, JPG and WebP are fine — a solid black mark is perfect.</span>
          </div>
        )}
      </div>

      {logo && (
        <div className="lf-row-end">
          <DsButton tone="tertiary" size="sm" onClick={() => setLogo(null)}>
            Remove
          </DsButton>
          <DsButton tone="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Replace
          </DsButton>
        </div>
      )}
      {error && (
        <p className="lf-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
