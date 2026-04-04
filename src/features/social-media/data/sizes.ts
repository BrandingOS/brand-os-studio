import type { SocialMediaSize } from '../types';

export const SOCIAL_MEDIA_SIZES: SocialMediaSize[] = [
  // Instagram
  { platform: 'instagram', format: 'post', label: 'Instagram Post', width: 1080, height: 1080 },
  { platform: 'instagram', format: 'story', label: 'Instagram Story', width: 1080, height: 1920 },
  { platform: 'instagram', format: 'reel', label: 'Instagram Reel Cover', width: 1080, height: 1920 },
  { platform: 'instagram', format: 'profile', label: 'Instagram Profile', width: 320, height: 320 },

  // Facebook
  { platform: 'facebook', format: 'post', label: 'Facebook Post', width: 1200, height: 630 },
  { platform: 'facebook', format: 'cover', label: 'Facebook Cover', width: 1640, height: 624 },
  { platform: 'facebook', format: 'story', label: 'Facebook Story', width: 1080, height: 1920 },
  { platform: 'facebook', format: 'profile', label: 'Facebook Profile', width: 170, height: 170 },

  // Twitter / X
  { platform: 'twitter', format: 'post', label: 'Twitter / X Post', width: 1200, height: 675 },
  { platform: 'twitter', format: 'cover', label: 'Twitter / X Banner', width: 1500, height: 500 },
  { platform: 'twitter', format: 'profile', label: 'Twitter / X Profile', width: 400, height: 400 },

  // LinkedIn
  { platform: 'linkedin', format: 'post', label: 'LinkedIn Post', width: 1200, height: 627 },
  { platform: 'linkedin', format: 'cover', label: 'LinkedIn Cover', width: 1584, height: 396 },
  { platform: 'linkedin', format: 'banner', label: 'LinkedIn Company Banner', width: 1128, height: 191 },
  { platform: 'linkedin', format: 'profile', label: 'LinkedIn Profile', width: 400, height: 400 },

  // TikTok
  { platform: 'tiktok', format: 'post', label: 'TikTok Video Cover', width: 1080, height: 1920 },
  { platform: 'tiktok', format: 'profile', label: 'TikTok Profile', width: 200, height: 200 },

  // YouTube
  { platform: 'youtube', format: 'cover', label: 'YouTube Channel Art', width: 2560, height: 1440 },
  { platform: 'youtube', format: 'post', label: 'YouTube Thumbnail', width: 1280, height: 720 },
  { platform: 'youtube', format: 'profile', label: 'YouTube Profile', width: 800, height: 800 },

  // Pinterest
  { platform: 'pinterest', format: 'pin', label: 'Pinterest Pin', width: 1000, height: 1500 },
  { platform: 'pinterest', format: 'profile', label: 'Pinterest Profile', width: 165, height: 165 },
];

export function getSizesForPlatform(platform: string): SocialMediaSize[] {
  return SOCIAL_MEDIA_SIZES.filter(s => s.platform === platform);
}

export function getSizeForFormat(platform: string, format: string): SocialMediaSize | undefined {
  return SOCIAL_MEDIA_SIZES.find(s => s.platform === platform && s.format === format);
}
