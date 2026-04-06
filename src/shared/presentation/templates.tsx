/**
 * Template Registry  --  maps PresentationStyle + ContentType → SlideData[]
 *
 * Architecture:
 *   Style (visual tokens) × Page Layout (arrangement) × Content (data) = Slide
 *
 * The SAME 10 page layouts render differently depending on which of the
 * 10 styles is active. Content types (Brand Guide, Company Profile, etc.)
 * determine WHAT data fills each layout slot.
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { Brand } from '@/shared/types/brand';
import type { PresentationStyle } from './styles';
import { getStyleById } from './styles';
import {
  CoverPage,
  SectionDividerPage,
  TwoColumnPage,
  TwoColumnReversePage,
  FullBleedImagePage,
  ThreeColumnPage,
  QuotePage,
  StatsPage,
  ListPage,
  ClosingPage,
  type PageProps,
} from './pages';

// ── Content Types ───────────────────────────────────────

export type ContentType =
  | 'brand-guide'
  | 'company-profile'
  | 'brand-presentation'
  | 'pitch-deck'
  | 'logo-showcase'
  | 'studio-portfolio';

export interface ContentTypeInfo {
  id: ContentType;
  name: string;
  description: string;
  icon: string;
}

export const CONTENT_TYPES: ContentTypeInfo[] = [
  { id: 'brand-guide', name: 'Brand Guide', description: 'Complete brand identity guidelines', icon: 'BookOpen' },
  { id: 'company-profile', name: 'Company Profile', description: 'Company overview and capabilities', icon: 'Building2' },
  { id: 'brand-presentation', name: 'Brand Presentation', description: 'Brand pitch to stakeholders', icon: 'Presentation' },
  { id: 'pitch-deck', name: 'Pitch Deck', description: 'Investor or client pitch', icon: 'Rocket' },
  { id: 'logo-showcase', name: 'Logo Showcase', description: 'Logo concepts and rationale', icon: 'Image' },
  { id: 'studio-portfolio', name: 'Studio Portfolio', description: 'Architecture / design studio portfolio (CNCPT-inspired)', icon: 'Layers' },
];

// ── Slide Builder ───────────────────────────────────────

/**
 * Per-slide overrides keyed by slide id. Each override is a partial set
 * of fields that gets merged on top of the default props baked at slide-build time.
 */
export type SlideOverridesMap = Record<string, Partial<Omit<PageProps, 'style' | 'brand' | 'pageNumber' | 'totalPages' | 'orientation' | 'aspectRatioValue' | 'settings'>>>;

function makeSlide(
  id: string,
  name: string,
  Component: React.ComponentType<PageProps>,
  props: Omit<PageProps, 'brand' | 'pageNumber' | 'totalPages' | 'orientation' | 'aspectRatioValue' | 'settings'>,
  overrides?: SlideOverridesMap,
): SlideData {
  const merged = { ...props, ...(overrides?.[id] || {}) };
  return {
    id,
    name,
    render: (rp: SlideRenderProps) => (
      <Component
        {...merged}
        brand={rp.brand}
        pageNumber={rp.pageNumber}
        totalPages={rp.totalPages}
        orientation={rp.orientation}
        aspectRatioValue={rp.aspectRatioValue}
        settings={rp.settings}
      />
    ),
  };
}

// ── Brand Guide Content ─────────────────────────────────

function buildBrandGuideSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  const strategy = brand.guidelines?.strategy;
  const colors = brand.guidelines?.colors;
  const fonts = brand.guidelines?.fonts;

  return [
    makeSlide('cover', 'Cover', CoverPage, {
      style,
      title: brand.name,
      subtitle: 'Brand Guidelines',
      logoUrl: brand.logo,
    }, overrides),
    makeSlide('overview', 'Brand Overview', SectionDividerPage, {
      style,
      sectionNumber: '01',
      sectionLabel: 'Brand Overview',
    }, overrides),
    makeSlide('mission', 'Mission & Vision', TwoColumnPage, {
      style,
      title: 'Mission & Vision',
      subtitle: strategy?.mission || `${brand.name} exists to make a meaningful impact.`,
      body: strategy?.vision || 'Our vision is to lead with purpose and create lasting value.',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('values', 'Core Values', ThreeColumnPage, {
      style,
      title: 'Core Values',
      sectionLabel: 'What We Stand For',
      columns: (strategy?.values || ['Innovation', 'Excellence', 'Integrity']).map(v => ({
        title: typeof v === 'string' ? v : v,
        body: `${typeof v === 'string' ? v : v} is at the heart of everything we do.`,
      })),
    }, overrides),
    makeSlide('logo-section', 'Logo System', SectionDividerPage, {
      style,
      sectionNumber: '02',
      sectionLabel: 'Logo System',
    }, overrides),
    makeSlide('logo-usage', 'Logo Usage', TwoColumnReversePage, {
      style,
      title: 'Logo Usage',
      subtitle: 'Primary Logo',
      body: 'The primary logo should be used in all official communications. Maintain clear space equal to the height of the logomark on all sides.',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('color-section', 'Color System', SectionDividerPage, {
      style,
      sectionNumber: '03',
      sectionLabel: 'Color System',
    }, overrides),
    makeSlide('colors', 'Brand Colors', StatsPage, {
      style,
      title: 'Brand Colors',
      stats: [
        { value: brand.primaryColor?.toUpperCase() || '#000000', label: 'Primary' },
        { value: brand.secondaryColor?.toUpperCase() || '#666666', label: 'Secondary' },
        { value: '#FFFFFF', label: 'Light' },
        { value: '#0A0A0A', label: 'Dark' },
      ],
    }, overrides),
    makeSlide('typography-section', 'Typography', SectionDividerPage, {
      style,
      sectionNumber: '04',
      sectionLabel: 'Typography',
    }, overrides),
    makeSlide('typography', 'Type System', TwoColumnPage, {
      style,
      title: 'Typography',
      subtitle: fonts?.primary || 'Plus Jakarta Sans',
      body: `Our type system uses ${fonts?.primary || 'Plus Jakarta Sans'} for headings and ${fonts?.secondary || 'Inter'} for body text. This combination balances personality with readability across all applications.`,
    }, overrides),
    makeSlide('voice', 'Brand Voice', QuotePage, {
      style,
      quote: strategy?.positioning || `${brand.name} speaks with clarity, confidence, and purpose. Every word reflects who we are.`,
      quoteAuthor: `${brand.name} Voice Guidelines`,
    }, overrides),
    makeSlide('applications', 'Applications', ListPage, {
      style,
      title: 'Brand Applications',
      items: [
        { title: 'Digital Presence', description: 'Website, social media, email signatures, digital ads' },
        { title: 'Print Materials', description: 'Business cards, letterhead, brochures, packaging' },
        { title: 'Environmental', description: 'Signage, office branding, event materials' },
        { title: 'Product', description: 'UI elements, app icons, loading screens, onboarding' },
      ],
    }, overrides),
    makeSlide('closing', 'Thank You', ClosingPage, {
      style,
      title: 'Thank You',
      subtitle: `${brand.name} Brand Guidelines  --  ${new Date().getFullYear()}`,
      logoUrl: brand.logo,
    }, overrides),
  ];
}

// ── Company Profile Content ─────────────────────────────

function buildCompanyProfileSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  return [
    makeSlide('cover', 'Cover', CoverPage, {
      style,
      title: brand.name,
      subtitle: 'Company Profile',
      logoUrl: brand.logo,
    }, overrides),
    makeSlide('about', 'About Us', SectionDividerPage, {
      style,
      sectionNumber: '01',
      sectionLabel: 'About Us',
    }, overrides),
    makeSlide('intro', 'Introduction', TwoColumnPage, {
      style,
      title: `About ${brand.name}`,
      subtitle: brand.tone || 'Professional & Innovative',
      body: brand.guidelines?.strategy?.mission || `${brand.name} is a forward-thinking company dedicated to delivering exceptional value through innovation and expertise.`,
    }, overrides),
    makeSlide('services', 'What We Do', ThreeColumnPage, {
      style,
      title: 'Our Services',
      sectionLabel: 'What We Offer',
      columns: [
        { title: 'Strategy', body: 'End-to-end strategic planning and brand positioning.' },
        { title: 'Design', body: 'Visual identity, UI/UX, and creative production.' },
        { title: 'Technology', body: 'Digital products, platforms, and engineering.' },
      ],
    }, overrides),
    makeSlide('approach', 'Our Approach', ListPage, {
      style,
      title: 'How We Work',
      items: [
        { title: 'Discovery', description: 'Deep research into your market, audience, and goals.' },
        { title: 'Strategy', description: 'Data-driven planning that aligns with business objectives.' },
        { title: 'Execution', description: 'Crafted with precision, delivered on time.' },
        { title: 'Iteration', description: 'Continuous improvement based on real-world results.' },
      ],
    }, overrides),
    makeSlide('impact', 'By The Numbers', StatsPage, {
      style,
      title: 'Our Impact',
      stats: [
        { value: '50+', label: 'Projects Delivered' },
        { value: '98%', label: 'Client Satisfaction' },
        { value: '12+', label: 'Years Experience' },
        { value: '30+', label: 'Team Members' },
      ],
    }, overrides),
    makeSlide('vision', 'Vision', QuotePage, {
      style,
      quote: brand.guidelines?.strategy?.vision || `We envision a future where ${brand.name} sets the standard for excellence in everything we do.`,
      quoteAuthor: `${brand.name} Leadership`,
    }, overrides),
    makeSlide('team', 'Our Team', FullBleedImagePage, {
      style,
      title: `The ${brand.name} Team`,
      subtitle: 'Passionate experts driving results',
    }, overrides),
    makeSlide('clients', 'Our Clients', ThreeColumnPage, {
      style,
      title: 'Trusted By',
      sectionLabel: 'Our Clients',
      columns: [
        { title: 'Enterprise', body: 'Fortune 500 companies trust us with their brand.' },
        { title: 'Startups', body: 'Fast-growing companies rely on our speed and agility.' },
        { title: 'Agencies', body: 'Creative agencies partner with us on complex projects.' },
      ],
    }, overrides),
    makeSlide('contact', 'Contact', ClosingPage, {
      style,
      title: "Let's Work Together",
      subtitle: brand.name,
      logoUrl: brand.logo,
      contactInfo: { website: `${brand.slug}.com`, email: `hello@${brand.slug}.com` },
    }, overrides),
  ];
}

// ── Brand Presentation Content ──────────────────────────

function buildBrandPresentationSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  return [
    makeSlide('cover', 'Cover', CoverPage, {
      style, title: brand.name, subtitle: 'Brand Presentation', logoUrl: brand.logo,
    }, overrides),
    makeSlide('why', 'Why', SectionDividerPage, {
      style, sectionNumber: '01', sectionLabel: 'Why We Exist',
    }, overrides),
    makeSlide('purpose', 'Purpose', TwoColumnPage, {
      style,
      title: 'Our Purpose',
      body: brand.guidelines?.strategy?.mission || `${brand.name} was built to solve a real problem  --  and we're just getting started.`,
    }, overrides),
    makeSlide('what', 'What', SectionDividerPage, {
      style, sectionNumber: '02', sectionLabel: 'What We Build',
    }, overrides),
    makeSlide('product', 'Product', ThreeColumnPage, {
      style,
      title: 'What We Offer',
      columns: [
        { title: 'Platform', body: 'A unified platform that brings everything together.' },
        { title: 'Tools', body: 'Purpose-built tools for every stage of the workflow.' },
        { title: 'Intelligence', body: 'AI-powered insights that drive better decisions.' },
      ],
    }, overrides),
    makeSlide('proof', 'Proof', StatsPage, {
      style,
      title: 'Traction',
      stats: [
        { value: '3x', label: 'Growth YoY' },
        { value: '10K+', label: 'Active Users' },
        { value: '95%', label: 'Retention' },
        { value: '4.9', label: 'Rating' },
      ],
    }, overrides),
    makeSlide('how', 'How', SectionDividerPage, {
      style, sectionNumber: '03', sectionLabel: 'How It Works',
    }, overrides),
    makeSlide('process', 'Process', ListPage, {
      style,
      title: 'Simple. Powerful.',
      items: [
        { title: 'Connect', description: 'Integrate with your existing tools in minutes.' },
        { title: 'Configure', description: 'Set up your workspace the way you work.' },
        { title: 'Create', description: 'Start building with intelligent automation.' },
        { title: 'Scale', description: 'Grow without limits  --  the platform grows with you.' },
      ],
    }, overrides),
    makeSlide('quote', 'Testimonial', QuotePage, {
      style,
      quote: `${brand.name} transformed how we work. It's not just a tool  --  it's a competitive advantage.`,
      quoteAuthor: 'Happy Customer',
    }, overrides),
    makeSlide('closing', 'Next Steps', ClosingPage, {
      style, title: "Let's Build Together", subtitle: brand.name, logoUrl: brand.logo,
    }, overrides),
  ];
}

// ── Pitch Deck Content ──────────────────────────────────

function buildPitchDeckSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  return [
    makeSlide('cover', 'Cover', CoverPage, {
      style, title: brand.name, subtitle: 'Investor Presentation', logoUrl: brand.logo,
    }, overrides),
    makeSlide('problem', 'Problem', SectionDividerPage, {
      style, sectionNumber: '01', sectionLabel: 'The Problem',
    }, overrides),
    makeSlide('problem-detail', 'Problem Detail', TwoColumnPage, {
      style,
      title: 'The Problem',
      body: 'Teams waste hours on repetitive, manual work that should be automated. Existing solutions are fragmented, expensive, and do not scale.',
    }, overrides),
    makeSlide('solution', 'Solution', SectionDividerPage, {
      style, sectionNumber: '02', sectionLabel: 'Our Solution',
    }, overrides),
    makeSlide('solution-detail', 'Solution Detail', ThreeColumnPage, {
      style,
      title: `${brand.name}  --  The Solution`,
      columns: [
        { title: 'Unified', body: 'One platform replacing 5+ tools.' },
        { title: 'Intelligent', body: 'AI that learns your workflow.' },
        { title: 'Scalable', body: 'From startup to enterprise.' },
      ],
    }, overrides),
    makeSlide('market', 'Market', StatsPage, {
      style,
      title: 'Market Opportunity',
      stats: [
        { value: '$12B', label: 'TAM' },
        { value: '$3.2B', label: 'SAM' },
        { value: '$800M', label: 'SOM' },
        { value: '23%', label: 'CAGR' },
      ],
    }, overrides),
    makeSlide('traction', 'Traction', StatsPage, {
      style,
      title: 'Traction',
      stats: [
        { value: '10K+', label: 'Users' },
        { value: '$1.2M', label: 'ARR' },
        { value: '3x', label: 'YoY Growth' },
        { value: '< 5%', label: 'Churn' },
      ],
    }, overrides),
    makeSlide('team', 'Team', FullBleedImagePage, {
      style, title: 'The Team', subtitle: 'Experienced builders and operators',
    }, overrides),
    makeSlide('ask', 'The Ask', TwoColumnPage, {
      style,
      title: 'The Ask',
      subtitle: 'Seed Round  --  $3M',
      body: 'We are raising $3M to accelerate product development, expand our go-to-market team, and capture the market window.',
    }, overrides),
    makeSlide('closing', 'Thank You', ClosingPage, {
      style, title: "Let's Talk", subtitle: brand.name, logoUrl: brand.logo,
      contactInfo: { email: `founders@${brand.slug}.com` },
    }, overrides),
  ];
}

// ── Logo Showcase Content ───────────────────────────────

function buildLogoShowcaseSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  return [
    makeSlide('cover', 'Cover', CoverPage, {
      style, title: brand.name, subtitle: 'Logo Design', logoUrl: brand.logo,
    }, overrides),
    makeSlide('brief', 'The Brief', SectionDividerPage, {
      style, sectionNumber: '01', sectionLabel: 'The Brief',
    }, overrides),
    makeSlide('brief-detail', 'Brief Detail', TwoColumnPage, {
      style,
      title: 'Design Brief',
      body: brand.guidelines?.strategy?.positioning || `Create a distinctive visual identity for ${brand.name} that communicates innovation, trust, and forward momentum.`,
    }, overrides),
    makeSlide('concepts', 'Concepts', SectionDividerPage, {
      style, sectionNumber: '02', sectionLabel: 'Logo Concepts',
    }, overrides),
    makeSlide('logo-main', 'Primary Logo', FullBleedImagePage, {
      style,
      title: brand.name,
      subtitle: 'Primary Logo',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('variations', 'Variations', ThreeColumnPage, {
      style,
      title: 'Logo Variations',
      columns: [
        { title: 'Full Color', body: 'Primary usage on light backgrounds.' },
        { title: 'Monochrome', body: 'Single-color for limited palettes.' },
        { title: 'Reversed', body: 'White version for dark backgrounds.' },
      ],
    }, overrides),
    makeSlide('rationale', 'Rationale', QuotePage, {
      style,
      quote: `The ${brand.name} identity captures the brand's core values in a single, memorable mark.`,
      quoteAuthor: 'Design Rationale',
    }, overrides),
    makeSlide('usage', 'Usage Rules', ListPage, {
      style,
      title: 'Usage Guidelines',
      items: [
        { title: 'Clear Space', description: 'Maintain minimum clear space equal to the height of the mark.' },
        { title: 'Minimum Size', description: 'Never reproduce the logo smaller than 24px in height.' },
        { title: 'Color Integrity', description: 'Do not alter the logo colors outside approved palette.' },
        { title: 'Background', description: 'Ensure sufficient contrast on all background colors.' },
      ],
    }, overrides),
    makeSlide('context', 'In Context', TwoColumnReversePage, {
      style,
      title: 'In Context',
      body: 'The logo works across all touchpoints  --  from digital interfaces to physical signage.',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('closing', 'Thank You', ClosingPage, {
      style, title: 'Thank You', subtitle: `${brand.name} Logo Design`, logoUrl: brand.logo,
    }, overrides),
  ];
}

// ── Studio Portfolio Content (CNCPT-inspired) ───────────

function buildStudioPortfolioSlides(brand: Brand, style: PresentationStyle, overrides?: SlideOverridesMap): SlideData[] {
  const tagline = brand.tagline || `Transforming ideas into ${brand.tone || 'meaningful'} experiences for modern, considered, timeless results.`;

  return [
    // 1. Hero — massive centered tagline (CNCPT signature)
    makeSlide('hero', 'Hero', CoverPage, {
      style,
      title: tagline,
      subtitle: `${brand.name} -- ${brand.tone || 'Studio'}`,
      logoUrl: brand.logo,
    }, overrides),

    // 2. Intro section divider
    makeSlide('intro-divider', 'About', SectionDividerPage, {
      style,
      sectionNumber: '01',
      sectionLabel: 'About The Studio',
    }, overrides),

    // 3. About — two column with subtitle
    makeSlide('about', 'About', TwoColumnPage, {
      style,
      sectionLabel: 'Studio',
      title: brand.name,
      subtitle: brand.guidelines?.strategy?.positioning || `An independent ${brand.tone || 'design'} studio.`,
      body: brand.guidelines?.strategy?.mission || `${brand.name} is a multidisciplinary studio creating thoughtful work for clients who value craft, restraint, and longevity.`,
      imageUrl: brand.logo,
    }, overrides),

    // 4. Services divider
    makeSlide('services-divider', 'Services', SectionDividerPage, {
      style,
      sectionNumber: '02',
      sectionLabel: 'What We Do',
    }, overrides),

    // 5. Services — 3 columns (CNCPT shows 3 services)
    makeSlide('services', 'Services', ThreeColumnPage, {
      style,
      sectionLabel: 'Services',
      title: 'What We Do',
      columns: [
        { title: 'Strategy', body: 'Brand positioning, naming, and verbal identity built on real research.' },
        { title: 'Identity', body: 'Logos, type systems, color, and the visual rules that hold them together.' },
        { title: 'Experience', body: 'Websites, apps, and digital products designed end-to-end.' },
      ],
    }, overrides),

    // 6. Process divider
    makeSlide('process-divider', 'Process', SectionDividerPage, {
      style,
      sectionNumber: '03',
      sectionLabel: 'How We Work',
    }, overrides),

    // 7. Process — 4 numbered steps (the CNCPT signature 01-04)
    makeSlide('process', 'How We Work', ListPage, {
      style,
      sectionLabel: 'Process',
      title: 'How We Work',
      items: [
        { title: 'Consultation', description: 'We begin with deep listening -- understanding the goals, constraints, and people behind the work.' },
        { title: 'Concept', description: 'Strategic and visual directions explored, refined, and presented with rationale.' },
        { title: 'Refinement', description: 'Iterating on the chosen direction with precision and care across every detail.' },
        { title: 'Execution', description: 'Final delivery with everything organized, documented, and ready to live in the world.' },
      ],
    }, overrides),

    // 8. Portfolio divider
    makeSlide('portfolio-divider', 'Work', SectionDividerPage, {
      style,
      sectionNumber: '04',
      sectionLabel: 'Selected Work',
    }, overrides),

    // 9-11. Three full-bleed project showcases (Budapest/Hamburg/Valencia from CNCPT)
    makeSlide('project-1', 'Project I', FullBleedImagePage, {
      style,
      title: 'Budapest',
      subtitle: 'Residential -- 2024',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('project-2', 'Project II', FullBleedImagePage, {
      style,
      title: 'Hamburg',
      subtitle: 'Commercial -- 2024',
      imageUrl: brand.logo,
    }, overrides),
    makeSlide('project-3', 'Project III', FullBleedImagePage, {
      style,
      title: 'Valencia',
      subtitle: 'Hospitality -- 2023',
      imageUrl: brand.logo,
    }, overrides),

    // 12. Stats — by the numbers
    makeSlide('stats', 'By The Numbers', StatsPage, {
      style,
      sectionLabel: 'Track Record',
      title: 'By The Numbers',
      stats: [
        { value: '12+', label: 'Years' },
        { value: '80+', label: 'Projects' },
        { value: '25+', label: 'Awards' },
        { value: '15', label: 'Countries' },
      ],
    }, overrides),

    // 13. Approach quote
    makeSlide('approach', 'Approach', QuotePage, {
      style,
      quote: 'Good work takes time. Great work takes patience, restraint, and the willingness to leave things out.',
      quoteAuthor: brand.name,
    }, overrides),

    // 14. Contact divider
    makeSlide('contact-divider', 'Contact', SectionDividerPage, {
      style,
      sectionNumber: '05',
      sectionLabel: 'Get In Touch',
    }, overrides),

    // 15. Closing — contact info
    makeSlide('closing', 'Contact', ClosingPage, {
      style,
      title: 'Make Something',
      subtitle: brand.name,
      logoUrl: brand.logo,
      contactInfo: {
        email: `hello@${brand.slug}.com`,
        website: `${brand.slug}.com`,
      },
    }, overrides),
  ];
}

// ── Master Builder ──────────────────────────────────────

export function buildTemplateSlides(
  brand: Brand,
  styleId: string,
  contentType: ContentType,
  overrides?: SlideOverridesMap,
): SlideData[] {
  const style = getStyleById(styleId);

  switch (contentType) {
    case 'brand-guide':
      return buildBrandGuideSlides(brand, style, overrides);
    case 'company-profile':
      return buildCompanyProfileSlides(brand, style, overrides);
    case 'brand-presentation':
      return buildBrandPresentationSlides(brand, style, overrides);
    case 'pitch-deck':
      return buildPitchDeckSlides(brand, style, overrides);
    case 'logo-showcase':
      return buildLogoShowcaseSlides(brand, style, overrides);
    case 'studio-portfolio':
      return buildStudioPortfolioSlides(brand, style, overrides);
    default:
      return buildBrandGuideSlides(brand, style, overrides);
  }
}
