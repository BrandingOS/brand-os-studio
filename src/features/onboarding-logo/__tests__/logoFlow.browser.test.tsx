/**
 * Start From Logo, end to end, in a real browser, against the REAL local
 * services: upload a black SVG mark → read → answers → directions → refine →
 * build → the hub. Then the files themselves are built and inspected, because
 * a hub that lists a PDF it cannot produce is the failure this guards.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { bootServices } from '@/core/boot';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { useBrandStore } from '@/shared/store/brandStore';
import { LogoFlowScreen } from '../LogoFlowScreen';
import { useLogoFlow } from '../model/flowStore';
import { buildZip, packageCatalog } from '../export/package';

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100"><circle cx="40" cy="50" r="34"/><rect x="70" y="16" width="44" height="68"/></svg>`;

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/onboard-brand/logo']}>
      <Routes>
        <Route path="/onboard-brand/logo" element={<LogoFlowScreen />} />
        <Route path="/b/:slug/setup" element={<div>setup page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  useLogoFlow.getState().reset();
  bootServices();
  await useBrandStore.getState().loadAll();
});
afterEach(cleanup);

describe('Start From Logo', () => {
  it('turns one black mark into a saved brand and a full package', async () => {
    renderFlow();

    // 1 — logo + name
    const input = screen.getByTestId('logo-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([MARK], 'northwind-logo-black.svg', { type: 'image/svg+xml' })] } });
    await screen.findByText(/Vector \(SVG\)/);
    // The filename suggested a name; the owner corrects it.
    const name = screen.getByLabelText(/brand name/i) as HTMLInputElement;
    expect(name.value).toMatch(/northwind/i);
    fireEvent.change(name, { target: { value: 'Northwind' } });
    click(/read my logo/i);

    // 2 — the read, with the one question a machine can get wrong
    await screen.findByText(/Is your logo a symbol/i, {}, { timeout: 8000 });
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(2);
    click(/^continue$/i);

    // 3 — four answers
    await screen.findByText(/What does Northwind do\?/);
    const continueBtn = () => screen.getByRole('button', { name: /show me directions/i }) as HTMLButtonElement;
    expect(continueBtn().disabled).toBe(true);
    fireEvent.click(within(screen.getByRole('group', { name: 'Industry' })).getByText('SaaS'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Audience' })).getByText('Startups'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Positioning' })).getByText('Challenger'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Personality' })).getByText('Bold'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Colours to avoid' })).getByText('Green'));
    expect(continueBtn().disabled).toBe(false);
    fireEvent.click(continueBtn());

    // 4 — three distinct directions
    const cards = await screen.findAllByTestId('direction-card');
    expect(cards).toHaveLength(3);
    const firstName = within(cards[0]).getByRole('heading').textContent;
    fireEvent.click(within(cards[0]).getByRole('button', { name: /choose this direction/i }));

    // 5 — refine and approve
    await screen.findByLabelText(/refine the brand system/i);
    expect(screen.getByTestId('brand-board')).toBeTruthy();
    const before = useLogoFlow.getState().system!.palette.primary;
    fireEvent.click(screen.getByRole('button', { name: 'Warmer' }));
    expect(useLogoFlow.getState().system!.palette.primary).not.toBe(before);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(useLogoFlow.getState().system!.approved).toContain('color');
    expect(screen.getByText(/1 of 6 approved/)).toBeTruthy();
    click(/build my brand/i);

    // 6/7 — built, saved, handed over
    await screen.findByRole('button', { name: /download everything/i }, { timeout: 20000 });
    const { committed, system, context, logo } = useLogoFlow.getState();
    expect(committed).toBeTruthy();
    expect(system!.directionName).toBe(firstName);

    // The brand is real, and holds what was approved — read through the canonical repository.
    const repo = new BrandServiceRepository(container.get<IBrandsService>(SERVICE_KEYS.BRANDS));
    const saved = await repo.getById(committed!.brandId);
    expect(saved?.identity.colors.primary.hex.toLowerCase()).toBe(system!.palette.primary.toLowerCase());
    expect(saved?.identity.typography.primary.family).toBe(system!.type.heading);
    expect(saved?.identity.voice.tone).toBe(system!.voice.tone);
    expect(saved?.identity.logos.primary?.assetId).toBeTruthy();
    expect(saved?.identity.logos.mono?.white?.assetId).toBeTruthy();

    // The files: every logo variation is a real recoloured vector.
    const catalog = packageCatalog({ logo: logo!, system: system!, context });
    const ctx = { logo: logo!, system: system!, context, brand: useBrandStore.getState().list.find((b) => b.id === committed!.brandId), board: () => screen.getByTestId('brand-board') };
    const svg = catalog.find((d) => d.id === 'logo-reversed')!.files.find((f) => f.format === 'SVG')!;
    const svgText = await (await svg.build(ctx)).text();
    expect(svgText).toContain('#ffffff');
    expect(svgText).toContain(system!.palette.primary);

    const board = catalog.find((d) => d.id === 'board')!.files.find((f) => f.format === 'PNG')!;
    expect((await board.build(ctx)).size).toBeGreaterThan(10_000);

    const deck = catalog.find((d) => d.id === 'deck')!.files[0];
    const pptx = await deck.build(ctx);
    expect(pptx.size).toBeGreaterThan(10_000);

    const guidelines = catalog.find((d) => d.id === 'guidelines')!.files[0];
    const pdf = await guidelines.build(ctx);
    expect(pdf.size).toBeGreaterThan(20_000);
    expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5))).toBe('%PDF-');

    const social = catalog.find((d) => d.id === 'social-post')!.files[0];
    expect((await social.build(ctx)).type).toBe('image/png');

    // Opening the brand hands over to Setup and clears the draft.
    click(/^open northwind/i);
    await screen.findByText('setup page');
    expect(useLogoFlow.getState().logo).toBeNull();
  }, 60000);

  it('builds the whole package as one zip, naming anything it had to leave out', async () => {
    const { generateDirectionsSync, systemFromDirection } = await import('../engine/directions');
    const { sourceFromFile, readLogo } = await import('../engine/logoRead');
    const logo = await sourceFromFile(new File([MARK], 'mark.svg', { type: 'image/svg+xml' }));
    const read = await readLogo(logo);
    const context = { name: 'Zipco', oneLiner: '', industry: 'retail', audience: 'consumers', positioning: 'everyday', personality: ['friendly'], loveHues: [], avoidHues: [] };
    const system = systemFromDirection(generateDirectionsSync({ read, context })[0], read);
    // No brand and no board: guidelines, deck and board must be reported, not silently dropped.
    const catalog = packageCatalog({ logo, system, context }).filter((d) => d.group !== 'guidelines');
    const { blob, report } = await buildZip({ logo, system, context }, catalog);
    expect(blob.size).toBeGreaterThan(50_000);
    expect(report.skipped.map((s) => s.name).join(' ')).toMatch(/brand-board|presentation/);
    expect(report.count).toBeGreaterThan(30);
  }, 60000);
});
