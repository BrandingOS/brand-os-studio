/**
 * DsModal — the shape of the box, not the look of it.
 *
 * The Brand Kit's export dialog laid its own primary action out at y≈1024 in
 * a 900px viewport: the whole panel was one scroller, so "Export everything"
 * was BELOW the box with nothing on screen to say more content existed, and
 * the wheel that scrolled the dialog also scrolled the page behind it by
 * 3300px (QA Q4). Both halves are structural, so both are pinned here.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DsModal, DsConfirmDialog } from './Modal';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('DsModal — three bands, one scroller', () => {
  it('puts the actions in their own row inside the panel, never in the scrolling body', () => {
    render(
      <DsModal
        open
        onClose={() => {}}
        title="Choose what to export"
        actions={<button type="button">Export everything</button>}
        secondaryActions={<button type="button">Essentials only</button>}
      >
        <p>Body</p>
      </DsModal>,
    );

    const modal = document.querySelector('.ds-modal')!;
    const body = modal.querySelector('.ds-modal-body')!;
    const foot = modal.querySelector('.ds-modal-foot')!;

    expect(modal.querySelector('.ds-modal-head')).toBeTruthy();
    expect(body).toBeTruthy();
    // The action row is a direct child of the panel — a sibling of the
    // scroller, so it cannot scroll out of the box with the content.
    expect(foot.parentElement).toBe(modal);
    expect(body.contains(foot)).toBe(false);

    const primary = screen.getByText('Export everything');
    const quiet = screen.getByText('Essentials only');
    expect(foot.contains(primary)).toBe(true);
    expect(foot.contains(quiet)).toBe(true);
    expect(body.contains(primary)).toBe(false);
  });

  it('gives the caller content to the body, so the body is what scrolls', () => {
    render(
      <DsModal open onClose={() => {}} title="Pick">
        <p>Row one</p>
        <p>Row two</p>
      </DsModal>,
    );
    const body = document.querySelector('.ds-modal-body')!;
    expect(body.textContent).toContain('Row one');
    expect(body.textContent).toContain('Row two');
  });

  it('renders no action row when the caller passes none', () => {
    render(<DsModal open onClose={() => {}} title="Pick" />);
    expect(document.querySelector('.ds-modal-foot')).toBeNull();
  });
});

describe('DsModal — the page behind it does not scroll', () => {
  it('locks and releases body scroll with the dialog', () => {
    const { rerender } = render(
      <DsModal open={false} onClose={() => {}} title="Pick" />,
    );
    expect(document.body.style.overflow).toBe('');

    rerender(<DsModal open onClose={() => {}} title="Pick" />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<DsModal open={false} onClose={() => {}} title="Pick" />);
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the lock when a confirm dialog opened on top of a modal closes', () => {
    const { rerender } = render(
      <>
        <DsModal open onClose={() => {}} title="Colours" />
        <DsConfirmDialog
          open
          title="Change the colour system"
          description="This rewrites the brand."
          confirmLabel="Change it"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    // The confirm closes; the modal underneath is still open, so the page
    // behind must stay locked. A non-counting lock would release here.
    rerender(
      <>
        <DsModal open onClose={() => {}} title="Colours" />
        <DsConfirmDialog
          open={false}
          title="Change the colour system"
          description="This rewrites the brand."
          confirmLabel="Change it"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<></>);
    expect(document.body.style.overflow).toBe('');
  });

  it('still closes on Escape and on a scrim click', () => {
    let closed = 0;
    render(<DsModal open onClose={() => { closed += 1; }} title="Pick" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(1);
    fireEvent.click(document.querySelector('.ds-modal-scrim')!);
    expect(closed).toBe(2);
  });
});
