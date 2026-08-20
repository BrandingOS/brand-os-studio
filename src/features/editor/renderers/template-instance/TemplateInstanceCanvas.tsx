/**
 * The artifact IS the canvas.
 *
 * `<BindProvider>` is what turns the artwork editable: each renderer
 * already declares which content its text is via `<Bind path=… >`, and
 * with a provider above it those regions accept a caret. With no
 * provider — Brand Kit's preview grid, an offscreen export — the very
 * same component renders a plain span. One artwork, two hosts, no fork.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BindProvider, hydrateContent, setAtPath } from '@/features/brandkit/content';
import { ScalingStage } from '@/shared/brand/ScalingStage';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import type { DesignCanvasProps } from '../types';
import type { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { exportArtworkPng, renderArtwork, resolveAspect, resolveTemplate } from './templateArtwork';

export function TemplateInstanceCanvas({ adapter, initialDocument }: DesignCanvasProps) {
  const instance = adapter as TemplateInstanceAdapter;
  const hostRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState(initialDocument);
  // Selection is read from the adapter, not held here — the properties
  // panel is a sibling and must see the same answer.
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    instance.getSelectedPath(),
  );

  useEffect(() => {
    void instance.loadDocument(initialDocument);
    setDoc(initialDocument);
    return instance.on('change', setDoc);
  }, [instance, initialDocument]);

  useEffect(
    () => instance.onSelectedPathChange(setSelectedPath),
    [instance],
  );

  // Export needs the LIVE DOM, which only exists once React has painted.
  useEffect(() => {
    instance.snapshot = async () => {
      const host = hostRef.current;
      if (!host) throw new Error('Nothing to export — the artwork is not mounted');
      const blob = await exportArtworkPng(host, 4);
      if (!blob) throw new Error('Rasterization produced no image');
      return blob;
    };
    return () => {
      instance.snapshot = null;
    };
  }, [instance]);

  const body = doc.body?.kind === 'template-instance' ? doc.body : null;
  // Deliberately keyed on `templateId` alone, not `body` — `body` is a new
  // object on every keystroke (each edit rebuilds `content` via
  // `setAtPath`), and resolving the template again on every keystroke would
  // re-run a scan over every deliverable's variant list for no reason: the
  // artwork only changes when the id it names changes.
  const template = useMemo(
    () => (body ? resolveTemplate(body.templateId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [body?.templateId],
  );
  const brand = instance.getBrand();
  const mockBrand = useMemo(() => (brand ? brandToMockBrand(brand) : null), [brand]);

  const commitBoundValue = useCallback(
    (path: string, text: string) => {
      const current = instance.getBody();
      if (current?.kind !== 'template-instance') return;
      instance.updateBody(
        { ...current, content: setAtPath(current.content, path, text) },
        `Edit ${path}`,
      );
    },
    [instance],
  );

  if (!body || !template || !mockBrand || !brand) {
    return (
      <div className="ti-canvas-empty" role="status">
        {template ? 'Attach a brand to open this design.' : 'This design is no longer available.'}
      </div>
    );
  }

  // A stored body may predate a field; hydrate before painting so a
  // missing key renders its default rather than a blank.
  const content = hydrateContent(body.content.kind, mockBrand, body.content);

  return (
    <div
      ref={hostRef}
      className="bk-editor-preview-frame ti-canvas"
      onClick={() => instance.setSelectedPath(null)}
    >
      <BindProvider
        value={{
          selectedPath,
          onSelect: (path) => instance.setSelectedPath(path),
          onCommit: commitBoundValue,
        }}
      >
        <ScalingStage aspect={resolveAspect(template.type)} fontFamily={null} hideLogo={body.design.showLogo === false}>
          {renderArtwork(template, brand, mockBrand, content)}
        </ScalingStage>
      </BindProvider>
    </div>
  );
}
