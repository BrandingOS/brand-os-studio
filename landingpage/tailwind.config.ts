import type { Config } from 'tailwindcss';

/**
 * BrandingOS landing — identity tokens.
 *
 * The identity is strictly neutral: ink (#0B0B0B) on paper (#F7F6F3),
 * plus pure white for elevated surfaces. No colour, ever — the only
 * colour on screen should be the user's brand, inside product imagery.
 *
 * Type: Funnel Display (display, 700, tight) · Funnel Sans (body/UI)
 *       Doto (technical microlabels — echoes the 9-dot logomark)
 *       Newsreader italic (rare editorial accent)
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Semantic aliases used across sections
        ink: 'hsl(var(--ink))',
        paper: 'hsl(var(--paper))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        panel: {
          DEFAULT: 'hsl(var(--panel) / <alpha-value>)',
          foreground: 'hsl(var(--panel-foreground) / <alpha-value>)',
        },
        // Legacy alias kept for MultiStepEarlyAccess — now maps to ink.
        'accent-pop': {
          DEFAULT: 'hsl(var(--accent-pop))',
          foreground: 'hsl(var(--accent-pop-fg))',
          soft: 'hsl(var(--accent-pop-soft))',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      transitionTimingFunction: {
        // --ds-ease: the system's one easing
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
