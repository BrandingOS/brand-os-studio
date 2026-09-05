/**
 * The whole website import, in the real onboarding screen: URL entry, the
 * Brand Scan on a scripted event stream, and the review it fills — through
 * the real local service stack, with only the network (the Edge Function and
 * the model) faked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { page } from '@vitest/browser/context';

const settled = () => new Promise((r) => setTimeout(r, 700));
import { bootServices } from '@/core/boot';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { SetUpScreen } from '@/features/onboarding-v4/screens/SetUpScreen';
import { useV4Store } from '@/features/onboarding-v4/store/onboardingV4Store';
import { AiCreditError } from '@/shared/ai/anthropicProxy';
import type { ScanEvent, WebsiteEvidence } from '../evidence';
import { EVIDENCE } from './fromWebsite.test';

// ── The network, scripted ────────────────────────────────────────────────
type Script = { status?: number; events: ScanEvent[] };
let script: Script = { events: [] };
let aiReply: () => Promise<unknown> = async () => ({ content: [{ type: 'text', text: '{}' }] });

vi.mock('@/features/onboarding/website/scanClient', async (orig) => {
  const mod = await orig<typeof import('../scanClient')>();
  return {
    ...mod,
    defaultScanDeps: () => ({
      fetch: async () => {
        if (script.status && script.status !== 200) return new Response('no', { status: script.status });
        const enc = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(c) {
            for (const e of script.events) {
              c.enqueue(enc.encode(JSON.stringify(e) + '\n'));
              await new Promise((r) => setTimeout(r, 40));
            }
            c.close();
          },
        });
        return new Response(body, { status: 200 });
      },
      token: async () => 'jwt',
      baseUrl: 'http://x',
      anonKey: 'k',
      ceilingMs: 8000,
    }),
  };
});

vi.mock('@/shared/ai/anthropicProxy', async (orig) => {
  const mod = await orig<typeof import('@/shared/ai/anthropicProxy')>();
  return { ...mod, callAnthropic: vi.fn(() => aiReply()) };
});

// A real logo: artwork on a transparent ground, not a filled square.
const GREEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="#1F3A2E" stroke-width="12"/><path d="M38 84V36l44 48V36" fill="none" stroke="#1F3A2E" stroke-width="12" stroke-linejoin="round"/><path d="M22 60h76" stroke="#C8553D" stroke-width="7"/></svg>';
const COPY = 'Northwind Studio is an architecture and interiors practice in Copenhagen. We design calm, durable homes that age well, built from honest materials and planned around daylight. ' + 'Our clients are families who stay in the homes we make for them. '.repeat(12);

const evidence = (over: Partial<WebsiteEvidence> = {}): WebsiteEvidence => ({
  ...EVIDENCE,
  pages: [{ ...EVIDENCE.pages[0], copy: COPY, wordCount: 190 }, EVIDENCE.pages[1]],
  logoCandidates: [{ url: 'https://northwind.studio/assets/logo.svg', source: 'header-img', score: 100, bytes: btoa(GREEN_SVG), contentType: 'image/svg+xml', byteLength: GREEN_SVG.length }],
  quality: { ...EVIDENCE.quality, copyWords: 200, pagesRead: 2 },
  ...over,
});

const complete = (ev = evidence()): ScanEvent[] => [
  { type: 'opened', url: 'https://northwind.studio', finalUrl: 'https://northwind.studio/', status: 200, redirected: false, ms: 200 },
  { type: 'signals', name: 'Northwind Studio', socials: 2, hasStructuredData: true, ms: 300 },
  { type: 'identity', logos: 1, colors: 3, fonts: ['Playfair Display', 'Inter'], ms: 900 },
  { type: 'pages', read: 1, attempted: 1, failed: [], roles: ['about'], ms: 1200 },
  { type: 'done', evidence: ev },
];

const GOOD_AI = {
  summary: { value: 'Northwind Studio is a Copenhagen architecture and interiors practice designing calm, durable homes.', basis: 'extracted', quote: 'an architecture and interiors practice in Copenhagen' },
  audience: { value: 'Luxury buyers', basis: 'inferred' },
  positioning: { value: 'Boutique', basis: 'inferred' },
  tone: { value: 'Calm', basis: 'inferred' },
  personality: { value: ['Warm', 'Sophisticated'], basis: 'inferred' },
  values: { value: ['Craftsmanship', 'Sustainability', 'Care'], basis: 'inferred' },
  unclear: [],
};

function mount() {
  return render(
    <MemoryRouter initialEntries={['/onboard-brand?step=details']}>
      <Routes>
        <Route path="/onboard-brand" element={<SetUpScreen />} />
        <Route path="/onboard-brand/:slug" element={<SetUpScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function toReview(timeout = 12_000) {
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => expect(screen.getByText('Review your uploads')).toBeInTheDocument(), { timeout });
}

beforeEach(async () => {
  // Real-size captures: the screenshots this suite takes are the owner's walkthrough.
  await page.viewport(1280, 900);
  localStorage.clear();
  bootServices();
  useBrandStore.setState({ list: [] } as never);
  useSessionStore.setState({ user: { id: 'u1', email: 'u@x.io' } } as never);
  const s = useV4Store.getState();
  s.reset();
  s.setSetupPanel(2);
  s.updateDefine({ name: 'Northwind Studio', description: 'Everything about us is on northwind.studio — the projects, the team.' });
  aiReply = async () => ({ content: [{ type: 'text', text: JSON.stringify(GOOD_AI) }] });
  script = { events: complete() };
});
afterEach(cleanup);

describe('URL entry', () => {
  it('shows the address found in the description and lets the user dismiss it', async () => {
    mount();
    const chip = await screen.findByTestId('site-chip');
    expect(chip).toHaveAttribute('data-source', 'description');
    expect(chip).toHaveTextContent("We'll read northwind.studio");
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/01-entry-detected.png' });
    fireEvent.click(within(chip).getByRole('button', { name: /don't read/i }));
    expect(screen.getByTestId('site-chip')).toHaveAttribute('data-source', 'none');
  });

  it('a link the user added wins over the description, which is offered instead', async () => {
    useV4Store.getState().addAsset({ id: 'l1', name: 'northwind-arch.com', sub: 'Link', kind: 'link', previewUrl: null, sourceUrl: 'https://northwind-arch.com', uploadStatus: 'done', uploadProgress: 1 });
    mount();
    const chip = await screen.findByTestId('site-chip');
    expect(chip).toHaveAttribute('data-source', 'pill');
    expect(chip).toHaveTextContent("We'll read northwind-arch.com");
    expect(chip).toHaveTextContent('also mentions northwind.studio');
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/02-entry-pill-precedence.png' });
    fireEvent.click(within(chip).getByRole('button', { name: /read that instead/i }));
    expect(screen.getByTestId('site-chip')).toHaveTextContent("We'll read northwind.studio");
  });
});

describe('a complete scan', () => {
  it('narrates real stages and findings, then fills the review from the website', async () => {
    mount();
    const started = performance.now();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText('Opening northwind.studio')).toBeInTheDocument(), { timeout: 8000 });
    await waitFor(() => expect(screen.getByText(/2 found/)).toBeInTheDocument(), { timeout: 8000 });
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/03-scan.png' });
    await waitFor(() => expect(screen.getByText('Review your uploads')).toBeInTheDocument(), { timeout: 12_000 });
    // The scan and the model answered in well under a second; the moment did
    // not hold the user for the eight-stage sequence.
    expect(performance.now() - started).toBeLessThan(5000);

    // Fonts and links say where they came from.
    await waitFor(() => expect(screen.getAllByText('From your website').length).toBeGreaterThanOrEqual(2), { timeout: 5000 });
    expect(screen.getByText('Playfair Display')).toBeInTheDocument();
    expect(screen.getByText('@northwind.studio')).toBeInTheDocument();

    // The strategy shows human words and page origins — never a raw id.
    await waitFor(() => expect(screen.getByText('Luxury buyers')).toBeInTheDocument(), { timeout: 5000 });
    expect(document.body.textContent).not.toContain('luxury-buyers');
    expect(screen.getByText('From northwind.studio/services')).toBeInTheDocument();
    expect(screen.getAllByText('Read from your website').length).toBeGreaterThanOrEqual(1);
    expect(document.body.textContent).not.toMatch(/\b(authority|provenance|website-scan|imported)\b/);

    // The palette is the site's: the logo's own green leads, every swatch is a
    // colour the site uses, none is repeated, and nothing was added by the
    // panel's mounting order.
    await waitFor(() => {
      const colours = useV4Store.getState().assets.filter((a) => a.kind === 'color').map((a) => a.value);
      expect(colours[0]).toBe('#1F3A2E');
      expect(colours.length).toBeGreaterThanOrEqual(2);
      expect(new Set(colours).size).toBe(colours.length);
      for (const c of colours) expect(['#1F3A2E', '#E4D9C3', '#C8553D']).toContain(c);
    }, { timeout: 5000 });
    // The scraped logo is on the board as a real file.
    const logo = useV4Store.getState().assets.find((a) => a.kind === 'image' && a.origin === 'website');
    expect(logo?._file).toBeInstanceOf(File);
    expect(screen.queryByTestId('scan-notice')).toBeNull();
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/04-review-complete.png', element: document.querySelector('.uploads-review') as Element });
  });
});

describe('when the site does not fully cooperate', () => {
  it('partial: the About page failed, everything else is in, and it says so', async () => {
    const ev = evidence({ crawl: { ...EVIDENCE.crawl, status: 'partial' }, pages: [{ ...EVIDENCE.pages[0], copy: COPY, wordCount: 190 }], problems: [{ code: 'http_error', page: 'https://northwind.studio/about', message: 'The site answered 500.', fatal: false }] });
    script = { events: [...complete(ev).slice(0, 3), { type: 'pages', read: 0, attempted: 1, failed: ['https://northwind.studio/about'], roles: [], ms: 1200 }, { type: 'done', evidence: ev }] };
    mount();
    await toReview();
    const notice = await screen.findByTestId('scan-notice');
    expect(notice).toHaveAttribute('data-status', 'partial');
    expect(notice).toHaveTextContent('About page');
    expect(notice).toHaveTextContent('not read');
    expect(screen.getByText('Playfair Display')).toBeInTheDocument();
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/05-review-partial.png' });
  });

  it('unavailable: the flow continues on the brief and uploads, with Try again', async () => {
    script = { events: [{ type: 'error', code: 'dns_failed', message: "We couldn't find northwind.studio.", fatal: true }, { type: 'done', evidence: { ...evidence(), crawl: { ...EVIDENCE.crawl, status: 'failed' }, pages: [], logoCandidates: [], colors: [], typography: [], links: [], problems: [{ code: 'dns_failed', message: "We couldn't find northwind.studio.", fatal: true }] } }] };
    mount();
    await toReview();
    const notice = await screen.findByTestId('scan-notice');
    expect(notice).toHaveAttribute('data-status', 'failed');
    expect(notice).toHaveTextContent("We couldn't find northwind.studio.");
    expect(useV4Store.getState().assets.filter((a) => a.origin === 'website')).toEqual([]);
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/06-review-unavailable.png' });
    // Try again re-runs only the scan; a good site now fills the review.
    script = { events: complete() };
    fireEvent.click(within(notice).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByText('Review your uploads')).toBeInTheDocument(), { timeout: 12_000 });
    await waitFor(() => expect(screen.queryByTestId('scan-notice')).toBeNull(), { timeout: 8000 });
    await waitFor(() => expect(screen.getByText('Playfair Display')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('extracted-only: no AI credits keeps the facts and says why', async () => {
    aiReply = async () => { throw new AiCreditError('insufficient_credits', {}); };
    mount();
    await toReview();
    const notice = await screen.findByTestId('scan-notice');
    expect(notice).toHaveAttribute('data-status', 'extracted-only');
    expect(notice).toHaveTextContent('run out of');
    expect(within(notice).getByRole('button', { name: /add credits/i })).toBeInTheDocument();
    expect(screen.getByText('Playfair Display')).toBeInTheDocument();
    expect(screen.queryByText('Luxury buyers')).toBeNull();
    await settled();
    await page.screenshot({ path: '__screenshots__/website-import/07-review-extracted-only.png' });
  });

  it('a rate-limited reader is named as such and nothing is invented', async () => {
    script = { status: 429, events: [] };
    mount();
    await toReview();
    const notice = await screen.findByTestId('scan-notice');
    expect(notice).toHaveAttribute('data-status', 'failed');
    expect(notice).toHaveTextContent(/read a lot of sites/i);
  });
});
