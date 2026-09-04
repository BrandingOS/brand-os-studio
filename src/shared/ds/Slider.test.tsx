import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { DsSlider } from './Slider';

afterEach(() => cleanup());

describe('DsSlider', () => {
  it('reports a number, not the input’s string', () => {
    const onChange = vi.fn();
    render(<DsSlider value={4} onChange={onChange} min={0} max={10} label="Gap" />);
    fireEvent.change(screen.getByLabelText('Gap'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
    expect(typeof onChange.mock.calls[0][0]).toBe('number');
  });

  it('shows the value the way the caller reads it', () => {
    render(<DsSlider value={1.5} onChange={() => {}} label="Zoom" format={(v) => `${v.toFixed(2)}×`} />);
    expect(screen.getByText('1.50×')).toBeTruthy();
  });

  it('renders a bare track with no label, since a lone number states nothing', () => {
    const { container } = render(<DsSlider value={3} onChange={() => {}} />);
    expect(container.querySelector('.ds-slider-field')).toBeNull();
    expect(container.querySelector('.ds-slider')).toBeTruthy();
  });
});
