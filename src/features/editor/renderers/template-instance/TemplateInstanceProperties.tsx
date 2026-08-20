/**
 * The Design properties panel for a template instance.
 *
 * This is `ContentPanel` — the schema-driven panel the content layer
 * already owns — given an adapter to write through. Nothing here knows
 * what an invoice is; `fieldGroupsFor(kind)` declares the controls, so a
 * new content kind is a declaration rather than another component.
 */
import { useEffect, useState } from 'react';
import { ContentPanel, defaultContentFor, hydrateContent } from '@/features/brandkit/content';
import type { DeliverableContent } from '@/features/brandkit/content';
import type { DesignPropertiesProps } from '../types';
import type { TemplateInstanceAdapter } from './TemplateInstanceAdapter';

export function TemplateInstanceProperties({ adapter, brand, initialDocument }: DesignPropertiesProps) {
  const instance = adapter as TemplateInstanceAdapter;
  // `adapter.getBody()` is undefined until `loadDocument` runs, and
  // `loadDocument` does not emit `change` (see `DesignPropertiesProps`'s
  // `initialDocument` doc comment for why not). This panel and the
  // canvas that calls `loadDocument` are SIBLINGS mounted by the same
  // parent, so whichever mounts second sees a live document and
  // whichever mounts first would otherwise see nothing — falling back
  // to `initialDocument.body` here means the panel renders correctly
  // regardless of that ordering.
  const [body, setBody] = useState(() => instance.getBody() ?? initialDocument?.body);
  // The same selection the artwork shows. Clicking a region on the
  // artifact opens its control here; focusing a control here highlights
  // the region there. One value, held by the adapter both share.
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    instance.getSelectedPath(),
  );

  useEffect(
    () => instance.on('change', (doc) => setBody(doc.body)),
    [instance],
  );
  useEffect(
    () => instance.onSelectedPathChange(setSelectedPath),
    [instance],
  );

  if (body?.kind !== 'template-instance') return null;
  // `body.content` is validated by the document's zod schema at the
  // storage boundary, not authored against `kinds.ts`'s hand type — a
  // stored value from before a field existed would otherwise render a
  // blank rather than that field's default. Same reasoning as the
  // canvas's own `hydrateContent` call.
  const content = hydrateContent(body.content.kind, { name: brand?.name ?? 'Brand' }, body.content);

  const write = (next: DeliverableContent, label: string) =>
    instance.updateBody({ ...body, content: next }, label);

  return (
    <ContentPanel
      kind={content.kind}
      content={content}
      onChange={(next) => write(next, 'Edit content')}
      selectedPath={selectedPath}
      onSelect={(path) => instance.setSelectedPath(path)}
      onResetContent={() => {
        instance.setSelectedPath(null);
        write(defaultContentFor(content.kind, { name: brand?.name ?? 'Brand' }), 'Reset content');
      }}
    />
  );
}
