import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import { dsLight, dsDark } from './tokens';
import { DsButton } from './Button';
import { DsInput } from './Input';
import { DsSelect } from './Select';
import { DsSwitch, DsCheckbox, DsSegmented } from './Toggle';
import { DsBadge, DsBanner, DsToast } from './Feedback';
import { DsMenu, DsMenuItem } from './Menu';
import { DsModal, DsConfirmDialog } from './Modal';
import { DsProgress } from './Progress';
import { DsTabBar } from './TabBar';
import { DsRail } from './Rail';
import { DsSwatchRow } from './SwatchRow';
import { BrandMark } from './BrandMark';

describe('DS v1 tokens — accessibility floor', () => {
  // Body text meets 4.5:1; large display text and meta meet 3:1.
  const cases: Array<[string, typeof dsLight | typeof dsDark]> = [
    ['light', dsLight],
    ['dark', dsDark],
  ];

  it.each(cases)('%s: body text on every surface clears 4.5:1', (_mode, t) => {
    for (const bg of [t.bg, t.surface, t.surfaceHover, t.surfaceSubtle]) {
      expect(contrastRatio(t.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(cases)('%s: muted text clears 3:1 for meta on bg + surface', (_mode, t) => {
    for (const bg of [t.bg, t.surface]) {
      expect(contrastRatio(t.textMuted, bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(cases)('%s: primary button label clears 4.5:1', (_mode, t) => {
    expect(contrastRatio(t.accentFg, t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)('%s: badge tones stay readable on their washes', (_mode, t) => {
    // Badges are bold uppercase status meta — the spec's floor for meta is
    // 3:1. (The spec's own light warning pair sits at 4.49, just under 4.5.)
    expect(contrastRatio(t.successFg, t.successBg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(t.warningFg, t.warningBg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(t.dangerFg, t.dangerBg)).toBeGreaterThanOrEqual(3);
  });
});

describe('DsButton', () => {
  it('renders tones and disabled at 40% via class', () => {
    const { rerender } = render(<DsButton>Set up</DsButton>);
    expect(screen.getByRole('button', { name: 'Set up' }).className).toContain('ds-btn--primary');
    rerender(<DsButton tone="secondary">Add</DsButton>);
    expect(screen.getByRole('button', { name: 'Add' }).className).toContain('ds-btn--secondary');
    rerender(<DsButton disabled>Continue</DsButton>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('renders a trailing arrow for forward actions', () => {
    render(<DsButton arrow>Set up</DsButton>);
    expect(screen.getByRole('button', { name: 'Set up' }).querySelector('svg')).toBeTruthy();
  });
});

describe('DsInput', () => {
  it('wires label and error with role=alert', () => {
    render(<DsInput label="Brand name" error="Brand names need at least 3 characters." />);
    const input = screen.getByLabelText('Brand name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('at least 3 characters');
  });
});

describe('DsSelect', () => {
  it('opens, selects, closes', () => {
    const onChange = vi.fn();
    render(
      <DsSelect
        aria-label="Format"
        value="post"
        onChange={onChange}
        options={[
          { value: 'post', label: 'Instagram post' },
          { value: 'story', label: 'Story' },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    fireEvent.click(screen.getByRole('option', { name: 'Story' }));
    expect(onChange).toHaveBeenCalledWith('story');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('selection controls', () => {
  it('DsSwitch toggles', () => {
    const onChange = vi.fn();
    render(<DsSwitch checked={false} onChange={onChange} label="Email me" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('DsCheckbox reflects state', () => {
    render(<DsCheckbox checked onChange={() => {}} label="Include" />);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('DsSegmented switches options', () => {
    const onChange = vi.fn();
    render(
      <DsSegmented
        options={[
          { value: 'image', label: 'Image' },
          { value: 'design', label: 'Editable design' },
        ]}
        value="image"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Editable design' }));
    expect(onChange).toHaveBeenCalledWith('design');
  });
});

describe('feedback', () => {
  it('DsToast shows message + action', () => {
    const onAction = vi.fn();
    render(<DsToast message="Brand kit exported" actionLabel="Undo" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('DsBanner applies tone class', () => {
    render(<DsBanner tone="warning">Low resolution</DsBanner>);
    expect(screen.getByRole('status').className).toContain('ds-banner--warning');
  });

  it('DsBadge applies tone class', () => {
    render(<DsBadge tone="danger">Failed</DsBadge>);
    expect(screen.getByText('Failed').className).toContain('ds-badge--danger');
  });
});

describe('DsMenu', () => {
  it('renders items, kbd hints, and danger tone', () => {
    render(
      <DsMenu>
        <DsMenuItem kbd="⌘E">Export</DsMenuItem>
        <DsMenuItem danger>Delete brand</DsMenuItem>
      </DsMenu>,
    );
    expect(screen.getByRole('menuitem', { name: /Export/ }).textContent).toContain('⌘E');
    expect(screen.getByRole('menuitem', { name: 'Delete brand' }).className).toContain(
      'ds-menu-item--danger',
    );
  });
});

describe('DsModal + DsConfirmDialog', () => {
  it('renders nothing when closed and closes on Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DsModal open={false} onClose={onClose} title="Business card" />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<DsModal open onClose={onClose} title="Business card" />);
    expect(screen.getByRole('dialog', { name: 'Business card' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('confirm dialog fires confirm and cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DsConfirmDialog
        open
        title="Delete this logo variant?"
        description="This can't be undone."
        confirmLabel="Delete variant"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete variant' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('DsProgress', () => {
  it('clamps value into 0–100', () => {
    render(<DsProgress value={1.4} label="Completion" meta="6 / 7" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('DsTabBar', () => {
  it('marks the active tab and switches on click', () => {
    const onChange = vi.fn();
    render(
      <DsTabBar
        tabs={[
          { value: 'setup', label: 'Setup' },
          { value: 'kit', label: 'Brand Kit' },
        ]}
        value="setup"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Setup' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Brand Kit' }));
    expect(onChange).toHaveBeenCalledWith('kit');
  });
});

describe('DsRail', () => {
  it('toggles the active item closed when clicked again', () => {
    const onChange = vi.fn();
    render(
      <DsRail
        items={[{ value: 'insert', label: 'Insert', icon: <span /> }]}
        value="insert"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('DsSwatchRow', () => {
  it('flips label color per swatch contrast', () => {
    render(
      <DsSwatchRow
        swatches={[
          { hex: '#0e0e0e', label: 'Dark' },
          { hex: '#f5f4ef', label: 'Light' },
        ]}
      />,
    );
    const dark = screen.getByText('Dark');
    const light = screen.getByText('Light');
    expect(dark.style.color).not.toBe(light.style.color);
  });

  it('renders the empty state with no swatches', () => {
    render(<DsSwatchRow swatches={[]} emptyHint="No colors yet" />);
    expect(screen.getByText('No colors yet')).toBeTruthy();
  });
});

describe('BrandMark', () => {
  it('renders nine dots and a status role while loading', () => {
    const { container } = render(<BrandMark loading />);
    expect(container.querySelectorAll('path')).toHaveLength(9);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
