/**
 * The size table, and the files it produces.
 *
 * Two different claims are checked here and they fail in different ways.
 * The TABLE is knowledge — a LinkedIn banner is 1584×396 and its lower
 * left is covered by the profile card — and a wrong number there ships a
 * design with the headline under an avatar. The PACK is plumbing, and its
 * failure is quieter: a slot rendered at the wrong size, or a file whose
 * name promises a size the bytes do not have.
 *
 * So every produced file is opened and its IHDR read. The name says
 * `1080x1920`; the pixels have to agree.
 */
import { describe, it, expect } from 'vitest';
import {
  SOCIAL_SIZES,
  PROFILE_SLOTS,
  socialSlot,
  slotsForPlatform,
  fileName,
  buildSocialSizePack,
  buildProfilePack,
  type SlotRenderer,
} from '../socialSizes';
import { bytesOf } from '../bytes';
import { readPngSize } from '../png';
import { pngBlob } from './pngFixture';

/** A rasteriser that answers with a real PNG at exactly the frame asked for. */
const render: SlotRenderer = async (_png, frame) => pngBlob(frame.width, frame.height);

/** The same, for `resizePng`'s `CustomSize` shape. */
const resize = async (_png: Blob, size: { width: number; height?: number }) =>
  pngBlob(size.width, size.height ?? size.width);

/** Every slot the spec names, with the number that has to be right. */
const REQUIRED: Array<[string, number, number]> = [
  ['instagram-post', 1080, 1080],
  ['instagram-story', 1080, 1920],
  ['facebook-cover', 820, 312],
  ['facebook-cover-2x', 1640, 624],
  ['linkedin-banner', 1584, 396],
  ['linkedin-company', 1128, 191],
  ['x-header', 1500, 500],
  ['youtube-banner', 2560, 1440],
  ['tiktok-profile', 400, 400],
  ['instagram-profile', 400, 400],
  ['app-store-icon', 1024, 1024],
];

describe('SOCIAL_SIZES — the knowledge', () => {
  it.each(REQUIRED)('%s is %i×%i', (id, width, height) => {
    const slot = socialSlot(id);
    expect(slot, `no slot named ${id}`).toBeDefined();
    expect({ width: slot!.width, height: slot!.height }).toEqual({ width, height });
  });

  it('covers every platform the kit claims to know', () => {
    const platforms = new Set(SOCIAL_SIZES.map((s) => s.platform));
    for (const platform of ['Instagram', 'Facebook', 'LinkedIn', 'X', 'YouTube', 'TikTok', 'App Store']) {
      expect(platforms.has(platform), `no slot for ${platform}`).toBe(true);
    }
    expect(slotsForPlatform('facebook').map((s) => s.id)).toEqual([
      'facebook-cover',
      'facebook-cover-2x',
    ]);
    expect(slotsForPlatform('instagram')).toHaveLength(3);
  });

  it('has a unique id per slot and a positive size', () => {
    const ids = SOCIAL_SIZES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const slot of SOCIAL_SIZES) {
      expect(slot.width).toBeGreaterThan(0);
      expect(slot.height).toBeGreaterThan(0);
      expect(slot.platform.length).toBeGreaterThan(0);
      expect(slot.slot.length).toBeGreaterThan(0);
    }
  });

  it('every safe area lies inside its own frame', () => {
    for (const slot of SOCIAL_SIZES) {
      if (!slot.safe) continue;
      const { x, y, width, height } = slot.safe;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(slot.width);
      expect(y + height).toBeLessThanOrEqual(slot.height);
    }
  });

  it('the YouTube banner names the phone crop, centred', () => {
    const slot = socialSlot('youtube-banner')!;
    // The one size everyone gets wrong: uploaded at 2560×1440, only the
    // central 1546×423 survives on a phone.
    expect(slot.safe).toEqual({ x: 507, y: 509, width: 1546, height: 423 });
    expect(slot.note).toContain('1546');
  });

  it('names a safe area everywhere something covers the artwork', () => {
    for (const id of ['instagram-story', 'linkedin-banner', 'x-header', 'youtube-banner']) {
      expect(socialSlot(id)!.safe, `${id} has no safe area`).toBeDefined();
    }
    // A square post is not cropped by anything, so claiming a safe area
    // there would be inventing a constraint.
    expect(socialSlot('instagram-post')!.safe).toBeUndefined();
  });

  it('PROFILE_SLOTS is exactly the square slots', () => {
    expect(PROFILE_SLOTS.map((s) => s.id).sort()).toEqual([
      'app-store-icon',
      'instagram-post',
      'instagram-profile',
      'tiktok-profile',
    ]);
  });

  it('puts the size in the file name', () => {
    expect(fileName(socialSlot('instagram-story')!)).toBe('instagram-story-1080x1920.png');
  });
});

describe('buildSocialSizePack — the files', () => {
  it('produces one PNG per slot at EXACTLY the declared size', async () => {
    const files = await buildSocialSizePack(pngBlob(1080, 1080), SOCIAL_SIZES, { render });
    expect(files).toHaveLength(SOCIAL_SIZES.length);
    for (let i = 0; i < files.length; i += 1) {
      const slot = SOCIAL_SIZES[i];
      const bytes = await bytesOf(files[i].blob);
      expect(readPngSize(bytes), `${slot.id} is not a PNG`).toEqual({
        width: slot.width,
        height: slot.height,
      });
      // The name must not be able to disagree with the bytes.
      expect(files[i].path).toBe(`${slot.id}-${slot.width}x${slot.height}.png`);
    }
  });

  it('takes a single slot, or a slot id, and files under a folder', async () => {
    const one = await buildSocialSizePack(pngBlob(8, 8), 'x-header', {
      render,
      folder: 'social',
    });
    expect(one.map((f) => f.path)).toEqual(['social/x-header-1500x500.png']);
    expect(readPngSize(await bytesOf(one[0].blob))).toEqual({ width: 1500, height: 500 });
  });

  it('refuses a slot it does not know rather than writing an empty file', async () => {
    await expect(
      buildSocialSizePack(pngBlob(8, 8), 'myspace-header', { render }),
    ).rejects.toThrow(/myspace-header/);
  });
});

describe('buildProfilePack — a mark on each ground', () => {
  it('renders every square slot on every ground, foldered by ground', async () => {
    const files = await buildProfilePack(pngBlob(512, 512), ['#2550E3', 'transparent'], {
      resize,
      folder: 'profile',
    });
    expect(files).toHaveLength(PROFILE_SLOTS.length * 2);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('profile/2550e3/app-store-icon-1024x1024.png');
    expect(paths).toContain('profile/transparent/tiktok-profile-400x400.png');
    for (const file of files) {
      const size = readPngSize(await bytesOf(file.blob))!;
      expect(size.width).toBe(size.height);
      expect(file.path).toContain(`${size.width}x${size.height}`);
    }
  });

  it('falls back to a transparent ground when none were offered', async () => {
    const files = await buildProfilePack(pngBlob(64, 64), [], {
      resize,
      slots: ['instagram-profile'],
    });
    expect(files.map((f) => f.path)).toEqual(['transparent/instagram-profile-400x400.png']);
  });

  it('pads the mark, and never past the clamp', async () => {
    const seen: number[] = [];
    await buildProfilePack(pngBlob(64, 64), ['#000000'], {
      slots: ['app-store-icon'],
      padding: 5,
      resize: async (_png, size) => {
        seen.push(size.padding ?? 0);
        return pngBlob(size.width, size.height ?? size.width);
      },
    });
    // 0.4 of 1024, not five times it.
    expect(seen).toEqual([410]);
  });
});
