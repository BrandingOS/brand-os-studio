import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LogoRoleChip } from '../LogoRoleChip';

describe('LogoRoleChip', () => {
  it('opens the role picker instead of bubbling to the tile, and picks a role', async () => {
    const onPick = vi.fn();
    const onTile = vi.fn();
    render(
      <div data-workspace="">
        <div onClick={onTile}>
          <LogoRoleChip label="Icon" currentId="mark" onPick={onPick} />
        </div>
      </div>,
    );
    fireEvent.click(screen.getByText('Icon'));
    expect(onTile).not.toHaveBeenCalled();
    const picker = await screen.findByText('Which variant is this?');
    expect(picker).toBeTruthy();
    expect(document.querySelector('[data-role-option="mark"]')!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(document.querySelector('[data-role-option="wordmark"]')!);
    expect(onPick).toHaveBeenCalledWith('wordmark');
    expect(onTile).not.toHaveBeenCalled();
  });
});
