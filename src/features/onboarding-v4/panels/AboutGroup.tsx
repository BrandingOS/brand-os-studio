import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AboutEditorModal, type AboutEditorInitial } from '@/features/setup/components/AboutEditorModal';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { useV4Store } from '../store/onboardingV4Store';
import { editAsUser, saveBusinessFact, type Projection } from '@/features/onboarding/bridge/v4Bridge';
import { VOCABULARIES, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';
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
   * The fields a brand strategy HAS — whether or not anything filled them.
   *
   * They used to be built from whatever the understanding pass came back with,
   * so a user who skipped the prompt arrived at a section offering one button:
   * "New section". Their brand still had an audience and a tone; the screen
   * simply never asked. The list is fixed now and the values are looked up
   * into it, so an empty field is a question waiting rather than a field that
   * does not exist.
   *
   * Choices where a closed vocabulary genuinely exists, prose everywhere the
   * meaning lives in the wording.
   */
  const values = new Map(projection?.profile.map((r) => [r.path, r.value]) ?? []);
  const textOf = (path: CoreFieldPath) => {
    const v = values.get(path);
    return typeof v === 'string' ? v : '';
  };
  const idsOf = (path: CoreFieldPath) => {
    const v = values.get(path);
    if (Array.isArray(v)) return v as string[];
    return v ? [String(v)] : [];
  };
  const labelsOf = (path: CoreFieldPath, vocab: VocabularyName) =>
    idsOf(path)
      .map((id) => VOCABULARIES[vocab].find((m) => m.id === id)?.label ?? id)
      .join(' · ');

  const prose = (path: CoreFieldPath, name: string): ValueCard => ({
    key: path,
    name,
    content: textOf(path),
    target: { kind: 'core', path, label: name, text: textOf(path) },
  });
  const choices = (
    path: CoreFieldPath,
    name: string,
    vocab: VocabularyName,
    single?: boolean,
  ): ValueCard => ({
    key: path,
    name,
    content: labelsOf(path, vocab),
    target: { kind: 'core', path, label: name, vocab, selected: idsOf(path), single },
  });
  const fact = (field: 'tagline' | 'description', name: string): ValueCard => ({
    key: `business.${field}`,
    name,
    content: projection?.business?.[field] ?? '',
    target: { kind: 'business', field, label: name, text: projection?.business?.[field] ?? '' },
  });

  const valueCards: ValueCard[] = [
    prose('strategy.summary', 'Brand summary'),
    {
      key: 'business.industry',
      name: 'Industry',
      content: projection?.industryLabel ?? '',
      target: {
        kind: 'business',
        field: 'industry',
        label: 'Industry',
        vocab: 'industry',
        selected: projection?.business?.industry ? [projection.business.industry] : [],
      },
    },
    fact('description', 'Products / Services'),
    prose('strategy.targetAudience', 'Audience'),
    prose('strategy.positioning', 'Positioning'),
    prose('strategy.mission', 'Mission'),
    choices('strategy.personality', 'Personality', 'personality'),
    choices('voice.tone', 'Tone', 'tone', true),
    choices('visualStyle.descriptors', 'Visual style', 'style'),
    choices('strategy.values', 'Core values', 'values'),
    fact('tagline', 'Slogan'),
  ];

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
  const answered = valueCards.filter((c) => c.content.trim()).length;

  return (
    <article className="review-group about-group">
      <header className="review-group-head">
        <h3>Brand Strategy</h3>
        {/* What is answered, out of what a strategy has. The old count said
            how many cards were on screen, which the user could already see. */}
        <span className="review-group-count">
          {answered} of {valueCards.length} answered
        </span>
      </header>

      <div className="about-list" data-dense={total > 6 ? 'true' : undefined}>
        {valueCards.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`about-card${card.content.trim() ? '' : ' is-empty'}`}
            onClick={() => setPicking(card.target)}
            title={card.content.trim() ? 'Click to change' : 'Click to answer'}
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
