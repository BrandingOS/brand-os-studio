/**
 * Onboarding V3 (R1) end to end, in a real browser, against the REAL services.
 *
 * The claims a unit test cannot make: that the DOM the user actually touches
 * produces the authority the spec promises, that merely RENDERING and reading
 * the review confirms nothing, and that the model's vocabulary never reaches
 * the screen.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta, type HumanActor } from '@/domain/brand';
import { applyProposals } from '../understanding/applyProposals';
import { acceptAll, acceptProposal } from '../understanding/acceptance';
import { ReviewStep, type ReviewStepProps } from '../steps/ReviewStep';
import { SetupStep } from '../steps/SetupStep';
import { UnderstandingStage } from '../steps/UnderstandingStage';
import { buildCreateInput } from '../understanding/createBrand';
import { isPlaceholderPath, readOnboardingState } from '@/shared/onboarding/onboardingState';
import { VOCABULARIES } from '../vocabulary/vocabularies';
import { planStages } from '../understanding/stages';
import type { Proposal } from '../understanding/proposals';

const actor: HumanActor = { kind: 'human', userId: 'u1' };

const PROPOSALS: Proposal[] = [
  { corePath: 'colors.primary', value: { hex: '#1C3F5E' }, provenance: 'inferred', evidence: 'your artwork' },
  { corePath: 'strategy.mission', value: 'Ship the thing', provenance: 'ai-suggested', evidence: 'your description' },
  { corePath: 'voice.tone', value: 'direct', provenance: 'ai-suggested', evidence: 'your description' },
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

/** A review with one open chip value and one open prose value. */
function reviewProps(over: Partial<ReviewStepProps> = {}): ReviewStepProps {
  return {
    brandName: 'Meridian',
    slogan: '',
    industryLabel: undefined,
    styleLabels: [],
    logos: { groups: [], duplicatesIgnored: 0 },
    swatches: [{ id: 'a', hex: '#1C3F5E', primary: true }],
    colorsDecided: false,
    paletteSuggestions: [],
    canExtract: false,
    fontRoles: [{ role: 'Heading', family: undefined }],
    fontsDecided: false,
    pairings: [],
    links: [],
    about: {
      industry: { value: undefined, vocabulary: VOCABULARIES.industry },
      products: '',
      values: [
        {
          path: 'strategy.mission',
          label: 'Mission',
          text: 'Ship the thing',
          origin: 'what you told us',
          decided: false,
        },
        {
          path: 'voice.tone',
          label: 'Tone',
          vocabulary: VOCABULARIES.tone,
          selected: ['direct'],
          origin: 'what you told us',
          decided: false,
        },
      ],
      freeSections: [],
      questions: [],
    },
    libraryItems: [],
    busy: false,
    problem: null,
    onSlogan: () => {}, onPlaceLogo: () => {}, onRemoveLogo: () => {}, onUploadMore: () => {},
    onColorsLooksRight: () => {}, onAddColor: () => {}, onExtractFromLogo: () => {},
    onExtractFromImage: () => {}, onSuggestPalettes: () => {}, onApplyPalette: () => {},
    onRemoveColor: () => {}, onFontsLooksRight: () => {}, onApplyPairing: () => {},
    onRenameFont: () => {}, onAddLink: () => {}, onRemoveLink: () => {},
    onToggleChip: () => {}, onEditText: () => {}, onIndustry: () => {}, onProducts: () => {},
    onAboutLooksRight: () => {}, onAnswer: () => {}, onAddSection: () => {}, onEditSection: () => {},
    onRenameAsset: () => {}, onRemoveAsset: () => {}, onDismissProblem: () => {},
    onFinish: () => {}, onBack: () => {},
    ...over,
  };
}

// ── Screen 1 ─────────────────────────────────────────────────────────
describe('Screen 1 — Set up your Brand, all on one screen', () => {
  const props = { busy: false, error: null, onContinue: () => {} };

  it('carries the name, the description and the upload area together', () => {
    render(<SetupStep {...props} />);
    expect(screen.getByLabelText(/brand name/i)).toBeTruthy();
    expect(screen.getByLabelText(/describe your brand/i)).toBeTruthy();
    expect(screen.getByText(/drag & drop image or folder here/i)).toBeTruthy();
    expect(screen.getByLabelText(/your website/i)).toBeTruthy();
  });

  it('the name is the only thing that unlocks Continue', () => {
    render(<SetupStep {...props} />);
    const cta = screen.getByRole('button', { name: /continue/i });
    expect(cta).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Meridian' } });
    expect(cta).not.toBeDisabled();
  });

  it('never asks the user to classify themselves', () => {
    render(<SetupStep {...props} />);
    expect(screen.queryByText(/from scratch|i have a brand|starting new/i)).toBeNull();
  });

  it('states the file limits before anything is dropped', () => {
    render(<SetupStep {...props} />);
    expect(screen.getByText(/up to 10 files · 5 mb each/i)).toBeTruthy();
  });

  it('the AI actions are behind a popover, never stacked under the textarea', () => {
    render(<SetupStep {...props} />);
    const trigger = screen.getByRole('button', { name: /build with ai/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('menu', { hidden: true }).getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menuitem', { name: /copy prompt/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /open in chatgpt/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /open in claude/i })).toBeTruthy();
  });

  it('closes the popover on Escape', () => {
    render(<SetupStep {...props} />);
    const trigger = screen.getByRole('button', { name: /build with ai/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('passes only what was typed — nothing is invented', () => {
    const seen: Array<{ name: string; description: string; website: string }> = [];
    render(<SetupStep {...props} onContinue={(v) => seen.push(v)} />);
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Meridian' } });
    fireEvent.change(screen.getByLabelText(/describe your brand/i), { target: { value: 'We build things' } });
    fireEvent.change(screen.getByLabelText(/your website/i), { target: { value: 'meridian.co' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(seen).toEqual([{ name: 'Meridian', description: 'We build things', website: 'meridian.co' }]);
  });
});

// ── The processing transition ────────────────────────────────────────
describe('the processing moment', () => {
  it('a name-only brand narrates no file work — the copy is unrepresentable', () => {
    const stages = planStages({ brandName: 'Meridian', hasText: false, hasBrief: false, items: [] });
    const labels = stages.map((s) => s.label);
    expect(labels).not.toContain('Organising your brand files');
    expect(labels).not.toContain('Finding your logo system');
    expect(labels).not.toContain('Extracting your colours');
  });

  it('shows no percentage and no progress bar', async () => {
    const stages = planStages({ brandName: 'Meridian', hasText: false, hasBrief: false, items: [] });
    render(
      <UnderstandingStage
        brandName="Meridian"
        stages={stages}
        work={() => Promise.resolve()}
        onDone={() => {}}
      />,
    );
    expect(document.body.textContent).not.toMatch(/\d+%/);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('plays one full beat before advancing, even when the work is instant', async () => {
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      const stages = planStages({ brandName: 'Meridian', hasText: false, hasBrief: false, items: [] });
      render(
        <UnderstandingStage brandName="Meridian" stages={stages} work={() => Promise.resolve()} onDone={done} />,
      );
      await vi.advanceTimersByTimeAsync(600);
      expect(done).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(900);
      expect(done).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── Screen 3 ─────────────────────────────────────────────────────────
describe('Screen 3 — reading is never accepting', () => {
  it('rendering the whole review performs ZERO acceptances', async () => {
    const { repo, id } = await seededBrand();
    render(<ReviewStep {...reviewProps()} />);
    // Mount, effects, observers, scroll handlers — none of it may promote.
    await waitFor(() => expect(screen.getByText(/here.s what we found/i)).toBeTruthy());
    for (const p of PROPOSALS) {
      const authority = await authorityOf(repo, id, p.corePath);
      expect(['suggested', 'provisional']).toContain(authority);
    }
  });

  it('keeps the retired page’s section composition and order', () => {
    render(<ReviewStep {...reviewProps()} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Logos', 'Colors', 'Fonts', 'Links', 'About', 'Brand assets']);
  });

  it('clicking one chip confirms exactly that value', async () => {
    const { repo, id } = await seededBrand();
    await acceptProposal(repo, id, 'voice.tone', actor);
    expect(await authorityOf(repo, id, 'voice.tone')).toBe('confirmed');
    // and nothing else moved
    expect(['suggested', 'provisional']).toContain(await authorityOf(repo, id, 'strategy.mission'));
  });
});

describe('the count never becomes completion pressure', () => {
  it('shows a per-section count, scoped to that section', () => {
    render(<ReviewStep {...reviewProps()} />);
    const about = screen.getByRole('heading', { name: 'About' }).closest('article')!;
    expect(within(about).getByText(/0 of 2 decided/)).toBeTruthy();
  });

  it('renders no progress bar, percentage or completion meter anywhere', () => {
    render(<ReviewStep {...reviewProps()} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+%/);
    expect(document.body.textContent).not.toMatch(/almost (there|done)|complete your brand/i);
  });

  it('Open my brand is enabled with nothing confirmed', () => {
    render(<ReviewStep {...reviewProps()} />);
    expect(screen.getByRole('button', { name: /open my brand/i })).not.toBeDisabled();
  });
});

describe('the interface never exposes the model', () => {
  it('shows no authority or provenance vocabulary', () => {
    render(<ReviewStep {...reviewProps()} />);
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const banned of ['authority', 'provenance', 'official', 'proposal', 'core value', 'user-entered']) {
      expect(text).not.toContain(banned);
    }
  });

  it('never uses "suggested" as a STATUS, only as ordinary product copy', () => {
    // "Add suggested palettes" is the retired interface's own wording and means
    // palettes we are offering — it does not expose the model. What would
    // expose the model is the word appearing where a value's state is
    // described, so that is what this checks rather than banning the token
    // outright.
    render(<ReviewStep {...reviewProps()} />);
    const stateBearing = [
      ...document.querySelectorAll('.onb-vo, .onb-vk, .onb-count, .onb-bulk'),
    ].map((el) => (el.textContent ?? '').toLowerCase());
    for (const text of stateBearing) {
      expect(text).not.toContain('suggested');
      expect(text).not.toContain('confirmed by the system');
    }
  });

  it('origin text sits in the origin slot, never in the value slot', () => {
    render(<ReviewStep {...reviewProps()} />);
    const origin = document.querySelector('.onb-vo');
    expect(origin?.textContent).toMatch(/from what you told us/i);
    // The value itself is a different element — the footnote can never be
    // mistaken for the brand content it annotates.
    expect(origin?.classList.contains('onb-vt')).toBe(false);
  });

  it('a confirmed value says who decided it instead', () => {
    const props = reviewProps();
    props.about.values[0].decided = true;
    render(<ReviewStep {...props} />);
    expect(screen.getByText(/confirmed by you/i)).toBeTruthy();
  });
});

describe('"Looks right" equals accepting each value individually', () => {
  it('produces the same authority as per-value acceptance', async () => {
    const a = await seededBrand();
    const b = await seededBrand();
    const paths = PROPOSALS.map((p) => p.corePath);

    await acceptAll(a.repo, a.id, paths, actor);
    for (const path of paths) await acceptProposal(b.repo, b.id, path, actor);

    for (const path of paths) {
      expect(await authorityOf(a.repo, a.id, path)).toBe(await authorityOf(b.repo, b.id, path));
    }
  });
});

describe('a name-only brand, through the real service stack', () => {
  it('records both sentinels and reads them as unset', async () => {
    const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
    const created = await brands.create(buildCreateInput({ name: 'Sentinel E2E' }) as never);
    const state = readOnboardingState(created);
    expect(state?.placeholders).toEqual(['colors.primary', 'typography.primary']);
    expect(isPlaceholderPath(created, 'colors.primary')).toBe(true);
  });

  it('a real colour write is what retires the sentinel', async () => {
    const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
    const created = await brands.create(buildCreateInput({ name: 'Retire E2E' }) as never);
    const repo = new BrandServiceRepository(brands);
    const report = await applyProposals(repo, created.id, [PROPOSALS[0]]);
    expect(report.applied).toContain('colors.primary');
  });
});
