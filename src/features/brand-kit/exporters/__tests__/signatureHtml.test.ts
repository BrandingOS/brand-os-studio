/**
 * The signature, read back as the markup a mail client will receive.
 *
 * Every assertion here is one of the constraints in the module's own
 * header, checked against the OUTPUT rather than trusted: a `<style>`
 * block or a `class` attribute means Gmail strips the design, a missing
 * `width` attribute on the logo means Outlook draws it at its natural
 * size, and a field that never reaches the markup is a person whose phone
 * number silently vanished from every email they send.
 *
 * The markup is parsed with `DOMParser`, not grepped, so "the email is in
 * there somewhere" cannot pass for "the email is a mailto link".
 */
import { describe, it, expect } from 'vitest';
import type { PersonContent } from '@/features/brandkit/content';
import { mockBrand } from '@/features/setup/data/mockBrand';
import {
  buildSignatureHtml,
  signatureHtml,
  signatureText,
  absoluteUrl,
  telHref,
  escapeHtml,
  emailFontStack,
} from '../signatureHtml';
import { textOf } from './blobText';

const PERSON: PersonContent = {
  fullName: 'Dana Okonkwo',
  jobTitle: 'Head of Brand',
  email: 'dana@nuworld.com',
  phone: '+1 (415) 555-0142',
  website: 'nuworld.com',
  company: 'Nuworld',
  address: '2 Mission Street, San Francisco, CA',
  tagline: 'We make complex things feel simple.',
  pronouns: 'she/her',
  socialHandle: '@nuworld',
};

const LOGO = 'data:image/png;base64,iVBORw0KGgo=';

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

describe('signatureHtml — what a mail client is allowed to receive', () => {
  const html = signatureHtml(PERSON, mockBrand, LOGO);

  it('carries no stylesheet and no class attribute', () => {
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/\sclass=/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).not.toMatch(/<script/i);
    // Layout is a table, because a table is the one box model every client
    // agrees on — and nothing depends on flex or grid.
    expect(html).not.toMatch(/display:\s*(flex|grid)/i);
    expect(parse(html).querySelector('table')).not.toBeNull();
  });

  it('styles everything inline', () => {
    const doc = parse(html);
    // Every element that paints carries its own declarations; nothing is
    // waiting for a stylesheet that will not arrive.
    const styled = [...doc.querySelectorAll('div, td, img, a')];
    expect(styled.length).toBeGreaterThan(0);
    for (const el of styled) {
      expect(el.getAttribute('style') ?? '').not.toBe('');
    }
  });

  it('every person field reaches the markup', () => {
    const text = parse(html).body.textContent ?? '';
    for (const value of [
      PERSON.fullName,
      PERSON.jobTitle,
      PERSON.email,
      PERSON.phone,
      PERSON.website,
      PERSON.company,
      PERSON.address,
      PERSON.tagline,
      PERSON.pronouns!,
      PERSON.socialHandle!,
    ]) {
      expect(text).toContain(value);
    }
  });

  it('the email is a mailto link, the phone a tel link, the site absolute', () => {
    const doc = parse(html);
    const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).toContain(`mailto:${PERSON.email}`);
    // `tel:` takes digits and a leading plus — not the display formatting.
    expect(hrefs).toContain('tel:+14155550142');
    expect(hrefs).toContain('https://nuworld.com');
    for (const a of doc.querySelectorAll('a')) {
      expect(a.getAttribute('style')).toContain('text-decoration: none');
    }
  });

  it('the logo carries width and height ATTRIBUTES as well as inline css', () => {
    const img = parse(html).querySelector('img')!;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(LOGO);
    // Outlook sizes from the attribute; the CSS alone is not enough.
    expect(img.getAttribute('width')).toBe('132');
    expect(img.getAttribute('height')).toBe('55');
    expect(img.getAttribute('style')).toContain('width: 132px');
    expect(img.getAttribute('style')).toContain('height: 55px');
    expect(img.getAttribute('style')).toContain('display: block');
    // An alt is the fallback for the clients that block images by default.
    expect(img.getAttribute('alt')).toBe(PERSON.company);
  });

  it('honours an explicit logo size', () => {
    const img = parse(signatureHtml(PERSON, mockBrand, LOGO, { logoWidth: 200, logoHeight: 60 }))
      .querySelector('img')!;
    expect(img.getAttribute('width')).toBe('200');
    expect(img.getAttribute('height')).toBe('60');
  });

  it('draws no image cell at all when there is no logo', () => {
    const doc = parse(signatureHtml(PERSON, mockBrand, null));
    expect(doc.querySelector('img')).toBeNull();
    expect((doc.body.textContent ?? '')).toContain(PERSON.fullName);
  });
});

describe('signatureHtml — the blank and the awkward', () => {
  it('omits an empty field rather than printing an empty row', () => {
    const sparse: PersonContent = {
      ...PERSON,
      phone: '',
      address: '',
      tagline: '',
      pronouns: '',
      socialHandle: '',
    };
    const doc = parse(signatureHtml(sparse, mockBrand, null));
    const text = doc.body.textContent ?? '';
    expect(text).not.toContain('Phone');
    expect(text).not.toContain('Address');
    expect(text).not.toContain('Social');
    expect(text).not.toContain('()');
    expect(text).toContain('Email');
    // No row is left standing with a label and nothing beside it.
    for (const row of doc.querySelectorAll('tr')) {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length === 2 && (cells[0].textContent ?? '').trim().length > 0) {
        expect((cells[1].textContent ?? '').trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('escapes a name that contains markup characters', () => {
    const html = signatureHtml({ ...PERSON, fullName: 'Ben & Co <Design>' }, mockBrand, null);
    expect(html).toContain('Ben &amp; Co &lt;Design&gt;');
    expect(html).not.toContain('<Design>');
    expect(parse(html).body.textContent).toContain('Ben & Co <Design>');
  });

  it('leaves an already-absolute website alone', () => {
    expect(absoluteUrl('https://x.dev')).toBe('https://x.dev');
    expect(absoluteUrl('x.dev')).toBe('https://x.dev');
    expect(absoluteUrl('  ')).toBe('');
    expect(telHref('(020) 7946 0018')).toBe('02079460018');
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });

  it('puts a safe ladder behind the brand family, never system-ui', () => {
    const stack = emailFontStack(mockBrand, 'body');
    expect(stack).not.toContain('system-ui');
    expect(stack.toLowerCase()).toContain('arial');
    // A serif brand face gets the serif ladder, not the sans one.
    expect(emailFontStack(mockBrand, 'heading').toLowerCase()).toContain('georgia');
  });
});

describe('buildSignatureHtml — the files', () => {
  it('ships the html and a plain-text twin carrying the same facts', async () => {
    const files = buildSignatureHtml(PERSON, mockBrand, LOGO);
    expect(files.map((f) => f.path)).toEqual(['signature.html', 'signature.txt']);

    const html = await textOf(files[0].blob);
    expect(parse(html).querySelector('img')).not.toBeNull();

    const text = await textOf(files[1].blob);
    expect(text).not.toMatch(/[<>]/);
    for (const value of [PERSON.fullName, PERSON.email, PERSON.phone, PERSON.website]) {
      expect(text).toContain(value);
    }
    expect(signatureText(PERSON)).toBe(text);
  });
});
