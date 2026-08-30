/**
 * An email signature that survives being pasted into an email client.
 *
 * This exporter is unusual in that its constraints come from 1997. Gmail
 * strips `<style>` blocks and `class` attributes; Outlook renders through
 * Word, which has no flexbox and no grid and ignores most of `display`;
 * several clients drop `background-image` and `max-width`. So:
 *
 *   • layout is a `<table>`, because a table is the one box model every
 *     client agrees on;
 *   • every declaration is INLINE, because a stylesheet may not arrive;
 *   • the logo carries `width`/`height` ATTRIBUTES as well as inline CSS,
 *     because Outlook sizes from the attribute;
 *   • the typeface is the brand's family in front of a hard-safe ladder —
 *     `fontStack` ends in `system-ui`, which several clients resolve to
 *     Times.
 *
 * Everything a reader sees comes from `PersonContent`, which is the kit's
 * one contact record: edit it once and the business card, the letterhead
 * and this signature all follow. Blank fields are omitted rather than
 * printed as empty rows — a signature with a stray bullet is worse than a
 * signature with one line fewer.
 *
 * `signature.txt` ships beside it for the plain-text part of a multipart
 * message, and for the clients that refuse HTML outright.
 */
import type { PersonContent } from '@/features/brandkit/content';
import { contrastOk, fontFamily, surface, type BrandStyleSource } from '../renderers/brandStyle';
import { textBlob } from './bytes';
import type { ExportFile } from './types';

export type SignatureOptions = {
  /** Rendered pixel width of the logo. Default 132. */
  logoWidth?: number;
  /** Rendered pixel height. Defaults to 42% of the width. */
  logoHeight?: number;
};

/**
 * Families every mail client resolves. The brand's own family goes first;
 * this is what it falls back to, and it is deliberately not `system-ui`.
 */
const SAFE_SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SAFE_SERIF = "Georgia, Times New Roman, Times, serif";

function looksSerif(family: string): boolean {
  return /serif|garamond|georgia|times|playfair|baskerville|didot|bodoni|caslon|merriweather|lora|spectral|cormorant|slab/i.test(
    family,
  ) && !/sans/i.test(family);
}

/** The brand's family in front of a ladder a mail client can honour. */
export function emailFontStack(brand: BrandStyleSource, role: 'heading' | 'body'): string {
  const family = fontFamily(brand, role);
  const ladder = family && looksSerif(family) ? SAFE_SERIF : SAFE_SANS;
  return family ? `${family}, ${ladder}` : ladder;
}

/** HTML-escape. A person's name may legitimately contain `&` or `'`. */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `brand.com` → `https://brand.com`; an absolute url is left alone. */
export function absoluteUrl(website: string): string {
  const raw = (website ?? '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
}

/** A phone number as `tel:` sees it — digits, and a leading `+`. */
export function telHref(phone: string): string {
  const raw = (phone ?? '').trim();
  const plus = raw.startsWith('+') ? '+' : '';
  return `${plus}${raw.replace(/[^0-9]/g, '')}`;
}

type Row = { label: string; text: string; href?: string };

/** The contact rows this person actually has, in reading order. */
function contactRows(person: PersonContent): Row[] {
  const rows: Row[] = [];
  const email = (person.email ?? '').trim();
  if (email) rows.push({ label: 'Email', text: email, href: `mailto:${email}` });
  const phone = (person.phone ?? '').trim();
  if (phone) rows.push({ label: 'Phone', text: phone, href: `tel:${telHref(phone)}` });
  const website = (person.website ?? '').trim();
  if (website) rows.push({ label: 'Web', text: website, href: absoluteUrl(website) });
  const address = (person.address ?? '').trim();
  if (address) rows.push({ label: 'Address', text: address });
  const handle = (person.socialHandle ?? '').trim();
  if (handle) rows.push({ label: 'Social', text: handle });
  return rows;
}

/**
 * @param logoPngDataUrl the logo as a `data:` PNG URL — a remote URL works
 *   too, but most clients block remote images by default, so the kit hands
 *   over an inlined raster. Absent = no image cell.
 */
export function buildSignatureHtml(
  person: PersonContent,
  brand: BrandStyleSource,
  logoPngDataUrl?: string | null,
  options: SignatureOptions = {},
): ExportFile[] {
  return [
    {
      path: 'signature.html',
      blob: textBlob(signatureHtml(person, brand, logoPngDataUrl, options), 'text/html;charset=utf-8'),
    },
    { path: 'signature.txt', blob: textBlob(signatureText(person)) },
  ];
}

/** The markup, so a caller can paste it straight into a clipboard write. */
export function signatureHtml(
  person: PersonContent,
  brand: BrandStyleSource,
  logoPngDataUrl?: string | null,
  options: SignatureOptions = {},
): string {
  const card = surface(brand, 'card');
  const brandTokens = surface(brand, 'brand');
  // The accent is the brand's own colour, but only where it can be READ on
  // the white-ish ground an email body actually has.
  const accent = contrastOk(brandTokens.bg, card.bg) ? brandTokens.bg : card.text;
  const headingFont = emailFontStack(brand, 'heading');
  const bodyFont = emailFontStack(brand, 'body');

  const logoWidth = Math.max(1, Math.round(options.logoWidth ?? 132));
  const logoHeight = Math.max(1, Math.round(options.logoHeight ?? Math.round(logoWidth * 0.42)));

  const name = (person.fullName ?? '').trim();
  const pronouns = (person.pronouns ?? '').trim();
  const title = (person.jobTitle ?? '').trim();
  const company = (person.company ?? '').trim();
  const tagline = (person.tagline ?? '').trim();
  const rows = contactRows(person);

  const cellBase = `font-family: ${bodyFont}; font-size: 13px; line-height: 19px; color: ${card.text};`;
  const parts: string[] = [];

  parts.push(
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; ${cellBase}">`,
  );
  parts.push('<tr>');

  if (logoPngDataUrl) {
    parts.push(
      `<td valign="top" style="padding: 0 18px 0 0;"><img src="${escapeHtml(logoPngDataUrl)}" alt="${escapeHtml(
        company || name,
      )}" width="${logoWidth}" height="${logoHeight}" style="display: block; width: ${logoWidth}px; height: ${logoHeight}px; border: 0; outline: none; text-decoration: none;"></td>`,
    );
    // A rule instead of a border on the text cell: Word drops `border-left`
    // on a `<td>` about as often as it honours it.
    parts.push(
      `<td valign="top" style="width: 1px; padding: 0; background-color: ${card.border};">&nbsp;</td>`,
    );
    parts.push(`<td valign="top" style="padding: 0 0 0 18px; ${cellBase}">`);
  } else {
    parts.push(`<td valign="top" style="padding: 0; ${cellBase}">`);
  }

  if (name) {
    parts.push(
      `<div style="font-family: ${headingFont}; font-size: 16px; line-height: 22px; font-weight: bold; color: ${accent};">${escapeHtml(
        name,
      )}${
        pronouns
          ? ` <span style="font-family: ${bodyFont}; font-size: 12px; font-weight: normal; color: ${card.textMuted};">(${escapeHtml(
              pronouns,
            )})</span>`
          : ''
      }</div>`,
    );
  }
  const roleLine = [title, company].filter(Boolean).join(' · ');
  if (roleLine) {
    parts.push(
      `<div style="font-family: ${bodyFont}; font-size: 13px; line-height: 19px; color: ${card.text}; padding-top: 2px;">${escapeHtml(
        roleLine,
      )}</div>`,
    );
  }
  if (tagline) {
    parts.push(
      `<div style="font-family: ${bodyFont}; font-size: 12px; line-height: 18px; color: ${card.textMuted}; padding-top: 6px;">${escapeHtml(
        tagline,
      )}</div>`,
    );
  }

  if (rows.length > 0) {
    parts.push(
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; padding-top: 8px;">`,
    );
    for (const row of rows) {
      const value = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color: ${accent}; text-decoration: none;">${escapeHtml(
            row.text,
          )}</a>`
        : escapeHtml(row.text);
      parts.push(
        `<tr><td style="font-family: ${bodyFont}; font-size: 12px; line-height: 18px; color: ${card.textMuted}; padding: 2px 10px 0 0; white-space: nowrap;">${escapeHtml(
          row.label,
        )}</td><td style="font-family: ${bodyFont}; font-size: 12px; line-height: 18px; color: ${card.text}; padding: 2px 0 0 0;">${value}</td></tr>`,
      );
    }
    parts.push('</table>');
  }

  parts.push('</td>');
  parts.push('</tr>');
  parts.push('</table>');
  return `${parts.join('\n')}\n`;
}

/** The same signature with no markup at all. */
export function signatureText(person: PersonContent): string {
  const lines: string[] = [];
  const name = (person.fullName ?? '').trim();
  const pronouns = (person.pronouns ?? '').trim();
  if (name) lines.push(pronouns ? `${name} (${pronouns})` : name);
  const roleLine = [(person.jobTitle ?? '').trim(), (person.company ?? '').trim()]
    .filter(Boolean)
    .join(' · ');
  if (roleLine) lines.push(roleLine);
  const tagline = (person.tagline ?? '').trim();
  if (tagline) lines.push(tagline);
  const rows = contactRows(person);
  if (rows.length > 0) {
    lines.push('');
    for (const row of rows) lines.push(`${row.label}: ${row.text}`);
  }
  return `${lines.join('\n')}\n`;
}
