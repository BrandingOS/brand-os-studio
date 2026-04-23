import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { TypescaleEditor } from '../TypescaleEditor';
import { seedTypescale } from '../../hooks/useSeedTypescale';

/** The `full` variant pulls in ExportPanel → ToolGate → useNavigate, so we
 *  wrap in a MemoryRouter. Compact mode has no router dependency but we
 *  wrap both for consistency. */
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TypescaleEditor', () => {
  it('renders full variant with font pair + export controls', () => {
    const initial = seedTypescale(null);
    renderWithRouter(<TypescaleEditor variant="full" initial={initial} />);
    expect(screen.getByText(/Font pair/i)).toBeInTheDocument();
    // ExportPanel's h3 is exactly "Export"; other nodes say "Export CSS"
    // etc., so scope to the exact match.
    expect(screen.getByText(/^Export$/)).toBeInTheDocument();
  });

  it('renders compact variant without export panel', () => {
    const initial = seedTypescale(null);
    renderWithRouter(<TypescaleEditor variant="compact" initial={initial} />);
    expect(screen.getByText(/Font pair/i)).toBeInTheDocument();
    // Export panel header is absent in compact mode
    expect(screen.queryByText(/^Export$/i)).not.toBeInTheDocument();
  });
});
