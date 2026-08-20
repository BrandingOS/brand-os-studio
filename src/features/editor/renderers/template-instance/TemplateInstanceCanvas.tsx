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
import {
  BindProvider,
  coerceToPathType,
  hydrateContent,
  setAtPath,
} from '@/features/brandkit/content';
import { ScalingStage } from '@/shared/brand/ScalingStage';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
// `.ti-canvas` sizing — moved here (2026-08-20) alongside `.bk-preview-*`
// from `ScalingStage.css` so this frame has real layout wherever it
// mounts. See templateInstance.css's own header for why the size has
// to be explicit pixels, not a percentage.
import './templateInstance.css';
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

  // Which document this canvas has actually loaded into the adapter.
  //
  // Keyed on the document's OWN id, not the `initialDocument` object's
  // identity — a parent re-rendering for any unrelated reason (a toolbar
  // click, a sibling state change) can hand this component a structurally
  // identical but referentially NEW `initialDocument`, and reloading on
  // that would call `loadDocument` again, which resets history and would
  // throw away whatever the user had just typed. Same bug class, same fix
  // shape as `BrandKitCardEditor`'s `loadedCardRef` — see canvas.browser.
  // test.tsx's "survives a re-render that hands it an equal-but-new
  // initialDocument" for the regression this guards.
  const loadedDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedDocIdRef.current === initialDocument.id) return;
    loadedDocIdRef.current = initialDocument.id;
    void instance.loadDocument(initialDocument);
    setDoc(initialDocument);
  }, [instance, initialDocument]);

  // The adapter's own change stream — kept in a separate effect, keyed
  // only on `instance`, so subscribing/unsubscribing isn't tangled up
  // with the load-guard above.
  useEffect(() => instance.on('change', setDoc), [instance]);

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
      // The text arrives as text — a caret has no idea it is a price — so
      // the model coerces it against whatever the field already holds.
      // This is the ONLY way an artifact edit reaches data.
      instance.updateBody(
        {
          ...current,
          content: setAtPath(
            current.content,
            path,
            coerceToPathType(current.content, path, text),
          ),
        },
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

  // The frame's UNSCALED pixel size — set explicitly, in the same
  // document-space units `Editor.tsx`'s `fitToContainer` uses to
  // compute the zoom transform it applies to this frame's ancestor.
  // Everything above this frame (the zoom wrap, the canvas surface) is
  // a shrink-to-fit chain with no definite size of its own — exactly
  // like Fabric's raw `<canvas>` before its width/height attributes are
  // set — so without this the frame, and everything inside it, is
  // 0×0. See templateInstance.css.
  const page = doc.pages[0];

  return (
    <div
      ref={hostRef}
      className="bk-editor-preview-frame ti-canvas"
      style={
        page
          ? {
              width: page.width,
              height: page.height,
              // `page.background` is a `ResolvedValue` (string | number |
              // SlotRef) generically, but `createTemplateInstanceDocument`
              // only ever writes a literal hex string — a SlotRef would
              // need brand resolution this frame has no reason to do.
              background: typeof page.background === 'string' ? page.background : '#ffffff',
            }
          : undefined
      }
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
