/**
 * WebsiteEvidence — the client's copy of the scan's contract.
 *
 * The Edge Function (`supabase/functions/_shared/websiteEvidence.ts`) is the
 * source of truth; this file mirrors its types so `src/` never imports across
 * the Deno boundary. `__tests__/evidenceContract.test.ts` fails the type
 * check when the two drift.
 */
export type PageRole = 'home' | 'about' | 'services' | 'contact' | 'other';

export interface PageEvidence {
  id: string;
  url: string;
  role: PageRole;
  title: string | null;
  h1: string | null;
  headings: string[];
  /** Main copy, noise stripped, capped. */
  copy: string;
  wordCount: number;
  lang: string | null;
  fetchedMs: number;
  truncated: boolean;
}

export interface JsonLdOrg {
  type?: string;
  name?: string;
  legalName?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  slogan?: string;
  foundingDate?: string;
}

export interface MetadataEvidence {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  canonical?: string;
  themeColor?: string;
  jsonLd?: JsonLdOrg;
  manifest?: { name?: string; shortName?: string; themeColor?: string; backgroundColor?: string };
}

export interface BusinessEvidence {
  names: Array<{ value: string; source: string }>;
  tagline?: { value: string; page: string; source: string };
  products: Array<{ value: string; page: string }>;
  contact: { email?: string; phone?: string; address?: string; page?: string };
  foundedYear?: number;
}

export interface LinkEvidence {
  url: string;
  platform: string;
  page: string;
}

export type LogoSource = 'svg-inline' | 'header-img' | 'json-ld-logo' | 'manifest-icon' | 'apple-touch-icon' | 'favicon' | 'og-image';

export interface LogoCandidate {
  url: string;
  source: LogoSource;
  score: number;
  alt?: string;
  width?: number;
  height?: number;
  /** Inline SVG markup, when the candidate was drawn in the page itself. */
  inline?: string;
  /** Downloaded bytes, base64, when the scan fetched the file. */
  bytes?: string;
  contentType?: string;
  byteLength?: number;
}

export interface ColorEvidence {
  hex: string;
  source: 'css-var' | 'manifest' | 'meta' | 'css';
  count: number;
  /** The custom property or manifest field it came from. */
  name?: string;
}

export interface FontEvidence {
  family: string;
  source: 'google-fonts' | 'font-face' | 'css';
  weights: string[];
  role?: 'heading' | 'body';
}

export interface CopyEvidence {
  voiceSample: string[];
  ctaLabels: string[];
  navLabels: string[];
}

export interface ImageryEvidence {
  imageCount: number;
  altSample: string[];
  hasHero: boolean;
}

export interface Problem {
  code: string;
  page?: string;
  message: string;
  fatal: boolean;
}

export interface QualityEvidence {
  copyWords: number;
  pagesRead: number;
  hasAbout: boolean;
  hasStructuredData: boolean;
  nameCandidates: number;
  languages: string[];
}

export interface CrawlSummary {
  requestedUrl: string;
  finalUrl?: string;
  origin?: string;
  startedAt: string;
  finishedAt: string;
  pagesAttempted: number;
  pagesRead: number;
  bytes: number;
  requests: number;
  status: 'complete' | 'partial' | 'failed';
  budgetMs: number;
  elapsedMs: number;
}

export interface WebsiteEvidence {
  crawl: CrawlSummary;
  pages: PageEvidence[];
  metadata: MetadataEvidence;
  business: BusinessEvidence;
  links: LinkEvidence[];
  logoCandidates: LogoCandidate[];
  colors: ColorEvidence[];
  typography: FontEvidence[];
  copy: CopyEvidence;
  imagery: ImageryEvidence;
  problems: Problem[];
  quality: QualityEvidence;
}


/** One line of the scan's NDJSON stream. */
export type ScanEvent =
  | { type: 'opened'; url: string; finalUrl: string; status: number; redirected: boolean; ms: number }
  | { type: 'signals'; name?: string; socials: number; hasStructuredData: boolean; ms: number }
  | { type: 'identity'; logos: number; colors: number; fonts: string[]; ms: number }
  | { type: 'pages'; read: number; attempted: number; failed: string[]; roles: PageRole[]; ms: number }
  | { type: 'done'; evidence: WebsiteEvidence }
  | { type: 'error'; code: string; message: string; fatal: boolean };
