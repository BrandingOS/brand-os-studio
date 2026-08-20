import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
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

describe('TemplateInstanceProperties', () => {
  let adapter: TemplateInstanceAdapter;

  beforeEach(async () => {
    adapter = new TemplateInstanceAdapter();
    await adapter.loadDocument(doc());
  });

  it('renders the content groups for the document kind', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.getByText('Bill from · Bill to')).toBeTruthy();
    expect(screen.getByText('Line items')).toBeTruthy();
  });

  it('writes an edit back through the adapter', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const input = screen.getByDisplayValue('Acme Co.') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Northwind Ltd' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(body.content.clientName).toBe('Northwind Ltd');
  });

  it('shows totals computed from the line items, with no input to type one', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    // 2400 + 3800 + 1200 + 900 = 8300, +5% default tax = 8715.
    // `formatMoney` drops decimals on whole amounts — "$8,715", not
    // "$8,715.00". See compute.ts.
    expect(screen.getByText('$8,715')).toBeTruthy();
  });

  it('opens the control for whatever the artwork selected', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.queryByText('Selected')).toBeNull();

    // What clicking `Acme Co.` on the artifact does. React 18 batches a
    // state update triggered outside a DOM event to a microtask, so the
    // assertion needs to wait for that flush the same way a real click
    // (routed through React's event system) would.
    act(() => {
      adapter.setSelectedPath('clientName');
    });
    expect(screen.getByText('Selected')).toBeTruthy();
  });
});
