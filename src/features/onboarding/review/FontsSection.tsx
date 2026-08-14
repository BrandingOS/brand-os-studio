/**
 * Fonts — uploaded families first, suggestions as PAIRINGS.
 *
 * A typeface suggestion is only useful as a pairing. Offering five unrelated
 * families is a font menu, not a recommendation — the user has to do the
 * matching themselves, which is the part they came here to avoid.
 *
 * A family the user uploaded outranks any suggestion, and a suggestion never
 * becomes the brand's typeface until it is chosen.
 */
import { ReviewCard } from './ReviewCard';

export interface FontRole {
  role: 'Heading' | 'Body';
  family?: string;
  /** "Buch · uploaded", "from your brand profile". */
  origin?: string;
}

export interface FontsSectionProps {
  roles: FontRole[];
  decided: boolean;
  /** Pairings offered when nothing was uploaded. Never individual fonts. */
  pairings: Array<{ heading: string; body: string }>;
  busy?: boolean;
  onLooksRight(): void;
  onApplyPairing(p: { heading: string; body: string }): void;
  onUpload(): void;
  onRename(role: 'Heading' | 'Body', next: string): void;
}

const SPECIMEN = 'Build a brand people remember';

export function FontsSection({
  roles, decided, pairings, busy, onLooksRight, onApplyPairing, onUpload, onRename,
}: FontsSectionProps) {
  const set = roles.filter((r) => r.family).length;

  return (
    <ReviewCard
      title="Fonts"
      meta={set ? `${set} of ${roles.length} set` : undefined}
      headAction={
        pairings.length > 0 && set === 0 ? (
          <button type="button" className="onb-suggest" onClick={() => onApplyPairing(pairings[0])}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" /></svg> Add suggested fonts
          </button>
        ) : undefined
      }
      onLooksRight={set ? onLooksRight : undefined}
      looksRightDisabled={decided || busy}
      empty="No fonts yet — pick from Google Fonts or upload a font file."
      footer={
        <>
          <button type="button" className="onb-act" onClick={onUpload}>
            Pick from Google Fonts
          </button>
          <button type="button" className="onb-act onb-act--ghost" onClick={onUpload}>
            + Upload font
          </button>
          {pairings.length > 0 && (
            <span className="onb-hint onb-hint--right">Suggestions come as pairings</span>
          )}
        </>
      }
    >
      {set > 0 && (
        <div>
          {roles.map((r) => (
            <div className="onb-font" key={r.role}>
              <span className="onb-font-r">{r.role}</span>
              <span
                className={`onb-font-s${r.family ? '' : ' is-empty'}`}
                style={r.family ? { fontFamily: `"${r.family}", var(--ds-font)` } : undefined}
              >
                {r.family ? SPECIMEN : 'Not chosen yet'}
              </span>
              <span className="onb-font-m">
                {r.family ? (
                  <button
                    type="button"
                    className="onb-font-name"
                    onClick={() => {
                      const next = window.prompt(`${r.role} typeface`, r.family);
                      if (next && next.trim() && next.trim() !== r.family) onRename(r.role, next.trim());
                    }}
                  >
                    {r.family}
                  </button>
                ) : (
                  <b>—</b>
                )}
                <small>{r.origin ?? 'no font found'}</small>
              </span>
            </div>
          ))}
        </div>
      )}

      {set === 0 && pairings.length > 0 && (
        <div className="onb-pairings">
          {pairings.map((p) => (
            <button
              type="button"
              className="onb-pairing"
              key={`${p.heading}-${p.body}`}
              onClick={() => onApplyPairing(p)}
            >
              <span className="onb-pairing-h" style={{ fontFamily: `"${p.heading}", var(--ds-font)` }}>
                {p.heading}
              </span>
              <span className="onb-pairing-b" style={{ fontFamily: `"${p.body}", var(--ds-font)` }}>
                with {p.body}
              </span>
            </button>
          ))}
        </div>
      )}
    </ReviewCard>
  );
}
