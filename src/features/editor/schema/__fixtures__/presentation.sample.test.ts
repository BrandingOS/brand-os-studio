// Step 5/7 fix 1 — sanity tests for the multi-page presentation
// fixture used by `/_dev/editor` as the default. Asserts the fixture
// parses cleanly, has more than one page, and resolves to a content
// type whose pageModel is 'multi' — which is the condition that
// surfaces the PageNavigator in the editor shell.

import { describe, expect, it } from 'vitest';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import { getContentTypeConfig } from '@/features/editor/content-types';
import presentationFixture from './presentation.sample.json';
import socialPostFixture from './social-post.sample.json';

describe('presentation.sample.json — dev harness default fixture', () => {
  it('parses against BrandOSDocumentSchema', () => {
    expect(() => BrandOSDocumentSchema.parse(presentationFixture)).not.toThrow();
  });

  it('has more than one page (so the dev harness surfaces the PageNavigator)', () => {
    const doc: BrandOSDocument = BrandOSDocumentSchema.parse(presentationFixture);
    expect(doc.pages.length).toBeGreaterThan(1);
  });

  it('uses a content type whose pageModel is "multi"', () => {
    const doc: BrandOSDocument = BrandOSDocumentSchema.parse(presentationFixture);
    const config = getContentTypeConfig(doc.contentType);
    expect(config.pageModel).toBe('multi');
  });

  it('contrast check: social-post still resolves to pageModel "single"', () => {
    // Sanity guard: bump the dev fixture default if this ever flips,
    // since the dev harness logic depends on the fork.
    const doc: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);
    const config = getContentTypeConfig(doc.contentType);
    expect(config.pageModel).toBe('single');
  });
});
