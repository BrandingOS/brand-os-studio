# BrandingOS — Landing Page (standalone)

A self-contained Vite + React + TypeScript + Tailwind project. Deploy this
folder alone to publish the public landing page without shipping the rest
of the BrandingOS app.

The only call-to-action is **early access** (email signup). No dashboard,
no auth, no pricing.

## Quick start

```bash
cd landingpage
bun install      # or: npm install / pnpm install
bun dev          # or: npm run dev
```

Open http://localhost:5174.

## Build & preview

```bash
bun run build    # output goes to landingpage/dist
bun run preview  # serves the built artifact on http://localhost:4174
```

## Deploy

This is a static SPA. It deploys cleanly to anywhere that serves static
files. Pick one:

### Vercel
```bash
cd landingpage
vercel
```
- Framework preset: **Vite**
- Build command: `bun run build` (or `npm run build`)
- Output directory: `dist`
- Root directory: `landingpage` (if deploying from a monorepo)

### Netlify
```bash
cd landingpage
netlify deploy --prod
```
- Build command: `bun run build`
- Publish directory: `landingpage/dist`

### Cloudflare Pages
- Build command: `bun run build`
- Build output directory: `dist`
- Root directory (advanced): `landingpage`

### GitHub Pages
```bash
cd landingpage
bun run build
# Push the contents of dist/ to a branch served by Pages.
```

### Drag-and-drop (cheapest, fastest)
```bash
cd landingpage
bun run build
```
Then drop `landingpage/dist` onto https://app.netlify.com/drop.

## Wiring up the early-access form

By default, submitted emails are stored in the browser's `localStorage`
under the key `brandos:early-access-emails`. **You must replace this
with a real backend before launch.** Open
`src/components/EarlyAccessForm.tsx` and uncomment one of the four
options at the top of `submitEmail()`:

| Provider | Best for | Setup |
|---|---|---|
| **Formspree** | Quickest, no backend needed | Create form → paste form ID |
| **Resend Audiences** | Transactional + email lists, by Vercel | Needs an API route at `/api/early-access` |
| **Supabase** | If you already use Supabase | Create `early_access` table, paste anon key |
| **Mailchimp / ConvertKit / Beehiiv** | If you already have a list | Replace the form with their embed snippet |

If you want zero backend at all, you can also wire the form to a
`mailto:` link or to a Google Form by replacing the entire
`EarlyAccessForm` component.

## Environment variables

There are none by default. Add them to a `.env.local` file at the root
of `landingpage/` and access them via `import.meta.env.VITE_*` if you
need to configure your backend hookup.

Example:
```
VITE_FORMSPREE_ID=xxxxx
```

## Project layout

```
landingpage/
├── README.md              ← you are here
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css          ← self-contained Tailwind + custom utilities
    ├── lib/utils.ts       ← cn() helper
    ├── hooks/useScrollReveal.ts
    ├── types/index.ts
    ├── data/content.ts    ← all marketing copy + image imports
    ├── assets/            ← illustration .webp files
    └── components/
        ├── ui/
        │   ├── button.tsx
        │   ├── input.tsx
        │   └── badge.tsx
        ├── EarlyAccessForm.tsx       ← THE main CTA — wire backend here
        ├── Navbar.tsx
        ├── Footer.tsx
        ├── HeroSection.tsx
        ├── MarqueeSection.tsx
        ├── PainPointsSection.tsx
        ├── SectionSplit.tsx
        ├── SetupSection.tsx
        ├── ProductModuleCard.tsx
        ├── ProductModulesSection.tsx
        ├── StatCard.tsx
        ├── StatisticsSection.tsx
        ├── FeatureCard.tsx
        └── FinalCTASection.tsx
```

## What's different from the version inside the main BrandingOS app

The main app's landing page (`src/pages/Index.tsx`) imports auth, the
onboarding store, and a Pricing section, all of which only make sense
when the full app is shipping. This standalone copy strips those:

- ❌ No auth modal, no sign-in button → ✅ "Get Early Access" button that scrolls to the email form
- ❌ No "Start Now" → onboarding wizard → ✅ Email signup form in the hero
- ❌ No Pricing section (no plans yet)
- ❌ No "Watch Demo" / "Start Free" buttons in the final CTA → ✅ Email signup form
- ❌ No router (single-page only)
- ❌ No dependencies on `@/features`, `@/shared`, `@/domains` from the main app

The visual design is identical to the main app's landing page. Hero
image, illustrations, marquee, dark product module section, footer
widget — all the same.

## Updating copy

All marketing copy lives in `src/data/content.ts` and the section
components themselves. Headlines, taglines, and pain-point text are
inline in each section component because they were never repeated.

## Updating illustrations

Replace files in `src/assets/` with the same filenames. Vite handles
the import paths automatically. Keep the `.webp` format for performance.

## Tech stack

- **Vite 5** — build tool
- **React 18** + **TypeScript 5.7**
- **Tailwind 3.4** + **tailwindcss-animate**
- **Lucide React** — icons
- **Radix Slot** + **CVA** — for the `Button` component's `asChild` prop and variants

No state management, no routing, no data fetching, no auth. Single page,
zero backend (until you wire up the early-access form).
