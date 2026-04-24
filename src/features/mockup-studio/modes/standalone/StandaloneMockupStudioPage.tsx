/**
 * StandaloneMockupStudioPage — Mode A: anonymous usable.
 *
 * Route: `/tools/mockup-studio`. No brand required. User picks a template,
 * uploads a design, tweaks, exports. Draft state persists to localStorage
 * via the mockup store so a page refresh keeps the user's work.
 */

import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SERVICE_KEYS, useService } from '@/core';
import type { IMockupTemplatesService } from '@/core/types/services';

import { ExportButton } from '../../components/ExportButton';
import { MockupCanvas } from '../../components/MockupCanvas';
import { PropertiesSidebar } from '../../components/PropertiesSidebar';
import { TemplateGallery } from '../../components/TemplateGallery';
import type { TemplateMeta } from '../../engine/types';
import { useMockupStore } from '../../state/mockupStore';
import { useMockupTemplates } from '../../hooks/useMockupTemplates';

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

  // On mount: pick the template from URL, or the first one we loaded.
  useEffect(() => {
    if (templates.length === 0) return;
    if (template) return;
    const preferred = templateParam
      ? templates.find((t) => t.id === templateParam)
      : undefined;
    const target = preferred ?? templates[0];
    loadTemplate(target);
    if (!templateParam) {
      setParams({ template: target.id }, { replace: true });
    }
  }, [templates, template, templateParam, loadTemplate, setParams]);

  // Keep URL in sync when user picks a different template.
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
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Top bar ----------------------------------------------------- */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            to="/tools"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Tools
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="text-sm font-semibold">Mockup Studio</div>
          {template && (
            <span className="text-xs text-muted-foreground">
              · {template.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            disabled={historyLen === 0}
            onClick={undo}
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="h-8 w-8"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={futureLen === 0}
            onClick={redo}
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            className="h-8 w-8"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <ExportButton />
        </div>
      </header>

      {/* Main 3-panel layout ---------------------------------------- */}
      <div className="flex min-h-0 flex-1">
        {/* Left: template browser */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-border/60 bg-background">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Templates
            </h2>
          </div>
          <TemplateGallery
            templates={templates}
            activeId={activeId}
            onPick={handlePick}
          />
        </aside>

        {/* Center: canvas */}
        <main className="min-w-0 flex-1">
          <MockupCanvas template={template} state={mockup} />
        </main>

        {/* Right: properties */}
        <PropertiesSidebar />
      </div>
    </div>
  );
}
