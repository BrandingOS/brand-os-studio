import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ExportPanel } from '../ExportPanel';
import { seedTypescale } from '../../hooks/useSeedTypescale';

/** ExportPanel's Copy button is wrapped in <ToolGate>, which calls
 *  useNavigate. Always mount under a MemoryRouter. */
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ExportPanel', () => {
  it('switches format on tab click (Tailwind v4 shows @theme)', () => {
    renderWithRouter(<ExportPanel draft={seedTypescale(null)} mode="in-app" />);
    fireEvent.click(screen.getByText(/Tailwind v4/i));
    expect(screen.getByText(/@theme/)).toBeInTheDocument();
  });

  it('Copy in in-app mode calls clipboard.writeText directly (no gate)', () => {
    const write = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText: write } });
    renderWithRouter(<ExportPanel draft={seedTypescale(null)} mode="in-app" />);
    fireEvent.click(screen.getByText('Copy'));
    expect(write).toHaveBeenCalled();
  });
});
