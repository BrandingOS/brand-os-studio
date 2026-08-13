/**
 * Screen 3 — Review what BrandingOS found.
 *
 * Four rules keep this from becoming a form: nothing empty is drawn, the value
 * is shown rather than the field, sections are stable furniture, and editing is
 * accepting.
 *
 * Nothing here confirms on render. Acceptance happens only in a click handler —
 * never in an effect, an observer or a scroll listener.
 */
import { DsButton } from '@/shared/ds';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { Section, ValueRow } from '../components/ValueRow';
import {
  PATH_LABEL,
  SECTION_LABEL,
  groupBySection,
  type Proposal,
  type ReviewSection,
} from '../understanding/proposals';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';

function renderValue(p: Proposal) {
  if (p.corePath.startsWith('colors.')) {
    const list = Array.isArray(p.value) ? (p.value as Array<{ hex: string }>) : [p.value as { hex: string }];
    return (
      <div className="onb-sw">
        {list.filter(Boolean).map((c, i) => (
          <div className="onb-sw-i" key={`${c.hex}-${i}`}>
            <span className="onb-sw-c" style={{ background: c.hex }} />
            <span className="onb-sw-h">{c.hex.replace('#', '')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (p.corePath.startsWith('typography.')) {
    const family = (p.value as { family?: string })?.family ?? '';
    // A specimen in the actual face, not the family name in a list.
    return (
      <>
        <div className="onb-specimen" style={{ fontFamily: family }}>
          The quick brown fox.
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ds-text-muted)', marginTop: 6 }}>{family}</div>
      </>
    );
  }
  if (Array.isArray(p.value)) return <>{(p.value as string[]).join(' · ')}</>;
  return <>{String(p.value ?? '')}</>;
}

/** The seed for the inline editor. Only text values are editable in place. */
function editableText(p: Proposal): string | undefined {
  if (typeof p.value === 'string') return p.value;
  if (Array.isArray(p.value) && p.value.every((v) => typeof v === 'string')) {
    return (p.value as string[]).join(', ');
  }
  return undefined;
}

export function ReviewStep({
  proposals,
  confirmed,
  material,
  busy,
  problem,
  stillReading,
  onAccept,
  onAcceptSection,
  onEdit,
  onFinish,
  onDismissProblem,
}: {
  proposals: Proposal[];
  confirmed: Set<string>;
  material: OnboardingAsset[];
  busy: boolean;
  problem: string | null;
  /** True while late proposals may still arrive. */
  stillReading: boolean;
  onAccept(path: CoreFieldPath): void;
  onAcceptSection(paths: CoreFieldPath[]): void;
  onEdit(path: CoreFieldPath, next: string): void;
  onFinish(): void;
  onDismissProblem(): void;
}) {
  const groups = groupBySection(proposals);
  const total = proposals.length;
  const decided = proposals.filter((p) => confirmed.has(p.corePath)).length;

  return (
    <div className="onb-step">
      <h1 className="onb-h">Here's what we found</h1>
      <p className="onb-sub">
        Confirm what's right. Anything you leave stays a suggestion — that's fine, and you can
        settle it later.
      </p>

      {stillReading && (
        <div className="onb-note onb-note--quiet" role="status">
          <span>Still reading — anything new will appear here.</span>
        </div>
      )}
      {problem && (
        <div className="onb-note onb-note--error" role="alert">
          <span>{problem}</span>
          <button type="button" onClick={onDismissProblem}>Dismiss</button>
        </div>
      )}

      {total === 0 && !stillReading && (
        <div className="onb-note onb-note--quiet">
          <span>
            We didn't find much to go on — you can add everything in your brand.
          </span>
        </div>
      )}

      {groups.map(({ section, items }) => {
        const paths = items.map((i) => i.corePath);
        const sectionDecided = paths.filter((p) => confirmed.has(p)).length;
        return (
          <Section
            key={section}
            title={SECTION_LABEL[section as ReviewSection]}
            total={paths.length}
            decided={sectionDecided}
            busy={busy}
            onAcceptAll={() => onAcceptSection(paths.filter((p) => !confirmed.has(p)))}
          >
            {items.map((p) => (
              <ValueRow
                key={p.corePath}
                label={PATH_LABEL[p.corePath] ?? p.corePath}
                origin={p.evidence}
                decided={confirmed.has(p.corePath)}
                busy={busy}
                editValue={editableText(p)}
                onAccept={() => onAccept(p.corePath)}
                onEdit={
                  editableText(p) !== undefined
                    ? (next) => onEdit(p.corePath, next)
                    : undefined
                }
              >
                {renderValue(p)}
              </ValueRow>
            ))}
          </Section>
        );
      })}

      {material.length > 0 && (
        // No accept controls: a file is not a claim about the brand. Listing it
        // closes the loop without adding a dozen more decisions.
        <Section
          title="Material"
          total={0}
          decided={0}
          meta={`${material.length} in your Library`}
        >
          {material.slice(0, 6).map((a) => (
            <div className="onb-row" key={a.id}>
              <div className="onb-row-th">
                {a.previewUrl ? <img src={a.previewUrl} alt="" /> : (a.kind || 'file').slice(0, 3).toUpperCase()}
              </div>
              <div className="onb-row-n">
                {a.name}
                <div className="onb-row-m">{a.sub}</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      <div className="onb-foot">
        {/* Neutral, never a colour that changes with how much is left. Finishing
            with nothing confirmed is a legitimate outcome. */}
        <span className="onb-hint">
          {total - decided} still suggested · {decided} confirmed
        </span>
        <DsButton arrow onClick={onFinish} disabled={busy}>
          Open my brand
        </DsButton>
      </div>
    </div>
  );
}
