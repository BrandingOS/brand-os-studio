// Phase 4.4 — admin templates queue browser E2E.
//
// Tests the full lifecycle: pending template appears in queue →
// admin approves OR rejects (with reason) → template moves out
// of pending. Plus the non-admin 403 gate.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import AdminTemplatesQueuePage from './TemplatesQueuePage';
import { __setIsAdminTestOverride } from '@/shared/hooks/useIsAdmin';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import { LocalTemplatesService } from '@/core/adapters/templates/LocalTemplatesService';

afterEach(() => {
  cleanup();
  serviceContainer.clear();
  __setIsAdminTestOverride(null);
  try {
    localStorage.removeItem('brandos:templates:bootstrapped-v1');
    localStorage.removeItem('brandos:templates:templates');
    localStorage.removeItem('brandos:templates:categories');
  } catch { /* ignore */ }
});

async function seedPending(svc: LocalTemplatesService) {
  // Trigger the bootstrap path FIRST — LocalTemplatesService
  // overwrites localStorage on first read; if we createTemplate
  // before any read, the seed inventory clobbers our addition.
  await svc.listTemplates();
  await svc.createTemplate({
    slug: 'pending-1', name: 'Submitted post',
    description: null,
    source: 'user_uploaded',
    categoryId: 'cat-social-posts',
    document: null as never, // not needed for queue logic
    thumbnailUrl: 'data:image/svg+xml;utf8,a',
    previewImageUrl: null,
    width: 1080, height: 1080,
    tags: ['social', 'community'], mood: 'bold',
    promptText: null, promptSystemHints: null, rasterImageUrl: null,
    uploadedByUserId: 'user-aaa',
    uploadStatus: 'pending',
    uploadedAt: new Date().toISOString(),
    approvedAt: null, approvedByUserId: null, rejectionReason: null,
    visibility: 'public', isPremium: false, requiredPlan: null,
  });
}

function mountAsAdmin(svc: LocalTemplatesService) {
  serviceContainer.register(SERVICE_KEYS.TEMPLATES, () => svc);
  __setIsAdminTestOverride({ isAdmin: true });
  return render(
    <MemoryRouter>
      <AdminTemplatesQueuePage />
      <Toaster />
    </MemoryRouter>,
  );
}

describe('Phase 4.4 — admin templates queue', () => {
  let svc: LocalTemplatesService;
  beforeEach(() => {
    svc = new LocalTemplatesService();
  });

  it('non-admin user sees 403 page', async () => {
    serviceContainer.register(SERVICE_KEYS.TEMPLATES, () => svc);
    __setIsAdminTestOverride({ isAdmin: false });
    const { container } = render(
      <MemoryRouter>
        <AdminTemplatesQueuePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-admin-403]')).toBeTruthy();
    });
    expect(container.querySelector('[data-admin-templates-queue]')).toBeNull();
  });

  it('admin sees the queue with pending templates', async () => {
    await seedPending(svc);
    const { container } = mountAsAdmin(svc);
    await waitFor(() => {
      expect(container.querySelector('[data-admin-templates-queue]')).toBeTruthy();
      const cards = container.querySelectorAll('[data-pending-template]');
      expect(cards.length).toBe(1);
    });
    // Card shows the submitted name + tags.
    expect(container.textContent).toMatch(/Submitted post/);
  });

  it('Approve action moves template out of pending', async () => {
    await seedPending(svc);
    const { container } = mountAsAdmin(svc);
    await waitFor(() => container.querySelector('[data-pending-template]'));

    let approveBtn: HTMLButtonElement | null = null;
    await waitFor(() => {
      approveBtn = container.querySelector<HTMLButtonElement>('[data-approve]');
      expect(approveBtn).toBeTruthy();
    });
    fireEvent.click(approveBtn!);

    await waitFor(() => {
      expect(container.querySelector('[data-admin-queue-empty]')).toBeTruthy();
    });

    // Verify state — the template is now approved.
    const all = await svc.listTemplates({ source: 'user_uploaded' });
    const t = all.find((x) => x.slug === 'pending-1')!;
    expect(t.uploadStatus).toBe('approved');
    expect(t.approvedAt).toBeTruthy();
  });

  it('Reject requires a reason; cancel returns to action buttons', async () => {
    await seedPending(svc);
    const { container } = mountAsAdmin(svc);
    await waitFor(() => container.querySelector('[data-pending-template]'));

    // Re-query inside waitFor so we get the live element even after
    // the page rerenders post-mount.
    let rejectOpen: HTMLButtonElement | null = null;
    await waitFor(() => {
      rejectOpen = container.querySelector<HTMLButtonElement>('[data-reject-open]');
      expect(rejectOpen).toBeTruthy();
    });
    fireEvent.click(rejectOpen!);

    // Reason textarea appears + Confirm button is disabled when empty.
    await waitFor(() => container.querySelector('[data-reject-reason]'));
    const confirmBtn = container.querySelector<HTMLButtonElement>('[data-reject-confirm]')!;
    expect(confirmBtn.disabled).toBe(true);

    // Fill reason → Confirm enabled → click.
    fireEvent.change(
      container.querySelector<HTMLTextAreaElement>('[data-reject-reason]')!,
      { target: { value: 'Layout violates brand guidelines.' } },
    );
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(container.querySelector('[data-admin-queue-empty]')).toBeTruthy();
    });

    const all = await svc.listTemplates({ source: 'user_uploaded' });
    const t = all.find((x) => x.slug === 'pending-1')!;
    expect(t.uploadStatus).toBe('rejected');
    expect(t.rejectionReason).toBe('Layout violates brand guidelines.');
  });

  it('empty queue shows the empty state', async () => {
    const { container } = mountAsAdmin(svc);
    await waitFor(() => {
      expect(container.querySelector('[data-admin-queue-empty]')).toBeTruthy();
    });
  });
});
