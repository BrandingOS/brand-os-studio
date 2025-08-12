import type { Brand } from '@/shared/types/brand';

export const demoBrandIdentity: Brand = {
  id: 'demo-brand-1',
  name: 'TechFlow Solutions',
  logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center',
  primaryColor: '#2563eb', // Blue
  secondaryColor: '#f59e0b', // Amber
  fonts: {
    primary: 'Inter',
    secondary: 'Poppins',
  },
  tone: 'Professional & Innovative',
  audience: 'Tech-savvy businesses and startups',
  strategy: 'Positioning as a cutting-edge technology solutions provider that delivers innovation with reliability.',
  guidelines: {
    strategy: 'TechFlow Solutions represents the perfect blend of innovation and reliability in the technology sector.',
    logoSystem: 'The logo should always maintain clear space and can be used in primary blue or white variants.',
    colorPalette: {
      primary: '#2563eb',
      secondary: '#f59e0b',
      accent: '#06b6d4',
      neutral: ['#f8fafc', '#e2e8f0', '#94a3b8', '#475569', '#1e293b'],
    },
    typography: {
      primary: {
        family: 'Inter',
        weights: [400, 500, 600, 700],
        fallbacks: ['system-ui', 'sans-serif'],
      },
      secondary: {
        family: 'Poppins',
        weights: [300, 400, 600],
        fallbacks: ['system-ui', 'sans-serif'],
      },
      scale: {
        h1: '2.5rem/1.2',
        h2: '2rem/1.3',
        h3: '1.5rem/1.4',
        body: '1rem/1.6',
        caption: '0.875rem/1.5',
      },
    },
    voiceAndTone: 'Professional yet approachable, confident but not arrogant, innovative while remaining trustworthy.',
    applications: 'Consistent use across all digital and print materials, maintaining brand integrity in all contexts.',
  },
  assets: [
    {
      id: 'logo-primary',
      name: 'Primary Logo',
      type: 'logo',
      url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
      size: 125000,
      tags: ['logo', 'primary', 'brand'],
      createdAt: new Date(),
    },
    {
      id: 'business-card-template',
      name: 'Business Card Template',
      type: 'document',
      url: '/templates/business-card.pdf',
      size: 245000,
      tags: ['business-card', 'template', 'print'],
      createdAt: new Date(),
    },
  ],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
};

export const demoOnboardingAnswers = {
  'brand-name': 'TechFlow Solutions',
  'logo-upload': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center',
  'primary-color': '#2563eb',
  'secondary-color': '#f59e0b',
  'primary-font': 'Inter',
  'secondary-font': 'Poppins',
  'tone': 'Professional & Innovative',
  'audience': 'Tech-savvy businesses and startups',
};