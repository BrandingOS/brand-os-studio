import type { FontRef, Typescale } from '@/shared/types/typescale';
import { googleFontsCssUrl } from '@/shared/typography';
import { cssString, cssUrl } from './_escape';

export function serializeFontSnippet(t: Typescale): string {
  const fonts: FontRef[] = [t.fonts.heading, t.fonts.body, ...(t.fonts.mono ? [t.fonts.mono] : [])];
  const googleLinks = fonts.filter(f => f.source === 'google')
    .map(f => `<link rel="stylesheet" href="${googleFontsCssUrl(f)}" />`).join('\n');
  const faces = fonts.filter(f => f.source === 'upload' && f.files?.length)
    .flatMap(f => f.files!.map(file =>
      `@font-face { font-family: "${cssString(f.family)}"; src: url("${cssUrl(file.url)}") format("${cssString(file.format)}"); font-weight: ${file.weight}; font-style: ${file.italic ? 'italic' : 'normal'}; font-display: swap; }`,
    )).join('\n');
  return [
    googleLinks ? `<!-- Google Fonts -->\n${googleLinks}` : '',
    faces ? `<style>\n${faces}\n</style>` : '',
  ].filter(Boolean).join('\n\n');
}
