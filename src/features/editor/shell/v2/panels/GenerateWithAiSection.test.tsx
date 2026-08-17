// Unit tests for the place-on-canvas branch of GenerateWithAiSection
// (Phase 5). The "Editable design" branch is covered end-to-end in
// aiGeneration.flows.browser.test.tsx via the real Editor mount.
//
// Here we mount the section in isolation, mock generateImage so it
// resolves with a known URL, switch the radio to "Image only",
// submit, then assert:
//   • The "Place on canvas" button only appears when onPlaceImage
//     was supplied AND a successful gen has happened.
//   • Clicking it invokes onPlaceImage with the URL + dimensions
//     and clears the result so the button hides afterward.
//   • When onPlaceImage is omitted, the button never appears even
//     after a successful gen (back-compat with test mounts).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { GenerateWithAiSection } from './GenerateWithAiSection';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import type { Brand } from '@/shared/types/brand';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  },
}));

const generateImageMock = vi.fn();
vi.mock('@/features/editor/ai/generateImage', () => ({
  generateImage: (...args: unknown[]) => generateImageMock(...args),
}));

// Stub navigator.clipboard so the URL-copy fallback inside the
// section doesn't blow up in the jsdom environment.
beforeEach(() => {
  generateImageMock.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => {}) },
    configurable: true,
  });
});
afterEach(() => cleanup());

function brand(): Brand {
  return {
    id: 'brand-x', slug: 'x', name: 'X',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function mount(opts: { onPlaceImage?: (url: string, dims: { width: number; height: number }) => void } = {}) {
  return render(
    <MemoryRouter>
      <GenerateWithAiSection
        agent={null}
        brand={brand()}
        brandKit={null}
        designStorage={null}
        onPlaceImage={opts.onPlaceImage}
      />
      <Toaster />
    </MemoryRouter>,
  );
}

async function generateImageFlow(container: HTMLElement, url = 'data:image/svg+xml;base64,abc') {
  generateImageMock.mockResolvedValueOnce({
    images: [{ storagePath: 'b/generated/j/1.png', url, width: 1024, height: 1024, mime: 'image/png', bytes: 10 }],
    jobId: 'job-1', model: 'pollinations:flux', chargedCredits: 0, balance: 500,
  });

  fireEvent.click(container.querySelector<HTMLInputElement>('[data-generate-with-ai-output="image"]')!);
  fireEvent.change(
    container.querySelector<HTMLTextAreaElement>('[data-generate-with-ai-prompt]')!,
    { target: { value: 'a friendly logo on a blue field' } },
  );

  await act(async () => {
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-with-ai-submit]')!);
  });
}

describe('GenerateWithAiSection — place-on-canvas (Phase 5)', () => {
  it('shows the place-on-canvas button after a successful image gen when onPlaceImage is wired', async () => {
    const onPlaceImage = vi.fn();
    const { container } = mount({ onPlaceImage });

    await generateImageFlow(container);

    await waitFor(() => {
      expect(container.querySelector('[data-generate-with-ai-place-image]')).toBeTruthy();
    });
    expect(generateImageMock).toHaveBeenCalledTimes(1);
  });

  it('clicking place-on-canvas invokes the callback with URL + dims and hides the button', async () => {
    const onPlaceImage = vi.fn();
    const { container } = mount({ onPlaceImage });

    await generateImageFlow(container, 'data:image/svg+xml;base64,XYZ');

    let placeBtn: HTMLButtonElement | null = null;
    await waitFor(() => {
      placeBtn = container.querySelector<HTMLButtonElement>('[data-generate-with-ai-place-image]');
      expect(placeBtn).toBeTruthy();
    });

    await act(async () => { fireEvent.click(placeBtn!); });

    expect(onPlaceImage).toHaveBeenCalledTimes(1);
    const [calledUrl, calledDims] = onPlaceImage.mock.calls[0];
    expect(calledUrl).toBe('data:image/svg+xml;base64,XYZ');
    // The dimensions come from the image that was PRODUCED, not from what the
    // content type asked for — the provider is free to return another size.
    expect(calledDims).toEqual({ width: 1024, height: 1024 });

    // Button hides because lastImage is cleared.
    expect(container.querySelector('[data-generate-with-ai-place-image]')).toBeFalsy();
  });

  it('does not render the button when onPlaceImage is absent (back-compat)', async () => {
    const { container } = mount({}); // no onPlaceImage

    await generateImageFlow(container);

    // Wait long enough for any pending state to settle.
    await new Promise((r) => setTimeout(r, 80));
    expect(container.querySelector('[data-generate-with-ai-place-image]')).toBeFalsy();
  });
});
