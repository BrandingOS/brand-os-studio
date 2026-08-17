/**
 * The whole identity, in one file.
 *
 * Assembled from the same per-piece builders the sections use, so a logo in the
 * bundle is byte-identical to the logo someone downloaded from the Logo
 * section. A second assembly path is how a zip ends up containing a different
 * PNG from the one the page showed.
 *
 * `brand.json` is included deliberately: a developer wiring the palette into
 * code should not have to read hexes off a picture of a swatch.
 */
import { buildZip, slugify } from '@/features/setup/utils/downloads';
import type { IdentityModel } from '../identityModel';
import { colourSvg, extensionOf, fetchAsBlob } from './identityDownloads';

/** A plain-text summary, for anyone who opens the zip before the files. */
function readme(model: IdentityModel): string {
  const lines = [`${model.name} — Brand identity`, ''];
  if (model.tagline) lines.push(model.tagline, '');
  if (model.introduction.summary) lines.push(model.introduction.summary, '');

  if (model.logo.present) {
    lines.push('LOGOS', ...model.logo.variants.map((v) => `  ${v.def.label} — ${v.def.hint}`), '');
  }
  if (model.colour.present) {
    lines.push('COLOUR', ...model.colour.colours.map((c) => `  ${c.role}  ${c.hex}  rgb(${c.rgb})`), '');
  }
  if (model.typography.present) {
    lines.push(
      'TYPOGRAPHY',
      ...model.typography.fonts.map((f) => `  ${f.role}  ${f.token.family}`),
      '',
    );
  }
  if (model.voice.present) {
    if (model.voice.tone) lines.push('VOICE', `  Tone: ${model.voice.tone}`);
    for (const d of model.voice.doList) lines.push(`  Always: ${d}`);
    for (const d of model.voice.dontList) lines.push(`  Never: ${d}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** The machine-readable half. Only what the brand actually decided. */
function brandJson(model: IdentityModel): string {
  return JSON.stringify(
    {
      name: model.name,
      ...(model.tagline ? { tagline: model.tagline } : {}),
      ...(model.introduction.summary ? { summary: model.introduction.summary } : {}),
      ...(model.colour.present
        ? {
            colours: model.colour.colours.map((c) => ({
              role: c.role,
              hex: c.hex,
              rgb: c.rgb,
              cmyk: c.cmyk,
            })),
          }
        : {}),
      ...(model.typography.present
        ? {
            typography: model.typography.fonts.map((f) => ({
              role: f.role,
              family: f.token.family,
              weights: f.token.weights ?? [],
            })),
          }
        : {}),
      ...(model.voice.present
        ? {
            voice: {
              ...(model.voice.tone ? { tone: model.voice.tone } : {}),
              do: model.voice.doList,
              dont: model.voice.dontList,
            },
          }
        : {}),
      ...(model.personality.present
        ? { personality: model.personality.traits, values: model.personality.values }
        : {}),
    },
    null,
    2,
  );
}

export async function downloadCompleteIdentity(model: IdentityModel): Promise<void> {
  await buildZip(`${slugify(model.name)}-brand-identity.zip`, async (zip) => {
    zip.file('README.txt', readme(model));
    zip.file('brand.json', brandJson(model));

    for (const logo of model.logo.variants) {
      const blob = await fetchAsBlob(logo.url);
      if (blob) {
        zip.file(`logos/${slugify(logo.def.label)}.${extensionOf(logo.url, logo.format)}`, blob);
      }
    }

    for (const colour of model.colour.colours) {
      zip.file(
        `colours/${slugify(colour.role)}-${colour.hex.replace('#', '')}.svg`,
        colourSvg(colour),
      );
    }

    for (const font of model.typography.fonts) {
      for (const file of font.files) {
        const blob = await fetchAsBlob(file.dataUrl);
        if (blob) zip.file(`fonts/${slugify(font.token.family)}/${file.name}`, blob);
      }
    }

    for (const image of model.photography.images) {
      const blob = await fetchAsBlob(image.url);
      if (blob) zip.file(`photography/${slugify(image.name)}`, blob);
    }

    for (const group of model.assets.groups) {
      for (const item of group.items) {
        const blob = await fetchAsBlob(item.url);
        if (blob) zip.file(`assets/${slugify(group.name)}/${slugify(item.name)}`, blob);
      }
    }
  });
}
