// Step 5/7 fix 7 — AssistantTrigger defaults to a collapsed FAB.
//
// Earlier the trigger always rendered as a full pill (icon + label +
// kbd) eating canvas real estate by default. Now it renders as a
// 48×48 icon-only FAB, expands on hover/focus, and persists the
// optional pinExpanded preference via localStorage.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';

// Mock the provider so the trigger can render in isolation without
// booting the brand store + AI provider chain.
vi.mock('./BrandAssistantProvider', () => ({
  useBrandAssistant: () => ({
    open: false,
    setOpen: vi.fn(),
    messages: [],
    send: vi.fn(),
    isThinking: false,
    reset: vi.fn(),
  }),
}));

import { AssistantTrigger } from './AssistantTrigger';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.removeItem('brandos.assistant.pinExpanded');
  } catch {
    /* noop */
  }
});

describe('AssistantTrigger — default-collapsed (Step 5/7 fix 7)', () => {
  it('renders as a collapsed FAB by default (no "Brand Assistant" label)', () => {
    const { container } = render(<AssistantTrigger />);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-assistant-trigger]',
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('data-assistant-expanded')).toBe('false');
    // Label + kbd should be absent in the collapsed form.
    expect(container.textContent ?? '').not.toContain('Brand Assistant');
  });

  it('hovering expands the trigger into the full pill', () => {
    const { container } = render(<AssistantTrigger />);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-assistant-trigger]',
    )!;
    fireEvent.mouseEnter(trigger);
    expect(trigger.getAttribute('data-assistant-expanded')).toBe('true');
    expect(container.textContent ?? '').toContain('Brand Assistant');
    fireEvent.mouseLeave(trigger);
    expect(trigger.getAttribute('data-assistant-expanded')).toBe('false');
  });

  it('respects the pinExpanded preference from localStorage on mount', () => {
    window.localStorage.setItem('brandos.assistant.pinExpanded', '1');
    const { container } = render(<AssistantTrigger />);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-assistant-trigger]',
    );
    expect(trigger?.getAttribute('data-assistant-expanded')).toBe('true');
  });
});
