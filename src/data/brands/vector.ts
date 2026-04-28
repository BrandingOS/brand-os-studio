import type { Brand } from '@/shared/types/brand';

/**
 * VECTOR — powered by Kaafex
 *
 * Visual identity rebuilt 2026-04-28 from the official Brand Board PDF
 * delivered by Kaafex (`/Brands/vector/Brand-Board/PDF/Brand Guideline.pdf`).
 *
 * Logo system (lives in /public/brands/vector/, served as a static asset):
 *   - Logo-1 / Icon-1 — dark wordmark (#232323) + Bright-Blue (#1934ee) arrow.
 *     Used on LIGHT surfaces (Arctic Ice, white).
 *   - Logo-2 / Icon-2 — white wordmark + cyan-gradient (#3ebff5 → #6be6f4) arrow.
 *     Used on DARK / brand-colored surfaces (Bright Blue, Black Charcoal).
 *
 * Color system (6 official tokens):
 *   - Bright Blue        #1934ee   primary
 *   - Spring Sky         #3ebff5   secondary
 *   - Atomic Turquoise   #6be6f4   accent / arrow gradient end
 *   - Blue Charcoal      #0f1622   dark surface
 *   - Black Charcoal     #212121   pure dark
 *   - Arctic Ice         #f2fbff   light surface
 *
 * Typography:
 *   - IBM Plex Sans          primary  — headlines & emphasis
 *   - Plus Jakarta Sans      secondary — body
 */

export const VECTOR_LOGO_URL        = '/brands/vector/logo-1.svg';
export const VECTOR_LOGO_LIGHT_URL  = '/brands/vector/logo-2.svg';
export const VECTOR_ICON_URL        = '/brands/vector/icon-1.svg';
export const VECTOR_ICON_LIGHT_URL  = '/brands/vector/icon-2.svg';

export const vectorBrand: Brand = {
  id: 'vector-brand-001',
  slug: 'vector',
  name: 'Vector',
  logo: VECTOR_LOGO_URL,
  logoAssets: {
    full: VECTOR_LOGO_URL,
    icon: VECTOR_ICON_URL,
    wordmark: VECTOR_LOGO_URL,
    alternate: VECTOR_LOGO_LIGHT_URL,
    dark: VECTOR_LOGO_URL,        // dark wordmark — for light backgrounds
    light: VECTOR_LOGO_LIGHT_URL, // white wordmark — for dark backgrounds
  },
  primaryColor: '#1934ee',
  secondaryColor: '#3ebff5',
  accentColor: '#6be6f4',
  fonts: {
    primary: 'IBM Plex Sans',
    secondary: 'Plus Jakarta Sans',
  },
  tone: 'Confident, Direct & Quietly Technical',
  audience:
    'Job seekers and professionals who are tired of volume-based "spray and pray" applications. ' +
    'They want a structured, transparent system that turns chaotic job hunting into precision-driven ' +
    'decisions — every match scored, every criterion visible, every direction earned.',
  strategy:
    'Vector is a directional job-search system. It replaces unguided applications with Job Scans ' +
    'and Job Vectors that produce transparent, AI-evaluated recommendations. The brand reads as ' +
    'modern infrastructure, not a recruiter — bright, precise, and confident.',
  guidelines: {
    strategy: {
      mission:
        'Give job seekers clarity and direction by replacing unguided applications with a logical, ' +
        'transparent evaluation process — Job Vectors, Job Scans, clear accept / reject logic, and ' +
        'optional, targeted human support.',
      vision:
        'Define a new trajectory of job-seeking — moving the industry from volume-based "spray and ' +
        'pray" to high-relevance precision.',
      values: ['Precision', 'Transparency', 'Direction', 'Structure', 'Control'],
      positioning:
        'Vector sits at the intersection of AI-driven analysis and human guidance. ' +
        'Precision over volume. Transparent logic over black-box matching.',
      personality: ['Confident', 'Direct', 'Modern', 'Calm', 'Technical', 'In-Control'],
      targetAudience:
        'Professionals who want a system, not motivation. People who value transparent logic, ' +
        'clear scoring, and the ability to act on data rather than hope.',
    },
    logoSystem: {
      primary: {
        url: VECTOR_LOGO_URL,
        description:
          'The Vector horizontal lockup — a precise V-arrow icon paired with the "vector" wordmark ' +
          'in IBM Plex Sans. The arrow combines a dark tail (#232323) with a Bright-Blue (#1934ee) ' +
          'forward stroke, signalling magnitude + direction — the mathematical vector. ' +
          'Use this colored variant on light surfaces (Arctic Ice, white).',
        usage:
          'Default brand identifier on light backgrounds — website headers, light-mode UI, ' +
          'product dashboards on white, light-themed reports, and email headers.',
      },
      secondary: {
        url: VECTOR_LOGO_LIGHT_URL,
        description:
          'The reversed Vector lockup — white wordmark with a cyan-gradient arrow (Spring Sky ' +
          '#3ebff5 → Atomic Turquoise #6be6f4). Tuned for high readability and brand expression ' +
          'on dark / brand-colored surfaces.',
        usage:
          'Use on Bright Blue (#1934ee), Black Charcoal (#212121) and Blue Charcoal (#0f1622) ' +
          'surfaces — hero bands, dark-mode UI, social cards, video, packaging.',
      },
      wordmark: {
        url: VECTOR_LOGO_URL,
        description:
          'Same horizontal lockup as the primary — there is no separate wordmark-only file. ' +
          'When pairing with another mark in co-branding contexts, use this colored variant on ' +
          'light surfaces.',
        usage:
          'Co-branding rows, footer placements, partner pages, and editorial contexts where ' +
          'the icon-only mark would be too small.',
      },
      iconmark: {
        url: VECTOR_ICON_URL,
        description:
          'The standalone V-arrow icon — dark tail + Bright-Blue arrow. Reads as direction at ' +
          'any size. Use the colored icon (Icon-1) on light surfaces.',
        usage:
          'App icons, favicons, social media avatars, loading splashes, watermarks, and any ' +
          'context where the wordmark is too wide.',
      },
      blackVersion: {
        url: VECTOR_LOGO_URL,
        description:
          'The standard colored variant doubles as the high-contrast option for light backgrounds — ' +
          'the wordmark sits in Black-Charcoal #232323. For strict single-color print runs, ' +
          'flatten the arrow to the same #232323.',
        usage:
          'Print on light stock, fax / scanned documents, embossing, and any single-color reproduction.',
      },
      whiteVersion: {
        url: VECTOR_LOGO_LIGHT_URL,
        description:
          'White wordmark with cyan-gradient arrow — the dark-surface companion to the primary lockup.',
        usage:
          'Dark UI, video outros, event backdrops, dark merchandise, and the Bright-Blue brand band.',
      },
      clearSpace:
        '1× the height of the V-arrow icon on all sides — never crowd the lockup with copy or UI chrome.',
      minSize: '80px width for digital, 25mm for print',
      usage: [
        {
          do:
            'Pair the right variant with the right surface — colored Logo-1 on Arctic Ice / white, ' +
            'white Logo-2 on Bright Blue and Black Charcoal.',
          dont:
            'Place the colored Logo-1 on Bright Blue or any dark surface — the dark tail collapses ' +
            'into the background and the arrow loses contrast.',
          example:
            'Website hero on Bright Blue uses Logo-2 (white wordmark + cyan arrow). Marketing ' +
            'PDFs on white use Logo-1.',
        },
        {
          do: 'Maintain the defined clear space (1× icon height) and the documented minimum size.',
          dont:
            'Crowd the lockup with surrounding text, icons, or interface chrome. Do not scale ' +
            'below 80px width on screen.',
          example:
            'In the dashboard topbar, the icon sits with generous gutters from the navigation items.',
        },
        {
          do: 'Use only the approved color variants exactly as supplied in the SVG / PDF assets.',
          dont:
            'Apply gradients of your own, drop shadows, outlines, glows, or recolor the arrow ' +
            'tail to match the surface. The brand-board variants are the only legal ones.',
          example:
            'Never repaint the V-arrow — it is calibrated to the cyan-gradient on dark and the ' +
            'Bright-Blue solid on light.',
        },
      ],
    },
    colorPalette: {
      primary: {
        hex: '#1934ee',
        rgb: 'rgb(25, 52, 238)',
        cmyk: 'C:86 M:75 Y:0 K:0',
        pantone: 'Pantone 2728 C',
        name: 'Bright Blue',
        usage:
          'Primary brand color — hero surfaces, primary CTAs, key brand moments, and the brand-band ' +
          'background that the white logo lives on. Used confidently and at full saturation.',
      },
      secondary: {
        hex: '#3ebff5',
        rgb: 'rgb(62, 191, 245)',
        cmyk: 'C:61 M:5 Y:0 K:0',
        pantone: 'Pantone 298 C',
        name: 'Spring Sky',
        usage:
          'Secondary accent — links, focused states, the start of the arrow gradient, and ' +
          'data highlights inside Job Scans.',
      },
      accent: {
        hex: '#6be6f4',
        rgb: 'rgb(107, 230, 244)',
        cmyk: 'C:46 M:0 Y:9 K:0',
        pantone: 'Pantone 3105 C',
        name: 'Atomic Turquoise',
        usage:
          'Tertiary accent — end of the arrow gradient, hover states, success / match highlights ' +
          'on dark surfaces, and decorative elements.',
      },
      neutral: [
        {
          hex: '#f2fbff',
          rgb: 'rgb(242, 251, 255)',
          cmyk: 'C:4 M:1 Y:0 K:0',
          name: 'Arctic Ice',
          usage: 'Page backgrounds, light cards, and subtle section bands. Default light surface.',
        },
        {
          hex: '#dfe8ec',
          rgb: 'rgb(223, 232, 236)',
          cmyk: 'C:8 M:3 Y:2 K:5',
          name: 'Frost Border',
          usage: 'Dividers, table lines, and quiet borders on Arctic-Ice surfaces.',
        },
        {
          hex: '#5b6b75',
          rgb: 'rgb(91, 107, 117)',
          cmyk: 'C:55 M:35 Y:25 K:30',
          name: 'Steel Muted',
          usage: 'Secondary text, captions, metadata, timestamps, table cell labels.',
        },
        {
          hex: '#212121',
          rgb: 'rgb(33, 33, 33)',
          cmyk: 'C:72 M:66 Y:65 K:73',
          name: 'Black Charcoal',
          usage:
            'Primary body text on light surfaces. Also the brand\'s "pure dark" surface — used as a ' +
            'rich black background, brand cards, and packaging.',
        },
        {
          hex: '#0f1622',
          rgb: 'rgb(0, 15, 22)',
          cmyk: 'C:82 M:68 Y:62 K:80',
          name: 'Blue Charcoal',
          usage:
            'Deepest brand surface — pitch-deck title slides, app dark-mode chrome, hero ' +
            'backdrops where Black Charcoal feels too neutral.',
        },
      ],
      semantic: {
        success: {
          hex: '#6be6f4',
          rgb: 'rgb(107, 230, 244)',
          cmyk: 'C:46 M:0 Y:9 K:0',
          name: 'Match Cyan',
          usage:
            'High-match scores, accepted recommendations, and positive scan signals. The brand ' +
            'leans into its own cyan family rather than a generic green.',
        },
        warning: {
          hex: '#ffb84d',
          rgb: 'rgb(255, 184, 77)',
          cmyk: 'C:0 M:28 Y:70 K:0',
          name: 'Caution Amber',
          usage: 'Partial matches, threshold alerts, and "review needed" states.',
        },
        error: {
          hex: '#ff5a6a',
          rgb: 'rgb(255, 90, 106)',
          cmyk: 'C:0 M:65 Y:50 K:0',
          name: 'Alert Coral',
          usage: 'Misalignment, rejected matches, and critical errors. Used sparingly.',
        },
        info: {
          hex: '#1934ee',
          rgb: 'rgb(25, 52, 238)',
          cmyk: 'C:86 M:75 Y:0 K:0',
          name: 'Info Blue',
          usage: 'System notices, neutral status, analytical callouts — same hex as primary.',
        },
      },
    },
    typography: {
      primary: {
        family: 'IBM Plex Sans',
        weights: [400, 500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
        usage:
          'Headlines, hero typography, and emphasis copy. IBM Plex carries Vector\'s technical, ' +
          'engineered character — letterforms with intent.',
      },
      secondary: {
        family: 'Plus Jakarta Sans',
        weights: [400, 500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        usage:
          'Body copy, UI text, dashboards, and data tables. Plus Jakarta is friendly and highly ' +
          'legible at small sizes — the workhorse for dense product surfaces.',
      },
      scale: {
        h1: '3rem/1.1',
        h2: '2.25rem/1.15',
        h3: '1.75rem/1.25',
        h4: '1.5rem/1.3',
        h5: '1.25rem/1.4',
        h6: '1.125rem/1.4',
        body: '1rem/1.6',
        bodyLarge: '1.125rem/1.6',
        bodySmall: '0.875rem/1.5',
        caption: '0.75rem/1.4',
        overline: '0.6875rem/1.2',
      },
      hierarchy: {
        headings: [
          { element: 'H1', fontSize: '3rem',    lineHeight: '1.1',  fontWeight: 700, usage: 'Hero headlines. IBM Plex Sans Bold.' },
          { element: 'H2', fontSize: '2.25rem', lineHeight: '1.15', fontWeight: 600, usage: 'Section headers. IBM Plex Sans SemiBold.' },
          { element: 'H3', fontSize: '1.75rem', lineHeight: '1.25', fontWeight: 600, usage: 'Card titles & subsections. IBM Plex Sans SemiBold.' },
        ],
        body: [
          { element: 'Body Large', fontSize: '1.125rem', lineHeight: '1.6', fontWeight: 400, usage: 'Lead paragraphs. Plus Jakarta Sans Regular.' },
          { element: 'Body',       fontSize: '1rem',     lineHeight: '1.6', fontWeight: 400, usage: 'Standard text. Plus Jakarta Sans Regular.' },
          { element: 'Body Small', fontSize: '0.875rem', lineHeight: '1.5', fontWeight: 400, usage: 'Table cells, metadata, scores. Plus Jakarta Sans Regular.' },
        ],
        ui: [
          { element: 'Button',   fontSize: '0.875rem',  lineHeight: '1.0', fontWeight: 600, usage: 'CTAs and action buttons. Plus Jakarta Sans SemiBold.' },
          { element: 'Label',    fontSize: '0.75rem',   lineHeight: '1.4', fontWeight: 500, usage: 'Form labels, score labels.' },
          { element: 'Overline', fontSize: '0.6875rem', lineHeight: '1.2', fontWeight: 600, usage: 'Section labels, tags. Uppercase, +0.08em tracking.' },
        ],
      },
    },
    voiceAndTone: {
      brandVoice:
        'Vector speaks like mission control — calm, precise, structured. We don\'t hype or promise; ' +
        'we analyse, score, and direct. Every statement carries a clear trajectory and the logic ' +
        'behind the call is always visible.',
      toneAttributes: ['Confident', 'Direct', 'Transparent', 'Calm', 'Technical', 'Directional'],
      communicationStyle:
        'Precision over fluff. Show the criteria, show the score, show the recommendation. We are ' +
        'a system for control, not another career site with motivational copy.',
      doAndDonts: {
        do: [
          'Lead with the evaluation — "Your match score: 87%. Here\'s why."',
          'Show the scoring criteria openly — make the logic visible.',
          'Use directional language — "aligned", "trajectory", "precision", "vector".',
          'Frame everything through the lens of direction, not hope.',
        ],
        dont: [
          'Use motivational language — "chase your dreams", "you can do it".',
          'Promise outcomes — Vector provides direction, not guarantees.',
          'Sound like a recruiter or job board — we are infrastructure.',
          'Use vague language — every claim must have visible supporting logic.',
        ],
      },
      examples: [
        {
          context: 'Job Scan result',
          good:
            'Match: 82%. Strong alignment on 4/5 criteria. Misalignment: seniority. ' +
            'Recommendation: Apply with adjusted positioning.',
          bad: 'Great news! This job looks like a perfect fit for you! Go for it!',
        },
        {
          context: 'Product description',
          good:
            'Vector generates Job Scans with transparent scoring. You see every criterion, ' +
            'every weight, every decision point.',
          bad: 'We use cutting-edge AI to help you land your dream job faster than ever!',
        },
      ],
    },
    iconography: {
      style:
        'Sharp, geometric outline icons with a 1.5px stroke — technical and precise, mirroring ' +
        'the angular V-arrow.',
      weight: '1.5px stroke',
      cornerRadius: '0px — sharp corners only.',
      examples: [
        {
          category: 'Navigation',
          icons: [
            { name: 'Compass',   url: '', usage: 'Direction, guidance.' },
            { name: 'Target',    url: '', usage: 'Precision, match accuracy.' },
            { name: 'Crosshair', url: '', usage: 'Focus, targeting, scan.' },
          ],
        },
        {
          category: 'Data',
          icons: [
            { name: 'BarChart3', url: '', usage: 'Scoring, analytics, metrics.' },
            { name: 'GitBranch', url: '', usage: 'Decision paths, vectors.' },
            { name: 'Radar',     url: '', usage: 'Job scanning, detection.' },
          ],
        },
      ],
      usage:
        'Lucide React icons, sharp variant. 1.5px stroke, 24px default. Never fill — outlines only.',
    },
    socialMedia: {
      platforms: [
        {
          name: 'LinkedIn',
          profileImage: { width: 400,  height: 400 },
          coverImage:   { width: 1584, height: 396 },
          postImage:    { width: 1200, height: 627 },
          guidelines:
            'Profile avatar: Icon-2 centered on Bright Blue (#1934ee). Cover: Bright Blue with ' +
            'Logo-2 left-aligned and a single tagline in IBM Plex Sans. Posts default to Bright ' +
            'Blue or Arctic Ice, never both — pick a tone per post and commit to it.',
        },
        {
          name: 'Twitter / X',
          profileImage: { width: 400,  height: 400 },
          coverImage:   { width: 1500, height: 500 },
          postImage:    { width: 1200, height: 675 },
          guidelines:
            'Avatar: Icon-2 on Bright Blue. Cover: Bright Blue with Logo-2 + 1-line manifesto. ' +
            'Threads use Plus Jakarta Sans for body text, IBM Plex for the lead.',
        },
      ],
      guidelines:
        'Every social asset reinforces: Vector is a system for control. Bright Blue is the brand ' +
        'band; Arctic Ice is the breathing room. Use Black Charcoal sparingly for premium / dark ' +
        'moments. Always pair the white Logo-2 with Bright Blue or Black Charcoal — never the ' +
        'colored Logo-1.',
    },
    stationery: {
      businessCard: {
        description:
          'Two-sided card. Front: Bright Blue full bleed with Logo-2 (white wordmark + cyan ' +
          'arrow). Back: Arctic Ice with Logo-1 and contact details in Plus Jakarta Sans.',
        specifications: '3.5" × 2", 450gsm soft-touch matte laminate.',
        template: '',
        guidelines:
          'Name set in IBM Plex Sans 600 / 11pt. Title and contact in Plus Jakarta Sans 400 / 8pt. ' +
          'Generous gutters — no edge-to-edge typography.',
      },
      letterhead: {
        description: 'Minimal A4 letterhead with Logo-1 top-left and a thin Spring-Sky accent rule.',
        specifications: 'A4, 120gsm premium uncoated.',
        template: '',
        guidelines:
          'Logo-1 sits at 24mm width. 0.5pt rule in Spring Sky (#3ebff5) below the header. ' +
          'Footer: web + contact in Plus Jakarta Sans 400 / 8pt, Steel Muted.',
      },
      envelope: {
        description: 'C5 envelope with corner Icon-1 and minimal return address.',
        specifications: 'C5, offset printed.',
        template: '',
        guidelines:
          'Icon-1 top-left at 16mm. Return address in Plus Jakarta Sans 400 / 8pt directly below.',
      },
      presentation: {
        description: 'Pitch-deck template with Bright-Blue title slides and Arctic-Ice content slides.',
        specifications: '16:9 (1920 × 1080px).',
        template: '',
        guidelines:
          'Title slides: Bright Blue or Blue Charcoal background, Logo-2 top-left, headline in ' +
          'IBM Plex Sans 700. Content slides: Arctic Ice, Logo-1 top-left, headlines in IBM Plex ' +
          'Sans 600 Bright Blue, body in Plus Jakarta Sans 400 Black Charcoal.',
      },
    },
    applications: {
      digital: [
        {
          name: 'Job Scan Dashboard',
          description:
            'The core Vector interface. Score cards, criteria breakdown, accept / reject ' +
            'recommendations. Default to a light theme on Arctic Ice with Bright-Blue accents.',
          image: '',
          specifications: 'Responsive — 1440px primary breakpoint.',
          guidelines:
            'Topbar: Arctic Ice, Logo-1, Plus Jakarta navigation. Score chips: Match Cyan for ' +
            'high matches, Caution Amber for partial, Alert Coral for misalignment. Charts use ' +
            'Bright Blue → Spring Sky → Atomic Turquoise as the core ramp.',
        },
        {
          name: 'Mobile App Icon',
          description: 'Icon-2 on a Bright-Blue rounded square — the iOS / Android app icon.',
          image: VECTOR_ICON_LIGHT_URL,
          specifications: '1024×1024px with platform corner-radius and 20% padding.',
          guidelines:
            'Use Icon-2 (white + cyan-gradient arrow) on Bright Blue (#1934ee). Never the ' +
            'colored Icon-1 here — contrast collapses against blue.',
        },
        {
          name: 'Favicon & Browser Tab',
          description: 'Icon-only mark for browser favicons and tab identification.',
          image: VECTOR_ICON_URL,
          specifications: '32×32, 16×16 SVG.',
          guidelines:
            'Use Icon-1 on transparent background for light tabs. Provide a dark-mode variant ' +
            'using Icon-2. Must remain recognisable at 16px.',
        },
        {
          name: 'Social Media Avatar',
          description: 'Icon-only circular avatar for LinkedIn, Twitter / X and other platforms.',
          image: VECTOR_ICON_LIGHT_URL,
          specifications: '400×400px circular crop.',
          guidelines:
            'Icon-2 centered on Bright Blue (#1934ee). No wordmark — icon-only at avatar size.',
        },
        {
          name: 'Email Signature',
          description: 'Icon-1 next to "Vector" wordmark in email signatures.',
          image: VECTOR_ICON_URL,
          specifications: '24px inline icon.',
          guidelines:
            'Icon-1 at 24px alongside name in IBM Plex Sans 600. Title and contact in Plus ' +
            'Jakarta Sans 400, Steel Muted.',
        },
        {
          name: 'Loading / Splash Screen',
          description: 'Centered Icon-2 on Bright Blue during app load.',
          image: VECTOR_ICON_LIGHT_URL,
          specifications: '64px centered icon, subtle scale-pulse 1.0 → 1.05 → 1.0 at 2s interval.',
          guidelines:
            'Icon-2 only, full-bleed Bright Blue background. No wordmark, no copy, no spinner.',
        },
      ],
      print: [
        {
          name: 'Business Card',
          description: 'Two-sided card — Bright-Blue front, Arctic-Ice back.',
          image: '',
          specifications: '3.5" × 2", 450gsm soft-touch matte laminate.',
          guidelines:
            'Front: Bright Blue full bleed, Logo-2 top-left at 18mm. Back: Arctic Ice, Logo-1 ' +
            'top-left, contact stack in Plus Jakarta Sans 400 / 8pt.',
        },
        {
          name: 'Letterhead',
          description: 'Clean A4 letterhead with Logo-1 header and Spring-Sky accent rule.',
          image: '',
          specifications: 'A4, 120gsm premium uncoated.',
          guidelines:
            'Logo-1 top-left at 24mm. 0.5pt Spring Sky rule below. Body type in Plus Jakarta ' +
            'Sans 400 / 10pt, line-height 1.5.',
        },
        {
          name: 'Presentation Deck',
          description: 'Pitch deck for investor / partner conversations.',
          image: '',
          specifications: '16:9 (1920 × 1080px).',
          guidelines:
            'Title slides on Bright Blue or Blue Charcoal with Logo-2. Content slides on Arctic ' +
            'Ice with Logo-1. Section dividers full-bleed in primary or accent.',
        },
      ],
      packaging: [],
      environmental: [
        {
          name: 'Conference Badge',
          description: 'Icon-only badge for events.',
          image: VECTOR_ICON_LIGHT_URL,
          specifications: '85mm × 55mm, lanyard-compatible.',
          guidelines:
            'Bright-Blue background, centered Icon-2 at 22mm, attendee name in IBM Plex Sans 500 ' +
            'white below.',
        },
      ],
    },
  },
  assets: [
    {
      id: 'vector-logo-1',
      name: 'Vector Logo — Primary (light surfaces)',
      type: 'logo',
      category: 'logo',
      url: VECTOR_LOGO_URL,
      size: 1798,
      source: 'url',
      tags: ['logo', 'primary', 'light-bg', 'colored', 'svg'],
      metadata: { dimensions: { width: 150, height: 38 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-logo-2',
      name: 'Vector Logo — White (dark / brand-blue surfaces)',
      type: 'logo',
      category: 'logo',
      url: VECTOR_LOGO_LIGHT_URL,
      size: 2179,
      source: 'url',
      tags: ['logo', 'white', 'dark-bg', 'gradient', 'svg'],
      metadata: { dimensions: { width: 150, height: 38 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-icon-1',
      name: 'Vector Icon — Primary (light surfaces)',
      type: 'logo',
      category: 'logo',
      url: VECTOR_ICON_URL,
      size: 591,
      source: 'url',
      tags: ['icon', 'primary', 'light-bg', 'colored', 'svg'],
      metadata: { dimensions: { width: 35, height: 38 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-icon-2',
      name: 'Vector Icon — White (dark / brand-blue surfaces)',
      type: 'logo',
      category: 'logo',
      url: VECTOR_ICON_LIGHT_URL,
      size: 972,
      source: 'url',
      tags: ['icon', 'white', 'dark-bg', 'gradient', 'svg'],
      metadata: { dimensions: { width: 35, height: 38 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-logo-1-pdf',
      name: 'Vector Logo — Primary (PDF, print)',
      type: 'logo',
      category: 'logo',
      url: '/brands/vector/logo-1.pdf',
      size: 41651,
      source: 'url',
      tags: ['logo', 'primary', 'print', 'pdf'],
      metadata: { format: 'PDF', colorMode: 'CMYK' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-logo-2-pdf',
      name: 'Vector Logo — White (PDF, print)',
      type: 'logo',
      category: 'logo',
      url: '/brands/vector/logo-2.pdf',
      size: 42283,
      source: 'url',
      tags: ['logo', 'white', 'print', 'pdf'],
      metadata: { format: 'PDF', colorMode: 'CMYK' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-logo-1-png-2x',
      name: 'Vector Logo — Primary (PNG @2x)',
      type: 'logo',
      category: 'logo',
      url: '/brands/vector/logo-1@2x.png',
      size: 8358,
      source: 'url',
      tags: ['logo', 'primary', 'raster', 'png', '@2x'],
      metadata: { format: 'PNG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-logo-2-png-2x',
      name: 'Vector Logo — White (PNG @2x)',
      type: 'logo',
      category: 'logo',
      url: '/brands/vector/logo-2@2x.png',
      size: 8454,
      source: 'url',
      tags: ['logo', 'white', 'raster', 'png', '@2x'],
      metadata: { format: 'PNG', colorMode: 'RGB' },
      createdAt: new Date('2026-04-28'),
    },
    {
      id: 'vector-brand-guideline',
      name: 'Vector — Brand Guideline (PDF)',
      type: 'document',
      category: 'reference',
      url: '/brands/vector/brand-guideline.pdf',
      size: 244459,
      source: 'url',
      tags: ['guideline', 'reference', 'pdf'],
      metadata: { format: 'PDF' },
      createdAt: new Date('2026-04-28'),
    },
  ],
  isPublic: false,
  createdAt: new Date('2026-04-28'),
  updatedAt: new Date('2026-04-28'),
};
