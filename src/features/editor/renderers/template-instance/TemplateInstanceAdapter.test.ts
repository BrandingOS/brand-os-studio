import { describe, it, expect, vi } from 'vitest';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { defaultContentFor } from '@/features/brandkit/content';
import type { BrandOSDocument } from '@/features/editor/schema';

function doc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '22222222-2222-4222-8222-222222222222',
    contentType: 'invoice',
    brandId: 'skam',
    masterPages: [],
    pages: [{
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Page 1', width: 1240, height: 1754,
      background: '#ffffff', masterPageId: null, layers: [],
    }],
    metadata: {},
    body: {
      kind: 'template-instance',
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    },
  } as BrandOSDocument;
}

describe('TemplateInstanceAdapter', () => {
  it('holds the loaded document and returns its body', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    expect(a.getBody()?.kind).toBe('template-instance');
    expect(a.getDocument().contentType).toBe('invoice');
  });

  it('emits change when the body is updated', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const onChange = vi.fn();
    a.on('change', onChange);

    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');
    a.updateBody({ ...body, content: { ...body.content, clientName: 'New Client' } as never }, 'Edit client');

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = a.getDocument();
    if (next.body?.kind !== 'template-instance' || next.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(next.body.content.clientName).toBe('New Client');
  });

  it('undoes one body update in one step', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');

    expect(a.canUndo()).toBe(false);
    a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'Switch design');
    expect(a.canUndo()).toBe(true);

    a.undo();
    const back = a.getBody();
    if (back?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(back.templateId).toBe('invoices-ext-4');
  });

  it('records one history entry for a batch of updates', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');

    a.batch('Reset', () => {
      a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'a');
      a.updateBody({ ...body, templateId: 'invoices-ext-3' }, 'b');
    });

    a.undo();
    const back = a.getBody();
    if (back?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(back.templateId).toBe('invoices-ext-4');
  });

  it('never emits selection — it has no layers', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const onSelection = vi.fn();
    a.on('selection', onSelection);
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');
    a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'x');
    expect(onSelection).not.toHaveBeenCalled();
  });

  it('shares the selected content path between the canvas and the panel', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const seen: Array<string | null> = [];
    a.onSelectedPathChange((p) => seen.push(p));

    expect(a.getSelectedPath()).toBeNull();
    a.setSelectedPath('clientName');
    expect(a.getSelectedPath()).toBe('clientName');
    a.setSelectedPath(null);
    expect(seen).toEqual(['clientName', null]);
  });

  it('does not record a selection in history — it is not a document change', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    a.setSelectedPath('clientName');
    expect(a.canUndo()).toBe(false);
  });
});
