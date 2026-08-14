import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AboutEditorModal, type AboutEditorInitial } from '@/features/setup/components/AboutEditorModal';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { useV4Store } from '../store/onboardingV4Store';
import { editAsUser, saveBusinessFact, type Projection } from '@/features/onboarding/bridge/v4Bridge';
import { VOCABULARIES, type VocabularyMember } from '@/features/onboarding/vocabulary/vocabularies';
import { PATH_LABEL } from '@/features/onboarding/understanding/proposals';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { ValuePicker, type PickerTarget } from './ValuePicker';
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
  /** A path the brand bar asked to edit. Opens that card's picker. */
  openPath?: string | null;
  onOpenPathHandled?(): void;
}

/** A structured brand value, rendered as one of the section widgets. */
interface ValueCard {
  key: string;
  name: string;
  content: string;
  target: PickerTarget;
}

export function AboutGroup({
  brandId,
  projection,
  actor,
  onChanged,
  openPath,
  onOpenPathHandled,
}: AboutGroupProps = {}) {
  const sections = useV4Store((s) => s.aboutSections);
  const [picking, setPicking] = useState<PickerTarget | null>(null);
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

  /**
   * The structured profile, as widgets in the list this section always had.
   *
   * Not a separate stacked block: every option laid out at once turned one card
   * into a page of chips, and the section stopped being scannable. A card shows
   * what the value IS; opening it is where the alternatives live.
   */
  const valueCards: ValueCard[] = [];
  if (projection) {
    if (projection.industryLabel) {
      valueCards.push({
        key: 'industry',
        name: 'Industry',
        content: projection.industryLabel,
        target: { kind: 'business', field: 'industry', label: 'Industry', vocab: 'industry', selected: [] },
      });
    }
    for (const row of projection.profile) {
      const label = PATH_LABEL[row.path] ?? row.path;
      if (row.vocab) {
        const ids = Array.isArray(row.value) ? (row.value as string[]) : row.value ? [String(row.value)] : [];
        const members = VOCABULARIES[row.vocab];
        const labels = ids.map((id) => members.find((m) => m.id === id)?.label ?? id);
        valueCards.push({
          key: row.path,
          name: label,
          content: labels.join(' · '),
          target: {
            kind: 'core',
            path: row.path,
            label,
            vocab: row.vocab,
            selected: ids,
            single: row.path === 'voice.tone',
          },
        });
      } else {
        valueCards.push({
          key: row.path,
          name: label,
          content: String(row.value ?? ''),
          target: { kind: 'core', path: row.path, label, text: String(row.value ?? '') },
        });
      }
    }
  }

  // The brand bar can ask for one of these directly.
  useEffect(() => {
    if (!openPath) return;
    const card = valueCards.find((c) => c.key === openPath);
    if (card) setPicking(card.target);
    onOpenPathHandled?.();
    // valueCards is derived; keying on the request alone is what is meant here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPath]);

  const commit = async (target: PickerTarget, next: unknown) => {
    if (!brandId) return;
    if (target.kind === 'business') {
      await saveBusinessFact(brandId, { [target.field]: next });
    } else if (actor) {
      await editAsUser(brandId, target.path as CoreFieldPath, next, actor);
    }
    onChanged?.();
  };

  const total = valueCards.length + sections.length;

  return (
    <article className="review-group about-group">
      <header className="review-group-head">
        <h3>About</h3>
        <span className="review-group-count">
          {total} {total === 1 ? 'section' : 'sections'}
        </span>
      </header>

      {total === 0 ? (
        <p className="review-group-empty">
          Add anything you want to say about your brand — voice, mission, audience, vibe…
        </p>
      ) : (
        <div className="about-list" data-dense={total > 6 ? 'true' : undefined}>
          {valueCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className="about-card"
              onClick={() => setPicking(card.target)}
              title="Click to change"
            >
              <span className="about-card-name">{card.name}</span>
              <span className="about-card-content">{card.content || 'Not set yet'}</span>
            </button>
          ))}
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

      <ValuePicker
        target={picking}
        theme={theme}
        onClose={() => setPicking(null)}
        onSave={(next) => {
          const target = picking;
          setPicking(null);
          if (target) void commit(target, next);
        }}
      />
    </article>
  );
}
