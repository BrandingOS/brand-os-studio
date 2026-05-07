import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AboutEditorModal, type AboutEditorInitial } from '@/features/setup/components/AboutEditorModal';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { useV4Store } from '../store/onboardingV4Store';
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

export function AboutGroup() {
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
        <span className="review-group-count">
          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </span>
      </header>

      {sections.length === 0 ? (
        <p className="review-group-empty">
          Add anything you want to say about your brand — voice, mission, audience, vibe…
        </p>
      ) : (
        <div className="about-list">
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
          <div data-workspace data-theme={theme}>
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
