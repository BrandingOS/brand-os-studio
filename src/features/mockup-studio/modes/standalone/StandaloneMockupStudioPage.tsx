/**
 * StandaloneMockupStudioPage — Mode A: anonymous usable.
 *
 * Route: `/tools/mockup-studio`. Wraps the editor in <WorkspaceShell>
 * so it inherits the same top nav + theme toggle as /setup, /tools/typescale,
 * and /tools/ui-color-system. Inner layout is a custom 3-column grid:
 * templates panel · canvas · properties panel — both side panels use cosmos
 * `.panel` chrome.
 */

import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { SERVICE_KEYS, useService } from '@/core';
import type { IMockupTemplatesService } from '@/core/types/services';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';

import { ExportButton } from '../../components/ExportButton';
import { MockupCanvas } from '../../components/MockupCanvas';
import { PropertiesSidebar } from '../../components/PropertiesSidebar';
import { TemplateGallery } from '../../components/TemplateGallery';
import type { TemplateMeta } from '../../engine/types';
import { useMockupStore } from '../../state/mockupStore';
import { useMockupTemplates } from '../../hooks/useMockupTemplates';
import './mockup-studio.css';

export default function StandaloneMockupStudioPage() {
  const [params, setParams] = useSearchParams();
  const templateParam = params.get('template');

  const service = useService<IMockupTemplatesService>(SERVICE_KEYS.MOCKUP_TEMPLATES);
  const templates = useMockupTemplates(service);

  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const loadTemplate = useMockupStore((s) => s.loadTemplate);
  const undo = useMockupStore((s) => s.undo);
  const redo = useMockupStore((s) => s.redo);
  const historyLen = useMockupStore((s) => s.history.length);
  const futureLen = useMockupStore((s) => s.future.length);

  // On mount: resolve the right template + rehydrate any persisted mockup.
  useEffect(() => {
    if (templates.length === 0) return;
    if (template && template.id === (templateParam ?? template.id)) return;

    const persistedId = mockup?.templateId;
    const preferred =
      (templateParam && templates.find((t) => t.id === templateParam)) ||
      (persistedId && templates.find((t) => t.id === persistedId)) ||
      templates[0];

    const seed =
      mockup && mockup.templateId === preferred.id ? mockup : undefined;
    loadTemplate(preferred, seed);

    if (!templateParam) {
      setParams({ template: preferred.id }, { replace: true });
    }
  }, [templates, template, mockup, templateParam, loadTemplate, setParams]);

  const handlePick = (t: TemplateMeta) => {
    loadTemplate(t);
    setParams({ template: t.id }, { replace: true });
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const activeId = useMemo(() => template?.id ?? null, [template]);

  return (
    <WorkspaceShell>
      <div className="ms-shell">
        <aside className="panel ms-panel" aria-label="Templates">
          <div className="panel-top">
            <div className="panel-heading">
              <span className="panel-heading-eyebrow">Mockup Studio</span>
              <h1 className="panel-heading-title">Pick a template</h1>
            </div>
            <p className="ms-panel-blurb">
              Drop your design onto a real product photo. Surface masks, lighting and displacement bake in automatically.
            </p>
          </div>
          <div className="panel-list ms-template-list">
            <TemplateGallery
              templates={templates}
              activeId={activeId}
              onPick={handlePick}
            />
          </div>
        </aside>

        <main className="ms-board">
          <div className="ms-board-toolbar">
            <div className="ms-board-toolbar-meta">
              <span className="panel-heading-eyebrow">Active</span>
              <span className="ms-board-toolbar-name">
                {template?.name ?? 'No template selected'}
              </span>
            </div>
            <div className="ms-board-toolbar-actions">
              <button
                type="button"
                className="ms-icon-btn"
                disabled={historyLen === 0}
                onClick={undo}
                aria-label="Undo"
                title="Undo (⌘Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                disabled={futureLen === 0}
                onClick={redo}
                aria-label="Redo"
                title="Redo (⇧⌘Z)"
              >
                <Redo2 size={14} />
              </button>
              <span className="ms-toolbar-divider" aria-hidden />
              <ExportButton />
            </div>
          </div>
          <div className="ms-board-canvas">
            <MockupCanvas template={template} state={mockup} />
          </div>
        </main>

        <PropertiesSidebar />
      </div>
    </WorkspaceShell>
  );
}
