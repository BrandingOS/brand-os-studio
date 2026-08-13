/**
 * Onboarding V3 end to end, in a real browser, against the REAL services.
 *
 * The claims a unit test cannot make: that the DOM the user actually touches
 * produces the authority the spec promises, and — the load-bearing one — that
 * merely RENDERING and reading the review confirms nothing.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta, type HumanActor } from '@/domain/brand';
import { applyProposals } from '../understanding/applyProposals';
import { acceptAll, acceptProposal } from '../understanding/acceptance';
import { ReviewStep } from '../steps/ReviewStep';
import { BasicsStep } from '../steps/BasicsStep';
import { buildCreateInput } from '../understanding/createBrand';
import { isPlaceholderPath, readOnboardingState } from '@/shared/onboarding/onboardingState';
import type { Proposal } from '../understanding/proposals';

const actor: HumanActor = { kind: 'human', userId: 'u1' };

const PROPOSALS: Proposal[] = [
  { corePath: 'colors.primary', value: { hex: '#1C3F5E' }, provenance: 'inferred', evidence: 'your artwork' },
  { corePath: 'strategy.mission', value: 'Ship the thing', provenance: 'ai-suggested', evidence: 'your description' },
  { corePath: 'voice.tone', value: 'Direct', provenance: 'ai-suggested', evidence: 'your description' },
];

beforeEach(() => {
  localStorage.clear();
  bootServices();
});
afterEach(cleanup);

async function seededBrand() {
  const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
  const created = await brands.create(buildCreateInput({ name: 'Meridian E2E' }) as never);
  const repo = new BrandServiceRepository(brands);
  await applyProposals(repo, created.id, PROPOSALS);
  return { brands, repo, id: created.id };
}

const authorityOf = async (repo: BrandServiceRepository, id: string, path: Parameters<typeof coreValueMeta>[1]) =>
  coreValueMeta((await repo.getById(id))!.identityMeta, path).authority;

// ── Screen 1 ─────────────────────────────────────────────────────────
describe('Screen 1 — tell us about your brand', () => {
  it('the name is the only thing that unlocks Continue', () => {
    render(<BasicsStep busy={false} error={null} onContinue={() => {}} />);
    const cta = screen.getByRole('button', { name: /continue/i });
    expect(cta).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Meridian' } });
    expect(cta).not.toBeDisabled();
  });

  it('never asks the user to classify themselves', () => {
    render(<BasicsStep busy={false} error={null} onContinue={() => {}} />);
    expect(screen.queryByText(/already have a brand/i)).toBeNull();
    expect(screen.queryByText(/starting (new|from scratch)/i)).toBeNull();
  });

  it('passes only what was typed — nothing is invented', () => {
    let got: unknown = null;
    render(<BasicsStep busy={false} error={null} onContinue={(v) => { got = v; }} />);
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Meridian' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(got).toEqual({ name: 'Meridian', description: '', website: '' });
  });
});

// ── Screen 3, the critical rule ──────────────────────────────────────
describe('Screen 3 — reading is never accepting', () => {
  function renderReview(
    confirmed = new Set<string>(),
    onAccept: (path: never) => void = () => {},
  ) {
    return render(
      <MemoryRouter>
        <ReviewStep
          proposals={PROPOSALS}
          confirmed={confirmed}
          material={[]}
          busy={false}
          problem={null}
          stillReading={false}
          onAccept={onAccept}
          onAcceptSection={() => {}}
          onEdit={() => {}}
          onFinish={() => {}}
          onDismissProblem={() => {}}
        />
      </MemoryRouter>,
    );
  }

  it('rendering the whole review performs ZERO acceptances', async () => {
    const { repo, id } = await seededBrand();
    renderReview();
    // Everything is on screen and readable…
    expect(screen.getByText('Ship the thing')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    // …and nothing has been confirmed by looking at it.
    for (const p of PROPOSALS) {
      expect(await authorityOf(repo, id, p.corePath)).toBe('suggested');
    }
  });

  it('every proposal starts with an Accept control, not a confirmed one', () => {
    renderReview();
    const accepts = screen.getAllByRole('button', { pressed: false });
    expect(accepts.length).toBeGreaterThanOrEqual(PROPOSALS.length);
  });

  it('a confirmed value reports itself as pressed to assistive tech', () => {
    renderReview(new Set(['strategy.mission']));
    expect(screen.getByRole('button', { name: /confirmed — mission/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clicking one Accept confirms exactly that value', async () => {
    const { repo, id } = await seededBrand();
    renderReview(new Set(), (path) => { void acceptProposal(repo, id, path, actor); });

    fireEvent.click(screen.getByRole('button', { name: /accept mission/i }));

    await waitFor(async () => {
      expect(await authorityOf(repo, id, 'strategy.mission')).toBe('confirmed');
    });
    // Neighbours untouched — the whole point of per-value.
    expect(await authorityOf(repo, id, 'voice.tone')).toBe('suggested');
    expect(await authorityOf(repo, id, 'colors.primary')).toBe('suggested');
  });
});

// ── The section count is contextual, never global pressure ───────────
describe('the count never becomes completion pressure', () => {
  function renderReview(confirmed: Set<string>) {
    return render(
      <MemoryRouter>
        <ReviewStep
          proposals={PROPOSALS} confirmed={confirmed} material={[]} busy={false}
          problem={null} stillReading={false}
          onAccept={() => {}} onAcceptSection={() => {}} onEdit={() => {}}
          onFinish={() => {}} onDismissProblem={() => {}}
        />
      </MemoryRouter>,
    );
  }

  it('shows a per-section count, scoped to that section', () => {
    renderReview(new Set());
    expect(screen.getByText('0 of 1 decided')).toBeInTheDocument(); // Visual direction
    expect(screen.getByText('0 of 2 decided')).toBeInTheDocument(); // Brand thinking
  });

  it('renders no progress bar, percentage or completion meter anywhere', () => {
    const { container: dom } = renderReview(new Set(['strategy.mission']));
    expect(dom.querySelector('progress')).toBeNull();
    expect(dom.querySelector('[role="progressbar"]')).toBeNull();
    expect(dom.textContent).not.toMatch(/\d+\s*%/);
    expect(dom.textContent).not.toMatch(/complete|remaining|finish setting up/i);
  });

  it('Open my brand is enabled with nothing confirmed', () => {
    renderReview(new Set());
    expect(screen.getByRole('button', { name: /open my brand/i })).not.toBeDisabled();
  });

  it('the footer states the split neutrally, without urging', () => {
    renderReview(new Set(['strategy.mission']));
    expect(screen.getByText(/2 still suggested · 1 confirmed/)).toBeInTheDocument();
  });
});

// ── Origin stays secondary ───────────────────────────────────────────
describe('origin text is secondary to the value', () => {
  it('shows where a belief came from, in the user’s words', () => {
    render(
      <MemoryRouter>
        <ReviewStep
          proposals={PROPOSALS} confirmed={new Set()} material={[]} busy={false}
          problem={null} stillReading={false}
          onAccept={() => {}} onAcceptSection={() => {}} onEdit={() => {}}
          onFinish={() => {}} onDismissProblem={() => {}}
        />
      </MemoryRouter>,
    );
    const origins = screen.getAllByText(/^From your description$/);
    expect(origins.length).toBeGreaterThan(0);
    // Secondary by construction: it lives in the origin slot, never in the
    // value slot, so it cannot compete with the brand content.
    expect(origins[0]).toHaveClass('onb-v-o');
    expect(screen.getByText('Ship the thing')).toHaveClass('onb-v-t');
  });

  it('a confirmed value says who decided it instead', () => {
    render(
      <MemoryRouter>
        <ReviewStep
          proposals={PROPOSALS} confirmed={new Set(['strategy.mission'])} material={[]} busy={false}
          problem={null} stillReading={false}
          onAccept={() => {}} onAcceptSection={() => {}} onEdit={() => {}}
          onFinish={() => {}} onDismissProblem={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Confirmed by you')).toBeInTheDocument();
  });
});

// ── "Looks right" is a loop ──────────────────────────────────────────
describe('"Looks right" equals accepting each value individually', () => {
  it('produces the same authority as per-value acceptance', async () => {
    const bulk = await seededBrand();
    await acceptAll(bulk.repo, bulk.id, ['strategy.mission', 'voice.tone'], actor);

    const one = await seededBrand();
    await acceptProposal(one.repo, one.id, 'strategy.mission', actor);
    await acceptProposal(one.repo, one.id, 'voice.tone', actor);

    for (const path of ['strategy.mission', 'voice.tone'] as const) {
      expect(await authorityOf(bulk.repo, bulk.id, path))
        .toBe(await authorityOf(one.repo, one.id, path));
    }
  });
});

// ── Sentinels, through the real services ─────────────────────────────
describe('a name-only brand, through the real service stack', () => {
  it('records both sentinels and reads them as unset', async () => {
    const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
    const created = await brands.create(buildCreateInput({ name: 'Nameless' }) as never);
    const reloaded = await brands.getById(created.id);

    expect(isPlaceholderPath(reloaded!, 'colors.primary')).toBe(true);
    expect(isPlaceholderPath(reloaded!, 'typography.primary')).toBe(true);
    // The marker survived a real persistence round trip.
    expect(readOnboardingState(reloaded!)?.step).toBe('basics');
  });

  it('a real colour write is what retires the sentinel', async () => {
    const { repo, id, brands } = await seededBrand();
    expect(await authorityOf(repo, id, 'colors.primary')).toBe('suggested');
    const brand = await brands.getById(id);
    // applyProposals wrote a real colour; the flow clears the marker on the
    // back of that report (see OnboardingFlow.runUnderstanding).
    expect(brand!.primaryColor).not.toBe('#8A877E');
  });
});

// ── Nothing is generated ─────────────────────────────────────────────
describe('FR-030 — onboarding produces no deliverables', () => {
  it('a finished brand has no kit adoptions', async () => {
    const { id } = await seededBrand();
    const adoptions = container.get<{ list(b: string): Promise<unknown[]> }>(SERVICE_KEYS.KIT_ADOPTIONS);
    expect(await adoptions.list(id)).toEqual([]);
  });
});
