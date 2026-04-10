import { describe, it, expect } from 'vitest';
import { hasVariables, interpolateString, interpolateDeep } from '../interpolate';

describe('hasVariables', () => {
  it('returns true when string contains {{variable}}', () => {
    expect(hasVariables('Hello {{brand.name}}')).toBe(true);
  });

  it('returns false for plain strings', () => {
    expect(hasVariables('Hello world')).toBe(false);
  });

  it('works correctly on repeated calls (no stateful regex)', () => {
    expect(hasVariables('{{a}}')).toBe(true);
    expect(hasVariables('{{b}}')).toBe(true);
    expect(hasVariables('plain')).toBe(false);
    expect(hasVariables('{{c}}')).toBe(true);
  });
});

describe('interpolateString', () => {
  const vars = {
    'brand.name': 'Acme',
    'brand.colors.primary': '#FF0000',
    'content.fullName': 'Jane Smith',
  };

  it('replaces single variable', () => {
    expect(interpolateString('Hello {{brand.name}}', vars)).toBe('Hello Acme');
  });

  it('replaces multiple variables', () => {
    expect(interpolateString('{{content.fullName}} at {{brand.name}}', vars)).toBe('Jane Smith at Acme');
  });

  it('keeps unknown variables as-is', () => {
    expect(interpolateString('Color: {{brand.unknown}}', vars)).toBe('Color: {{brand.unknown}}');
  });

  it('returns plain strings unchanged', () => {
    expect(interpolateString('No variables here', vars)).toBe('No variables here');
  });

  it('handles empty string', () => {
    expect(interpolateString('', vars)).toBe('');
  });
});

describe('interpolateDeep', () => {
  const vars = { 'brand.name': 'Acme', 'brand.colors.primary': '#FF0000' };

  it('interpolates nested object strings', () => {
    const input = {
      title: '{{brand.name}}',
      style: { color: '{{brand.colors.primary}}' },
    };
    const result = interpolateDeep(input, vars);
    expect(result.title).toBe('Acme');
    expect(result.style.color).toBe('#FF0000');
  });

  it('interpolates arrays', () => {
    const input = ['{{brand.name}}', 'static'];
    const result = interpolateDeep(input, vars);
    expect(result[0]).toBe('Acme');
    expect(result[1]).toBe('static');
  });

  it('does not mutate input', () => {
    const input = { name: '{{brand.name}}' };
    const result = interpolateDeep(input, vars);
    expect(input.name).toBe('{{brand.name}}');
    expect(result.name).toBe('Acme');
  });

  it('preserves non-string values', () => {
    const input = { count: 42, active: true, name: '{{brand.name}}' };
    const result = interpolateDeep(input, vars);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });
});
