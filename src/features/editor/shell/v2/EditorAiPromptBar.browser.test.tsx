// Browser E2E for the AI prompt bar — Phase 3.5 commit 5.
//
// Mounts the bar in isolation (the Editor wires it into the topbar
// in Editor.tsx; tested separately at the integration boundary in
// commits 6/7/8 when modes are wired). Uses a stub agent that
// returns deterministic AICommandResults so the UI behavior is
// exercised without any network.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Toaster } from 'sonner';
import { EditorAiPromptBar } from './EditorAiPromptBar';
import type {
  AIAgent,
  AICommandContext,
  AICommandResult,
} from '@/features/editor/ai/types';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

afterEach(() => cleanup());

function brand(): Brand {
  return {
    id: 'brand-test', slug: 'test', name: 'Test',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function doc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-000000000aa1',
    contentType: 'social-post',
    brandId: 'brand-test',
    masterPages: [],
    pages: [{
      id: '00000000-0000-0000-0000-000000000bb1',
      name: 'Page 1', width: 1080, height: 1080,
      background: '#ffffff', masterPageId: null, layers: [],
    }],
    metadata: {},
  };
}

function ctx(): AICommandContext {
  return {
    activePageId: '00000000-0000-0000-0000-000000000bb1',
    selection: [],
    brand: brand(),
  };
}

function stubAgent(result: AICommandResult, opts: { delayMs?: number } = {}): AIAgent {
  return {
    applyCommand: vi.fn(async () => {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      return result;
    }),
  };
}

function mount(args: { agent: AIAgent; onApply?: (r: AICommandResult) => void }) {
  const onApply = args.onApply ?? vi.fn();
  const utils = render(
    <>
      <EditorAiPromptBar
        agent={args.agent}
        getDoc={doc}
        getContext={ctx}
        onApply={onApply}
      />
      <Toaster />
    </>,
  );
  return { ...utils, onApply };
}

// Helper — set the viewport before mount so the bar picks up width.
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

// ─── Wide viewport — expanded inline form ──────────────────────────────

describe('EditorAiPromptBar — wide viewport (≥1024px)', () => {
  it('renders the expanded form with input + send button', () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'rejected', reason: 'empty_prompt', message: 'OK',
    });
    const { container } = mount({ agent });
    expect(container.querySelector('[data-ai-prompt-bar-mode="expanded"]')).toBeTruthy();
    expect(container.querySelector('[data-ai-prompt-input]')).toBeTruthy();
    expect(container.querySelector('[data-ai-prompt-send]')).toBeTruthy();
  });

  it('disables send when input is empty; enables when typed', () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'rejected', reason: 'empty_prompt', message: 'OK',
    });
    const { container } = mount({ agent });
    const send = container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!;
    expect(send.disabled).toBe(true);

    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'add a CTA button' } });
    expect(send.disabled).toBe(false);
  });

  it('on submit: shows thinking indicator, calls agent.applyCommand, surfaces success toast', async () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'delta',
      label: 'AI: add layer',
      ops: [{ op: 'remove-layer', pageId: '00000000-0000-0000-0000-000000000bb1', layerId: '00000000-0000-0000-0000-000000000bb1' }],
      message: 'Added a CTA button.',
    }, { delayMs: 30 });

    const { container, onApply } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'add cta' } });
    const send = container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!;
    fireEvent.click(send);

    // Thinking indicator appears synchronously on submit.
    await waitFor(() => {
      expect(container.querySelector('[data-ai-prompt-thinking]')).toBeTruthy();
    }, { timeout: 200 });

    // Toast appears after the agent resolves.
    await waitFor(() => {
      expect(document.body.textContent ?? '').toContain('Added a CTA button');
    }, { timeout: 1000 });

    expect(agent.applyCommand).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('on Enter (no shift): submits the form (Shift+Enter still adds a newline)', async () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'delta',
      label: 'AI: ok',
      ops: [{ op: 'remove-layer', pageId: '00000000-0000-0000-0000-000000000bb1', layerId: '00000000-0000-0000-0000-000000000bb1' }],
      message: 'OK',
    });
    const { container } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'cmd' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(agent.applyCommand).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Negative paths — every mode 5 / network failure surface ───────────

describe('EditorAiPromptBar — negative paths', () => {
  it('rejected → tints the input border + surfaces error inline (no success toast)', async () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'rejected',
      reason: 'no_selection',
      message: 'Pick something first.',
      suggestions: ['Make the title bigger', 'Make the logo bigger'],
    });
    const { container } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'make this bigger' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!);

    await waitFor(() => {
      const err = container.querySelector('[data-ai-prompt-error]');
      expect(err?.textContent).toContain('Pick something first');
    });

    // Suggestion chips appear under the bar.
    const sugg = container.querySelectorAll('[data-ai-prompt-suggestion]');
    expect(sugg.length).toBe(2);
  });

  it('clicking a suggestion chip refills the input', async () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'rejected', reason: 'no_selection', message: 'OK',
      suggestions: ['Make the title bigger'],
    });
    const { container } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'make this bigger' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!);

    await waitFor(() => {
      expect(container.querySelector('[data-ai-prompt-suggestion]')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-suggestion]')!);
    expect(input.value).toBe('Make the title bigger');
  });

  it('agent throw is caught and surfaced as an error (no app crash)', async () => {
    setViewport(1440);
    const agent: AIAgent = {
      applyCommand: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    const { container } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'cmd' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!);

    await waitFor(() => {
      const err = container.querySelector('[data-ai-prompt-error]');
      expect(err?.textContent).toMatch(/boom/);
    });
  });
});

// ─── Disambiguation chip surfacing ─────────────────────────────────────

describe('EditorAiPromptBar — disambiguation', () => {
  it('appends the disambiguation alternative to the suggestions row', async () => {
    setViewport(1440);
    const agent = stubAgent({
      kind: 'delta',
      label: 'AI: change all',
      ops: [{ op: 'remove-layer', pageId: '00000000-0000-0000-0000-000000000bb1', layerId: '00000000-0000-0000-0000-000000000bb1' }],
      message: 'Done.',
      disambiguation: { mode4_alternative: 'Make just this headline white instead?' },
    });
    const { container } = mount({ agent });
    const input = container.querySelector<HTMLTextAreaElement>('[data-ai-prompt-input]')!;
    fireEvent.change(input, { target: { value: 'change all to white' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-send]')!);

    await waitFor(() => {
      const sugg = Array.from(container.querySelectorAll('[data-ai-prompt-suggestion]'));
      const labels = sugg.map((s) => s.textContent ?? '');
      expect(labels).toContain('Make just this headline white instead?');
    });
  });
});

// ─── Narrow viewport — collapsed icon + popover ────────────────────────

describe('EditorAiPromptBar — narrow viewport (<1024px)', () => {
  it('renders the sparkle trigger button only, not the inline form', () => {
    setViewport(800);
    const agent = stubAgent({ kind: 'rejected', reason: 'empty_prompt', message: 'OK' });
    const { container } = mount({ agent });
    expect(container.querySelector('[data-ai-prompt-bar-mode="collapsed"]')).toBeTruthy();
    expect(container.querySelector('[data-ai-prompt-trigger]')).toBeTruthy();
    expect(container.querySelector('[data-ai-prompt-popover]')).toBeNull();
    // Form is NOT inline.
    expect(container.querySelector('[data-ai-prompt-input]')).toBeNull();
  });

  it('clicking the trigger opens the popover with the form inside', () => {
    setViewport(800);
    const agent = stubAgent({ kind: 'rejected', reason: 'empty_prompt', message: 'OK' });
    const { container } = mount({ agent });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ai-prompt-trigger]')!);
    expect(container.querySelector('[data-ai-prompt-popover]')).toBeTruthy();
    expect(container.querySelector('[data-ai-prompt-input]')).toBeTruthy();
  });
});
