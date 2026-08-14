import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AboutEditorModal, type AboutEditorInitial } from '@/features/setup/components/AboutEditorModal';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { useV4Store } from '../store/onboardingV4Store';
import {
  accept,
  acceptSection,
  editAsUser,
  saveBusinessFact,
  type Projection,
} from '@/features/onboarding/bridge/v4Bridge';
import { VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import { PATH_LABEL } from '@/features/onboarding/understanding/proposals';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { AboutSection } from '../types';
import { useCosmosTheme } from '../components/useCosmosTheme';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

export interface AboutGroupProps {
  brandId?: string;
  projection?: Projection | null;
  actor?: { kind: 'human'; userId: string };
  onChanged?(): void;
}

/**
 * The brand profile, as selections where the concept is categorical and as
 * text where the meaning lives in the wording.
 *
 * The split is about MEANING, not convenience. Industry, style, personality,
 * tone and values are things two brands should answer with the same token if
 * they mean the same thing — something downstream will compare them. Summary,
 * audience, positioning and mission are not: turning those into dropdowns
 * would throw away the only part that mattered.
 *
 * Picking a chip or saving text is an explicit choice, so it confirms that one
 * value. Nothing else moves.
 */
function StructuredProfile({
  brandId,
  projection,
  actor,
  onChanged,
}: Required<Pick<AboutGroupProps, 'projection'>> & AboutGroupProps) {
  if (!projection) return null;
  const rows = projection.profile;
  if (!rows.length && !projection.industryLabel) return null;

  const write = async (path: CoreFieldPath, value: unknown) => {
    if (!brandId || !actor) return;
    await editAsUser(brandId, path, value, actor);
    onChanged?.();
  };

  return (
    <div className="about-structured">
      {projection.industryLabel && (
        <div className="about-row">
          <span className="about-row-key">Industry</span>
          <div className="about-chips">
            {VOCABULARIES.industry.map((m) => {
              const on = m.label === projection.industryLabel;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`about-chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    if (!brandId) return;
                    void saveBusinessFact(brandId, { industry: m.id }).then(() => onChanged?.());
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rows.map((row) => {
        const label = PATH_LABEL[row.path] ?? row.path;
        if (row.vocab) {
          const selected = Array.isArray(row.value)
            ? (row.value as string[])
            : row.value
              ? [String(row.value)]
              : [];
          const single = row.path === 'voice.tone';
          return (
            <div className="about-row" key={row.path}>
              <span className="about-row-key">{label}</span>
              <div className="about-chips">
                {VOCABULARIES[row.vocab].map((m) => {
                  const on = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`about-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        const next = single
                          ? on ? '' : m.id
                          : on
                            ? selected.filter((s) => s !== m.id)
                            : [...selected, m.id];
                        void write(row.path, next);
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div className="about-row" key={row.path}>
            <span className="about-row-key">{label}</span>
            <textarea
              className="about-row-text"
              defaultValue={String(row.value ?? '')}
              rows={2}
              aria-label={label}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== String(row.value ?? '')) void write(row.path, next);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function AboutGroup({ brandId, projection, actor, onChanged }: AboutGroupProps = {}) {
  const sections = useV4Store((s) => s.aboutSections);
  const addSection = useV4Store((s) => s.addAboutSection);
  const updateSection = useV4Store((s) => s.updateAboutSection);
  const removeSection = useV4Store((s) => s.removeAboutSection);

  const [theme] = useCosmosTheme();
  const [editing, setEditing] = useState<AboutEditorInitial | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxAnchorRef = useRef<HTMLElement | null>(null);

  const launchAdd = () => setEditing({ title: '', content: '' });
  const launchEdit = (section: AboutSection) =>
    setEditing({ id: section.id, title: section.name, content: section.content });

  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  const openSectionMenu = (e: React.MouseEvent<HTMLButtonElement>, section: AboutSection) => {
    e.preventDefault();
    e.stopPropagation();
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    const items: ContextMenuState['items'] = [
      {
        label: 'Edit',
        onSelect: () => launchEdit(section),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        ),
      },
      {
        label: 'Copy content',
        onSelect: () => {
          void copyText(section.content);
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        ),
      },
      {
        label: 'Copy title',
        onSelect: () => {
          void copyText(section.name);
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5h16v2" />
            <path d="M9 20h6" />
            <path d="M12 5v15" />
          </svg>
        ),
      },
      {
        label: 'Delete section',
        destructive: true,
        onSelect: () => removeSection(section.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      },
    ];
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <article className="review-group about-group">
      <header className="review-group-head">
        <h3>About</h3>
        <span className="review-group-head-right">
          <span className="review-group-count">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'}
          </span>
          {projection && projection.profile.length > 0 && brandId && actor && (
            <button
              type="button"
              className="looks-right"
              onClick={() => {
                void acceptSection(
                  brandId,
                  projection.profile.map((r) => r.path),
                  actor,
                ).then(() => onChanged?.());
              }}
            >
              Looks right
            </button>
          )}
        </span>
      </header>

      <StructuredProfile
        brandId={brandId}
        projection={projection ?? null}
        actor={actor}
        onChanged={onChanged}
      />

      {sections.length === 0 ? (
        <p className="review-group-empty">
          Add anything you want to say about your brand — voice, mission, audience, vibe…
        </p>
      ) : (
        <div className="about-list" data-dense={sections.length > 6 ? 'true' : undefined}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="about-card"
              onClick={() => launchEdit(section)}
              onContextMenu={(e) => openSectionMenu(e, section)}
              title="Click to edit"
            >
              <span className="about-card-name">{section.name}</span>
              <span className="about-card-content">{section.content || 'No content yet'}</span>
            </button>
          ))}
        </div>
      )}

      <div className="review-group-foot">
        <button type="button" className="add-more-btn" onClick={launchAdd}>
          <span className="add-more-plus" aria-hidden="true">+</span>
          New section
        </button>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          // `about-modal-portal` resets the [data-workspace] root defaults
          // (min-height: 100vh + page background). Without it this always-
          // mounted wrapper adds a viewport-tall empty block to <body> —
          // a phantom screenful of scroll under the panel.
          <div data-workspace data-theme={theme} className="about-modal-portal">
            <AboutEditorModal
              open={!!editing}
              initial={editing}
              takenTitles={sections.map((s) => s.name)}
              onClose={() => setEditing(null)}
              onSave={({ id, title, content }) => {
                if (id) updateSection(id, { name: title, content });
                else addSection({ name: title, content });
                setEditing(null);
              }}
              onDelete={(id) => {
                removeSection(id);
                setEditing(null);
              }}
            />
          </div>,
          document.body,
        )}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />
      )}
    </article>
  );
}
