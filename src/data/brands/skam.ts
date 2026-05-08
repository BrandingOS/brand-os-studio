import type { Brand } from '@/shared/types/brand';

/**
 * SKAM Logo System
 * Text-based wordmark "SKAM" in bold display typography.
 * Logo assets to be added when provided by the brand.
 * Brand color: #EF4444 (SKAM Red)
 */
export const SKAM_LOGO_URL = '/brands/skam/logo.svg';
export const SKAM_LOGO_WHITE_URL = '/brands/skam/logo-white.svg';
export const SKAM_LOGO_BLACK_URL = '/brands/skam/logo-black.svg';

/**
 * SKAM — The Ultimate Social Card Game
 * Premium social card game brand based in Istanbul, Turkey.
 * Designs, develops, and produces physical games that bring people together.
 */
export const skamBrand: Brand = {
  id: 'skam-brand-001',
  slug: 'skam',
  name: 'SKAM',
  logo: SKAM_LOGO_URL,
  primaryColor: '#EF4444',
  secondaryColor: '#FFFFFF',
  fonts: {
    primary: 'GT Super',
    secondary: 'Bricolage Grotesque',
  },
  tone: 'Bold, Playful & Intentionally Premium',
  audience: 'Young social gamers, university students, and party-goers in Turkey and the Arab world — people who value face-to-face connection, group experiences, and premium game nights',
  strategy: 'SKAM positions itself as a luxury social card game company that brings people together through meticulously crafted physical games. Every product is built to create unforgettable moments — quality over quantity, timeless over trendy.',
  guidelines: {
    strategy: {
      mission: 'Design, develop, and produce physical games that bring people together. Every product we make is built to create unforgettable moments.',
      vision: 'To be the game company that made your favorite game — not the biggest, but the one that matters most. More games. More moments. More reasons to put the phone down.',
      values: ['Craftsmanship', 'Human Connection', 'Quality Over Quantity', 'Intentional Design', 'Timeless Play'],
      positioning: 'The Ultimate Social Card Game — SKAM builds premium physical games engineered for unforgettable social moments. Each title is crafted to be timeless.',
      personality: ['Bold', 'Playful', 'Premium', 'Intentional', 'Social', 'Confident', 'Dark', 'Minimal'],
      targetAudience: 'Primary: Young adults (18–30) in Turkey and the Arab world — university students, social groups, and party-goers. Egyptian and Arab student communities in Istanbul. People who prefer face-to-face connection over screen time. Secondary: Card game enthusiasts and party game collectors globally.',
    },
    logoSystem: {
      // SKAM has three distinct production assets — the colored wordmark
      // and the black/white mono variants. Aliasing the wordmark URL
      // across `secondary` / `wordmark` / `iconmark` (as the seed used
      // to) created lookalike duplicates everywhere variants surface.
      // Roles without a unique asset are intentionally LEFT UNSET.
      primary: {
        url: SKAM_LOGO_URL,
        description: 'The SKAM wordmark set in bold Bricolage Grotesque display type. Large, commanding letterforms designed for maximum impact on dark backgrounds. The typography itself IS the logo — no icon, no embellishment.',
        usage: 'Primary brand identifier for all major touchpoints — website hero, packaging, event banners, and official communications. Always use at large scale for maximum impact.',
      },
      blackVersion: {
        url: SKAM_LOGO_BLACK_URL,
        description: 'Single-color black version for light background applications and monochrome print.',
        usage: 'Print on light backgrounds, official documents, merchandise on light fabrics, partner materials.',
      },
      whiteVersion: {
        url: SKAM_LOGO_WHITE_URL,
        description: 'White version for the primary dark background brand expression. This is the default — SKAM lives on black.',
        usage: 'Website, packaging, event backdrops, social media, merchandise on dark fabrics. This is the most-used variant.',
      },
      clearSpace: '1x the cap height of the S on all sides minimum',
      minSize: '60px width for digital, 20mm for print',
      usage: [
        {
          do: 'Always present the logo on solid dark backgrounds — black is the brand\'s native environment',
          dont: 'Place the logo on busy backgrounds, photographs, gradients, or light surfaces without switching to the black variant',
          example: 'On the website hero, the SKAM wordmark sits in 9xl white type on pure black with generous space',
        },
        {
          do: 'Use only the approved color variants: white on black, black on white, or red accent for special emphasis',
          dont: 'Apply outlines, shadows, glows, 3D effects, or any unapproved color treatments to the wordmark',
          example: 'On packaging, use white wordmark on matte black card stock',
        },
        {
          do: 'Scale proportionally and maintain the bold weight — the logo must always feel commanding',
          dont: 'Use thin weights, stretch, compress, or reduce the logo below minimum size where it loses impact',
          example: 'Event banners use the wordmark at maximum practical size, never competing with other elements',
        },
      ],
    },
    colorPalette: {
      primary: {
        hex: '#EF4444',
        rgb: 'rgb(239, 68, 68)',
        cmyk: 'C:0 M:72 Y:72 K:6',
        pantone: 'Pantone 185 C',
        name: 'SKAM Red',
        usage: 'Primary accent color — used sparingly for emphasis, CTAs, highlights, and brand moments. Red is the energy that cuts through the dark. Never used as a background fill — always as a precise accent.',
      },
      secondary: {
        hex: '#FFFFFF',
        rgb: 'rgb(255, 255, 255)',
        cmyk: 'C:0 M:0 Y:0 K:0',
        name: 'Pure White',
        usage: 'Primary text color on dark surfaces, logo default, headlines, and all foreground content. White is the voice of SKAM — bold and clear against the darkness.',
      },
      accent: {
        hex: '#EF4444',
        rgb: 'rgb(239, 68, 68)',
        cmyk: 'C:0 M:72 Y:72 K:6',
        pantone: 'Pantone 185 C',
        name: 'Action Red',
        usage: 'Interactive elements, call-to-action buttons, links, and attention-drawing moments. Same red, different context — accent is for interaction.',
      },
      neutral: [
        {
          hex: '#000000',
          rgb: 'rgb(0, 0, 0)',
          cmyk: 'C:0 M:0 Y:0 K:100',
          name: 'SKAM Black',
          usage: 'The brand\'s primary surface color. All backgrounds, all environments, all contexts start with black. This IS the brand — darkness is not an aesthetic choice, it is the identity.',
        },
        {
          hex: '#222222',
          rgb: 'rgb(34, 34, 34)',
          cmyk: 'C:0 M:0 Y:0 K:87',
          name: 'Surface Dark',
          usage: 'Hover states, elevated card surfaces, secondary backgrounds, and interactive feedback. Slightly lighter than black for depth and hierarchy.',
        },
        {
          hex: '#94938E',
          rgb: 'rgb(148, 147, 142)',
          cmyk: 'C:0 M:1 Y:4 K:42',
          name: 'Stone Gray',
          usage: 'Muted text, secondary labels, descriptions, timestamps, and supporting content. The quiet voice beneath the bold headlines.',
        },
        {
          hex: '#FFFFFF',
          rgb: 'rgb(255, 255, 255)',
          cmyk: 'C:0 M:0 Y:0 K:0',
          name: 'White',
          usage: 'Primary text, headlines, logo, and all foreground content on dark surfaces.',
        },
      ],
      semantic: {
        success: {
          hex: '#22C55E',
          rgb: 'rgb(34, 197, 94)',
          cmyk: 'C:83 M:0 Y:52 K:23',
          name: 'Win Green',
          usage: 'Successful actions, available stock, positive game states, and confirmation messages.',
        },
        warning: {
          hex: '#F59E0B',
          rgb: 'rgb(245, 158, 11)',
          cmyk: 'C:0 M:35 Y:95 K:4',
          name: 'Alert Amber',
          usage: 'Low stock warnings, pending states, and attention-needed indicators.',
        },
        error: {
          hex: '#EF4444',
          rgb: 'rgb(239, 68, 68)',
          cmyk: 'C:0 M:72 Y:72 K:6',
          name: 'Error Red',
          usage: 'Sold out states, form errors, failed transactions, and critical alerts. Same as brand red — errors are on-brand.',
        },
        info: {
          hex: '#94938E',
          rgb: 'rgb(148, 147, 142)',
          cmyk: 'C:0 M:1 Y:4 K:42',
          name: 'Info Gray',
          usage: 'Informational messages, help text, tooltips, and neutral system states.',
        },
      },
    },
    typography: {
      primary: {
        family: 'GT Super',
        weights: [400, 500, 700],
        fallbacks: ['Georgia', 'serif'],
        usage: 'Display and heading typeface for editorial and brand-forward contexts. A refined serif with character — used for hero headlines, manifesto text, and premium brand moments. GT Super brings warmth and personality to the dark, minimal aesthetic.',
      },
      secondary: {
        family: 'Bricolage Grotesque',
        weights: [400, 600, 700, 800],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        usage: 'Primary display sans-serif for the SKAM wordmark, large headlines, and bold typographic moments. Used at massive scale (7xl–9xl) for maximum impact. Geometric and commanding.',
      },
      accent: {
        family: 'Favorit',
        weights: [400, 500, 600],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        usage: 'UI typeface for body text, navigation, buttons, labels, and interface elements. Often used in uppercase with semibold weight for navigation and category labels. Clean and functional.',
      },
      scale: {
        h1: '8rem/1.0',
        h2: '4.5rem/1.05',
        h3: '2.25rem/1.15',
        h4: '1.75rem/1.25',
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
          { element: 'H1', fontSize: '8rem', lineHeight: '1.0', fontWeight: 700, usage: 'Hero display — the SKAM wordmark and primary page headlines. Bricolage Grotesque Bold at massive scale. This is the brand\'s visual shout.' },
          { element: 'H2', fontSize: '4.5rem', lineHeight: '1.05', fontWeight: 700, usage: 'Section headlines and product names. GT Super Bold for editorial warmth or Bricolage for impact.' },
          { element: 'H3', fontSize: '2.25rem', lineHeight: '1.15', fontWeight: 600, usage: 'Subsection headers, card titles, and partner names. GT Super or Favorit SemiBold.' },
        ],
        body: [
          { element: 'Body Large', fontSize: '1.125rem', lineHeight: '1.6', fontWeight: 400, usage: 'Manifesto text, brand story paragraphs, and long-form content. GT Super Regular for editorial feel.' },
          { element: 'Body', fontSize: '1rem', lineHeight: '1.6', fontWeight: 400, usage: 'Standard body text, descriptions, product details, and partner descriptions. Favorit Regular.' },
          { element: 'Body Small', fontSize: '0.875rem', lineHeight: '1.5', fontWeight: 400, usage: 'Metadata, timestamps, secondary descriptions, and fine print. Favorit Regular.' },
        ],
        ui: [
          { element: 'Button', fontSize: '0.875rem', lineHeight: '1.0', fontWeight: 600, usage: 'CTAs and action buttons — "Join Wishlist", "Explore", "Become a Partner". Favorit SemiBold, often uppercase.' },
          { element: 'Navigation', fontSize: '0.875rem', lineHeight: '1.0', fontWeight: 600, usage: 'Top nav items — Store, Events, Manifesto, Partners. Favorit SemiBold uppercase with wide tracking.' },
          { element: 'Label', fontSize: '0.75rem', lineHeight: '1.4', fontWeight: 500, usage: 'Category tags, partner types, event labels. Favorit Medium uppercase.' },
        ],
      },
    },
    voiceAndTone: {
      brandVoice: 'SKAM speaks with quiet confidence and deliberate intention. The voice is that of a craft-obsessed creator who believes in the power of face-to-face human connection. Every word earns its place. We are serious about play — not serious in how we play. We sound like the friend who always brings the best game to the party, but who spent months perfecting every card.',
      toneAttributes: ['Confident', 'Intentional', 'Craft-obsessed', 'Warm but premium', 'Direct', 'Community-driven'],
      communicationStyle: 'Short, punchy sentences with purpose. No marketing fluff. No exclamation marks unless absolutely earned. Manifesto-style writing — declarative statements that feel like principles, not sales pitches. Period-heavy rhythm. Each sentence stands alone. We state what we believe and let the work speak.',
      doAndDonts: {
        do: [
          'Lead with the human moment — "We want people to laugh, argue, confess, and connect — face to face"',
          'Use declarative, manifesto-style statements — "Quality over quantity." "This is serious craft."',
          'Speak about the product with genuine craft pride — every card, every rule, every detail matters',
          'Reference real social experiences — trips, game nights, gatherings, late-night Ramadan sessions',
          'Be direct and confident — "We don\'t want to be the biggest game company. We want to be the one that made your favorite game."',
        ],
        dont: [
          'Use generic gaming industry language — "epic", "insane", "lit", "fire"',
          'Over-explain mechanics or rules in brand communications — let mystery build anticipation',
          'Sound corporate or startup-ish — no "disrupting the industry" or "revolutionizing game night"',
          'Use excessive emojis or internet slang in official brand communications',
          'Promise what hasn\'t been built yet — "This is just the beginning" is as far as we go',
        ],
      },
      examples: [
        {
          context: 'Brand manifesto',
          good: 'We would rather make one game that people love forever than ten they forget. Each SKAM title is crafted to be timeless.',
          bad: 'We\'re creating the most EPIC card games ever!! Get ready to have your mind BLOWN with our insane new collection! 🔥🎮',
        },
        {
          context: 'Product description',
          good: 'SKAM. Up to 5 Players. The perfect game for trips. 350 TL.',
          bad: 'Introducing our AMAZING new card game that will make your parties 10x more fun! Order now before it\'s too late!!!',
        },
        {
          context: 'Social media / event promotion',
          good: 'SKAM day was packed with games, challenges, and great vibes. A cozy late night during Ramadan — SKAM players stayed up playing together.',
          bad: '🎉🃏 COME JOIN US for the CRAZIEST game night EVER! You won\'t believe what we have planned!! Link in bio! 🔗💥',
        },
      ],
    },
    iconography: {
      style: 'Minimal, rounded-edge outline icons that complement the bold typography without competing for attention',
      weight: '1.5px stroke',
      cornerRadius: '2px — slightly softened to match the brand\'s warm-but-premium feel',
      examples: [
        {
          category: 'Gaming',
          icons: [
            { name: 'Spade', url: '', usage: 'Card game references, game categories, card-related UI' },
            { name: 'Users', url: '', usage: 'Player counts, community, social features' },
            { name: 'Dice', url: '', usage: 'Randomness, game mechanics, chance elements' },
          ],
        },
        {
          category: 'Commerce',
          icons: [
            { name: 'ShoppingBag', url: '', usage: 'Store, purchase actions, cart' },
            { name: 'Package', url: '', usage: 'Orders, shipping, delivery status' },
            { name: 'CreditCard', url: '', usage: 'Payment, checkout, pricing' },
          ],
        },
        {
          category: 'Social',
          icons: [
            { name: 'Instagram', url: '', usage: 'Instagram link, social sharing' },
            { name: 'MessageCircle', url: '', usage: 'WhatsApp contact, community chat' },
            { name: 'Calendar', url: '', usage: 'Events, upcoming dates, scheduling' },
          ],
        },
      ],
      usage: 'Use Lucide React icons. Keep icons secondary to typography — they support, never lead. Maintain 1.5px stroke weight and 20px default size. Never fill icons. Icon color matches text color in context (white on dark, muted for secondary).',
    },
    socialMedia: {
      platforms: [
        {
          name: 'Instagram',
          profileImage: { width: 320, height: 320 },
          coverImage: { width: 1080, height: 1080 },
          postImage: { width: 1080, height: 1080 },
          guidelines: 'Primary social platform — @skam.cards. Event documentaries, product shots on dark backgrounds, community moments, partner features. Dark aesthetic with grain texture. Video-heavy content from game nights and events. Behind-the-scenes craft process.',
        },
        {
          name: 'TikTok',
          profileImage: { width: 200, height: 200 },
          coverImage: { width: 1080, height: 1920 },
          postImage: { width: 1080, height: 1920 },
          guidelines: 'Short-form video content — game night moments, reaction clips, event highlights, unboxing. More casual tone allowed but still on-brand. Dark editing style. No cringy trends unless genuinely funny and on-brand.',
        },
        {
          name: 'WhatsApp',
          profileImage: { width: 500, height: 500 },
          coverImage: { width: 0, height: 0 },
          postImage: { width: 0, height: 0 },
          guidelines: 'Direct customer communication and community building. WhatsApp Business for orders, support, and event coordination. Warm and personal tone — this is where the community lives.',
        },
        {
          name: 'LinkedIn',
          profileImage: { width: 400, height: 400 },
          coverImage: { width: 1584, height: 396 },
          postImage: { width: 1200, height: 627 },
          guidelines: 'Brand story, partnership announcements, and business milestones. More professional tone but still distinctly SKAM — never corporate. Used for partner outreach and industry presence.',
        },
      ],
      guidelines: 'All social content reinforces the core message: SKAM creates premium physical games that bring people together face to face. Dark backgrounds are default. Red accents used sparingly. Community and real moments over polished marketing. Video and event documentation over static product shots. Arabic and English bilingual for Turkey/Arab market. Instagram handle: @skam.cards.',
    },
    stationery: {
      businessCard: {
        description: 'Matte black business card with SKAM wordmark in white. Back: solid SKAM Red with white contact details.',
        specifications: '3.5" x 2" (89mm x 51mm), 450gsm black-core stock, soft-touch matte laminate.',
        template: '',
        guidelines: 'Front: Pure black, white SKAM wordmark centered or top-left, name and role in Favorit Medium, minimal contact info. Back: SKAM Red full bleed with white text. Maximum 3 lines of contact info. The card should feel heavy and premium.',
      },
      letterhead: {
        description: 'Black or white letterhead with SKAM wordmark header and minimal red accent line.',
        specifications: 'A4 (210mm x 297mm), 120gsm premium stock.',
        template: '',
        guidelines: 'White variant: SKAM wordmark top-left in black, thin red accent line below spanning 30% width. Black variant: white wordmark, red accent. Body text in Favorit Regular 10pt. Footer: contact email and Instagram in muted gray.',
      },
      envelope: {
        description: 'Matte black envelope with white SKAM wordmark.',
        specifications: 'C5 envelope (162mm x 229mm), black stock, white foil stamp.',
        template: '',
        guidelines: 'SKAM wordmark top-left corner. Return address in Favorit Regular 7pt white. No additional decoration — the black envelope IS the statement.',
      },
      presentation: {
        description: 'Dark-mode pitch deck with bold typography, grain texture, and red accent moments.',
        specifications: '16:9 (1920x1080px), Keynote / Google Slides compatible.',
        template: '',
        guidelines: 'All slides: black background with grain texture overlay. Title slides: Bricolage Grotesque Bold massive type. Content slides: Favorit body text in white/gray. Red used only for key numbers or emphasis. Maximum 15 words per slide. Let the darkness and typography do the work.',
      },
    },
    applications: {
      digital: [
        {
          name: 'SKAM Website',
          description: 'The primary digital presence — dark-mode immersive experience with bold typography, grain texture backgrounds, smooth scroll animations, and a premium e-commerce store.',
          image: '',
          specifications: 'Responsive (mobile-first), PWA-enabled, Next.js application hosted on Vercel.',
          guidelines: 'Pure black background with grain texture overlay. White text, red accents on CTAs. Lenis smooth scrolling. Product images on dark with hover scale effects. Navigation in Favorit SemiBold uppercase. Hero headline in Bricolage 9xl.',
        },
        {
          name: 'SKAM Store',
          description: 'E-commerce platform selling SKAM card games — SKAM (5 players, 350 TL) and SKAM ELLAMA (9 players, 550 TL). Future: coins, totebags, gift cards.',
          image: '',
          specifications: 'Integrated within the main website, responsive product grid.',
          guidelines: 'Product cards on dark surface with rounded corners (2xl). Hover: scale 105% with shadow. Price in white, product name bold. "Top Pick" badge for featured products. Stock/availability shown clearly.',
        },
      ],
      print: [
        {
          name: 'Card Game Packaging',
          description: 'Premium matte black packaging for SKAM card games. The unboxing experience is part of the brand.',
          image: '',
          specifications: 'Custom box dimensions per game variant. 350gsm matte black card stock.',
          guidelines: 'White SKAM wordmark on matte black. Minimal information — game name, player count, age range. No busy graphics. Premium feel through material quality and restraint. The box should feel like it contains something worth gathering around.',
        },
        {
          name: 'Event Materials',
          description: 'Posters, banners, and printed materials for SKAM events — game nights, EID celebrations, picnics.',
          image: '',
          specifications: 'Various sizes, digital print and large format.',
          guidelines: 'Always dark backgrounds. SKAM wordmark dominant. Event name in GT Super. Date and details in Favorit. Red accent for urgency or featured info. Partner logos arranged in clean grid.',
        },
      ],
      packaging: [
        {
          name: 'SKAM Card Deck',
          description: 'The physical card product — premium card stock with custom illustrations and the SKAM design language.',
          image: '',
          specifications: 'Standard playing card size, 300gsm coated card stock, custom card back design.',
          guidelines: 'Card backs: consistent SKAM branding pattern on black. Card faces: clear typography, game mechanics readable at a glance. Every card is designed with luxury-level attention. Materials must feel premium in the hand.',
        },
      ],
      environmental: [
        {
          name: 'Event Space Branding',
          description: 'SKAM event setups at partner venues, university spaces, and community gatherings. Banners, table cards, and ambient branding.',
          image: '',
          specifications: 'Pull-up banners (800x2000mm), table cards (A5), stickers.',
          guidelines: 'Dark brand environment even in bright spaces. Use dark tablecloths, branded table cards, and pull-up banners to create a SKAM zone. Partner co-branding integrated cleanly. The space should feel like entering the brand world.',
        },
      ],
    },
    language: {
      primary: 'English',
      secondary: ['Arabic', 'Turkish'],
      direction: 'ltr',
      localization: [
        {
          language: 'English',
          adaptations: [
            'Primary brand language for website, packaging, and official communications',
            'Manifesto-style writing — short declarative sentences with period-heavy rhythm',
            'Casual but intentional — never sloppy, never corporate',
            'Lowercase preference in casual contexts (social, community) — feels approachable',
          ],
          examples: [
            'We would rather make one game that people love forever than ten they forget.',
            'A great game is not just fun — it is engineered.',
            'The future holds more. More games. More moments. More reasons to put the phone down.',
          ],
        },
        {
          language: 'Arabic',
          adaptations: [
            'Used for community engagement with Egyptian and Arab student audiences in Turkey',
            'Maintain the same confident, warm tone in Arabic',
            'Mix Arabic with English gaming terms where natural',
            'Community events and partner communications often in Arabic',
          ],
          examples: [
            'سكام — اللعبة المثالية للرحلات',
            'كل لعبة مصنوعة عشان تخلق لحظات ما تتنسى',
          ],
        },
        {
          language: 'Turkish',
          adaptations: [
            'Used for local Istanbul market, Turkish partner communications, and store/shipping contexts',
            'Pricing displayed in Turkish Lira (TL / ₺)',
            'Local event promotion and venue coordination in Turkish where needed',
          ],
          examples: [
            'SKAM — Sosyal kart oyunu deneyimi',
          ],
        },
      ],
    },
  },
  assets: [
    {
      id: 'skam-logo-primary',
      name: 'SKAM Wordmark (White)',
      type: 'logo',
      category: 'logo',
      url: SKAM_LOGO_URL,
      size: 3200,
      source: 'url' as const,
      tags: ['logo', 'primary', 'wordmark', 'svg', 'white'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-01-01'),
    },
    {
      id: 'skam-logo-white',
      name: 'SKAM Wordmark (White on Dark)',
      type: 'logo',
      category: 'logo',
      url: SKAM_LOGO_WHITE_URL,
      size: 3200,
      source: 'url' as const,
      tags: ['logo', 'white', 'reversed', 'svg'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-01-01'),
    },
    {
      id: 'skam-logo-black',
      name: 'SKAM Wordmark (Black)',
      type: 'logo',
      category: 'logo',
      url: SKAM_LOGO_BLACK_URL,
      size: 3200,
      source: 'url' as const,
      tags: ['logo', 'black', 'monochrome', 'svg'],
      metadata: { dimensions: { width: 400, height: 100 }, format: 'SVG', colorMode: 'RGB' },
      createdAt: new Date('2025-01-01'),
    },
    {
      id: 'skam-brand-guide',
      name: 'SKAM Brand Guidelines v1.0',
      type: 'document',
      category: 'logo',
      url: '',
      size: 4800000,
      source: 'url' as const,
      tags: ['guidelines', 'brand-guide', 'pdf'],
      metadata: { format: 'PDF' },
      createdAt: new Date('2025-01-15'),
    },
    {
      id: 'skam-product-photos',
      name: 'SKAM Product Photography Set',
      type: 'image',
      category: 'application',
      url: '',
      size: 8200000,
      source: 'url' as const,
      tags: ['product', 'photography', 'store', 'packaging'],
      metadata: { format: 'JPG', colorMode: 'RGB' },
      createdAt: new Date('2025-01-10'),
    },
    {
      id: 'skam-social-kit',
      name: 'Social Media Kit',
      type: 'template',
      category: 'social',
      url: '',
      size: 3600000,
      source: 'url' as const,
      tags: ['social', 'instagram', 'tiktok', 'templates'],
      metadata: { format: 'ZIP' },
      createdAt: new Date('2025-01-12'),
    },
    {
      id: 'skam-event-templates',
      name: 'Event Materials Templates',
      type: 'template',
      category: 'application',
      url: '',
      size: 2800000,
      source: 'url' as const,
      tags: ['events', 'posters', 'banners', 'print'],
      metadata: { format: 'ZIP' },
      createdAt: new Date('2025-01-08'),
    },
    {
      id: 'skam-grain-texture',
      name: 'SKAM Grain Texture Overlay',
      type: 'image',
      category: 'application',
      url: '/images/grain.png',
      size: 120000,
      source: 'url' as const,
      tags: ['texture', 'grain', 'background', 'overlay'],
      metadata: { format: 'PNG', colorMode: 'RGB' },
      createdAt: new Date('2025-01-01'),
    },
  ],
  isPublic: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2026-04-02'),
};
