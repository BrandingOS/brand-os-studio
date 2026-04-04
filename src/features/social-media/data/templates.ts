import type { SocialTemplate, TemplateCategory } from '../types';

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  // ─── Quote Templates ──────────────────────────────────────
  {
    id: 'quote-minimal',
    name: 'Minimal Quote',
    category: 'quote',
    platforms: ['instagram', 'facebook', 'twitter', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['clean', 'typography', 'inspirational'],
    isPro: false,
    layout: {
      background: { type: 'brand-primary', value: '' },
      elements: [
        { type: 'text', position: { x: 10, y: 30 }, size: { width: 80, height: 30 }, content: '"Your quote here"', style: { fontSize: '28', fontWeight: '700', color: '#fff', textAlign: 'center' }, brandAware: true },
        { type: 'divider', position: { x: 40, y: 65 }, size: { width: 20, height: 2 } },
        { type: 'text', position: { x: 10, y: 72 }, size: { width: 80, height: 10 }, content: '— Author Name', style: { fontSize: '14', color: '#fff', textAlign: 'center', opacity: '0.8' } },
        { type: 'logo', position: { x: 38, y: 88 }, size: { width: 24, height: 8 }, brandAware: true },
      ],
    },
  },
  {
    id: 'quote-bold',
    name: 'Bold Quote',
    category: 'quote',
    platforms: ['instagram', 'facebook', 'twitter'],
    formats: ['post'],
    thumbnail: '',
    tags: ['bold', 'impact', 'dark'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#0A0A0F' },
      elements: [
        { type: 'shape', position: { x: 5, y: 5 }, size: { width: 90, height: 90 }, style: { border: '2px solid', borderColor: 'brand-primary', borderRadius: '16' } },
        { type: 'text', position: { x: 12, y: 25 }, size: { width: 76, height: 40 }, content: 'Your powerful quote goes here', style: { fontSize: '32', fontWeight: '800', color: '#fff', textTransform: 'uppercase' } },
        { type: 'logo', position: { x: 12, y: 82 }, size: { width: 20, height: 8 }, brandAware: true },
      ],
    },
  },
  {
    id: 'quote-gradient',
    name: 'Gradient Quote',
    category: 'quote',
    platforms: ['instagram', 'facebook'],
    formats: ['post', 'story'],
    thumbnail: '',
    tags: ['gradient', 'modern', 'vibrant'],
    isPro: false,
    layout: {
      background: { type: 'gradient', value: 'linear-gradient(135deg, brand-primary, brand-secondary)' },
      elements: [
        { type: 'text', position: { x: 10, y: 20 }, size: { width: 80, height: 10 }, content: '"', style: { fontSize: '72', color: '#fff', opacity: '0.3' } },
        { type: 'text', position: { x: 10, y: 35 }, size: { width: 80, height: 30 }, content: 'Your inspiring quote text', style: { fontSize: '24', fontWeight: '600', color: '#fff', lineHeight: '1.4' } },
        { type: 'text', position: { x: 10, y: 72 }, size: { width: 80, height: 8 }, content: 'Author Name | Title', style: { fontSize: '13', color: '#fff', opacity: '0.7' } },
        { type: 'logo', position: { x: 10, y: 88 }, size: { width: 18, height: 6 }, brandAware: true },
      ],
    },
  },

  // ─── Announcement Templates ────────────────────────────────
  {
    id: 'announce-launch',
    name: 'Product Launch',
    category: 'announcement',
    platforms: ['instagram', 'facebook', 'twitter', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['launch', 'new', 'product'],
    isPro: false,
    layout: {
      background: { type: 'brand-primary', value: '' },
      elements: [
        { type: 'text', position: { x: 10, y: 15 }, size: { width: 80, height: 8 }, content: 'INTRODUCING', style: { fontSize: '12', letterSpacing: '4', color: '#fff', opacity: '0.7', textTransform: 'uppercase' } },
        { type: 'text', position: { x: 10, y: 28 }, size: { width: 80, height: 25 }, content: 'Product Name', style: { fontSize: '36', fontWeight: '800', color: '#fff' } },
        { type: 'text', position: { x: 10, y: 58 }, size: { width: 70, height: 15 }, content: 'Brief description of the product and what makes it special.', style: { fontSize: '15', color: '#fff', opacity: '0.85', lineHeight: '1.5' } },
        { type: 'shape', position: { x: 10, y: 80 }, size: { width: 35, height: 8 }, style: { backgroundColor: '#fff', borderRadius: '99', padding: '8 16' }, content: 'Learn More' },
        { type: 'logo', position: { x: 70, y: 88 }, size: { width: 20, height: 6 }, brandAware: true },
      ],
    },
  },
  {
    id: 'announce-event',
    name: 'Event Announcement',
    category: 'event',
    platforms: ['instagram', 'facebook', 'linkedin'],
    formats: ['post', 'story'],
    thumbnail: '',
    tags: ['event', 'webinar', 'conference'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#0A0A0F' },
      elements: [
        { type: 'text', position: { x: 10, y: 10 }, size: { width: 80, height: 6 }, content: 'YOU\'RE INVITED', style: { fontSize: '11', letterSpacing: '3', color: 'brand-primary', textTransform: 'uppercase' } },
        { type: 'text', position: { x: 10, y: 22 }, size: { width: 80, height: 20 }, content: 'Event Title Here', style: { fontSize: '32', fontWeight: '700', color: '#fff' } },
        { type: 'divider', position: { x: 10, y: 48 }, size: { width: 20, height: 2 }, style: { backgroundColor: 'brand-primary' } },
        { type: 'text', position: { x: 10, y: 55 }, size: { width: 40, height: 6 }, content: 'Date & Time', style: { fontSize: '14', fontWeight: '600', color: '#fff' } },
        { type: 'text', position: { x: 10, y: 63 }, size: { width: 40, height: 6 }, content: 'Location / Online', style: { fontSize: '13', color: '#fff', opacity: '0.6' } },
        { type: 'shape', position: { x: 10, y: 78 }, size: { width: 30, height: 8 }, style: { backgroundColor: 'brand-primary', borderRadius: '99' }, content: 'Register Now' },
        { type: 'logo', position: { x: 10, y: 90 }, size: { width: 16, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Promotion Templates ───────────────────────────────────
  {
    id: 'promo-sale',
    name: 'Sale Promotion',
    category: 'promotion',
    platforms: ['instagram', 'facebook'],
    formats: ['post', 'story'],
    thumbnail: '',
    tags: ['sale', 'discount', 'offer'],
    isPro: false,
    layout: {
      background: { type: 'brand-primary', value: '' },
      elements: [
        { type: 'text', position: { x: 10, y: 15 }, size: { width: 80, height: 30 }, content: '50% OFF', style: { fontSize: '64', fontWeight: '900', color: '#fff' } },
        { type: 'text', position: { x: 10, y: 50 }, size: { width: 60, height: 10 }, content: 'Everything Must Go', style: { fontSize: '20', fontWeight: '600', color: '#fff', opacity: '0.9' } },
        { type: 'text', position: { x: 10, y: 64 }, size: { width: 50, height: 8 }, content: 'Use code: SAVE50', style: { fontSize: '14', color: '#fff', opacity: '0.7' } },
        { type: 'shape', position: { x: 10, y: 78 }, size: { width: 30, height: 8 }, style: { backgroundColor: '#fff', borderRadius: '99' }, content: 'Shop Now' },
        { type: 'logo', position: { x: 72, y: 88 }, size: { width: 18, height: 6 }, brandAware: true },
      ],
    },
  },
  {
    id: 'promo-flash',
    name: 'Flash Sale',
    category: 'promotion',
    platforms: ['instagram', 'facebook', 'twitter'],
    formats: ['post', 'story'],
    thumbnail: '',
    tags: ['flash', 'urgent', 'limited'],
    isPro: false,
    layout: {
      background: { type: 'gradient', value: 'linear-gradient(135deg, #FF4444, brand-primary)' },
      elements: [
        { type: 'text', position: { x: 10, y: 10 }, size: { width: 80, height: 8 }, content: 'FLASH SALE', style: { fontSize: '14', letterSpacing: '6', color: '#fff', textTransform: 'uppercase' } },
        { type: 'text', position: { x: 10, y: 25 }, size: { width: 80, height: 35 }, content: 'LIMITED TIME OFFER', style: { fontSize: '42', fontWeight: '900', color: '#fff', textTransform: 'uppercase' } },
        { type: 'text', position: { x: 10, y: 68 }, size: { width: 60, height: 10 }, content: 'Ends tonight at midnight', style: { fontSize: '16', color: '#fff', opacity: '0.9' } },
        { type: 'logo', position: { x: 10, y: 88 }, size: { width: 16, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Tips / Educational Templates ──────────────────────────
  {
    id: 'tips-numbered',
    name: 'Numbered Tips',
    category: 'tips',
    platforms: ['instagram', 'linkedin', 'twitter'],
    formats: ['post'],
    thumbnail: '',
    tags: ['tips', 'list', 'educational'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#FAFAFA' },
      elements: [
        { type: 'text', position: { x: 8, y: 8 }, size: { width: 84, height: 10 }, content: '5 Tips for Success', style: { fontSize: '24', fontWeight: '700', color: '#0A0A0F' } },
        { type: 'divider', position: { x: 8, y: 22 }, size: { width: 84, height: 1 }, style: { backgroundColor: '#E5E5E5' } },
        { type: 'text', position: { x: 8, y: 28 }, size: { width: 84, height: 8 }, content: '01  First tip goes here', style: { fontSize: '14', color: '#333' } },
        { type: 'text', position: { x: 8, y: 38 }, size: { width: 84, height: 8 }, content: '02  Second tip goes here', style: { fontSize: '14', color: '#333' } },
        { type: 'text', position: { x: 8, y: 48 }, size: { width: 84, height: 8 }, content: '03  Third tip goes here', style: { fontSize: '14', color: '#333' } },
        { type: 'text', position: { x: 8, y: 58 }, size: { width: 84, height: 8 }, content: '04  Fourth tip goes here', style: { fontSize: '14', color: '#333' } },
        { type: 'text', position: { x: 8, y: 68 }, size: { width: 84, height: 8 }, content: '05  Fifth tip goes here', style: { fontSize: '14', color: '#333' } },
        { type: 'logo', position: { x: 8, y: 88 }, size: { width: 16, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Stats / Data Templates ────────────────────────────────
  {
    id: 'stats-highlight',
    name: 'Stats Highlight',
    category: 'stats',
    platforms: ['instagram', 'linkedin', 'twitter'],
    formats: ['post'],
    thumbnail: '',
    tags: ['data', 'numbers', 'metrics'],
    isPro: false,
    layout: {
      background: { type: 'brand-primary', value: '' },
      elements: [
        { type: 'text', position: { x: 10, y: 20 }, size: { width: 80, height: 30 }, content: '93%', style: { fontSize: '72', fontWeight: '900', color: '#fff' } },
        { type: 'text', position: { x: 10, y: 55 }, size: { width: 70, height: 15 }, content: 'of customers saw improvement in their first month', style: { fontSize: '18', color: '#fff', opacity: '0.9', lineHeight: '1.4' } },
        { type: 'text', position: { x: 10, y: 78 }, size: { width: 50, height: 6 }, content: 'Source: Internal Study 2026', style: { fontSize: '11', color: '#fff', opacity: '0.5' } },
        { type: 'logo', position: { x: 10, y: 88 }, size: { width: 16, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Testimonial Templates ─────────────────────────────────
  {
    id: 'testimonial-card',
    name: 'Testimonial Card',
    category: 'testimonial',
    platforms: ['instagram', 'facebook', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['review', 'customer', 'social-proof'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#FAFAFA' },
      elements: [
        { type: 'shape', position: { x: 8, y: 8 }, size: { width: 84, height: 84 }, style: { backgroundColor: '#fff', borderRadius: '16', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } },
        { type: 'text', position: { x: 14, y: 20 }, size: { width: 72, height: 6 }, content: '"', style: { fontSize: '48', color: 'brand-primary', opacity: '0.3' } },
        { type: 'text', position: { x: 14, y: 32 }, size: { width: 72, height: 25 }, content: 'This product completely transformed how we handle branding. Highly recommended!', style: { fontSize: '18', fontWeight: '500', color: '#333', lineHeight: '1.5' } },
        { type: 'divider', position: { x: 14, y: 65 }, size: { width: 72, height: 1 } },
        { type: 'text', position: { x: 14, y: 72 }, size: { width: 72, height: 6 }, content: 'Jane Doe, CEO at Company', style: { fontSize: '13', fontWeight: '600', color: '#666' } },
        { type: 'logo', position: { x: 14, y: 82 }, size: { width: 14, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Minimal Templates ─────────────────────────────────────
  {
    id: 'minimal-clean',
    name: 'Clean Minimal',
    category: 'minimal',
    platforms: ['instagram', 'twitter', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['clean', 'white', 'simple'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#FFFFFF' },
      elements: [
        { type: 'text', position: { x: 15, y: 35 }, size: { width: 70, height: 20 }, content: 'Your message here', style: { fontSize: '22', fontWeight: '600', color: '#0A0A0F', textAlign: 'center' } },
        { type: 'text', position: { x: 15, y: 58 }, size: { width: 70, height: 10 }, content: 'Supporting text goes below', style: { fontSize: '14', color: '#666', textAlign: 'center' } },
        { type: 'logo', position: { x: 38, y: 85 }, size: { width: 24, height: 8 }, brandAware: true },
      ],
    },
  },
  {
    id: 'minimal-dark',
    name: 'Dark Minimal',
    category: 'minimal',
    platforms: ['instagram', 'twitter', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['dark', 'elegant', 'simple'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#0A0A0F' },
      elements: [
        { type: 'text', position: { x: 15, y: 35 }, size: { width: 70, height: 20 }, content: 'Your message here', style: { fontSize: '22', fontWeight: '600', color: '#FFFFFF', textAlign: 'center' } },
        { type: 'text', position: { x: 15, y: 58 }, size: { width: 70, height: 10 }, content: 'Supporting text goes below', style: { fontSize: '14', color: '#999', textAlign: 'center' } },
        { type: 'logo', position: { x: 38, y: 85 }, size: { width: 24, height: 8 }, brandAware: true },
      ],
    },
  },

  // ─── Bold Templates ────────────────────────────────────────
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    category: 'bold',
    platforms: ['instagram', 'facebook', 'twitter'],
    formats: ['post'],
    thumbnail: '',
    tags: ['bold', 'statement', 'impact'],
    isPro: false,
    layout: {
      background: { type: 'brand-primary', value: '' },
      elements: [
        { type: 'text', position: { x: 8, y: 15 }, size: { width: 84, height: 50 }, content: 'MAKE A BOLD STATEMENT', style: { fontSize: '48', fontWeight: '900', color: '#fff', textTransform: 'uppercase', lineHeight: '1.1' } },
        { type: 'text', position: { x: 8, y: 72 }, size: { width: 60, height: 10 }, content: 'Supporting detail text here', style: { fontSize: '14', color: '#fff', opacity: '0.7' } },
        { type: 'logo', position: { x: 8, y: 88 }, size: { width: 16, height: 5 }, brandAware: true },
      ],
    },
  },

  // ─── Team / Culture ────────────────────────────────────────
  {
    id: 'team-spotlight',
    name: 'Team Spotlight',
    category: 'team',
    platforms: ['instagram', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['team', 'people', 'culture'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#FAFAFA' },
      elements: [
        { type: 'text', position: { x: 10, y: 10 }, size: { width: 80, height: 6 }, content: 'MEET THE TEAM', style: { fontSize: '11', letterSpacing: '3', color: 'brand-primary', textTransform: 'uppercase' } },
        { type: 'image', position: { x: 10, y: 20 }, size: { width: 80, height: 45 }, style: { borderRadius: '12', objectFit: 'cover' } },
        { type: 'text', position: { x: 10, y: 70 }, size: { width: 80, height: 8 }, content: 'John Smith', style: { fontSize: '20', fontWeight: '700', color: '#0A0A0F' } },
        { type: 'text', position: { x: 10, y: 80 }, size: { width: 80, height: 6 }, content: 'Head of Design', style: { fontSize: '14', color: '#666' } },
        { type: 'logo', position: { x: 72, y: 88 }, size: { width: 18, height: 6 }, brandAware: true },
      ],
    },
  },

  // ─── Product Templates ─────────────────────────────────────
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    category: 'product',
    platforms: ['instagram', 'facebook'],
    formats: ['post'],
    thumbnail: '',
    tags: ['product', 'showcase', 'feature'],
    isPro: true,
    layout: {
      background: { type: 'solid', value: '#F5F5F0' },
      elements: [
        { type: 'image', position: { x: 10, y: 8 }, size: { width: 80, height: 55 }, style: { borderRadius: '16', objectFit: 'cover' } },
        { type: 'text', position: { x: 10, y: 68 }, size: { width: 60, height: 8 }, content: 'Product Name', style: { fontSize: '22', fontWeight: '700', color: '#0A0A0F' } },
        { type: 'text', position: { x: 10, y: 78 }, size: { width: 60, height: 6 }, content: '$99.00', style: { fontSize: '16', fontWeight: '600', color: 'brand-primary' } },
        { type: 'logo', position: { x: 72, y: 88 }, size: { width: 18, height: 6 }, brandAware: true },
      ],
    },
  },

  // ─── Story Templates ───────────────────────────────────────
  {
    id: 'story-gradient-cta',
    name: 'Gradient CTA Story',
    category: 'gradient',
    platforms: ['instagram', 'facebook', 'tiktok'],
    formats: ['story'],
    thumbnail: '',
    tags: ['story', 'cta', 'gradient'],
    isPro: false,
    layout: {
      background: { type: 'gradient', value: 'linear-gradient(180deg, brand-primary, #0A0A0F)' },
      elements: [
        { type: 'logo', position: { x: 10, y: 5 }, size: { width: 20, height: 5 }, brandAware: true },
        { type: 'text', position: { x: 8, y: 30 }, size: { width: 84, height: 25 }, content: 'Your Headline Here', style: { fontSize: '36', fontWeight: '800', color: '#fff', lineHeight: '1.2' } },
        { type: 'text', position: { x: 8, y: 58 }, size: { width: 70, height: 12 }, content: 'Add a compelling description that drives action.', style: { fontSize: '16', color: '#fff', opacity: '0.8', lineHeight: '1.5' } },
        { type: 'shape', position: { x: 8, y: 78 }, size: { width: 40, height: 6 }, style: { backgroundColor: '#fff', borderRadius: '99' }, content: 'Swipe Up' },
      ],
    },
  },
  {
    id: 'story-minimal-poll',
    name: 'Minimal Poll Story',
    category: 'minimal',
    platforms: ['instagram', 'facebook'],
    formats: ['story'],
    thumbnail: '',
    tags: ['story', 'poll', 'engagement'],
    isPro: false,
    layout: {
      background: { type: 'solid', value: '#FFFFFF' },
      elements: [
        { type: 'logo', position: { x: 10, y: 5 }, size: { width: 16, height: 4 }, brandAware: true },
        { type: 'text', position: { x: 8, y: 25 }, size: { width: 84, height: 15 }, content: 'Which do you prefer?', style: { fontSize: '28', fontWeight: '700', color: '#0A0A0F', textAlign: 'center' } },
        { type: 'shape', position: { x: 10, y: 50 }, size: { width: 80, height: 10 }, style: { backgroundColor: 'brand-primary', borderRadius: '12', padding: '12' }, content: 'Option A' },
        { type: 'shape', position: { x: 10, y: 64 }, size: { width: 80, height: 10 }, style: { backgroundColor: '#F0F0F0', borderRadius: '12', padding: '12' }, content: 'Option B' },
      ],
    },
  },

  // ─── Cover Templates ───────────────────────────────────────
  {
    id: 'cover-brand-gradient',
    name: 'Brand Gradient Cover',
    category: 'gradient',
    platforms: ['facebook', 'twitter', 'linkedin', 'youtube'],
    formats: ['cover', 'banner'],
    thumbnail: '',
    tags: ['cover', 'banner', 'brand'],
    isPro: false,
    layout: {
      background: { type: 'gradient', value: 'linear-gradient(135deg, brand-primary, brand-secondary)' },
      elements: [
        { type: 'logo', position: { x: 5, y: 30 }, size: { width: 15, height: 12 }, brandAware: true },
        { type: 'text', position: { x: 25, y: 28 }, size: { width: 50, height: 15 }, content: 'Your Brand Tagline', style: { fontSize: '24', fontWeight: '700', color: '#fff' } },
        { type: 'text', position: { x: 25, y: 50 }, size: { width: 50, height: 10 }, content: 'website.com', style: { fontSize: '14', color: '#fff', opacity: '0.7' } },
      ],
    },
  },
  {
    id: 'cover-photo-overlay',
    name: 'Photo Overlay Cover',
    category: 'photo',
    platforms: ['facebook', 'twitter', 'linkedin'],
    formats: ['cover', 'banner'],
    thumbnail: '',
    tags: ['cover', 'photo', 'overlay'],
    isPro: true,
    layout: {
      background: { type: 'image', value: '', opacity: 0.4 },
      elements: [
        { type: 'logo', position: { x: 5, y: 25 }, size: { width: 12, height: 10 }, brandAware: true },
        { type: 'text', position: { x: 22, y: 25 }, size: { width: 55, height: 15 }, content: 'Your Brand Name', style: { fontSize: '28', fontWeight: '800', color: '#fff' } },
        { type: 'text', position: { x: 22, y: 48 }, size: { width: 55, height: 8 }, content: 'Tagline or slogan goes here', style: { fontSize: '14', color: '#fff', opacity: '0.8' } },
      ],
    },
  },

  // ─── Carousel Templates ────────────────────────────────────
  {
    id: 'carousel-tips',
    name: 'Tips Carousel',
    category: 'carousel',
    platforms: ['instagram', 'linkedin'],
    formats: ['post'],
    thumbnail: '',
    tags: ['carousel', 'swipe', 'educational'],
    isPro: true,
    layout: {
      background: { type: 'solid', value: '#FFFFFF' },
      elements: [
        { type: 'text', position: { x: 10, y: 10 }, size: { width: 80, height: 6 }, content: 'SWIPE FOR MORE', style: { fontSize: '11', letterSpacing: '3', color: 'brand-primary' } },
        { type: 'text', position: { x: 10, y: 22 }, size: { width: 80, height: 15 }, content: 'Slide Title', style: { fontSize: '28', fontWeight: '700', color: '#0A0A0F' } },
        { type: 'text', position: { x: 10, y: 45 }, size: { width: 80, height: 25 }, content: 'Content for this slide goes here. Make it informative and engaging.', style: { fontSize: '16', color: '#333', lineHeight: '1.6' } },
        { type: 'text', position: { x: 10, y: 82 }, size: { width: 30, height: 6 }, content: '1 / 5', style: { fontSize: '12', color: '#999' } },
        { type: 'logo', position: { x: 72, y: 88 }, size: { width: 18, height: 6 }, brandAware: true },
      ],
    },
  },
];

export function getTemplatesByCategory(category: TemplateCategory): SocialTemplate[] {
  return SOCIAL_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesForPlatform(platform: string): SocialTemplate[] {
  return SOCIAL_TEMPLATES.filter(t => t.platforms.includes(platform as any));
}

export function getTemplatesForFormat(format: string): SocialTemplate[] {
  return SOCIAL_TEMPLATES.filter(t => t.formats.includes(format as any));
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'quote', label: 'Quotes' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'promotion', label: 'Promotions' },
  { id: 'product', label: 'Products' },
  { id: 'event', label: 'Events' },
  { id: 'tips', label: 'Tips & Education' },
  { id: 'stats', label: 'Stats & Data' },
  { id: 'team', label: 'Team & Culture' },
  { id: 'testimonial', label: 'Testimonials' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'photo', label: 'Photo' },
  { id: 'carousel', label: 'Carousel' },
];
