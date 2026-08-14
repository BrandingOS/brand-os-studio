/**
 * Logos — the retired slot board, with classification in front of it.
 *
 * The board itself is unchanged in behaviour: named slots, a tile per slot,
 * add and remove. What is new sits upstream — exact duplicates never reach it,
 * near-duplicate variants arrive folded into one entry, and roles are assigned
 * only where the evidence supports them.
 *
 * An empty slot is a real answer. A role we could not evidence is left blank
 * rather than filled with a guess the user then has to notice and undo.
 */
import type { LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';
import { SLOT_LABEL, SLOT_ORDER, type LogoGroup } from '../understanding/logoClassify';
import { ReviewCard } from './ReviewCard';

export interface LogosSectionProps {
  groups: LogoGroup[];
  duplicatesIgnored: number;
  onPlace(assetId: string, slot: LogoSlot): void;
  onRemove(assetId: string): void;
  onUpload(): void;
}

function tileFor(groups: LogoGroup[], slot: LogoSlot): LogoGroup | undefined {
  return groups.find((g) => g.slot === slot);
}

export function LogosSection({
  groups,
  duplicatesIgnored,
  onPlace,
  onRemove,
  onUpload,
}: LogosSectionProps) {
  const placed = groups.filter((g) => g.slot !== null).length;
  // Only the slots that are filled, plus the two every brand has, so the board
  // is not a grid of seven empty boxes for someone who brought one logo.
  const shown = SLOT_ORDER.filter(
    (s) => tileFor(groups, s) || s === 'primary' || s === 'wordmark',
  );
  const unplaced = groups.filter((g) => g.slot === null);

  return (
    <ReviewCard
      title="Logos"
      meta={placed ? `${placed} placed` : undefined}
      empty="No logos yet — upload one and we'll sort the variations."
      footer={
        <>
          <button type="button" className="onb-hint-link" onClick={onUpload}>
            Upload a logo
          </button>
          {duplicatesIgnored > 0 && (
            <span className="onb-hint onb-hint--right">
              {duplicatesIgnored} exact duplicate{duplicatesIgnored === 1 ? '' : 's'} ignored
            </span>
          )}
        </>
      }
    >
      {groups.length > 0 && (
        <>
          <div className="onb-slots">
            {shown.map((slot) => {
              const g = tileFor(groups, slot);
              return (
                <div
                  key={slot}
                  className={`onb-slot${g ? '' : ' is-empty'}${slot === 'dark' ? ' is-ondark' : ''}`}
                >
                  <span className="onb-slot-tag">{SLOT_LABEL[slot]}</span>
                  {g ? (
                    <>
                      {g.lead.previewUrl ? (
                        <img src={g.lead.previewUrl} alt={g.lead.name} className="onb-slot-img" />
                      ) : (
                        <span className="onb-slot-hint">{g.lead.name}</span>
                      )}
                      {g.variants.length > 0 && (
                        <span className="onb-slot-var">
                          {g.variants.length} variant{g.variants.length === 1 ? '' : 's'} grouped
                        </span>
                      )}
                      <button
                        type="button"
                        className="onb-slot-x"
                        onClick={() => onRemove(g.lead.id)}
                      >
                        <span className="sr-only">Remove {SLOT_LABEL[slot]} logo</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    </>
                  ) : (
                    <span className="onb-slot-hint">Empty</span>
                  )}
                </div>
              );
            })}
          </div>

          {unplaced.length > 0 && (
            <div className="onb-unplaced">
              <p className="onb-hint">Not sure where these go — pick a slot:</p>
              {unplaced.map((g) => (
                <div className="onb-unplaced-r" key={g.lead.id}>
                  <span className="onb-file-ico" aria-hidden="true">
                    {g.lead.previewUrl ? <img src={g.lead.previewUrl} alt="" /> : 'IMG'}
                  </span>
                  <b className="onb-file-n">{g.lead.name}</b>
                  <select
                    className="onb-slot-pick"
                    aria-label={`Slot for ${g.lead.name}`}
                    defaultValue=""
                    onChange={(e) => e.target.value && onPlace(g.lead.id, e.target.value as LogoSlot)}
                  >
                    <option value="" disabled>Choose…</option>
                    {SLOT_ORDER.map((s) => (
                      <option key={s} value={s}>{SLOT_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ReviewCard>
  );
}

export type { OnboardingAsset };
