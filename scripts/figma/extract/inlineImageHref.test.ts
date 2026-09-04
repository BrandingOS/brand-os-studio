import { describe, expect, it } from 'vitest';
import { inlineImageHref } from './toIR';

const MARK = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
  + '<circle cx="12" cy="2" r="2" fill="#111113"/><circle cx="12" cy="12" r="3" fill="#111113"/></svg>';

const wrap = (href: string, extra = 'x="20" y="20" width="160" height="160"') =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`
  + `<rect width="200" height="200" fill="#F5F4EF"></rect>`
  + `<image href="${href}" ${extra} preserveAspectRatio="xMidYMid meet"></image>`
  + `</svg>`;

describe('inlineImageHref', () => {
  /**
   * The regression. createNodeFromSvg does not resolve a nested <image>, so a
   * logo delivered as rect + image reached the canvas as the RECT alone — a
   * solid block where the mark should be.
   */
  it('replaces a data-URI image with the drawing it points at', () => {
    const out = inlineImageHref(wrap(`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`));
    expect(out).not.toContain('<image');
    expect(out).toContain('<circle cx="12" cy="2"');
    expect(out).toContain('<circle cx="12" cy="12"');
  });

  it('keeps the ground that was drawn behind it', () => {
    const out = inlineImageHref(wrap(`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`));
    expect(out).toContain('<rect width="200" height="200" fill="#F5F4EF">');
  });

  /** Dropping the placement paints the mark at the origin at its own scale. */
  it('carries the placement across as a transform', () => {
    const out = inlineImageHref(wrap(`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`));
    // 160 wide over a 24-unit viewBox.
    expect(out).toContain('<g transform="translate(20 20) scale(6.666666666666667 6.666666666666667)">');
  });

  it('decodes a base64 payload too', () => {
    const b64 = Buffer.from(MARK, 'utf8').toString('base64');
    const out = inlineImageHref(wrap(`data:image/svg+xml;base64,${b64}`));
    expect(out).toContain('<circle cx="12" cy="12"');
  });

  /** A remote href cannot be resolved here; the loss must stay visible. */
  it('leaves a remote href alone rather than half-drawing it', () => {
    const src = wrap('https://example.com/logo.svg');
    expect(inlineImageHref(src)).toBe(src);
  });

  it('leaves a raster data URI alone', () => {
    const src = wrap('data:image/png;base64,iVBORw0KGgo=');
    expect(inlineImageHref(src)).toBe(src);
  });

  it('leaves an svg with no image untouched', () => {
    const src = '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>';
    expect(inlineImageHref(src)).toBe(src);
  });

  it('refuses a payload that is not an svg', () => {
    const src = wrap(`data:image/svg+xml;utf8,${encodeURIComponent('<html>nope</html>')}`);
    expect(inlineImageHref(src)).toBe(src);
  });

  it('survives a payload that will not decode', () => {
    const src = wrap('data:image/svg+xml;utf8,%E0%A4%A');
    expect(inlineImageHref(src)).toBe(src);
  });

  it('defaults placement to the origin at 1:1 when the image declares none', () => {
    const out = inlineImageHref(
      wrap(`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`, ''),
    );
    expect(out).toContain('<g transform="translate(0 0) scale(1 1)">');
  });

  /** A stray </image> produced '</g></image>' and an SVG a parser would reject. */
  it('consumes the closing tag, leaving no orphan', () => {
    const out = inlineImageHref(wrap(`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`));
    expect(out).not.toContain('</image>');
    expect(out).toContain('</g>');
    expect(out.split('<g ').length - 1).toBe(1);
  });

  it('handles the self-closing form too', () => {
    const src = `<svg viewBox="0 0 200 200"><image href="data:image/svg+xml;utf8,${encodeURIComponent(MARK)}" x="0" y="0" width="24" height="24"/></svg>`;
    const out = inlineImageHref(src);
    expect(out).not.toContain('<image');
    expect(out).toContain('<circle cx="12" cy="12"');
  });
});
