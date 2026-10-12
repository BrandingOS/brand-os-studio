import { z } from 'zod';

export const statuses = ['draft', 'preview', 'ready', 'review', 'done'] as const;
export const statusLabels = { draft: 'قيد الفهم', preview: 'معاينة', ready: 'جاهز للتنفيذ', review: 'قيد التحقق', done: 'مكتمل' };
const checkSchema = z.object({ id: z.string(), label: z.string(), done: z.boolean() });
export const requestSchema = z.object({
  id: z.string(), title: z.string().min(1), brief: z.string(), intent: z.string(),
  kind: z.enum(['feature', 'fix', 'small']), status: z.enum(statuses),
  revision: z.number().int().nonnegative(), approvedRevision: z.number().int().nonnegative().nullable(),
  reviewer: z.string().nullable(), notes: z.array(z.string()), checks: z.array(checkSchema),
  evidence: z.string(), updatedAt: z.string(), activity: z.array(z.string()),
  preview: z.object({ direction: z.enum(['clear', 'bold', 'organic']), font: z.enum(['sans', 'serif']), pattern: z.boolean(), logoMode: z.enum(['original', 'reverse']), logo: z.string() }).optional(),
});
export type Request = z.infer<typeof requestSchema>;
export const workspaceSchema = z.object({ version: z.literal(1), requests: z.array(requestSchema) });
export const storageKey = 'build-intent.workspace.v1';

export const seed: Request[] = [{
  id: 'BI-001', title: 'من لوجو إلى هوية يصنعها صاحبها',
  brief: 'الـBranding Kit موجودة بالفعل، لكن عايز الشخص هو اللي يختار ويبني ويحس إنه عمل حاجة بنفسه. مش عايز هوية جاهزة بمجرد تسجيل البراند.',
  intent: 'صاحب البراند يبدأ بلوجوه، يختار اتجاهًا بصريًا ويعدّل عناصره مع معاينة مباشرة. الهوية المحفوظة تتكوّن من قراراته، والعناصر غير المختارة تظل اقتراحات.',
  kind: 'feature', status: 'preview', revision: 1, approvedRevision: null, reviewer: null,
  notes: [], evidence: '', updatedAt: '2026-10-12',
  preview: { direction: 'clear', font: 'sans', pattern: false, logoMode: 'original', logo: '' },
  checks: [
    { id: 'choice', label: 'اختيارات صاحب البراند هي التي تحدد الهوية المحفوظة', done: false },
    { id: 'pending', label: 'العناصر غير المعتمدة لا تظهر كقرارات نهائية', done: false },
    { id: 'return', label: 'الرجوع والتعديل يحافظان على الاختيارات السابقة', done: false },
    { id: 'logo', label: 'نسخ الشعار تحافظ على أصل الشعار ونوع الملف', done: false },
  ],
  activity: ['أُنشئت حالة تجريبية من طلبك وشات #Logo to Branding.', 'مرجع التنفيذ الحالي: e91853c4، ومسار src/features/onboarding-logo.'],
}];

export function revise(request: Request, intent: string, note?: string): Request {
  if (intent === request.intent && !note?.trim()) return request;
  return { ...request, intent, revision: request.revision + 1, approvedRevision: null, reviewer: null,
    status: request.id === 'BI-001' ? 'preview' : 'draft', evidence: '',
    checks: request.checks.map(c => ({ ...c, done: false })),
    notes: note?.trim() ? [...request.notes, note.trim()] : request.notes,
    activity: [...request.activity, note?.trim() ? `تصحيح: ${note.trim()}` : 'تحديث فهم الطلب؛ يلزم اعتماد النسخة الجديدة.'],
    updatedAt: new Date().toISOString() };
}

export function approve(request: Request, reviewer: string): Request {
  if (!request.intent.trim() || !reviewer.trim()) throw new Error('يلزم فهم محدد واسم المراجع.');
  return { ...request, status: 'ready', approvedRevision: request.revision, reviewer,
    activity: [...request.activity, `اعتمد ${reviewer} الاتجاه، نسخة ${request.revision}.`], updatedAt: new Date().toISOString() };
}

export function canComplete(request: Request): boolean {
  return request.status === 'review' && request.approvedRevision === request.revision &&
    request.checks.length > 0 && request.checks.every(c => c.done) && Boolean(request.evidence.trim());
}

export function complete(request: Request): Request {
  if (!canComplete(request)) throw new Error('يلزم اعتماد النسخة الحالية وإرفاق دليل وإتمام التحقق.');
  return { ...request, status: 'done', activity: [...request.activity, 'أُغلق الطلب بعد تسجيل دليل التنفيذ والتحقق اليدوي.'], updatedAt: new Date().toISOString() };
}

export function handoff(request: Request): string {
  if (request.approvedRevision !== request.revision) throw new Error('اعتمد النسخة الحالية قبل تجهيز التسليم.');
  const stages = request.kind === 'small' ? ['تعديل محدود', 'معاينة ومراجعة الفرق'] : request.kind === 'fix'
    ? ['إعادة إنتاج المشكلة', 'إصلاح السبب', 'اختبار الحالة ومنع تكرارها']
    : ['مراجعة التنفيذ الحالي', 'تجربة تفاعلية للسلوك المتفق عليه', 'تنفيذ على مراحل', 'تحقق من النتيجة'];
  const preview = request.preview ? `\n\n## Prototype choices\nDirection: ${request.preview.direction}\nTypography: ${request.preview.font}\nPattern: ${request.preview.pattern}\nLogo display: ${request.preview.logoMode}\nThese are manually selected prototype options, not generated brand assets. Uploaded images stay in browser storage and are not included in this handoff.` : '';
  return `# ${request.id}: ${request.title}\n\nProject: BrandingOS\nRevision: ${request.revision}\nApproved by: ${request.reviewer}\n\n## Original request\n${request.brief}\n\n## Approved intent\n${request.intent}${preview}\n\n## Corrections\n${request.notes.join('\n') || 'None'}\n\n## Work plan\n${stages.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## Acceptance checks\n${request.checks.map(c => `- [ ] ${c.label}`).join('\n')}\n\n## Execution rules\nUse the existing repository patterns. Make routine decisions autonomously. Ask only when an unresolved decision could materially change the approved outcome. Do not present mock data as real AI output or manual checks as automated tests. Report changed files, validation and limitations. Final completion requires implementation evidence and acceptance checks.\n`;
}

export function readWorkspace(raw: string | null): Request[] {
  if (!raw) return structuredClone(seed);
  const parsed = workspaceSchema.parse(JSON.parse(raw));
  return parsed.requests.length ? parsed.requests : structuredClone(seed);
}
