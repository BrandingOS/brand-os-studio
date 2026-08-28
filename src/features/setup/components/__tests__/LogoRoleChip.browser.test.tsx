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

  it('renames in place when the surface can persist a name', async () => {
    const onRename = vi.fn();
    render(
      <div data-workspace="">
        <LogoRoleChip label="Wordmark" currentId="wordmark" onPick={() => {}} onRename={onRename} />
      </div>,
    );
    fireEvent.click(screen.getByText('Wordmark'));
    fireEvent.click(await screen.findByText(/Rename “Wordmark”/));
    const input = document.querySelector('[data-logo-role-rename-input]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'RAQM-LOGO-AR' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('RAQM-LOGO-AR');
  });

  it('offers no rename when nothing can persist it', async () => {
    render(
      <div data-workspace="">
        <LogoRoleChip label="Icon" currentId="mark" onPick={() => {}} />
      </div>,
    );
    fireEvent.click(screen.getByText('Icon'));
    await screen.findByText('Which variant is this?');
    expect(document.querySelector('[data-logo-role-rename]')).toBeNull();
  });
});
