/**
 * Screen 2 — describe the brand, bring what you have, give a website.
 *
 * All three on ONE screen, in that order, as the flow this restores had them.
 * They belong together: they are the same act — telling us about the brand —
 * expressed in words, in files and in a link. Splitting them across screens
 * made the flow feel longer without making any step clearer.
 *
 * The AI helper sits beside the description label and opens a floating popover.
 * Nothing on this screen is required; Continue is always available.
 *
 * Material goes to the Library as it arrives, not batched at the end. That is
 * what makes a refusal honest — "too big" is said at the moment of upload
 * rather than silently at finish.
 */
import { useCallback, useRef, useState } from 'react';
import { DsButton, DsDropZone, DsInput, DsTextArea } from '@/shared/ds';
import { collectDroppedFiles, enqueueFile, filterFolderPick } from '@/shared/upload/intake';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { MAX_FILES, MAX_FILE_BYTES, describeLimits, refuse } from '../material/limits';
import { useOnboardingStore } from '../state/onboardingStore';
import { BuildWithAI } from '../brief/BuildWithAI';
import { SplitShell } from '../components/SplitShell';

const PLACEHOLDER = `What does your brand do, and who is it for? Mention your industry, what you sell, the customer you want, how you'd like to sound, and any colours or fonts you already use.`;

export interface ProfileStepProps {
  brandName: string;
  initialDescription: string;
  initialWebsite: string;
  busy: boolean;
  onBack(): void;
  onContinue(values: { description: string; website: string }): void;
  onExit?: () => void;
  /** Called per item once it lands, so the caller can put it in the Library. */
  onUploaded(item: OnboardingAsset): void;
}

export function ProfileStep({
  brandName,
  initialDescription,
  initialWebsite,
  busy,
  onBack,
  onContinue,
  onExit,
  onUploaded,
}: ProfileStepProps) {
  const [description, setDescription] = useState(initialDescription);
  const [website, setWebsite] = useState(initialWebsite);
  const [hot, setHot] = useState(false);
  const [refusals, setRefusals] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useOnboardingStore((s) => s.items);
  const addItem = useOnboardingStore((s) => s.addItem);
  const updateItem = useOnboardingStore((s) => s.updateItem);
  const removeItem = useOnboardingStore((s) => s.removeItem);

  const deps = useCallback(
    () => ({
      max: MAX_FILES,
      getCount: () => useOnboardingStore.getState().items.length,
      getAssets: () => useOnboardingStore.getState().items,
      addAsset: addItem,
      updateAssetProgress: (id: string, pct: number) =>
        updateItem(id, { uploadProgress: pct, uploadStatus: 'uploading' }),
      markAssetDone: (id: string, previewUrl?: string | null) => {
        updateItem(id, { uploadProgress: 1, uploadStatus: 'done', ...(previewUrl ? { previewUrl } : {}) });
        const item = useOnboardingStore.getState().items.find((i) => i.id === id);
        if (item) onUploaded(item);
      },
    }),
    [addItem, updateItem, onUploaded],
  );

  /**
   * Takes a batch, refusing per item.
   *
   * One oversized file in a dropped folder must not cost the user the folder —
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

  return (
    <SplitShell nodes={[7, 0, 1]} step={2} total={3} onExit={onExit}>
      <div>
        <h1 className="onb-split-h">Tell us about {brandName}</h1>
        <p className="onb-split-sub">
          The more you give us, the less we&rsquo;ll have to ask. Skip any of it.
        </p>
      </div>

      {/* ── Describe your brand ─────────────────────────────────────── */}
      <div className="onb-field">
        <div className="onb-field-head">
          <label className="onb-label" htmlFor="onb-description">
            Describe your brand
          </label>
          <BuildWithAI brandName={brandName} />
        </div>
        <DsTextArea
          id="onb-description"
          rows={7}
          value={description}
          placeholder={PLACEHOLDER}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="onb-hint">
          Already have a brand deck or a strategy doc? Paste it straight in.
        </p>
      </div>

      {/* ── Bring what you have ─────────────────────────────────────── */}
      <div className="onb-field">
        <label className="onb-label">Bring what you already have</label>
        <DsDropZone
          className={hot ? 'is-hot' : undefined}
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
          <p className="onb-dz-t">Drag &amp; drop files or a folder</p>
          <p className="onb-dz-s">
            Or{' '}
            <button type="button" className="onb-hint-link" onClick={() => fileRef.current?.click()}>
              choose files
            </button>{' '}
            — logos, fonts, colours, decks. We&rsquo;ll sort them.
          </p>
          <p className="onb-dz-meta">{describeLimits()}</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void take(filterFolderPick(e.target.files));
              e.target.value = '';
            }}
          />
        </DsDropZone>

        {refusals.length > 0 && (
          <ul className="onb-refusals" role="status">
            {refusals.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="onb-files">
            {items
              .filter((a) => a.kind !== 'color')
              .map((a) => (
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
                  <button type="button" className="onb-file-x" onClick={() => removeItem(a.id)}>
                    <span className="sr-only">Remove {a.name}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Website ─────────────────────────────────────────────────── */}
      <div className="onb-field">
        <DsInput
          id="onb-website"
          label="Website — optional"
          value={website}
          placeholder="yourbrand.com"
          autoComplete="url"
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="onb-split-cta onb-split-cta--row">
        <DsButton tone="tertiary" onClick={onBack}>
          Back
        </DsButton>
        <DsButton disabled={busy} onClick={() => onContinue({ description, website })}>
          {busy ? 'Working…' : 'Continue'}
        </DsButton>
      </div>
    </SplitShell>
  );
}

export { MAX_FILES, MAX_FILE_BYTES };
