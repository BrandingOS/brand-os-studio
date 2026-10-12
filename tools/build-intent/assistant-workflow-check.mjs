import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
let calls = 0;
let lastInput;
try {
  await page.addInitScript(() => localStorage.setItem('build-intent.locale', 'en'));
  await page.route('**/__build-intent/status', route => route.fulfill({ json: { connected: true, provider: 'Codex', auth: 'chatgpt' } }));
  await page.route('**/__build-intent/chat', async route => {
    calls++; lastInput = route.request().postDataJSON();
    await route.fulfill({ json: { reply: `Test provider update ${calls}`, change: {
      title: `Editable flow ${calls}`, intent: `Choose colors before typography. Revision from message ${calls}.`, kind: 'feature',
      checks: ['Colors persist when going back'], prototypeTitle: 'Color-first prototype',
      prototypeHtml: '<h2>Choose colors</h2><button class="ds-btn ds-btn--primary" id="next">Continue</button><p id="step">Colors</p><script>document.getElementById("next").onclick=()=>document.getElementById("step").textContent="Typography";try{parent.localStorage.getItem("build-intent.workspace.v1");document.body.dataset.parentAccess="allowed"}catch{document.body.dataset.parentAccess="blocked"}fetch("/__build-intent/status").then(()=>document.body.dataset.network="allowed").catch(()=>document.body.dataset.network="blocked");</script>',
    } } });
  });
  await page.goto('http://127.0.0.1:5190/');
  await page.getByRole('button', { name: 'New request', exact: true }).click();
  await page.getByLabel('Your idea', { exact: true }).fill('A color-first identity building experience.');
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  await page.locator('.generated-preview iframe').waitFor();
  assert.equal(calls, 1, 'one automatic interpretation, including StrictMode');
  assert.equal(lastInput.message, 'A color-first identity building experience.');
  assert.equal(lastInput.request.history, undefined);
  const frame = page.frameLocator('.generated-preview iframe');
  await frame.getByRole('button', { name: 'Continue', exact: true }).click();
  await frame.getByText('Typography', { exact: true }).waitFor();
  assert.equal(await frame.locator('body').getAttribute('data-parent-access'), 'blocked');
  assert.equal(await frame.locator('body').getAttribute('data-network'), 'blocked');
  await page.getByRole('button', { name: 'Approve direction', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message AI', exact: true }).fill('Make it less formal.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('heading', { name: 'Editable flow 2', exact: true }).waitFor();
  assert.equal(lastInput.request.messages.length, 3);
  assert.equal(await page.getByRole('button', { name: 'Approve direction', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Edit request', exact: true }).click();
  await page.getByLabel('Request title', { exact: true }).fill('My edited title');
  await page.getByLabel('Intended outcome', { exact: true }).fill('My own editable outcome.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { name: 'My edited title', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve direction', exact: true }).isEnabled(), false);
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await page.getByRole('heading', { name: 'Editable flow 2', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve direction', exact: true }).isEnabled(), true);
  await page.reload();
  await page.getByRole('heading', { name: 'Editable flow 2', exact: true }).waitFor();
  await page.locator('.chat-message').getByText('Make it less formal.', { exact: true }).waitFor();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `overflow at ${width}`);
  }
  console.log('PASS (mock provider): new idea auto-start, conversational updates, interactive sandboxed preview, approval invalidation, direct edit, undo, persistence, responsive layout.');
} finally { await browser.close(); }
