// The canonical-host redirect is the one piece of routing that can lock people
// out of the demo if it is wrong, so its decision is pinned here.

import { describe, expect, it } from 'vitest';
import { canonicalRedirectFor } from '../_middleware';

describe('canonical demo host redirect', () => {
  it('redirects the retired project subdomain, preserving path and query', () => {
    expect(canonicalRedirectFor('https://demo-25t.pages.dev/'))
      .toBe('https://demo.brandingos.ai/');
    expect(canonicalRedirectFor('https://demo-25t.pages.dev/dashboard'))
      .toBe('https://demo.brandingos.ai/dashboard');
    expect(canonicalRedirectFor('https://demo-25t.pages.dev/b/acme/design/abc?prompt=a%20cat&mode=image'))
      .toBe('https://demo.brandingos.ai/b/acme/design/abc?prompt=a%20cat&mode=image');
  });

  it('leaves per-deployment preview aliases alone, so previews stay inspectable', () => {
    expect(canonicalRedirectFor('https://cba6a864.demo-25t.pages.dev/dashboard')).toBeNull();
    expect(canonicalRedirectFor('https://075f0113.demo-25t.pages.dev/')).toBeNull();
  });

  it('never touches the second project, which builds from the same branch', () => {
    expect(canonicalRedirectFor('https://demo-b.pages.dev/')).toBeNull();
    expect(canonicalRedirectFor('https://d8ef059a.demo-b.pages.dev/')).toBeNull();
  });

  it('serves the canonical host itself without redirecting (no loop)', () => {
    expect(canonicalRedirectFor('https://demo.brandingos.ai/')).toBeNull();
    expect(canonicalRedirectFor('https://demo.brandingos.ai/dashboard?x=1')).toBeNull();
  });

  it('does not touch the production zone or local development', () => {
    expect(canonicalRedirectFor('https://brandingos.ai/')).toBeNull();
    expect(canonicalRedirectFor('https://brand-os-studio-dxw.pages.dev/')).toBeNull();
    expect(canonicalRedirectFor('http://localhost:8080/b/acme/design')).toBeNull();
  });
});
