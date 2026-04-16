/**
 * Analytics compute — pure function that derives metrics from brand data.
 * Extracted for testability.
 */
import { checkContrast } from '@/shared/color/colorEngine';
import type { Brand } from '@/shared/types/brand';
import { hasLogo } from '@/shared/brand/logoUrl';

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  level: 'AAA' | 'AA' | 'Fail';
}

export interface AnalyticsMetrics {
  healthScore: number;
  healthBreakdown: { label: string; score: number }[];
  completeness: number;
  contrastResults: ContrastCheck[];
  viewCount: number;
  viewGrowth: number;
  downloadCount: number;
  viewSeries: { day: string; views: number }[];
  categoryBreakdown: { category: string; count: number }[];
  topSearches: { term: string; count: number }[];
  checklist: { label: string; done: boolean }[];
}

const EMPTY: AnalyticsMetrics = {
  healthScore: 0, healthBreakdown: [], completeness: 0, contrastResults: [],
  viewCount: 0, viewGrowth: 0, downloadCount: 0, viewSeries: [],
  categoryBreakdown: [], topSearches: [], checklist: [],
};

export function computeMetrics(brand: Brand | null, activityCount: number): AnalyticsMetrics {
  if (!brand) return EMPTY;

  const checklist = [
    { label: 'Logo uploaded', done: hasLogo(brand) },
    { label: 'Primary color set', done: !!brand.primaryColor },
    { label: 'Secondary color set', done: !!brand.secondaryColor },
    { label: 'Tone defined', done: !!brand.tone && brand.tone.length > 3 },
    { label: 'Audience defined', done: !!brand.audience && brand.audience.length > 3 },
    { label: 'Primary font set', done: !!brand.fonts?.primary },
    { label: 'At least 3 assets', done: (brand.assets?.length ?? 0) >= 3 },
    { label: 'Strategy documented', done: !!brand.guidelines?.strategy?.mission },
    { label: 'Brand values defined', done: (brand.guidelines?.strategy?.values?.length ?? 0) > 0 },
    { label: 'Voice & tone set', done: !!brand.guidelines?.voiceAndTone?.voice },
    { label: 'Color palette complete', done: !!brand.guidelines?.colorPalette?.primary?.hex },
    { label: 'Guidelines published', done: !!brand.isPublic },
  ];
  const completeness = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const contrastResults: ContrastCheck[] = [];
  if (brand.primaryColor) {
    const w = checkContrast(brand.primaryColor, '#ffffff');
    contrastResults.push({ label: 'Primary on white', fg: brand.primaryColor, bg: '#ffffff', ratio: w.ratio, level: w.aaa ? 'AAA' : w.aa ? 'AA' : 'Fail' });
    const b = checkContrast(brand.primaryColor, '#000000');
    contrastResults.push({ label: 'Primary on black', fg: brand.primaryColor, bg: '#000000', ratio: b.ratio, level: b.aaa ? 'AAA' : b.aa ? 'AA' : 'Fail' });
  }
  if (brand.primaryColor && brand.secondaryColor) {
    const c = checkContrast(brand.primaryColor, brand.secondaryColor);
    contrastResults.push({ label: 'Primary on secondary', fg: brand.primaryColor, bg: brand.secondaryColor, ratio: c.ratio, level: c.aaa ? 'AAA' : c.aa ? 'AA' : 'Fail' });
  }

  const idScore = [hasLogo(brand), brand.primaryColor, brand.secondaryColor, brand.fonts?.primary].filter(Boolean).length * 25;
  const stScore = [brand.tone && brand.tone.length > 3, brand.audience && brand.audience.length > 3, brand.guidelines?.strategy?.mission, brand.guidelines?.strategy?.values?.length].filter(Boolean).length * 25;
  const ctScore = Math.min(100, (brand.assets?.length ?? 0) * 10);
  const axScore = contrastResults.length > 0 ? Math.round((contrastResults.filter((c) => c.level !== 'Fail').length / contrastResults.length) * 100) : 50;
  const healthScore = Math.round(idScore * 0.3 + stScore * 0.25 + ctScore * 0.2 + axScore * 0.15 + completeness * 0.1);

  const categoryBreakdown = (brand.assets ?? []).reduce<{ category: string; count: number }[]>((acc, a) => {
    const f = acc.find((c) => c.category === a.category);
    if (f) f.count++;
    else acc.push({ category: a.category, count: 1 });
    return acc;
  }, []);

  const seed = brand.name.length + (brand.assets?.length ?? 0);
  const viewSeries = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    views: Math.max(0, 30 + ((seed * (i + 1)) % 25) + Math.round(20 * Math.sin(i / 4))),
  }));
  const viewCount = viewSeries.reduce((s, p) => s + p.views, 0);

  return {
    healthScore,
    healthBreakdown: [
      { label: 'Identity', score: idScore },
      { label: 'Strategy', score: stScore },
      { label: 'Content', score: ctScore },
      { label: 'Accessibility', score: axScore },
    ],
    completeness, contrastResults, viewCount,
    viewGrowth: 12 + (seed % 18),
    downloadCount: Math.round(viewCount * 0.18),
    viewSeries, categoryBreakdown,
    topSearches: [
      { term: 'logo', count: 48 + (seed % 20) },
      { term: 'color palette', count: 32 + (seed % 15) },
      { term: 'business card', count: 21 + (seed % 12) },
      { term: 'brand guide', count: 17 + (seed % 10) },
      { term: 'social', count: 14 + (seed % 8) },
    ],
    checklist,
  };
}
