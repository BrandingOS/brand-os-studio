import type { Brand } from '@/shared/types/brand';

/**
 * RAQM Logo System
 * Uses the original production SVG from the designer — NOT auto-traced or reconstructed.
 * The SVG lives in /public/brands/raqm/ and is served as a static asset.
 * Brand color: #7231FF (Raqm Violet)
 */
export const RAQM_LOGO_URL = '/brands/raqm/logo.svg';
export const RAQM_LOGO_WHITE_URL = '/brands/raqm/logo-white.svg';
export const RAQM_LOGO_BLACK_URL = '/brands/raqm/logo-black.svg';

/**
 * Raqm — Performance Revenue Infrastructure
 * Complete premium brand identity system.
 */
export const raqmBrand: Brand = {
  id: 'raqm-brand-001',
  slug: 'raqm',
  name: 'Raqm',
  logo: RAQM_LOGO_URL,
  primaryColor: '#7231FF',
  secondaryColor: '#00D4AA',
  fonts: {
    primary: 'Inter',
    secondary: 'DM Sans',
  },
  tone: 'Direct, Strategic & Precision-Driven',
  audience: 'E-commerce brands (5-30M SAR) and real estate companies in Saudi Arabia seeking financial clarity from their marketing spend',
  strategy: 'Raqm positions itself as the performance infrastructure partner that turns marketing activity into measurable financial impact. We build revenue-centered systems — not ads, not reports — that connect every marketing dollar to real profit.',
  guidelines: {
    strategy: {
      mission: 'Build a financial control layer inside businesses that enables them to see real profit, expose waste, make informed financial decisions, structure marketing performance, and grow with confidence.',
      vision: 'To become the reference in the Saudi market for building clear financial performance systems that link every marketing activity to real profit.',
      values: ['Financial Clarity', 'Precision', 'Discipline', 'Measurable Impact', 'Revenue Truth'],
      positioning: 'Revenue-Centered Performance Infrastructure — Raqm builds performance infrastructure that turns marketing activity into measurable financial impact.',
      personality: ['Strategic', 'Precise', 'Calm', 'Confident', 'Analytical', 'High-level', 'Minimal', 'Founder-level'],
      targetAudience: 'Primary: E-commerce brands (5–30M SAR annually) and structured real estate companies/developers in Saudi Arabia. Pain points include unclear ROAS-to-profit correlation, CAC bleeding, unclear contribution margins, inaccurate tracking, and decisions made without financial visibility.',
    },
    logoSystem: {
      primary: {
        url: '/brands/raqm/logo.svg',
        description: 'The RAQM wordmark features bold geometric letterforms with angular cuts and rectangular counters. Each letter is constructed on a strict grid system — the R has a rectangular counter with a geometric leg, the A features angular negative space, the Q has a distinctive diagonal notch, and the M uses precise diagonal strokes. The geometry reflects precision, structure, and mathematical confidence.',
        usage: 'Primary brand identifier for all major touchpoints — website headers, proposals, contracts, presentations, and official communications. Always use the SVG source file.',
      },
      secondary: {
        url: RAQM_LOGO_URL,
        description: 'Compact version of the wordmark optimized for smaller contexts. Same letterforms, tighter tracking.',
        usage: 'Email signatures, sidebar navigation, footer placements, and co-branding contexts. Minimum 80px width for digital.',
      },
      wordmark: {
        url: RAQM_LOGO_URL,
        description: 'The RAQM name set in the custom geometric letterforms with precise angular construction.',
        usage: 'Text-heavy contexts, editorial content, formal documents, and proposal covers.',
      },
      iconmark: {
        url: RAQM_LOGO_URL,
        description: 'The "R" monogram extracted from the full wordmark — a bold geometric R with the rectangular counter. Works independently at any size.',
        usage: 'App icons, favicons, social media avatars, watermarks, and compact brand placements.',
      },
      blackVersion: {
        url: RAQM_LOGO_BLACK_URL,
        description: 'Single-color black (#0A0A0F) version for high-contrast and monochrome applications.',
        usage: 'Print on light backgrounds, fax headers, legal documents, newspaper ads, embossing.',
      },
      whiteVersion: {
        url: RAQM_LOGO_WHITE_URL,
        description: 'Reversed white version for dark backgrounds and photography overlays.',
        usage: 'Dark UI surfaces, video outros, event backdrops, dark-mode interfaces, merchandise.',
      },
      clearSpace: '1× the cap height of the R on all sides minimum',
      minSize: '80px width for digital, 25mm for print',
      usage: [
        {
          do: 'Always maintain the defined clear space around the logo — minimum 1× cap height on all sides',
          dont: 'Crowd the logo with text, images, decorative elements, or other interface components',
          example: 'In proposals, the logo sits in isolation at the top with generous white space below',
        },
        {
          do: 'Use only the approved color variants: Raqm Violet on white, white on dark surfaces, or black for monochrome',
          dont: 'Apply gradients, drop shadows, outlines, glows, or any unapproved color treatments',
          example: 'On the website hero, use white logo on the dark (#0A0A0F) background',
        },
        {
          do: 'Scale proportionally from the SVG source files only',
          dont: 'Stretch, compress, rotate, skew, or add effects to the logo',
          example: 'Download from the brand asset library; never screenshot or export from presentations',
        },
      ],
    },
    colorPalette: {
      primary: {
        hex: '#7231FF',
        rgb: 'rgb(123, 47, 242)',
        cmyk: 'C:49 M:81 Y:0 K:5',
        pantone: 'Pantone 2665 C',
        name: 'Raqm Violet',
        usage: 'Primary brand color — logo, headlines, CTAs, primary interactive elements, key accent moments. Used sparingly and with intention, never as decoration.',
      },
      secondary: {
        hex: '#00D4AA',
        rgb: 'rgb(0, 212, 170)',
        cmyk: 'C:100 M:0 Y:20 K:17',
        pantone: 'Pantone 3395 C',
        name: 'Signal Green',
        usage: 'Success states, positive financial metrics, revenue indicators, growth signals, and secondary accent. Represents money, profit, and positive outcomes.',
      },
      accent: {
        hex: '#F59E0B',
        rgb: 'rgb(245, 158, 11)',
        cmyk: 'C:0 M:35 Y:95 K:4',
        pantone: 'Pantone 130 C',
        name: 'Alert Amber',
        usage: 'Warning states, attention indicators, pending reviews, and financial caution signals. Used in dashboards and data visualization for threshold alerts.',
      },
      neutral: [
        {
          hex: '#FAFAFA',
          rgb: 'rgb(250, 250, 250)',
          cmyk: 'C:0 M:0 Y:0 K:2',
          name: 'Surface',
          usage: 'Page backgrounds, card surfaces, and light UI areas. The default canvas.',
        },
        {
          hex: '#E5E5E5',
          rgb: 'rgb(229, 229, 229)',
          cmyk: 'C:0 M:0 Y:0 K:10',
          name: 'Border',
          usage: 'Dividers, borders, input outlines, table lines, and subtle separators.',
        },
        {
          hex: '#8A8A8A',
          rgb: 'rgb(138, 138, 138)',
          cmyk: 'C:0 M:0 Y:0 K:46',
          name: 'Muted',
          usage: 'Placeholder text, secondary labels, timestamps, and disabled states.',
        },
        {
          hex: '#3A3A3A',
          rgb: 'rgb(58, 58, 58)',
          cmyk: 'C:0 M:0 Y:0 K:77',
          name: 'Body',
          usage: 'Body text, descriptions, secondary content, and data labels.',
        },
        {
          hex: '#0A0A0F',
          rgb: 'rgb(10, 10, 15)',
          cmyk: 'C:33 M:33 Y:0 K:94',
          name: 'Midnight',
          usage: 'Headlines, primary text, dark surfaces, hero backgrounds, and high-emphasis content. The brand\'s anchor dark — almost black with a hint of deep violet.',
        },
      ],
      semantic: {
        success: {
          hex: '#00D4AA',
          rgb: 'rgb(0, 212, 170)',
          cmyk: 'C:100 M:0 Y:20 K:17',
          name: 'Revenue Green',
          usage: 'Profit indicators, successful transactions, positive ROAS, growth metrics.',
        },
        warning: {
          hex: '#F59E0B',
          rgb: 'rgb(245, 158, 11)',
          cmyk: 'C:0 M:35 Y:95 K:4',
          name: 'Caution Amber',
          usage: 'CAC warnings, margin alerts, tracking issues, budget threshold approaching.',
        },
        error: {
          hex: '#EF4444',
          rgb: 'rgb(239, 68, 68)',
          cmyk: 'C:0 M:72 Y:72 K:6',
          name: 'Loss Red',
          usage: 'Negative ROI, budget overrun, tracking failures, critical financial errors.',
        },
        info: {
          hex: '#7231FF',
          rgb: 'rgb(123, 47, 242)',
          cmyk: 'C:49 M:81 Y:0 K:5',
          name: 'Insight Violet',
          usage: 'Analytical insights, system information, performance notes, neutral status.',
        },
      },
    },
    typography: {
      primary: {
        family: 'Inter',
        weights: [400, 500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        usage: 'Primary typeface for all UI text, body content, data tables, financial reports, dashboards, and interface elements. Chosen for its exceptional legibility at small sizes and numerical clarity — critical for financial data display.',
      },
      secondary: {
        family: 'DM Sans',
        weights: [500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&display=swap',
        usage: 'Display typeface for headlines, hero sections, proposal covers, and brand-forward communications. Used at large sizes only. Its geometric construction mirrors the logo\'s precision.',
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
          { element: 'H1', fontSize: '3rem', lineHeight: '1.1', fontWeight: 700, usage: 'Hero headlines, proposal titles, and primary page headings. DM Sans Bold.' },
          { element: 'H2', fontSize: '2.25rem', lineHeight: '1.15', fontWeight: 600, usage: 'Section headers, service titles, and secondary page headings. DM Sans SemiBold.' },
          { element: 'H3', fontSize: '1.75rem', lineHeight: '1.25', fontWeight: 600, usage: 'Card titles, subsection headers, and financial metric labels. Inter SemiBold.' },
        ],
        body: [
          { element: 'Body Large', fontSize: '1.125rem', lineHeight: '1.6', fontWeight: 400, usage: 'Lead paragraphs, service descriptions, and proposal body text.' },
          { element: 'Body', fontSize: '1rem', lineHeight: '1.6', fontWeight: 400, usage: 'Standard text, data descriptions, dashboard labels, and general content.' },
          { element: 'Body Small', fontSize: '0.875rem', lineHeight: '1.5', fontWeight: 400, usage: 'Table cells, metadata, timestamps, footnotes, and secondary data.' },
        ],
        ui: [
          { element: 'Button', fontSize: '0.875rem', lineHeight: '1.0', fontWeight: 600, usage: 'CTAs, action buttons, and primary interactive elements. Always Inter SemiBold.' },
          { element: 'Label', fontSize: '0.75rem', lineHeight: '1.4', fontWeight: 500, usage: 'Form labels, table headers, metric labels, and small UI labels.' },
          { element: 'Overline', fontSize: '0.6875rem', lineHeight: '1.2', fontWeight: 600, usage: 'Section labels, category tags, KPI headers. Always uppercase, tracked wider.' },
        ],
      },
    },
    voiceAndTone: {
      brandVoice: 'Raqm speaks like a senior financial strategist — direct, precise, and never wasteful with words. Every sentence has a purpose. We don\'t sell excitement; we sell clarity. We don\'t promise growth; we expose the numbers that drive it.',
      toneAttributes: ['Direct', 'Strategic', 'Precise', 'Confident', 'Financial', 'Decision-focused'],
      communicationStyle: 'No buzzwords. No exaggeration. No fluff. Business-first, money-oriented, decision-focused. We speak closer to a financial strategy firm than a creative agency. Numbers before narratives. Results before promises. Clarity before cleverness.',
      doAndDonts: {
        do: [
          'Lead with the financial impact — "Your CAC dropped 34%" not "We optimized your campaigns"',
          'Use precise numbers — never round, never approximate when exactness is available',
          'Speak to the business owner\'s financial concerns, not marketing metrics',
          'Be direct — one sentence where competitors use three paragraphs',
          'Frame everything through the lens of profit, not performance',
        ],
        dont: [
          'Use marketing buzzwords — "growth hacking", "viral", "game-changing", "disruptive"',
          'Promise outcomes before diagnosis — we don\'t know until we look at the numbers',
          'Sound like a creative agency — we are infrastructure, not inspiration',
          'Use exclamation marks — ever. Our confidence doesn\'t need volume.',
          'Sell emotion — we sell financial clarity and measurable impact only',
        ],
      },
      examples: [
        {
          context: 'Client proposal opening',
          good: 'Your ROAS shows 4.2×. Your actual contribution margin is 11%. Here\'s what\'s leaking.',
          bad: 'We\'re excited to partner with you on your growth journey! Let\'s unlock your brand\'s full potential!',
        },
        {
          context: 'Service description',
          good: 'Raqm Revenue Infrastructure: a financial control layer that connects every marketing dirham to real profit.',
          bad: 'We offer cutting-edge, AI-powered growth solutions designed to supercharge your digital marketing presence.',
        },
        {
          context: 'Social media post',
          good: 'ROAS ≠ Profit. Most brands can\'t tell you their real contribution margin. That\'s where the money disappears.',
          bad: '🚀 Ready to 10× your growth? Let us take your brand to the NEXT LEVEL! 💪🔥',
        },
      ],
    },
    iconography: {
      style: 'Sharp, geometric outline icons with 1.5px stroke weight — matching the angular precision of the logo',
      weight: '1.5px stroke',
      cornerRadius: '0px — sharp corners to match the brand\'s geometric precision',
      examples: [
        {
          category: 'Financial',
          icons: [
            { name: 'TrendingUp', url: '', usage: 'Revenue growth, positive ROAS, upward financial trends' },
            { name: 'BarChart3', url: '', usage: 'Performance data, contribution margin visualization, KPIs' },
            { name: 'DollarSign', url: '', usage: 'Revenue, profit, financial amounts, pricing' },
          ],
        },
        {
          category: 'Infrastructure',
          icons: [
            { name: 'Layers', url: '', usage: 'System layers, infrastructure stack, service architecture' },
            { name: 'Target', url: '', usage: 'Tracking accuracy, attribution, precision targeting' },
            { name: 'Shield', url: '', usage: 'Financial protection, audit integrity, data security' },
          ],
        },
      ],
      usage: 'Use Lucide React icons exclusively. Sharp variant preferred over rounded. Maintain 1.5px stroke weight and 24px default size. Never fill icons. The icon style must reinforce the brand\'s precision — no soft, rounded, playful icons.',
    },
    socialMedia: {
      platforms: [
        {
          name: 'LinkedIn',
          profileImage: { width: 400, height: 400 },
          coverImage: { width: 1584, height: 396 },
          postImage: { width: 1200, height: 627 },
          guidelines: 'Financial insights, case studies with real numbers, performance infrastructure thought leadership. No fluff, no motivational quotes. Every post must contain a number or a framework.',
        },
        {
          name: 'Twitter / X',
          profileImage: { width: 400, height: 400 },
          coverImage: { width: 1500, height: 500 },
          postImage: { width: 1200, height: 675 },
          guidelines: 'Sharp financial truths, ROAS vs profit comparisons, quick diagnostic frameworks. Maximum impact in minimum words. Arabic-first for Saudi market engagement.',
        },
        {
          name: 'Instagram',
          profileImage: { width: 320, height: 320 },
          coverImage: { width: 1080, height: 1080 },
          postImage: { width: 1080, height: 1080 },
          guidelines: 'Data visualizations, before/after financial clarity comparisons, infrastructure diagrams, case study results. Dark backgrounds, clean typography, precise numbers. No stock photos, no lifestyle imagery.',
        },
      ],
      guidelines: 'All social content must reinforce one message: Raqm turns marketing spend into measurable financial impact. Use Raqm Violet sparingly. Prefer dark surfaces (#0A0A0F) with white text and Signal Green for positive metrics. Arabic + English bilingual capability required for Saudi market.',
    },
    stationery: {
      businessCard: {
        description: 'Premium business card with RAQM wordmark, role, and contact details on dark surface. Back: full Raqm Violet with white logo.',
        specifications: '3.5" x 2" (89mm x 51mm), 450gsm black-core stock, soft-touch matte laminate, spot UV on the logo.',
        template: '',
        guidelines: 'Front: Dark surface (#0A0A0F), white wordmark top-left, name and title in Inter Medium, contact in Inter Regular 8pt. Back: Raqm Violet full bleed with white wordmark centered. Maximum 4 lines of contact info.',
      },
      letterhead: {
        description: 'Minimal letterhead with wordmark header and geometric accent line.',
        specifications: 'A4 (210mm x 297mm), 120gsm premium uncoated stock, 1-color header.',
        template: '',
        guidelines: 'Wordmark top-left at 20mm from edges. Thin 0.5pt Raqm Violet accent line below header spanning 40% of page width. Body text in Inter Regular 10pt. Footer: address and CR number in 7pt muted gray.',
      },
      envelope: {
        description: 'Branded envelope with corner monogram and minimal return address.',
        specifications: 'C5 envelope (162mm x 229mm), offset printed, 1 PMS color.',
        template: '',
        guidelines: 'R monogram top-left corner at 15mm. Return address in Inter Regular 7pt below. Maximum 3 lines. The envelope should feel premium through restraint, not decoration.',
      },
      presentation: {
        description: 'Proposal and pitch deck template with data-focused layouts, dark hero slides, and structured content grids.',
        specifications: '16:9 (1920x1080px), Keynote / Google Slides / PowerPoint compatible.',
        template: '',
        guidelines: 'Title slides: DM Sans Bold on dark (#0A0A0F) background. Data slides: white background with structured grid. Chart colors follow brand palette. Maximum 25 words per slide. Every slide must have clear hierarchy and generous white space.',
      },
    },
    applications: {
      digital: [
        {
          name: 'Revenue Dashboard',
          description: 'The core Raqm dashboard showing financial performance overview — real profit vs reported ROAS, contribution margin trends, CAC analysis, and attribution integrity scores.',
          image: '',
          specifications: 'Responsive (1440px primary, 1024px tablet, 375px mobile)',
          guidelines: 'Dark header bar with brand mark. White content area with card-based metrics. Signal Green for positive, Loss Red for negative, Alert Amber for warnings. Numbers are always the hero — large, bold, prominent.',
        },
        {
          name: 'Financial Diagnosis Report',
          description: 'Automated financial diagnosis PDF generated for each client — showing revenue leakage, attribution gaps, and recommended infrastructure.',
          image: '',
          specifications: 'A4 PDF, 8-12 pages, auto-generated from client data.',
          guidelines: 'Cover: dark with RAQM wordmark. Interior: white pages with structured data tables, charts in brand colors, and clear section headers. No decorative elements — the data IS the design.',
        },
      ],
      print: [
        {
          name: 'Client Proposal',
          description: 'Branded proposal document for new performance infrastructure engagements.',
          image: '',
          specifications: 'A4 landscape, 15-20 pages, digital PDF delivery.',
          guidelines: 'Title slide dark. Financial diagnosis section uses data visualization. Service architecture uses structured grid diagrams. Pricing uses clean tables. Closing slide with next steps. Every page earns its place.',
        },
      ],
      packaging: [],
      environmental: [
        {
          name: 'Office Wall Display',
          description: 'Minimal interior signage for Raqm office — wordmark on dark wall.',
          image: '',
          specifications: 'Brushed aluminum cutout letters, LED backlit, 1200mm width.',
          guidelines: 'White or silver cut letters on dark wall surface. No additional decoration. The precision of the letterforms is the design statement.',
        },
      ],
    },
    language: {
      primary: 'Arabic',
      secondary: ['English'],
      direction: 'rtl',
      localization: [
        {
          language: 'Arabic',
          adaptations: [
            'Arabic is the primary language for Saudi market communications',
            'Use modern business Arabic — not literary, not colloquial',
            'Financial terms can remain in English where industry-standard (ROAS, CAC, etc.)',
            'UI supports RTL layout natively',
          ],
          examples: [
            'رقم يبني بنية أداء تربط التسويق بالربح الحقيقي',
            'الوضوح المالي. ليس الضجيج التسويقي.',
          ],
        },
        {
          language: 'English',
          adaptations: [
            'English for international communications and technical documentation',
            'Maintain the same direct, financial tone in English',
            'Never translate marketing fluff — keep it sharp in both languages',
          ],
          examples: [
            'Raqm builds performance infrastructure that turns marketing activity into measurable financial impact.',
            'If it doesn\'t make or save money, we don\'t sell it.',
          ],
        },
      ],
    },
  },
  assets: [
    {
      id: 'raqm-logo-primary',
      name: 'RAQM Wordmark (Violet)',
      type: 'logo',
      category: 'logo',
      url: RAQM_LOGO_URL,
      size: 4200,
      source: 'url' as const,
      tags: ['logo', 'primary', 'wordmark', 'svg', 'violet'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-03-01'),
    },
    {
      id: 'raqm-logo-white',
      name: 'RAQM Wordmark (White)',
      type: 'logo',
      category: 'logo',
      url: RAQM_LOGO_WHITE_URL,
      size: 4200,
      source: 'url' as const,
      tags: ['logo', 'white', 'reversed', 'svg'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-03-01'),
    },
    {
      id: 'raqm-logo-black',
      name: 'RAQM Wordmark (Black)',
      type: 'logo',
      category: 'logo',
      url: RAQM_LOGO_BLACK_URL,
      size: 4200,
      source: 'url' as const,
      tags: ['logo', 'black', 'monochrome', 'svg'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-03-01'),
    },
    {
      id: 'raqm-brand-guide',
      name: 'Raqm Brand Guidelines v1.0',
      type: 'document',
      category: 'logo',
      url: '',
      size: 5200000,
      source: 'url' as const,
      tags: ['guidelines', 'brand-guide', 'pdf'],
      metadata: { format: 'PDF' },
      createdAt: new Date('2025-03-15'),
    },
    {
      id: 'raqm-proposal-template',
      name: 'Client Proposal Template',
      type: 'template',
      category: 'application',
      url: '',
      size: 2400000,
      source: 'url' as const,
      tags: ['proposal', 'template', 'presentation'],
      metadata: { format: 'PDF' },
      createdAt: new Date('2025-03-10'),
    },
    {
      id: 'raqm-business-card',
      name: 'Business Card Template',
      type: 'template',
      category: 'stationery',
      url: '',
      size: 380000,
      source: 'url' as const,
      tags: ['business-card', 'template', 'print'],
      metadata: { format: 'PDF', colorMode: 'CMYK' },
      createdAt: new Date('2025-03-08'),
    },
    {
      id: 'raqm-social-kit',
      name: 'Social Media Kit',
      type: 'template',
      category: 'social',
      url: '',
      size: 4100000,
      source: 'url' as const,
      tags: ['social', 'instagram', 'linkedin', 'twitter'],
      metadata: { format: 'ZIP' },
      createdAt: new Date('2025-03-12'),
    },
    {
      id: 'raqm-icon-set',
      name: 'Raqm Icon Set',
      type: 'icon',
      category: 'icon',
      url: '',
      size: 520000,
      source: 'url' as const,
      tags: ['icons', 'ui', 'financial', 'svg'],
      metadata: { format: 'SVG' },
      createdAt: new Date('2025-03-05'),
    },
  ],
  isPublic: false,
  createdAt: new Date('2025-03-01'),
  updatedAt: new Date('2025-03-20'),
};
