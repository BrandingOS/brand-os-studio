import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { SetupBoard } from '../SetupBoard';
import { mockBrand } from '../../data/mockBrand';
import type { SetupBoardRefs } from '../SetupBoard';
import { createRef, type MutableRefObject } from 'react';

/**
 * The Brand section — the name and the slogan, which are the two things a
 * brand is called and could previously be changed nowhere in Setup at all.
 *
 * These run in a real browser because the value has to travel from a typed
 * input to the caller's save handler; that hand-off is exactly the data-flow
 * the jsdom layer keeps missing.
 */
function mount(over: {
  onChangeName?: (v: string) => void;
  onChangeSlogan?: (v: string) => void;
} = {}) {
  const refs = createRef<SetupBoardRefs>() as MutableRefObject<SetupBoardRefs>;
  refs.current = {};
  return render(
    <div data-workspace="">
      <SetupBoard
        brand={{ ...mockBrand, name: 'Acme Co', strategy: { ...mockBrand.strategy, slogan: 'Built to last' } }}
        onEdit={() => {}}
        sectionRefs={refs}
        onUpdateColor={() => {}}
        {...over}
      />
    </div>,
  );
}

const nameField = () => screen.getByLabelText(/brand name/i) as HTMLInputElement;
const sloganField = () => screen.getByLabelText(/^slogan$/i) as HTMLInputElement;

describe('Setup — Brand section', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('shows the brand name and slogan', () => {
    mount();
    expect(nameField().value).toBe('Acme Co');
    expect(sloganField().value).toBe('Built to last');
  });

  it('commits a rename on blur', async () => {
    const onChangeName = vi.fn();
    mount({ onChangeName });

    nameField().focus();
    fireEvent.change(nameField(), { target: { value: 'Acme Studio' } });
    fireEvent.blur(nameField());

    await waitFor(() => expect(onChangeName).toHaveBeenCalledWith('Acme Studio'));
  });

  it('commits a rename on Enter', async () => {
    const onChangeName = vi.fn();
    mount({ onChangeName });

    nameField().focus();
    fireEvent.change(nameField(), { target: { value: 'Acme Studio' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    await waitFor(() => expect(onChangeName).toHaveBeenCalledWith('Acme Studio'));
  });

  it('does NOT commit on every keystroke — a rename regenerates the slug', () => {
    const onChangeName = vi.fn();
    mount({ onChangeName });

    nameField().focus();
    for (const v of ['A', 'Ac', 'Acm', 'Acme']) {
      fireEvent.change(nameField(), { target: { value: v } });
    }
    expect(onChangeName).not.toHaveBeenCalled();
  });

  it('Escape abandons the edit rather than saving it', async () => {
    const onChangeName = vi.fn();
    mount({ onChangeName });

    nameField().focus();
    fireEvent.change(nameField(), { target: { value: 'Typed by mistake' } });
    fireEvent.keyDown(nameField(), { key: 'Escape' });

    // Escape blurs, and the blur must not commit the text it just discarded.
    await waitFor(() => expect(nameField().value).toBe('Acme Co'));
    expect(onChangeName).not.toHaveBeenCalled();
  });

  it('refuses to save an empty name', async () => {
    const onChangeName = vi.fn();
    mount({ onChangeName });

    nameField().focus();
    fireEvent.change(nameField(), { target: { value: '   ' } });
    fireEvent.blur(nameField());

    await waitFor(() => expect(nameField().value).toBe('Acme Co'));
    expect(onChangeName).not.toHaveBeenCalled();
  });

  it('commits the slogan independently', async () => {
    const onChangeSlogan = vi.fn();
    mount({ onChangeSlogan });

    sloganField().focus();
    fireEvent.change(sloganField(), { target: { value: 'Made for the long run' } });
    fireEvent.blur(sloganField());

    await waitFor(() => expect(onChangeSlogan).toHaveBeenCalledWith('Made for the long run'));
  });

  it('disables the fields when the surface cannot save', () => {
    mount();
    expect(nameField().disabled).toBe(true);
    expect(sloganField().disabled).toBe(true);
  });
});
