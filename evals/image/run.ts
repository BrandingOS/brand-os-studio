// The evaluation runner.
//
//   npm run eval:image                     mock mode — zero credits, zero network
//   npm run eval:image -- --mode=live      real provider calls, budget-capped
//   npm run eval:image -- --stage=compile  prompts only, no images
//
// Two rules it exists to keep: the whole run is priced by the SERVER and
// checked against the budget before the first paid call, and every cell is
// recorded with enough context (model, compiled prompt, references, includes,
// cost, latency, failure) that two runs can be compared on something other
// than vibes.

import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { recordId, type EvalRecord } from './record';
import { currentBalance, estimate, generate, idempotencyKeyFor, priceRun, requireJwt, sha256 } from './transport';
import { scoreBrief } from './score/heuristic';

// A browser-shaped global so the real compiler (and the supabase client it
// pulls in) can be imported under node.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(), key: () => null, length: 0,
};
(globalThis as { window?: unknown }).window = globalThis;

interface Task {
  id: string;
  why: string;
  userPrompt: string;
  copy: { headline?: string; subhead?: string; cta?: string } | null;
  formatId: string;
  kind: 'design' | 'image' | 'auto';
}

function arg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const MODE = (arg('mode', 'mock') as 'mock' | 'live');
const STAGE = (arg('stage', 'generate') as 'compile' | 'generate');
const BUDGET = Number(arg('budget-credits', '50'));
const MODELS = (arg('models', 'google:nano-banana') ?? '').split(',').filter(Boolean);
const VARIANTS = (arg('variants', 'baseline,candidate') ?? '').split(',').filter(Boolean);
const TASKS_FILE = arg('tasks', 'default');
const BRAND_ID = process.env.BRAND ?? '';

const HERE = new URL('.', import.meta.url).pathname;
const RUN_ID = arg('run-id', new Date().toISOString().replace(/[:.]/g, '-'))!;
const OUT = join(HERE, 'runs', RUN_ID);

const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();

async function main() {
  const tasksPath = join(HERE, 'tasks', `${TASKS_FILE}.json`);
  const set = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(tasksPath, 'utf8'))) as
    { brandSlug: string; tasks: Task[] };

  const { SEED_BRANDS } = await import('@/data/brands');
  const brand = (SEED_BRANDS as Array<{ slug: string }>).find((b) => b.slug === set.brandSlug);
  if (!brand) throw new Error(`No seed brand "${set.brandSlug}"`);

  const { deterministicCompile } = await import('@/features/editor/ai/imagePrompt/compileImagePrompt');
  const baselineUrl = arg('baseline-dir');
  const baseline = baselineUrl
    ? (await import(join(baselineUrl, 'compileImagePrompt.old.ts'))).deterministicCompile
    : null;

  mkdirSync(join(OUT, 'images'), { recursive: true });
  const jsonl = join(OUT, 'records.jsonl');

  // ── Compile every cell first. Free, and it tells us what to price. ──
  interface Cell {
    id: string; task: Task; variantId: string; modelId: string;
    prompt: string; negativePrompt?: string; compileMs: number;
    source: 'claude' | 'deterministic'; kind: string; deliverable: string;
    paletteHexes: string[]; useLogo: boolean;
  }
  const cells: Cell[] = [];

  for (const task of set.tasks) {
    for (const variantId of VARIANTS) {
      const compile = variantId === 'baseline' ? baseline : deterministicCompile;
      if (!compile) continue;
      const t0 = Date.now();
      const out = compile({
        userPrompt: task.userPrompt,
        brand,
        formatLabel: task.formatId,
        copy: task.copy ?? undefined,
        kind: task.kind === 'auto' ? undefined : task.kind,
        count: 1,
      });
      const compileMs = Date.now() - t0;
      for (const modelId of (STAGE === 'compile' ? ['none'] : MODELS)) {
        cells.push({
          id: recordId(task.id, modelId, variantId),
          task, variantId, modelId,
          prompt: out.prompt,
          negativePrompt: out.negativePrompt,
          compileMs,
          source: out.source, kind: out.kind, deliverable: out.deliverable,
          paletteHexes: out.paletteHexes, useLogo: out.useLogo,
        });
      }
    }
  }

  console.log(`${cells.length} cells · mode=${MODE} · stage=${STAGE}`);

  // ── Price the whole run before spending anything. ──
  let priced = new Map<string, { credits: number; usd: number; pricingVersion: string; model: string }>();
  if (MODE === 'live' && STAGE === 'generate') {
    const jwt = requireJwt();
    const { total, perCell } = await priceRun(
      cells.map((c) => ({ id: c.id, model: c.modelId, count: 1, size: 1024 })),
      BUDGET, jwt,
    );
    priced = perCell as never;
    console.log(`priced: ${total} credits (budget ${BUDGET}) — proceeding`);
  }

  const records: EvalRecord[] = [];
  // Charge is a balance DELTA, read from the server between calls.
  let lastBalance: number | null = null;
  for (const c of cells) {
    const est = priced.get(c.id);
    const base: EvalRecord = {
      id: c.id, runId: RUN_ID, gitSha, stage: STAGE, mode: MODE,
      taskId: c.task.id, variantId: c.variantId,
      userPrompt: c.task.userPrompt, copy: c.task.copy,
      kind: c.kind as EvalRecord['kind'], formatId: c.task.formatId, aspectRatio: '1:1',
      modelRequested: c.modelId, modelResolved: est?.model ?? c.modelId,
      compiledPrompt: c.prompt, negativePrompt: c.negativePrompt ?? null,
      compileSource: c.source, compileLatencyMs: c.compileMs, promptSha256: sha256(c.prompt),
      references: [], seed: null,
      brandIncludes: {
        logo: c.useLogo, text: true, colours: c.paletteHexes.length > 0, identity: true,
        paletteHexes: c.paletteHexes, brandSlug: set.brandSlug,
      },
      imagePath: null, width: null, height: null,
      estimatedCredits: est?.credits ?? 0, chargedCredits: 0,
      usd: est?.usd ?? 0, pricingVersion: est?.pricingVersion ?? null,
      latencyMs: 0, warnings: [], ok: true, failure: null,
      scores: { heuristic: scoreBrief(c.prompt, c.negativePrompt ?? '', c.task) },
    };

    if (STAGE === 'compile' || MODE === 'mock') {
      records.push(base);
      appendFileSync(jsonl, `${JSON.stringify(base)}\n`);
      continue;
    }

    const jwt = requireJwt();
    if (lastBalance == null) {
      // Seed the delta from a free call so the first cell's charge is real.
      lastBalance = (await estimate({ model: c.modelId, count: 1 }, jwt)) ? await currentBalance(jwt) : null;
    }
    const t0 = Date.now();
    try {
      const res = await generate({
        brandId: BRAND_ID,
        userPrompt: c.task.userPrompt,
        compiledPrompt: c.prompt,
        negativePrompt: c.negativePrompt,
        model: c.modelId,
        aspectRatio: '1:1', size: 1024, count: 1,
        idempotencyKey: idempotencyKeyFor(c.id, RUN_ID),
      }, jwt);
      const out = res.job.outputs?.[0];
      let imagePath: string | null = null;
      if (out?.url) {
        const bytes = Buffer.from(await (await fetch(out.url)).arrayBuffer());
        imagePath = join(OUT, 'images', `${c.id}.jpg`);
        writeFileSync(imagePath, bytes);
      }
      const rec: EvalRecord = {
        ...base,
        modelResolved: res.job.model ?? c.modelId,
        imagePath, width: out?.width ?? null, height: out?.height ?? null,
        chargedCredits: (() => {
          const now = res.credits?.balance ?? null;
          const spent = lastBalance != null && now != null ? Math.max(0, lastBalance - now) : 0;
          lastBalance = now ?? lastBalance;
          return spent;
        })(),
        latencyMs: Date.now() - t0,
        warnings: res.job.warnings ?? [],
        ok: res.job.status === 'succeeded',
        failure: res.job.failure
          ? { code: res.job.failure.code, message: res.job.failure.message, retryable: !!res.job.failure.retryable }
          : null,
      };
      records.push(rec);
      appendFileSync(jsonl, `${JSON.stringify(rec)}\n`);
      console.log(`  ✓ ${c.id}  ${rec.chargedCredits}cr  ${rec.latencyMs}ms`);
    } catch (err) {
      const e = err as Error & { code?: string };
      const rec: EvalRecord = {
        ...base, ok: false, latencyMs: Date.now() - t0,
        failure: { code: e.code ?? 'unknown', message: e.message, retryable: false },
      };
      records.push(rec);
      appendFileSync(jsonl, `${JSON.stringify(rec)}\n`);
      console.log(`  ✗ ${c.id}  ${e.code}: ${e.message}`);
    }
  }

  const spent = records.reduce((t, r) => t + r.chargedCredits, 0);
  const summary = {
    runId: RUN_ID, gitSha, mode: MODE, stage: STAGE,
    cells: records.length, creditsSpent: spent,
    byVariant: Object.fromEntries(VARIANTS.map((v) => {
      const rs = records.filter((r) => r.variantId === v);
      const keys = Object.keys(rs[0]?.scores.heuristic ?? {});
      return [v, {
        n: rs.length,
        heuristic: Object.fromEntries(keys.map((k) => [
          k, rs.reduce((t, r) => t + (r.scores.heuristic[k] ?? 0), 0) / (rs.length || 1),
        ])),
        meanPromptChars: Math.round(rs.reduce((t, r) => t + r.compiledPrompt.length, 0) / (rs.length || 1)),
      }];
    })),
  };
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(join(OUT, 'prompts.md'), records.map((r) =>
    `## ${r.id}\n\n_${r.taskId} · ${r.variantId} · ${r.compiledPrompt.length} chars_\n\n\`\`\`\n${r.compiledPrompt}\n\`\`\`\n`,
  ).join('\n'));
  console.log(`\n${spent} credits spent. → ${OUT}`);
  console.log(JSON.stringify(summary.byVariant, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });

if (!existsSync(HERE)) throw new Error('unreachable');
