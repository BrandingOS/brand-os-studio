// Phase 8.2 — useDocumentMeta tests.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useDocumentMeta, type DocumentMeta } from './useDocumentMeta';

function Probe(props: DocumentMeta) {
  useDocumentMeta(props);
  return null;
}

const ORIGINAL_TITLE = 'Original';

beforeEach(() => {
  document.title = ORIGINAL_TITLE;
  // Wipe meta tags possibly added by previous tests.
  document.head
    .querySelectorAll('meta[name^="description"], meta[property^="og:"], meta[name^="twitter:"]')
    .forEach((el) => el.remove());
});

afterEach(() => {
  cleanup();
});

const getMeta = (kind: 'name' | 'property', key: string): string | null => {
  const el = document.head.querySelector<HTMLMetaElement>(
    `meta[${kind}="${key}"]`,
  );
  return el?.content ?? null;
};

describe('useDocumentMeta', () => {
  it('sets document.title and restores on unmount', () => {
    const { unmount } = render(<Probe title="Hello" />);
    expect(document.title).toBe('Hello');
    unmount();
    expect(document.title).toBe(ORIGINAL_TITLE);
  });

  it('sets description, og:description, twitter:description', () => {
    render(<Probe title="X" description="A short summary" />);
    expect(getMeta('name', 'description')).toBe('A short summary');
    expect(getMeta('property', 'og:description')).toBe('A short summary');
    expect(getMeta('name', 'twitter:description')).toBe('A short summary');
  });

  it('sets og:image + twitter:image when image is provided', () => {
    render(<Probe title="X" image="https://x.test/cover.png" />);
    expect(getMeta('property', 'og:image')).toBe('https://x.test/cover.png');
    expect(getMeta('name', 'twitter:image')).toBe('https://x.test/cover.png');
  });

  it('defaults twitter:card to summary_large_image when image is set', () => {
    render(<Probe title="X" image="https://x.test/c.png" />);
    expect(getMeta('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('defaults twitter:card to summary when no image', () => {
    render(<Probe title="X" />);
    expect(getMeta('name', 'twitter:card')).toBe('summary');
  });

  it('og:url defaults to window.location.href', () => {
    render(<Probe title="X" />);
    expect(getMeta('property', 'og:url')).toBe(window.location.href);
  });

  it('og:url respects explicit override', () => {
    render(<Probe title="X" url="https://example.test/x" />);
    expect(getMeta('property', 'og:url')).toBe('https://example.test/x');
  });

  it('removes added tags on unmount', () => {
    const { unmount } = render(<Probe title="X" image="https://x.test/c.png" />);
    expect(getMeta('property', 'og:image')).not.toBeNull();
    unmount();
    expect(getMeta('property', 'og:image')).toBeNull();
  });

  it('restores prior content of pre-existing tags on unmount', () => {
    // Seed an existing description tag (mimics a static index.html tag).
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'static-index-description');
    document.head.appendChild(meta);

    const { unmount } = render(<Probe title="X" description="dynamic" />);
    expect(getMeta('name', 'description')).toBe('dynamic');
    unmount();
    expect(getMeta('name', 'description')).toBe('static-index-description');

    meta.remove();
  });
});
