import type { Brand } from '@/shared/types/brand';

export const demoBrandIdentity: Brand = {
  id: 'demo-brand-1',
  name: 'The Main Brand',
  logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center',
  primaryColor: '#2563eb',
  secondaryColor: '#f59e0b',
  fonts: {
    primary: 'Inter',
    secondary: 'Poppins',
  },
  tone: 'Professional & Innovative',
  audience: 'Tech-savvy businesses and startups',
  strategy: 'Positioning as a cutting-edge technology solutions provider that delivers innovation with reliability.',
  guidelines: {
    strategy: {
      mission: 'To empower businesses with cutting-edge technology solutions that drive innovation and growth.',
      vision: 'To be the leading technology partner that transforms how businesses operate in the digital age.',
      values: ['Innovation', 'Reliability', 'Excellence', 'Partnership', 'Integrity'],
      positioning: 'The trusted technology partner for forward-thinking businesses.',
      personality: ['Innovative', 'Professional', 'Reliable', 'Expert', 'Approachable'],
      targetAudience: 'Tech-savvy businesses, startups, and scale-ups looking for reliable technology solutions.',
    },
    logoSystem: {
      primary: {
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
        description: 'The primary logo represents our core brand identity and should be used in most applications.',
        usage: 'Use for main brand communications, headers, and primary touchpoints.',
      },
      secondary: {
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center&brightness=0.8',
        description: 'A simplified version of our logo for smaller applications and secondary placements.',
        usage: 'Use when space is limited or as a supporting brand element.',
      },
      wordmark: {
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop',
        description: 'Text-only version of our brand name with consistent typography.',
        usage: 'Use when the icon version is not suitable or in text-heavy contexts.',
      },
      iconmark: {
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center',
        description: 'Standalone icon that represents our brand without text.',
        usage: 'Use for app icons, social media profiles, and compact spaces.',
      },
      blackVersion: {
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center&contrast=100&brightness=0',
        description: 'Single-color black version for print and monochrome applications.',
        usage: 'Use for newspaper ads, stamps, embossing, and single-color applications.',
      },
      whiteVersion: {
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center&contrast=100&brightness=200',
        description: 'Single-color white version for dark backgrounds.',
        usage: 'Use on dark backgrounds, photography, and reverse applications.',
      },
      clearSpace: '2x the height of the logo',
      minSize: '24px height for digital, 0.5 inch for print',
      usage: [
        {
          do: 'Maintain clear space around the logo',
          dont: 'Place other elements too close to the logo',
          example: 'Always keep a minimum clear space equivalent to 2x the logo height',
        },
        {
          do: 'Use approved logo versions only',
          dont: 'Recreate, modify, or distort the logo',
          example: 'Download official logo files from the brand asset library',
        },
      ],
    },
    colorPalette: {
      primary: {
        hex: '#2563eb',
        rgb: 'rgb(37, 99, 235)',
        cmyk: 'C:84 M:58 Y:0 K:8',
        pantone: 'Pantone 2728 C',
        name: 'TechFlow Blue',
        usage: 'Primary brand color for headlines, CTAs, and key brand elements.',
      },
      secondary: {
        hex: '#f59e0b',
        rgb: 'rgb(245, 158, 11)',
        cmyk: 'C:0 M:35 Y:95 K:4',
        pantone: 'Pantone 130 C',
        name: 'Innovation Amber',
        usage: 'Secondary color for accents, highlights, and supporting elements.',
      },
      accent: {
        hex: '#06b6d4',
        rgb: 'rgb(6, 182, 212)',
        cmyk: 'C:97 M:14 Y:0 K:17',
        pantone: 'Pantone 3125 C',
        name: 'Tech Cyan',
        usage: 'Accent color for links, interactive elements, and data visualization.',
      },
      neutral: [
        {
          hex: '#f8fafc',
          rgb: 'rgb(248, 250, 252)',
          cmyk: 'C:2 M:1 Y:0 K:1',
          name: 'Light Gray',
          usage: 'Background color for light themes and subtle backgrounds.',
        },
        {
          hex: '#e2e8f0',
          rgb: 'rgb(226, 232, 240)',
          cmyk: 'C:6 M:3 Y:0 K:6',
          name: 'Medium Gray',
          usage: 'Borders, dividers, and subtle UI elements.',
        },
        {
          hex: '#94a3b8',
          rgb: 'rgb(148, 163, 184)',
          cmyk: 'C:20 M:11 Y:0 K:28',
          name: 'Cool Gray',
          usage: 'Secondary text and placeholder content.',
        },
        {
          hex: '#475569',
          rgb: 'rgb(71, 85, 105)',
          cmyk: 'C:32 M:19 Y:0 K:59',
          name: 'Dark Gray',
          usage: 'Primary text color and important UI elements.',
        },
        {
          hex: '#1e293b',
          rgb: 'rgb(30, 41, 59)',
          cmyk: 'C:49 M:31 Y:0 K:77',
          name: 'Charcoal',
          usage: 'Headlines, high-contrast text, and dark themes.',
        },
      ],
      semantic: {
        success: {
          hex: '#10b981',
          rgb: 'rgb(16, 185, 129)',
          cmyk: 'C:91 M:0 Y:30 K:27',
          name: 'Success Green',
          usage: 'Success messages, positive indicators, and confirmation states.',
        },
        warning: {
          hex: '#f59e0b',
          rgb: 'rgb(245, 158, 11)',
          cmyk: 'C:0 M:35 Y:95 K:4',
          name: 'Warning Amber',
          usage: 'Warning messages, caution indicators, and attention states.',
        },
        error: {
          hex: '#ef4444',
          rgb: 'rgb(239, 68, 68)',
          cmyk: 'C:0 M:72 Y:72 K:6',
          name: 'Error Red',
          usage: 'Error messages, destructive actions, and critical alerts.',
        },
        info: {
          hex: '#3b82f6',
          rgb: 'rgb(59, 130, 246)',
          cmyk: 'C:76 M:47 Y:0 K:4',
          name: 'Info Blue',
          usage: 'Informational messages, tips, and neutral notifications.',
        },
      },
    },
    typography: {
      primary: {
        family: 'Inter',
        weights: [400, 500, 600, 700, 800],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        usage: 'Primary typeface for all digital applications, UI text, and body content.',
      },
      secondary: {
        family: 'Poppins',
        weights: [300, 400, 500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
        usage: 'Secondary typeface for headlines, marketing materials, and brand messaging.',
      },
      scale: {
        h1: '3rem/1.1',
        h2: '2.5rem/1.2',
        h3: '2rem/1.3',
        h4: '1.75rem/1.3',
        h5: '1.5rem/1.4',
        h6: '1.25rem/1.4',
        body: '1rem/1.6',
        bodyLarge: '1.125rem/1.6',
        bodySmall: '0.875rem/1.5',
        caption: '0.75rem/1.4',
        overline: '0.75rem/1.0',
      },
      hierarchy: {
        headings: [
          {
            element: 'H1',
            fontSize: '3rem',
            lineHeight: '1.1',
            fontWeight: 700,
            usage: 'Page titles, hero headlines, primary messaging',
          },
          {
            element: 'H2',
            fontSize: '2.5rem',
            lineHeight: '1.2',
            fontWeight: 600,
            usage: 'Section headers, secondary headlines',
          },
          {
            element: 'H3',
            fontSize: '2rem',
            lineHeight: '1.3',
            fontWeight: 600,
            usage: 'Subsection headers, article titles',
          },
        ],
        body: [
          {
            element: 'Body Large',
            fontSize: '1.125rem',
            lineHeight: '1.6',
            fontWeight: 400,
            usage: 'Lead paragraphs, important body text',
          },
          {
            element: 'Body',
            fontSize: '1rem',
            lineHeight: '1.6',
            fontWeight: 400,
            usage: 'Standard body text, paragraphs',
          },
          {
            element: 'Body Small',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            fontWeight: 400,
            usage: 'Secondary text, captions, metadata',
          },
        ],
        ui: [
          {
            element: 'Button',
            fontSize: '0.875rem',
            lineHeight: '1.0',
            fontWeight: 500,
            usage: 'Buttons, CTAs, interactive elements',
          },
          {
            element: 'Label',
            fontSize: '0.75rem',
            lineHeight: '1.4',
            fontWeight: 500,
            usage: 'Form labels, UI labels, tags',
          },
        ],
      },
    },
    voiceAndTone: {
      brandVoice: 'Professional yet approachable, confident but not arrogant, innovative while remaining trustworthy.',
      toneAttributes: ['Expert', 'Helpful', 'Clear', 'Inspiring', 'Reliable'],
      communicationStyle: 'We communicate with clarity and confidence, using accessible language that empowers our audience to make informed decisions.',
      doAndDonts: {
        do: [
          'Use clear, jargon-free language',
          'Be specific and actionable',
          'Show empathy for customer challenges',
          'Highlight benefits over features',
          'Maintain a professional tone',
        ],
        dont: [
          'Use technical jargon without explanation',
          'Make unrealistic promises',
          'Sound robotic or corporate',
          'Overwhelm with too much information',
          'Use humor inappropriately',
        ],
      },
      examples: [
        {
          context: 'Error message',
          good: 'Something went wrong. Let\'s fix this together - try refreshing the page or contact our support team.',
          bad: 'Error 500: Internal server malfunction detected in system protocols.',
        },
        {
          context: 'Marketing headline',
          good: 'Transform your business with technology that actually works.',
          bad: 'Leverage cutting-edge paradigms to optimize your enterprise infrastructure.',
        },
      ],
    },
    iconography: {
      style: 'Outline icons with rounded corners',
      weight: '1.5px stroke weight',
      cornerRadius: '2px corner radius',
      examples: [
        {
          category: 'Technology',
          icons: [
            { name: 'Server', url: 'https://cdn.lucide.dev/icons/server.svg', usage: 'Representing hosting and infrastructure' },
            { name: 'Code', url: 'https://cdn.lucide.dev/icons/code.svg', usage: 'Development and programming' },
            { name: 'Cloud', url: 'https://cdn.lucide.dev/icons/cloud.svg', usage: 'Cloud services and storage' },
          ],
        },
        {
          category: 'Business',
          icons: [
            { name: 'Growth', url: 'https://cdn.lucide.dev/icons/trending-up.svg', usage: 'Business growth and success' },
            { name: 'Team', url: 'https://cdn.lucide.dev/icons/users.svg', usage: 'Collaboration and teamwork' },
            { name: 'Strategy', url: 'https://cdn.lucide.dev/icons/target.svg', usage: 'Goals and strategic planning' },
          ],
        },
      ],
      usage: 'Use consistent icon style throughout all applications. Icons should complement the typography and maintain visual hierarchy.',
    },
    socialMedia: {
      platforms: [
        {
          name: 'LinkedIn',
          profileImage: { width: 400, height: 400 },
          coverImage: { width: 1584, height: 396 },
          postImage: { width: 1200, height: 627 },
          guidelines: 'Professional tone, industry insights, thought leadership content',
        },
        {
          name: 'Twitter',
          profileImage: { width: 400, height: 400 },
          coverImage: { width: 1500, height: 500 },
          postImage: { width: 1200, height: 675 },
          guidelines: 'Timely updates, quick tips, industry news, engaging conversations',
        },
        {
          name: 'Instagram',
          profileImage: { width: 320, height: 320 },
          coverImage: { width: 1080, height: 1080 },
          postImage: { width: 1080, height: 1080 },
          guidelines: 'Visual storytelling, behind-the-scenes content, company culture',
        },
      ],
      guidelines: 'Maintain consistent brand voice across all platforms while adapting content to platform-specific audiences and formats.',
    },
    stationery: {
      businessCard: {
        description: 'Standard business card with logo, contact information, and brand colors',
        specifications: '3.5" x 2" (89mm x 51mm), 350gsm cardstock, matte finish',
        template: '/templates/business-card.pdf',
        guidelines: 'Use primary logo, maintain clear space, include essential contact information only',
      },
      letterhead: {
        description: 'Official letterhead for formal business correspondence',
        specifications: '8.5" x 11" (216mm x 279mm), 70gsm paper, full bleed',
        template: '/templates/letterhead.pdf',
        guidelines: 'Logo placement in header, consistent margins, professional layout',
      },
      envelope: {
        description: 'Branded envelope design for business correspondence',
        specifications: '#10 envelope (4.125" x 9.5"), offset printing',
        template: '/templates/envelope.pdf',
        guidelines: 'Minimal branding, return address format, postal compliance',
      },
      presentation: {
        description: 'PowerPoint template for business presentations',
        specifications: '16:9 aspect ratio, master slides, brand colors',
        template: '/templates/presentation.pptx',
        guidelines: 'Consistent slide layouts, readable fonts, professional imagery',
      },
    },
    applications: {
      digital: [
        {
          name: 'Website Header',
          description: 'Primary navigation with logo and key menu items',
          image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=400&fit=crop',
          specifications: 'Responsive design, sticky navigation, search functionality',
          guidelines: 'Logo left-aligned, navigation center, CTA right-aligned',
        },
        {
          name: 'Email Signature',
          description: 'Professional email signature for all team members',
          image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&h=300&fit=crop',
          specifications: 'HTML format, mobile-responsive, contact information',
          guidelines: 'Minimal design, essential contact info, brand colors',
        },
      ],
      print: [
        {
          name: 'Brochure',
          description: 'Tri-fold brochure for service overview',
          image: 'https://images.unsplash.com/photo-1586927134295-c8b27d0aa34e?w=600&h=400&fit=crop',
          specifications: '8.5" x 11" tri-fold, 150gsm paper, full color',
          guidelines: 'Clear hierarchy, compelling imagery, strong call-to-action',
        },
      ],
      packaging: [
        {
          name: 'Software Box',
          description: 'Product packaging for software solutions',
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
          specifications: 'Custom dimensions, CMYK printing, matte finish',
          guidelines: 'Product hero image, key features, brand consistency',
        },
      ],
      environmental: [
        {
          name: 'Office Signage',
          description: 'Interior signage for office spaces',
          image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
          specifications: 'Various sizes, vinyl application, brand colors',
          guidelines: 'Clear wayfinding, consistent typography, brand integration',
        },
      ],
    },
    language: {
      primary: 'English',
      secondary: ['Spanish', 'French'],
      direction: 'ltr',
      localization: [
        {
          language: 'Spanish',
          adaptations: ['Formal tone', 'Cultural sensitivity', 'Regional variations'],
          examples: ['Soluciones tecnológicas profesionales', 'Innovación confiable'],
        },
        {
          language: 'French',
          adaptations: ['Professional formality', 'Technical precision', 'Cultural context'],
          examples: ['Solutions technologiques professionnelles', 'Innovation fiable'],
        },
      ],
    },
  },
  assets: [
    {
      id: 'logo-primary',
      name: 'Primary Logo',
      type: 'logo',
      category: 'logo',
      url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
      size: 125000,
      tags: ['logo', 'primary', 'brand'],
      metadata: {
        dimensions: { width: 400, height: 400 },
        format: 'PNG',
        colorMode: 'RGB',
      },
      createdAt: new Date(),
    },
    {
      id: 'logo-secondary',
      name: 'Secondary Logo',
      type: 'logo',
      category: 'logo',
      url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center&brightness=0.8',
      size: 115000,
      tags: ['logo', 'secondary', 'brand'],
      metadata: {
        dimensions: { width: 400, height: 400 },
        format: 'PNG',
        colorMode: 'RGB',
      },
      createdAt: new Date(),
    },
    {
      id: 'wordmark',
      name: 'Wordmark',
      type: 'logo',
      category: 'logo',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop',
      size: 85000,
      tags: ['logo', 'wordmark', 'text'],
      metadata: {
        dimensions: { width: 400, height: 200 },
        format: 'PNG',
        colorMode: 'RGB',
      },
      createdAt: new Date(),
    },
    {
      id: 'business-card-template',
      name: 'Business Card Template',
      type: 'template',
      category: 'stationery',
      url: '/templates/business-card.pdf',
      size: 245000,
      tags: ['business-card', 'template', 'print'],
      metadata: {
        format: 'PDF',
        colorMode: 'CMYK',
      },
      createdAt: new Date(),
    },
    {
      id: 'letterhead-template',
      name: 'Letterhead Template',
      type: 'template',
      category: 'stationery',
      url: '/templates/letterhead.pdf',
      size: 180000,
      tags: ['letterhead', 'template', 'print'],
      metadata: {
        format: 'PDF',
        colorMode: 'CMYK',
      },
      createdAt: new Date(),
    },
    {
      id: 'presentation-template',
      name: 'Presentation Template',
      type: 'template',
      category: 'application',
      url: '/templates/presentation.pptx',
      size: 1200000,
      tags: ['presentation', 'template', 'powerpoint'],
      metadata: {
        format: 'PPTX',
      },
      createdAt: new Date(),
    },
  ],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
};

export const demoOnboardingAnswers = {
  'company-basics': {
    brandName: 'The Main Brand',
    description: 'We create innovative technology solutions for modern businesses',
    industry: 'Technology',
    companySize: '11-50'
  },
  'target-audience': ['professionals', 'entrepreneurs'],
  'brand-personality': {
    tone: 'modern',
    traits: ['Innovative', 'Trustworthy', 'Expert'],
    voice: 'Professional yet approachable, confident but not arrogant'
  },
  'business-goals': {
    goals: ['brand-awareness', 'sales-growth'],
    timeframe: '1-year',
    successMetrics: 'Increased market recognition and 30% growth in sales'
  },
  'style-values': {
    primaryColor: '#2563eb',
    stylePreference: 'modern',
    coreValues: ['Innovation', 'Quality', 'Trust']
  },
  'logo-assets': {
    primaryLogo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center'
  }
};