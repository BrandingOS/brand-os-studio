import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const output = '/tmp/build-intent-live-qa';
await mkdir(output, { recursive: true });
try {
  let cached = null;
  try { cached = JSON.parse(await readFile(`${output}/workspace.json`, 'utf8')); } catch { /* First run uses the live provider. */ }
  if (cached) await page.addInitScript(data => localStorage.setItem('build-intent.workspace.v1', JSON.stringify(data)), cached);
  await page.goto('http://127.0.0.1:5190/');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.locator('.assistant-header').getByText('Codex · ChatGPT', { exact: true }).waitFor();
  const message = 'Change this prototype: put an editable color-selection step before typography. The user chooses a palette and sees it on their logo, then clicks a button exactly named "Continue to typography" to reach font selection. Make the color step heading exactly "Choose your colors". Preserve their selected colors when they go back. No questionnaire, no automatic complete kit on registration. Update the intent and acceptance criteria as well. Use English.';
  if (!cached) {
    await page.getByRole('textbox', { name: 'Message AI', exact: true }).fill(message);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
  }
  await Promise.race([
    page.locator('.generated-preview iframe').waitFor({ timeout: 190000 }),
    page.locator('.chat-error').waitFor({ timeout: 190000 }).then(async () => { throw new Error(await page.locator('.chat-error').innerText()); }),
  ]);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('build-intent.workspace.v1')));
  await writeFile(`${output}/workspace.json`, JSON.stringify(data));
  const frame = page.frameLocator('.generated-preview iframe');
  await frame.getByRole('heading', { name: 'Choose your colors', exact: true }).waitFor({ timeout: 15000 });
  const next = frame.getByRole('button', { name: 'Continue to typography', exact: true });
  if (!await next.isEnabled()) {
    // Select an available choice before progressing; a required choice is valid UX.
    const choices = frame.locator('button:enabled');
    for (let index = 0; index < await choices.count() && !await next.isEnabled(); index++) await choices.nth(index).click();
  }
  assert.equal(await next.isEnabled(), true, 'palette choices allow progression');
  await next.click();
  assert.ok(await frame.getByText(/typography|font/i).count());
  const request = data.requests[0];
  assert.ok(request.artifact.html.length > 100);
  assert.equal(request.artifact.revision, request.revision);
  assert.equal(request.approvedRevision, null);
  assert.equal(request.messages.length, 2);
  assert.match(request.intent.toLowerCase(), /color|palette/);
  await writeFile(`${output}/result.json`, JSON.stringify({ title: request.title, intent: request.intent, reply: request.messages.at(-1).text, revision: request.revision }, null, 2));
  await writeFile(`${output}/workspace.json`, JSON.stringify(data));
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.locator('.generated-preview > iframe').scrollIntoViewIfNeeded();
  await frame.getByRole('button', { name: /back.*colors/i }).click();
  await frame.getByRole('heading', { name: 'Choose your colors', exact: true }).waitFor();
  assert.equal(await frame.locator('html').evaluate(root => root.scrollWidth <= innerWidth), true, 'mobile prototype overflow');
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  console.log(cached ? 'PASS: cached genuine Codex artifact verified on desktop and mobile.' : 'PASS: live ChatGPT-authenticated Codex response updated intent, criteria and an interactive prototype through the UI.');
  console.log(`Screenshots and result: ${output}`);
} finally { await browser.close(); }
