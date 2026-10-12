import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const output = '/tmp/build-intent-qa';
await mkdir(output, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  const response = await page.goto('http://127.0.0.1:5190');
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: 'نبني اللي في بالك.' }).waitFor();
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })));
  });
  assert.equal(await page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0)), true);
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'جريء وحيوي' }).click();
  await page.getByRole('button', { name: 'اعتماد الاتجاه', exact: true }).click();
  await page.getByRole('tab', { name: 'خطة العمل', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'تنزيل ملف التسليم' }).click();
  const artifact = await downloadPromise;
  assert.match(await readFile(await artifact.path(), 'utf8'), /Direction: bold/);
  await page.getByRole('tab', { name: 'النموذج الأولي', exact: true }).click();
  await page.getByRole('button', { name: 'طبيعي وقريب' }).click();
  assert.equal(await page.getByRole('button', { name: 'اعتماد الاتجاه', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'اعتماد الاتجاه', exact: true }).click();
  await page.getByRole('tab', { name: 'التحقق', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'إغلاق بعد التحقق' }).isEnabled(), false);
  await page.getByRole('button', { name: 'تسجيل تنفيذ خارجي ومراجعته' }).click();
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  assert.equal(await page.getByRole('button', { name: 'إغلاق بعد التحقق' }).isEnabled(), false);
  await page.getByRole('textbox', { name: 'دليل التنفيذ', exact: true }).fill('QA test record: simulated external implementation, not production evidence.');
  await page.getByRole('button', { name: 'إغلاق بعد التحقق' }).click();
  await page.reload();
  assert.equal(await page.getByText('اكتمل الطلب بناءً على الدليل والمراجعة المسجلين.').count(), 0);
  assert.ok(await page.getByText('مكتمل', { exact: true }).count() > 0);
  await page.getByRole('button', { name: 'طلب جديد', exact: true }).click();
  await page.getByLabel('اسم الطلب', { exact: true }).fill('تعديل عنوان الصفحة');
  await page.getByLabel('الفكرة بصوتك').fill('أريد تغيير العنوان فقط، دون تغيير باقي الصفحة.');
  await page.getByLabel('نوع الطلب').selectOption('small');
  await page.getByRole('button', { name: 'تسجيل الطلب', exact: true }).click();
  await page.getByRole('textbox', { name: 'النتيجة المقصودة', exact: true }).fill('تغيير عنوان الصفحة الرئيسية إلى الاسم الجديد.');
  await page.getByRole('button', { name: 'حفظ التصحيح', exact: true }).click();
  await page.getByRole('tab', { name: 'النموذج الأولي', exact: true }).click();
  await page.getByRole('heading', { name: 'المعاينة لم تُجهز بعد' }).waitFor();
  await page.getByRole('tab', { name: 'خطة العمل', exact: true }).click();
  assert.equal(await page.locator('.plan li').count(), 3);
  await page.getByRole('textbox', { name: 'بحث في الطلبات' }).fill('غير موجود');
  await page.getByText('لا توجد طلبات هنا.', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'بحث في الطلبات' }).fill('');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    await page.getByRole('heading', { name: 'نبني اللي في بالك.' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `overflow at ${width}`);
    await page.screenshot({ path: `${output}/${width}.png`, fullPage: true });
  }
  const recordsBeforeLanguageSwitch = await page.evaluate(() => localStorage.getItem('build-intent.workspace.v1'));
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.getByRole('heading', { name: 'Build what you mean.' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
  await page.getByRole('heading', { name: 'From a logo to an identity the owner builds' }).waitFor();
  await page.getByRole('tab', { name: 'Intent', exact: true }).click();
  assert.match(await page.getByRole('textbox', { name: 'Intended outcome', exact: true }).inputValue(), /The brand owner starts/);
  await page.getByRole('tab', { name: 'Verification', exact: true }).click();
  await page.getByText('The saved identity reflects the brand owner’s choices', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await page.getByText('Demo case created from your request and the #Logo to Branding conversation.', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Prototype', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('build-intent.workspace.v1')), recordsBeforeLanguageSwitch);
  const canonicalStyle = await page.getByRole('button', { name: 'Approve direction', exact: true }).evaluate(button => ({
    background: getComputedStyle(button).backgroundColor,
    radius: getComputedStyle(button).borderRadius,
    font: getComputedStyle(button).fontFamily,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--ds-accent').trim(),
    isCanonical: button.classList.contains('ds-btn--primary'),
  }));
  assert.equal(canonicalStyle.isCanonical, true);
  assert.equal(canonicalStyle.accent, '#111113');
  assert.equal(canonicalStyle.background, 'rgb(17, 17, 19)');
  assert.equal(canonicalStyle.radius, '999px');
  assert.match(canonicalStyle.font, /Plus Jakarta Sans/);
  await page.reload();
  await page.getByRole('heading', { name: 'Build what you mean.' }).waitFor();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `English overflow at ${width}`);
    await page.screenshot({ path: `${output}/english-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Approve direction', exact: true }).click();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await page.getByText('Product owner approved the direction, revision 1.', { exact: true }).waitFor();
  const approvedRecords = await page.evaluate(() => localStorage.getItem('build-intent.workspace.v1'));
  await page.getByRole('radio', { name: 'العربية', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('build-intent.workspace.v1')), approvedRecords);
  await page.getByRole('button', { name: 'الاتجاه معتمد', exact: true }).waitFor();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'New request', exact: true }).click();
  await page.getByRole('dialog', { name: 'New request', exact: true }).waitFor();
  await page.getByLabel('Request title', { exact: true }).fill('An English request');
  await page.getByLabel('Your idea', { exact: true }).fill('Keep the original user text.');
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  await page.getByRole('radio', { name: 'العربية', exact: true }).click();
  await page.getByRole('heading', { name: 'An English request', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  await page.getByText('Keep the original user text.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: existing workflows, Arabic/English switching and persistence, both layout directions at three widths, localized example, canonical DS button tokens, shared modal and preserved user content.');
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
