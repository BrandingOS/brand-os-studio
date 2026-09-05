import { describe, expect, it } from 'vitest';
import { normalizePageUrl, parseRobots, planKeyPages, robotsAllows } from './crawlPlan.ts';
import type { Anchor } from './websiteEvidence.ts';

const a = (href: string, text: string, inNav = true): Anchor => ({ href, text, inNav, className: '' });
const HOME = 'https://northwind.studio/';

describe('choosing the key pages', () => {
  it('takes about, services, contact and one more by nav prominence', () => {
    const plan = planKeyPages(
      [a('/', 'Home'), a('/about', 'About'), a('/services', 'Services'), a('/projects', 'Projects'), a('/contact', 'Contact'), a('/blog', 'Journal'), a('/privacy', 'Privacy', false)],
      HOME,
    );
    expect(plan.map((p) => [p.role, p.url])).toEqual([
      ['about', 'https://northwind.studio/about'],
      ['services', 'https://northwind.studio/services'],
      ['contact', 'https://northwind.studio/contact'],
      ['other', 'https://northwind.studio/projects'],
    ]);
  });

  it('never selects legal, auth, commerce or content-index pages', () => {
    const plan = planKeyPages(
      [a('/login', 'Login'), a('/cart', 'Cart'), a('/privacy-policy', 'Privacy'), a('/terms', 'Terms'), a('/blog', 'Blog'), a('/careers', 'Careers'), a('/news', 'News')],
      HOME,
    );
    expect(plan).toEqual([]);
  });

  it('recognises a role from the label when the path is opaque', () => {
    const plan = planKeyPages([a('/p/42', 'About us'), a('/p/43', 'Our services')], HOME);
    expect(plan.map((p) => p.role)).toEqual(['about', 'services']);
  });

  it('stays on the site, including its www twin, and never leaves it', () => {
    const plan = planKeyPages([a('https://www.northwind.studio/about', 'About'), a('https://instagram.com/nw', 'Instagram'), a('https://cdn.example/x', 'x')], HOME);
    expect(plan).toHaveLength(1);
    expect(plan[0].url).toBe('https://www.northwind.studio/about');
  });

  it('treats language variants of one page as one page', () => {
    const plan = planKeyPages([a('/about', 'About'), a('/da/about', 'Om os'), a('/en/about', 'About')], HOME);
    expect(plan).toHaveLength(1);
  });

  it('skips files and pages robots closed to us', () => {
    const plan = planKeyPages([a('/brochure.pdf', 'Brochure'), a('/about', 'About'), a('/contact', 'Contact')], HOME, (path) => path !== '/contact');
    expect(plan.map((p) => p.url)).toEqual(['https://northwind.studio/about']);
  });

  it('caps at four pages', () => {
    const plan = planKeyPages([a('/about', 'About'), a('/services', 'Services'), a('/contact', 'Contact'), a('/projects', 'Projects'), a('/team', 'Team'), a('/press-kit', 'Press')], HOME);
    expect(plan).toHaveLength(4);
  });
});

describe('url normalisation', () => {
  it('drops fragments, tracking params, trailing slashes and index files', () => {
    expect(normalizePageUrl('/About/?utm_source=x&ref=y#team', HOME)).toBe('https://northwind.studio/About');
    expect(normalizePageUrl('/index.html', HOME)).toBe('https://northwind.studio/');
    expect(normalizePageUrl('mailto:x@y.z', HOME)).toBeNull();
  });
});

describe('robots.txt', () => {
  const rules = parseRobots(`User-agent: *\nDisallow: /private/\nAllow: /private/open\n\nUser-agent: BrandingOSBot\nDisallow: /about\n`);

  it('prefers our own group over the wildcard', () => {
    expect(rules.disallow).toEqual(['/about']);
  });

  it('falls back to the wildcard group and honours longest match', () => {
    const star = parseRobots(`User-agent: *\nDisallow: /private/\nAllow: /private/open\nDisallow: /*.pdf$`);
    expect(robotsAllows(star, '/about')).toBe(true);
    expect(robotsAllows(star, '/private/x')).toBe(false);
    expect(robotsAllows(star, '/private/open/y')).toBe(true);
    expect(robotsAllows(star, '/brochure.pdf')).toBe(false);
    expect(robotsAllows(star, '/brochure.pdf/view')).toBe(true);
  });

  it('an empty file allows everything', () => {
    expect(robotsAllows(parseRobots(''), '/anything')).toBe(true);
  });
});
