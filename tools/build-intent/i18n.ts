import { useEffect, useState } from 'react';
import { seed } from './model';

export type Locale = 'ar' | 'en';
export const localeKey = 'build-intent.locale';
export const english: Record<string, string> = {
  'فهم الطلب': 'Intent', 'النموذج الأولي': 'Prototype', 'خطة العمل': 'Work plan', 'التحقق': 'Verification', 'السجل': 'Activity',
  'واضح وهادئ': 'Clear & calm', 'جريء وحيوي': 'Bold & lively', 'طبيعي وقريب': 'Natural & approachable',
  'صاحب المنتج': 'Product owner', 'تعذر الحفظ المحلي. نزّل نسخة من مساحة العمل قبل إغلاق الصفحة.': 'Local save failed. Export your workspace before closing this page.',
  'تحديد التعديل': 'Define the change', 'تنفيذ محدود': 'Make the focused change', 'معاينة الفرق': 'Review the difference',
  'إعادة إنتاج المشكلة': 'Reproduce the issue', 'إصلاح السبب': 'Fix the cause', 'اختبار منع التكرار': 'Test for regressions',
  'فهم النتيجة المطلوبة': 'Define the intended outcome', 'نموذج أولي قابل للتجربة': 'Review an interactive prototype',
  'تنفيذ على مراحل': 'Implement in stages', 'اختبار السلوك ومراجعة النتيجة': 'Test behavior and review the outcome',
  'اتحفظ التصحيح مع نسخة جديدة من الطلب.': 'Correction saved as a new request revision.',
  'تحديث اختيارات النموذج الأولي': 'Prototype choices updated', 'اختر PNG أو JPG أو WebP بحجم أقل من 1 MB.': 'Choose a PNG, JPG or WebP smaller than 1 MB.',
  'تغيير شعار المعاينة': 'Prototype logo changed', 'تعذر قراءة الصورة.': 'Could not read this image.',
  'تم تسجيل الطلب؛ فهمه التفصيلي لم يُجهز بعد.': 'Request recorded; detailed interpretation is not ready yet.',
  'مساحة تطوير المنتج': 'Product workspace', 'مساحة العمل': 'Workspace', 'كل الطلبات': 'All requests', 'الشغل الجاري': 'In progress',
  'المكتمل': 'Completed', 'نموذج محلي': 'Local prototype', 'AI غير متصل': 'AI not connected', 'إعدادات مساحة العمل': 'Workspace settings',
  'مراجع المنتج': 'Product reviewer', 'تطوير المنتج': 'Product development', 'نبني اللي في بالك.': 'Build what you mean.',
  'طلبات مفتوحة': 'open requests', 'طلب جديد': 'New request', 'حالة المنتج': 'Product status', 'تحتاج قرارًا': 'Needs a decision',
  'جاهزة للتنفيذ': 'Ready to implement', 'اكتملت بتحقق مسجّل': 'Verified & completed', 'طلبات المنتج': 'Product requests',
  'بحث في الطلبات': 'Search requests', 'بحث في الطلبات…': 'Search requests…', 'ميزة': 'Feature', 'إصلاح': 'Fix', 'تعديل بسيط': 'Small change',
  'لا توجد طلبات هنا.': 'No requests here.', 'مرجع أولي من المستودع': 'Initial repository reference', 'نسخة': 'Revision',
  'النتيجة أولًا، ثم تفاصيل التنفيذ.': 'The outcome first. Implementation details follow.', 'الاتجاه لم يُعتمد بعد': 'Direction not approved yet',
  'تفاصيل الطلب': 'Request details', 'الطلب بصوتك': 'Your original request', 'المصدر: صاحب المنتج': 'Source: product owner',
  'النتيجة المقصودة': 'Intended outcome', 'قابلة للتعديل': 'Editable', 'اكتب النتيجة والسلوك المطلوبين…': 'Describe the outcome and expected behavior…',
  'تصحيح محدد': 'Specific correction', 'مثال: اختيار الألوان يسبق اعتماد الهوية…': 'For example: choose colors before approving the identity…',
  'حفظ التصحيح': 'Save correction', 'قرارات المنتج': 'Product decisions', 'التفاصيل الروتينية يحسمها منفّذ الطلب.': 'The implementer decides routine details.',
  'الأسئلة تخص القرارات التي تغيّر النتيجة بشكل مؤثر.': 'Questions focus on decisions that materially change the outcome.',
  'الاعتماد مرتبط بالنسخة الحالية من الطلب.': 'Approval is tied to the current request revision.',
  'صاحب البراند يختار. الهوية تتكوّن.': 'The owner chooses. The identity takes shape.', 'معاينة مصممة · ليست توليد AI': 'Curated prototype · not AI-generated',
  'تجربة صاحب البراند': 'Brand owner experience', 'رفع لوجو': 'Upload logo', '01 / الاتجاه البصري': '01 / Visual direction',
  'اختار الإحساس الأقرب لبراندك': 'Choose the feeling that fits your brand', 'الشعار الذي رفعته': 'Your uploaded logo',
  'شعار تجريبي من أصول المشروع': 'Demo logo from project assets', 'هويتك، باختياراتك.': 'Your identity. Your choices.',
  'الألوان المختارة': 'Selected colors', 'الخط': 'Typography', 'بسيط': 'Simple', 'تحريري': 'Editorial', 'نمط بصري': 'Visual pattern',
  'عرض الشعار': 'Logo display', 'الأصل': 'Original', 'خلفية داكنة': 'Dark background', 'الاتجاه والألوان محددان': 'Direction and colors selected',
  'نسخ الشعار والإرشادات: لم تُبنَ بعد': 'Logo variants and guidelines: not built yet', 'عدّل الفكرة قبل التنفيذ': 'Refine the idea before implementation',
  'تصحيح المعاينة': 'Prototype correction', 'قول إيه اللي محتاج يبقى مختلف…': 'Describe what should be different…', 'تسجيل التصحيح': 'Record correction',
  'المعاينة لم تُجهز بعد': 'Prototype not ready yet',
  'هذا طلب جديد مسجّل محليًا. لا يوجد منفّذ AI متصل لتجهيز نموذج له.': 'This new request is stored locally. No AI provider is connected to prepare its prototype.',
  'فتح فهم الطلب': 'Open intent', 'مسار يناسب الطلب': 'A plan suited to this request', 'مختصر': 'Short path', 'ميزة ذات تجربة': 'Experience-led feature',
  'مرجع التنفيذ الحالي والنتيجة المتفق عليها.': 'Current implementation and agreed outcome.', 'دليل تنفيذ ومراجعة للسلوك الفعلي.': 'Implementation evidence and a review of actual behavior.',
  'قرار واضح ومخرج يمكن مراجعته.': 'A clear decision and a reviewable result.', 'التنفيذ الخارجي': 'External implementation',
  'ملف التسليم يضم القصد والاختيارات والتصحيحات ومعايير القبول.': 'The handoff includes intent, choices, corrections and acceptance criteria.',
  'تم تجهيز ملف التسليم. لم يبدأ تنفيذ تلقائي.': 'Handoff prepared. Automatic implementation has not started.', 'تنزيل ملف التسليم': 'Download handoff',
  'تحقق من النتيجة': 'Verify the outcome', 'مراجعة يدوية مسجّلة': 'Recorded manual review', 'لم تُحدد معايير القبول لهذا الطلب بعد.': 'Acceptance criteria have not been defined yet.',
  'معيار قبول جديد': 'New acceptance criterion', 'معيار قبول جديد…': 'New acceptance criterion…', 'إضافة معيار قبول': 'Add acceptance criterion',
  'دليل التنفيذ والتحقق': 'Implementation and verification evidence', 'دليل التنفيذ': 'Implementation evidence',
  'رابط التغييرات أو رقم commit، وكيف اختُبرت النتيجة…': 'Link to the changes or commit, and how the outcome was tested…',
  'نُقل الطلب يدويًا للتحقق من تنفيذ خارجي.': 'Request moved manually to review an external implementation.',
  'تسجيل تنفيذ خارجي ومراجعته': 'Record external implementation', 'اكتمل الطلب بناءً على الدليل والمراجعة المسجلين.': 'Request completed with recorded evidence and review.',
  'إغلاق بعد التحقق': 'Complete after verification', 'القرارات والتحديثات': 'Decisions and updates', 'أحداث': 'events',
  'الاتجاه المعتمد جاهز للتسليم.': 'The approved direction is ready for handoff.', 'اعتماد واحد للاتجاه، والتفاصيل الروتينية للمنفّذ.': 'Approve the direction once. Delegate routine details.',
  'اتحفظ اعتماد الاتجاه. تقدر تنزّل ملف التسليم من خطة العمل.': 'Direction approved. Download the handoff from the work plan.',
  'الاتجاه معتمد': 'Direction approved', 'اعتماد الاتجاه': 'Approve direction', 'BuildIntent / نموذج أولي': 'BuildIntent / Prototype',
  'بيانات محلية على هذا المتصفح · لا توجد مزامنة بين المستخدمين': 'Local browser data · no shared user sync', 'إغلاق التنبيه': 'Dismiss notification',
  'إغلاق': 'Close', 'اسم الطلب': 'Request title', 'الفكرة بصوتك': 'Your idea', 'نوع الطلب': 'Request type', 'إصلاح مشكلة': 'Bug fix',
  'تسجيل الطلب': 'Create request', 'اسم المراجع': 'Reviewer name', 'حفظ': 'Save', 'فتح المستودع': 'Open repository',
  'Codex وClaude غير متصلين بهذا النموذج. الطلبات والاعتمادات محفوظة في المتصفح فقط.': 'Codex and Claude are not connected. Requests and approvals are stored in this browser only.',
  'تصدير مساحة العمل': 'Export workspace', 'قيد الفهم': 'Clarifying', 'معاينة': 'Preview', 'جاهز للتنفيذ': 'Ready to implement', 'قيد التحقق': 'In review', 'مكتمل': 'Completed',
  'أُنشئت حالة تجريبية من طلبك وشات #Logo to Branding.': 'Demo case created from your request and the #Logo to Branding conversation.',
  'مرجع التنفيذ الحالي: e91853c4، ومسار src/features/onboarding-logo.': 'Implementation reference: e91853c4, src/features/onboarding-logo.',
  'تحديث فهم الطلب؛ يلزم اعتماد النسخة الجديدة.': 'Intent updated; the new revision needs approval.',
  'أُغلق الطلب بعد تسجيل دليل التنفيذ والتحقق اليدوي.': 'Request closed after recording implementation evidence and manual verification.',
};
english[seed[0].title] = 'From a logo to an identity the owner builds';
english[seed[0].brief] = 'The Branding Kit already exists, but I want people to choose and build it themselves and feel ownership. I do not want a ready-made identity as soon as a brand is registered.';
english[seed[0].intent] = 'The brand owner starts with their logo, chooses a visual direction and adjusts its elements with a live preview. The saved identity reflects their decisions; unselected elements remain suggestions.';
seed[0].checks.forEach((check, index) => { english[check.label] = [
  'The saved identity reflects the brand owner’s choices', 'Unapproved elements are not presented as final decisions',
  'Going back and editing preserves previous choices', 'Logo versions preserve the original mark and file type',
][index]; });

export function translate(text: string, locale: Locale): string {
  if (locale === 'ar') return text;
  if (english[text]) return english[text];
  // Localize system event framing, keeping the user's correction unchanged.
  const approval = /^اعتمد (.+) الاتجاه، نسخة (\d+)\.$/.exec(text);
  if (approval) return `${translate(approval[1], locale)} approved the direction, revision ${approval[2]}.`;
  if (text.startsWith('تصحيح: ')) return `Correction: ${translate(text.slice('تصحيح: '.length), locale)}`;
  if (text.startsWith('إضافة معيار قبول: ')) return `Acceptance criterion added: ${text.slice('إضافة معيار قبول: '.length)}`;
  return text;
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem(localeKey) === 'en' ? 'en' : 'ar');
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(localeKey, locale); } catch { /* Language still works without storage. */ }
  }, [locale]);
  return { locale, setLocale, t: (text: string) => translate(text, locale) };
}
