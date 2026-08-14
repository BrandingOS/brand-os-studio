/**
 * Screen 1 — Set up your Brand.
 *
 * The interface this restores, unchanged in shape: one centred column carrying
 * the brand name, the description and the upload area together. They belong on
 * one screen because they are one act — telling us about the brand, in words
 * and in files — and splitting them apart made the flow feel longer without
 * making any step clearer.
 *
 * The Build-with-AI badge sits to the right of the "Describe your brand" label
 * and opens a floating popover, exactly as the retired hint did.
 *
 * Pressing Continue CREATES the brand record. Everything after this writes to
 * that real brand, which is what makes resume work across sessions and devices,
 * and it is why a name collision is resolved here, visibly, rather than
 * silently renamed at the end.
 */
import { useCallback, useRef, useState } from 'react';
import { DsButton, DsInput } from '@/shared/ds';
import { collectDroppedFiles, enqueueFile, filterFolderPick } from '@/shared/upload/intake';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { MAX_FILES, describeLimits, refuse } from '../material/limits';
import { useOnboardingStore } from '../state/onboardingStore';
import { BuildWithAI } from '../brief/BuildWithAI';

const PLACEHOLDER =
  "Tell me everything — what you do, who it's for, and why it matters…";

export interface SetupStepProps {
  busy: boolean;
  error: string | null;
  onContinue(values: { name: string; description: string; website: string }): void;
  onExit?: () => void;
}

/** The three paper previews that sit above the drop text. */
function DropPreviews() {
  return (
    <div className="onb-dz-previews" aria-hidden="true">
      {(['PNG', 'JPG', 'PDF'] as const).map((kind, i) => (
        <span className={`onb-pv onb-pv--${i}`} key={kind}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <rect x="3" y="2" width="18" height="20" rx="2" />
            {kind === 'PDF' ? (
              <>
                <path d="M7 9h10M7 13h10M7 17h6" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="9" cy="9" r="1.6" />
                <path d="M4 17l5-5 4 4 3-2 4 3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
          <b>{kind}</b>
        </span>
      ))}
    </div>
  );
}

export function SetupStep({ busy, error, onContinue, onExit }: SetupStepProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [hot, setHot] = useState(false);
  const [refusals, setRefusals] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useOnboardingStore((s) => s.items);
  const addItem = useOnboardingStore((s) => s.addItem);
  const updateItem = useOnboardingStore((s) => s.updateItem);
  const removeItem = useOnboardingStore((s) => s.removeItem);
  const clearItems = useOnboardingStore((s) => s.reset);

  const ready = name.trim().length > 0;

  const deps = useCallback(
    () => ({
      max: MAX_FILES,
      getCount: () => useOnboardingStore.getState().items.length,
      getAssets: () => useOnboardingStore.getState().items,
      addAsset: addItem,
      updateAssetProgress: (id: string, pct: number) =>
        updateItem(id, { uploadProgress: pct, uploadStatus: 'uploading' }),
      markAssetDone: (id: string, previewUrl?: string | null) =>
        updateItem(id, {
          uploadProgress: 1,
          uploadStatus: 'done',
          ...(previewUrl ? { previewUrl } : {}),
        }),
    }),
    [addItem, updateItem],
  );

  /**
   * Takes a batch, refusing per item.
   *
   * One oversized file in a dropped folder must not cost the user the folder,
   * so the loop continues and the refusals are named together at the end.
   */
  const take = useCallback(
    async (files: File[]) => {
      const said: string[] = [];
      for (const f of files) {
        const no = refuse(f, useOnboardingStore.getState().items.length);
        if (no) {
          said.push(no);
          continue;
        }
        await enqueueFile(f, deps());
      }
      setRefusals(said);
    },
    [deps],
  );

  const visible = items.filter((a) => a.kind !== 'color' && !a.generated);

  return (
    <div className="onb-page">
      {onExit && (
        <button type="button" className="onb-exit onb-exit--corner" onClick={onExit}>
          Exit
        </button>
      )}

      <div className="onb-col">
        <header className="onb-head">
          <span className="onb-mark-sq" aria-hidden="true">B</span>
          <h1 className="onb-h1">Set up your Brand</h1>
          <p className="onb-sub">Upload your brand and let the system structure everything for you.</p>
        </header>

        <form
          className="onb-form"
          autoComplete="off"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) onContinue({ name: name.trim(), description, website });
          }}
        >
          <div className="onb-field">
            <DsInput
              id="brand-name"
              label="Brand name"
              value={name}
              autoFocus
              placeholder="Enter your brand name"
              onChange={(e) => setName(e.target.value)}
              {...(error ? { error } : {})}
            />
          </div>

          <div className="onb-field">
            <div className="onb-field-head">
              <label className="onb-label" htmlFor="onb-description">
                Describe your brand
              </label>
              <BuildWithAI brandName={name} />
            </div>
            <div className="onb-ta-wrap">
              <textarea
                id="onb-description"
                className="onb-ta"
                rows={6}
                value={description}
                placeholder={PLACEHOLDER}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="onb-ta-spark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                  <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
                </svg>
              </span>
            </div>
          </div>

          <div className="onb-field">
            <div
              className={`onb-dz${hot ? ' is-hot' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Upload brand files — drag and drop, or choose files"
              onClick={(e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('input')) return;
                fileRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (document.activeElement?.tagName === 'INPUT') return;
                e.preventDefault();
                fileRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setHot(true);
              }}
              onDragLeave={() => setHot(false)}
              onDrop={(e) => {
                e.preventDefault();
                setHot(false);
                void collectDroppedFiles(e.dataTransfer).then(take);
              }}
            >
              <div className="onb-dz-inner">
                <DropPreviews />

                <p className="onb-dz-text">
                  Drag &amp; drop image or folder here,{' '}
                  <button
                    type="button"
                    className="onb-dz-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                  >
                    upload file
                  </button>{' '}
                  or paste the URL
                </p>

                <label className="onb-pill" onClick={(e) => e.stopPropagation()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
                  </svg>
                  <input
                    type="url"
                    className="onb-pill-input"
                    placeholder="Paste a URL"
                    aria-label="Your website"
                    autoComplete="url"
                    spellCheck={false}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>

                {visible.length > 0 && (
                  <div className="onb-dz-items">
                    <div className="onb-dz-bar">
                      <span className="onb-count">
                        {visible.length} {visible.length === 1 ? 'item' : 'items'}
                      </span>
                      <button
                        type="button"
                        className="onb-hint-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearItems();
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="onb-files" aria-live="polite">
                      {visible.map((a) => (
                        <div
                          className={`onb-file${a.uploadStatus === 'error' ? ' is-error' : ''}`}
                          key={a.id}
                        >
                          <span className="onb-file-ico" aria-hidden="true">
                            {a.previewUrl ? (
                              <img src={a.previewUrl} alt="" />
                            ) : (
                              (a.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? a.kind).slice(0, 4).toUpperCase()
                            )}
                          </span>
                          <span className="onb-file-n">
                            <b>{a.name}</b>
                            <small>{a.error ?? a.sub}</small>
                          </span>
                          <button
                            type="button"
                            className="onb-file-x"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(a.id);
                            }}
                          >
                            <span className="sr-only">Remove {a.name}</span>
                            <span aria-hidden="true">×</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="onb-dz-meta">{describeLimits()}</p>

                {refusals.length > 0 && (
                  <ul className="onb-refusals" role="status">
                    {refusals.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                accept="image/*,.svg,.pdf,.ai,.sketch,.fig,.psd,.zip,.otf,.ttf,.woff,.woff2"
                onChange={(e) => {
                  if (e.target.files) void take(filterFolderPick(e.target.files));
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="onb-foot">
            <DsButton type="submit" arrow disabled={!ready || busy}>
              {busy ? 'Setting up…' : 'Continue'}
            </DsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { OnboardingAsset };
