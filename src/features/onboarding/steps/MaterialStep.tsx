/**
 * Screen 2 — Bring anything you have.
 *
 * One surface. No file types, no dimensions, no "7 assets classified": results
 * sort themselves into brand nouns and filenames are demoted to small metadata.
 *
 * Material goes to the Library as it arrives, not in a batch at the end. That
 * is what makes "too big to store" honest — the refusal happens at the moment
 * of upload rather than silently at finish.
 */
import { useCallback, useRef, useState } from 'react';
import { DsButton, DsDropZone } from '@/shared/ds';
import { collectDroppedFiles, enqueueFile, filterFolderPick } from '@/shared/upload/intake';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { useOnboardingStore } from '../state/onboardingStore';
import { Section } from '../components/ValueRow';
import type { StartingDirection } from '../understanding/interpret';

const MAX_ITEMS = 60;

/** Groups material by what it IS to a person, never by MIME type. */
function groupItems(items: OnboardingAsset[]) {
  return {
    logos: items.filter((a) => a.kind === 'image' && a.isLogo),
    colors: items.filter((a) => a.kind === 'color'),
    fonts: items.filter((a) => a.kind === 'font'),
    // The catch-all is a real destination, not a failure bin. Discarding
    // somebody's file because we could not classify it is the worst thing this
    // screen could do.
    rest: items.filter(
      (a) => a.kind !== 'color' && a.kind !== 'font' && !(a.kind === 'image' && a.isLogo),
    ),
  };
}

export function MaterialStep({
  brandName,
  directions,
  chosenDirection,
  onChooseDirection,
  onAskForHelp,
  onAnotherDirection,
  onContinue,
  onUploaded,
}: {
  brandName: string;
  directions: StartingDirection[];
  chosenDirection: StartingDirection | null;
  onChooseDirection(d: StartingDirection): void;
  onAskForHelp(): void;
  onAnotherDirection(): void;
  onContinue(): void;
  /** Called per item once it lands, so the caller can put it in the Library. */
  onUploaded(item: OnboardingAsset): void;
}) {
  const items = useOnboardingStore((s) => s.items);
  const addItem = useOnboardingStore((s) => s.addItem);
  const updateItem = useOnboardingStore((s) => s.updateItem);
  const removeItem = useOnboardingStore((s) => s.removeItem);
  const [hot, setHot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const deps = useCallback(
    () => ({
      max: MAX_ITEMS,
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

  const take = useCallback(
    async (files: File[]) => {
      for (const f of files) await enqueueFile(f, deps());
    },
    [deps],
  );

  const showingDirections = directions.length > 0;

  return (
    <div className="onb-step">
      <h1 className="onb-h onb-h--brand">{brandName}</h1>
      <p className="onb-saved">Saved · you can leave and come back anytime.</p>

      {showingDirections ? (
        <>
          <h2 className="onb-h" style={{ fontSize: 22 }}>
            Three directions for {brandName}
          </h2>
          <p className="onb-sub">
            Based on what you told us. Pick one to start from — none of it is locked in.
          </p>
          <div className="onb-dirs">
            {directions.map((d) => (
              <button
                key={d.id}
                type="button"
                className="onb-dir"
                aria-pressed={chosenDirection?.id === d.id}
                onClick={() => onChooseDirection(d)}
              >
                <div className="onb-dir-t">{d.title}</div>
                <div className="onb-dir-q">{d.qualities}</div>
                <div className="onb-dir-sw">
                  {d.colors.slice(0, 4).map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
                <div
                  className="onb-dir-name"
                  style={{ fontFamily: d.fontFamily, fontWeight: d.fontWeight }}
                >
                  {brandName}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="onb-sub">
            Bring anything you have — logos, fonts, colours, a deck, a folder off your desktop.
            We'll make sense of it.
          </p>

          <DsDropZone
            className={hot ? 'is-hot' : undefined}
            onDragOver={(e) => { e.preventDefault(); setHot(true); }}
            onDragLeave={() => setHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setHot(false);
              void collectDroppedFiles(e.dataTransfer).then(take);
            }}
          >
            <p style={{ fontSize: 15.5, fontWeight: 500, margin: '0 0 6px' }}>Drop it here</p>
            <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
              Or{' '}
              <button
                type="button"
                className="onb-hint-link"
                onClick={() => fileRef.current?.click()}
              >
                choose files
              </button>{' '}
              · folders and zips are fine
            </p>
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

          {items.length > 0 && <MaterialGroups items={items} onRemove={removeItem} />}
        </>
      )}

      <div className="onb-foot">
        {showingDirections ? (
          <button type="button" className="onb-hint-link" onClick={onAnotherDirection}>
            Show me another direction
          </button>
        ) : items.length === 0 ? (
          <button type="button" className="onb-hint-link" onClick={onAskForHelp}>
            Nothing yet? Help me start
          </button>
        ) : (
          <span className="onb-hint">
            {items.length} {items.length === 1 ? 'thing' : 'things'} added
          </span>
        )}
        <DsButton arrow onClick={onContinue}>Continue</DsButton>
      </div>
    </div>
  );
}

function MaterialGroups({
  items,
  onRemove,
}: {
  items: OnboardingAsset[];
  onRemove(id: string): void;
}) {
  const { logos, colors, fonts, rest } = groupItems(items);
  const row = (a: OnboardingAsset) => (
    <div className={`onb-row${a.uploadStatus === 'error' ? ' onb-row--error' : ''}`} key={a.id}>
      <div className="onb-row-th">
        {a.previewUrl ? <img src={a.previewUrl} alt="" /> : (a.kind || 'file').slice(0, 3).toUpperCase()}
      </div>
      <div className="onb-row-n">
        {a.name}
        <div className="onb-row-m">{a.error ?? a.sub}</div>
      </div>
      <button type="button" className="onb-row-x" onClick={() => onRemove(a.id)}>
        <span className="sr-only">Remove {a.name}</span>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );

  return (
    <div style={{ marginTop: 'var(--ds-space-5)' }}>
      {logos.length > 0 && (
        <Section title="Logos" total={0} decided={0} meta={`${logos.length} found`}>
          <div className="onb-tiles">
            {logos.map((a) => (
              <div className="onb-tile" data-decided="true" key={a.id}>
                {a.previewUrl && <img src={a.previewUrl} alt={a.name} />}
              </div>
            ))}
          </div>
        </Section>
      )}
      {colors.length > 0 && (
        <Section title="Colours" total={0} decided={0} meta={`${colors.length} found`}>
          <div className="onb-sw">
            {colors.map((a) => (
              <div className="onb-sw-i" key={a.id}>
                <span className="onb-sw-c" style={{ background: a.value }} />
                <span className="onb-sw-h">{(a.value ?? '').replace('#', '')}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {fonts.length > 0 && (
        <Section title="Type" total={0} decided={0} meta={`${fonts.length} found`}>
          {fonts.map(row)}
        </Section>
      )}
      {rest.length > 0 && (
        <Section title="Everything else" total={0} decided={0} meta={`${rest.length} items`}>
          {rest.map(row)}
        </Section>
      )}
    </div>
  );
}
