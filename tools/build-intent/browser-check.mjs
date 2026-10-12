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
  await page.getByRole('button', { name: 'خطة العمل', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'تنزيل ملف التسليم' }).click();
  const artifact = await downloadPromise;
  assert.match(await readFile(await artifact.path(), 'utf8'), /Direction: bold/);
  await page.getByRole('button', { name: 'النموذج الأولي', exact: true }).click();
  await page.getByRole('button', { name: 'طبيعي وقريب' }).click();
  assert.equal(await page.getByRole('button', { name: 'اعتماد الاتجاه', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'اعتماد الاتجاه', exact: true }).click();
  await page.getByRole('button', { name: 'التحقق', exact: true }).click();
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
  await page.getByRole('button', { name: 'النموذج الأولي', exact: true }).click();
  await page.getByRole('heading', { name: 'المعاينة لم تُجهز بعد' }).waitFor();
  await page.getByRole('button', { name: 'خطة العمل', exact: true }).click();
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
  assert.deepEqual(errors, []);
  console.log('PASS: images, responsive layout, prototype choices, revision invalidation, handoff download, evidence-gated completion, persistence, new request, short plan and search.');
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
