#!/usr/bin/env node
/**
 * Image A/B — separates MODEL quality from PROMPT quality on identical briefs.
 *
 *   JWT=<supabase access token> BRAND=<brand uuid> node scripts/image-ab.mjs
 *
 * The design is a 2×2 plus one hero cell, so each factor moves alone:
 *
 *            │ OLD prompt          │ NEW prompt
 *   ─────────┼─────────────────────┼──────────────────────
 *   free     │ A1  turbo · old     │ B1  turbo · new
 *   paid     │ A2  nano-banana·old │ B2  nano-banana · new
 *   best     │                     │ C   nano-banana-pro · new
 *
 * A1↔B1 and A2↔B2 isolate the prompt. A1↔A2 and B1↔B2 isolate the model.
 * C shows the ceiling once Auto routes to the strongest production model.
 *
 * Spend is bounded BEFORE anything is sent: the runner prices every cell with
 * the server's own estimate endpoint, refuses to start if the total exceeds
 * BUDGET_CREDITS, and prints what it actually cost. A test that can silently
 * outspend its budget is not a test.
 */

import { writeFileSync, mkdirSync } from 'node:fs';

const SUPABASE = 'https://ciojgoozobzbeglwdxcz.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb2pnb296b2J6YmVnbHdkeGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQ4ODgsImV4cCI6MjA5MTMyMDg4OH0.qwfviBXKJh1i2-vyUYtCIdUXMZM5ICBJtBTEmqDYbng';
const OUT = '/tmp/brandos-ab/images';
const BUDGET_CREDITS = Number(process.env.BUDGET_CREDITS ?? 50);

const JWT = process.env.JWT;
const BRAND = process.env.BRAND;
if (!JWT || !BRAND) {
  console.error('Need JWT=<access token> and BRAND=<brand uuid>.');
  console.error('In the app, signed in, run:  JSON.parse(localStorage["sb-ciojgoozobzbeglwdxcz-auth-token"]).access_token');
  process.exit(2);
}

/** The prompts the A/B compares. Written to disk by the prompt harness. */
const CELLS = JSON.parse(process.env.CELLS_JSON ?? '[]');
if (!CELLS.length) {
  console.error('No cells. Run the prompt harness first (AB=1 vitest …) — it writes /tmp/brandos-ab/cells.json.');
  process.exit(2);
}

async function fn(body) {
  const res = await fetch(`${SUPABASE}/functions/v1/ai-generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${JWT}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: { raw: text.slice(0, 400) } }; }
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // ── Price every cell first. Nothing is sent until the total is known. ─────
  let total = 0;
  for (const c of CELLS) {
    const { json } = await fn({
      action: 'estimate', model: c.model, aspectRatio: c.aspectRatio, count: 1,
    });
    c.credits = json.credits ?? 0;
    total += c.credits;
    console.log(`  estimate  ${c.id.padEnd(28)} ${String(c.model).padEnd(24)} ${c.credits} credits`);
  }
  console.log(`\n  TOTAL ${total} credits (budget ${BUDGET_CREDITS})`);
  if (total > BUDGET_CREDITS) {
    console.error(`\nRefusing to run: ${total} > ${BUDGET_CREDITS}. Trim CELLS or raise BUDGET_CREDITS deliberately.`);
    process.exit(1);
  }

  // ── Generate, one cell at a time so a failure cannot cascade. ────────────
  let spent = 0;
  const rows = [];
  for (const c of CELLS) {
    process.stdout.write(`  generating ${c.id} … `);
    const { status, json } = await fn({
      action: 'generate',
      brandId: BRAND,
      designId: `ab-${c.id}`,
      operation: 'generate',
      userPrompt: c.userPrompt,
      compiledPrompt: c.prompt,
      negativePrompt: c.negativePrompt,
      model: c.model,
      aspectRatio: c.aspectRatio,
      count: 1,
      references: c.references ?? [],
      idempotencyKey: `ab-${c.id}-${process.env.RUN_ID ?? '1'}`,
    });
    if (status !== 200 || !json.images?.length) {
      console.log(`FAILED ${status} ${json.message ?? json.error ?? ''}`);
      rows.push({ ...c, error: json.message ?? json.error ?? `HTTP ${status}` });
      continue;
    }
    spent += json.chargedCredits ?? 0;
    const img = json.images[0];
    const file = `${OUT}/${c.id}.png`;
    const bytes = img.url.startsWith('data:')
      ? Buffer.from(img.url.split(',')[1], 'base64')
      : Buffer.from(await (await fetch(img.url)).arrayBuffer());
    writeFileSync(file, bytes);
    console.log(`ok  ${json.chargedCredits} credits  → ${file}`);
    rows.push({ ...c, file, charged: json.chargedCredits, balance: json.balance });
  }

  writeFileSync(`${OUT}/results.json`, JSON.stringify(rows, null, 2));

  // A side-by-side page, because the comparison is visual.
  const html = `<!doctype html><meta charset=utf8><title>Image A/B</title>
<style>body{font:14px/1.5 system-ui;margin:24px;background:#faf9f7}
h2{margin:28px 0 8px}figure{margin:0}img{width:100%;border-radius:8px;border:1px solid #ddd;background:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
figcaption{font-size:12px;color:#555;margin-top:6px}code{font-size:11px;color:#777}</style>
<h1>Image A/B — model quality vs prompt quality</h1>
<p>Spent <b>${spent}</b> credits of a ${BUDGET_CREDITS} budget.</p>
<div class=grid>
${rows.map((r) => `<figure><img src="${r.file ? `${r.id}.png` : ''}" alt="${r.id}">
<figcaption><b>${r.label}</b><br><code>${r.model}</code>${r.error ? `<br><b style=color:#b00>${r.error}</b>` : ''}</figcaption></figure>`).join('\n')}
</div>`;
  writeFileSync(`${OUT}/index.html`, html);
  console.log(`\n  spent ${spent} credits · wrote ${OUT}/index.html`);
}

main().catch((e) => { console.error(e); process.exit(1); });
