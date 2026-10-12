import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowUpRight, Check, CheckCheck, Circle, ClipboardList, Download, FileText, FolderGit2, GitBranch, Layers3, ListChecks, MessageSquare, Plus, Search, Settings2, Sparkles, Upload } from 'lucide-react';
import { approve, canComplete, complete, handoff, readWorkspace, Request, revise, seed, statusLabels, storageKey } from './model';
import { useLocale } from './i18n';
import { DsButton } from '../../src/shared/ds/Button';
import { DsInput, DsTextArea } from '../../src/shared/ds/Input';
import { DsTabBar } from '../../src/shared/ds/TabBar';
import { DsSegmented, DsSwitch, DsCheckbox } from '../../src/shared/ds/Toggle';
import { DsModal } from '../../src/shared/ds/Modal';
import { DsToast, DsBadge } from '../../src/shared/ds/Feedback';
import { AssistantPanel } from './AssistantPanel';
import { GeneratedPreview } from './GeneratedPreview';
import { editRequest, undoRequest } from './model';
import { Pencil, Undo2 } from 'lucide-react';
import '../../src/shared/ds/tokens.css';
import '../../src/shared/ds/components.css';
import './styles.css';
type Tab = 'intent' | 'preview' | 'plan' | 'checks' | 'history';
const tabs: {
    id: Tab;
    label: string;
    icon: typeof FileText;
}[] = [
    { id: 'intent', label: 'فهم الطلب', icon: MessageSquare }, { id: 'preview', label: 'النموذج الأولي', icon: Layers3 },
    { id: 'plan', label: 'خطة العمل', icon: ClipboardList }, { id: 'checks', label: 'التحقق', icon: ListChecks },
    { id: 'history', label: 'السجل', icon: FileText },
];
const directions = [
    { id: 'clear' as const, title: 'واضح وهادئ', color: '#1a7964', accent: '#daeae5', image: '/onboarding-v3/styles/soan.jpg' },
    { id: 'bold' as const, title: 'جريء وحيوي', color: '#b33452', accent: '#f6dce2', image: '/onboarding-v3/styles/spectrum.jpg' },
    { id: 'organic' as const, title: 'طبيعي وقريب', color: '#537434', accent: '#e4edda', image: '/onboarding-v3/styles/mindshift.jpg' },
];
function download(name: string, content: string, type = 'text/markdown;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
    const { locale, setLocale, t } = useLocale();
    const [notice, setNotice] = useState('');
    const [requests, setRequests] = useState<Request[]>(() => {
        try {
            return readWorkspace(localStorage.getItem(storageKey));
        }
        catch {
            return structuredClone(seed);
        }
    });
    const [selected, setSelected] = useState(() => {
      const stored = localStorage.getItem('build-intent.selected');
      return requests.some(request => request.id === stored) ? stored! : requests[0].id;
    });
    useEffect(() => { try { localStorage.setItem('build-intent.selected', selected); } catch { /* In-memory selection still works. */ } }, [selected]);
    const [tab, setTab] = useState<Tab>('preview');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [modal, setModal] = useState<'new' | 'settings' | 'edit' | null>(null);
    const [aiConnected, setAiConnected] = useState(false);
    const [editDraft, setEditDraft] = useState({ title: '', brief: '', intent: '', kind: 'feature' as Request['kind'], checks: '' });
    const [editBaseline, setEditBaseline] = useState(editDraft);
    const [reviewer, setReviewer] = useState(() => localStorage.getItem('build-intent.reviewer') || 'صاحب المنتج');
    const [note, setNote] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newBrief, setNewBrief] = useState('');
    const [newKind, setNewKind] = useState<Request['kind']>('feature');
    const request = requests.find(r => r.id === selected) || requests[0];
    const [intent, setIntent] = useState(request.intent);
    useEffect(() => { setIntent(request.intent); setNote(''); }, [request.id, request.intent]);
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({ version: 1, requests }));
        }
        catch {
            setNotice(t("تعذر الحفظ المحلي. نزّل نسخة من مساحة العمل قبل إغلاق الصفحة."));
        }
    }, [requests]);
    useEffect(() => { if (!modal)
        return; const listener = (e: KeyboardEvent) => { if (e.key === 'Escape')
        setModal(null); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, [modal]);
    const update = (next: Request) => setRequests(current => current.map(r => r.id === next.id ? next : r));
    const updateCurrent = (id: string, change: (current: Request) => Request) => setRequests(current => current.map(r => r.id === id ? change(r) : r));
    function openEditor() {
      const values = { title: t(request.title), brief: request.brief, intent: t(request.intent), kind: request.kind,
        checks: request.checks.map(check => t(check.label)).join('\n') };
      setEditDraft(values); setEditBaseline(values); setModal('edit');
    }
    function saveEditor(event: React.FormEvent) {
      event.preventDefault();
      const patch: Partial<Request> = {};
      if (editDraft.title !== editBaseline.title) patch.title = editDraft.title.trim();
      if (editDraft.brief !== editBaseline.brief) patch.brief = editDraft.brief.trim();
      if (editDraft.intent !== editBaseline.intent) patch.intent = editDraft.intent.trim();
      if (editDraft.kind !== editBaseline.kind) patch.kind = editDraft.kind;
      if (editDraft.checks !== editBaseline.checks) patch.checks = editDraft.checks.split('\n').map(label => label.trim()).filter(Boolean).map(label => ({ id: crypto.randomUUID(), label, done: false }));
      if (Object.keys(patch).length) update(editRequest(request, patch, locale === 'en' ? 'Request edited directly' : 'تعديل مباشر للطلب'));
      setModal(null);
    }
    const notify = (message: string) => setNotice(message);
    const stagePlan = request.kind === 'small'
        ? [t("تحديد التعديل"), t("تنفيذ محدود"), t("معاينة الفرق")]
        : request.kind === 'fix' ? [t("إعادة إنتاج المشكلة"), t("إصلاح السبب"), t("اختبار منع التكرار")]
            : [t("فهم النتيجة المطلوبة"), t("نموذج أولي قابل للتجربة"), t("تنفيذ على مراحل"), t("اختبار السلوك ومراجعة النتيجة")];
    const approved = request.approvedRevision === request.revision;
    function saveIntent() { update(revise(request, intent, note)); setNote(''); notify(t("اتحفظ التصحيح مع نسخة جديدة من الطلب.")); }
    function changePreview(patch: Partial<NonNullable<Request['preview']>>) {
        const current = request.preview!;
        update({ ...revise(request, request.intent, t("تحديث اختيارات النموذج الأولي")), preview: { ...current, ...patch } });
    }
    async function uploadLogo(file?: File) {
        if (!file)
            return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024)
            return notify(t("اختر PNG أو JPG أو WebP بحجم أقل من 1 MB."));
        const reader = new FileReader();
        const target = request;
        reader.onload = () => {
            if (typeof reader.result === 'string')
                update({ ...revise(target, target.intent, t("تغيير شعار المعاينة")), preview: { ...target.preview!, logo: reader.result } });
        };
        reader.onerror = () => notify(t("تعذر قراءة الصورة."));
        reader.readAsDataURL(file);
    }
    function addRequest(e: React.FormEvent) {
        e.preventDefault();
        if (!newBrief.trim())
            return;
        const id = `BI-${crypto.randomUUID().slice(0, 8)}`;
        const added: Request = { id, title: newTitle.trim() || newBrief.trim().slice(0, 70), brief: newBrief.trim(), intent: '', kind: newKind,
            status: 'draft', revision: 1, approvedRevision: null, reviewer: null, notes: [], evidence: '',
            checks: [], updatedAt: new Date().toISOString(), activity: [t("تم تسجيل الطلب؛ فهمه التفصيلي لم يُجهز بعد.")] };
        setRequests(current => [...current, added]);
        setSelected(id);
        setTab('intent');
        setModal(null);
        setNewTitle('');
        setNewBrief('');
    }
    const visible = requests.filter(r => (filter === 'all' || (filter === 'done' ? r.status === 'done' : r.status !== 'done')) && `${r.title} ${t(r.title)} ${r.id}`.toLowerCase().includes(search.toLowerCase()));
    const palette = directions.find(d => d.id === request.preview?.direction) || directions[0];
    return <div className="workspace ds">
    <aside className="rail">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); setFilter('all'); }}><img src="/favicon.svg" width="27" height="27" alt="BrandingOS"/><strong dir="ltr">BuildIntent<span>BrandingOS</span></strong></a>
      <div className="project"><div className="project-symbol">B</div><div><strong>BrandingOS</strong><span>{t("مساحة تطوير المنتج")}</span></div><FolderGit2 size={17}/></div>
      <div className="nav-label">{t("مساحة العمل")}</div>
      <button className={filter === 'all' ? 'nav active' : 'nav'} onClick={() => setFilter('all')}><Layers3 size={18}/>{t("كل الطلبات")}<b>{requests.length}</b></button>
      <button className={filter === 'open' ? 'nav active' : 'nav'} onClick={() => setFilter('open')}><Circle size={17}/>{t("الشغل الجاري")}<b>{requests.filter(r => r.status !== 'done').length}</b></button>
      <button className={filter === 'done' ? 'nav active' : 'nav'} onClick={() => setFilter('done')}><CheckCheck size={18}/>{t("المكتمل")}<b>{requests.filter(r => r.status === 'done').length}</b></button>
      <div className="rail-bottom"><div className="connection"><span className="dot"/>{t("نموذج محلي")}<span>{aiConnected ? 'Codex · ChatGPT' : t("AI غير متصل")}</span></div><button className="nav" onClick={() => setModal('settings')}><Settings2 size={18}/>{t("إعدادات مساحة العمل")}</button><div className="profile"><div className="avatar">{t(reviewer).slice(0, 1)}</div><div><strong>{t(reviewer)}</strong><span>{t("مراجع المنتج")}</span></div></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumbs">BrandingOS <span>/</span>{t("تطوير المنتج")}</div><div className="topbar-actions"><div className="branch"><GitBranch size={14}/><span dir="ltr">feat/build-intent-workspace</span></div><DsSegmented aria-label="Language / اللغة" value={locale} onChange={value => setLocale(value as 'ar' | 'en')} options={[{value:'ar',label:'العربية'},{value:'en',label:'English'}]}/></div></header>
      <section className="overview"><div><div className="eyebrow">{locale === 'en' ? 'Product overview' : 'نظرة على المنتج'}</div><h1>{t("نبني اللي في بالك.")}</h1><p>BrandingOS <span>·</span> {requests.filter(r => r.status !== 'done').length} {t("طلبات مفتوحة")}</p></div><DsButton onClick={() => setModal('new')} tone="secondary"><Plus size={18}/>{t("طلب جديد")}</DsButton></section>
      <section className="stats" aria-label={t("حالة المنتج")}><div><span>{t("كل الطلبات")}</span><strong>{requests.length.toString().padStart(2, '0')}</strong></div><div><span>{t("تحتاج قرارًا")}</span><strong>{requests.filter(r => r.status === 'preview' || r.status === 'draft').length.toString().padStart(2, '0')}<i className="amber"/></strong></div><div><span>{t("جاهزة للتنفيذ")}</span><strong>{requests.filter(r => r.status === 'ready').length.toString().padStart(2, '0')}<i className="green"/></strong></div><div><span>{t("اكتملت بتحقق مسجّل")}</span><strong>{requests.filter(r => r.status === 'done').length.toString().padStart(2, '0')}</strong></div></section>
      <div className="workbench">
        <section className="request-list"><div className="list-heading"><h2>{t("طلبات المنتج")}</h2><span>{visible.length}</span></div><label className="search"><Search size={16}/><DsInput aria-label={t("بحث في الطلبات")} placeholder={t("بحث في الطلبات…")} value={search} onChange={e => setSearch(e.target.value)}/></label>
          <div className="request-items">{visible.map(r => <button className={`request-item ${r.id === request.id ? 'selected' : ''}`} key={r.id} onClick={() => { setSelected(r.id); setTab(r.preview || r.artifact ? 'preview' : 'intent'); }}><div className="item-meta"><span dir="ltr">{r.id}</span><DsBadge tone={r.status === 'preview' ? 'warning' : r.status === 'done' || r.status === 'ready' ? 'success' : 'neutral'}>{t(statusLabels[r.status])}</DsBadge></div><strong>{t(r.title)}</strong><div className="item-footer"><span>{r.kind === 'feature' ? t("ميزة") : r.kind === 'fix' ? t("إصلاح") : t("تعديل بسيط")}</span><ArrowLeft size={16}/></div></button>)}</div>
          {!visible.length && <div className="empty">{t("لا توجد طلبات هنا.")}</div>}
          <div className="repo-ref"><FolderGit2 size={16}/><div><strong dir="ltr">brand-os-studio</strong><span>{t("مرجع أولي من المستودع")}</span><code>e91853c4</code></div></div>
        </section>
        <div className="detail-and-chat"><section className="detail"><div className="detail-header"><div className="detail-meta"><span dir="ltr">{request.id}</span><DsBadge tone={request.status === 'preview' ? 'warning' : request.status === 'done' || request.status === 'ready' ? 'success' : 'neutral'}>{t(statusLabels[request.status])}</DsBadge><span>{t("نسخة")} {request.revision}</span></div><h2>{t(request.title)}</h2><div className="detail-sub"><span>{t("النتيجة أولًا، ثم تفاصيل التنفيذ.")}</span><span>{approved ? `${locale === 'en' ? 'Approved by' : 'اعتمدها'} ${t(request.reviewer || '')}` : t("الاتجاه لم يُعتمد بعد")}</span></div></div>
          <div className="tabs"><DsTabBar key={locale} aria-label={t("تفاصيل الطلب")} value={tab} onChange={value => setTab(value as Tab)} tabs={tabs.map(item => ({ value: item.id, label: <><item.icon size={15}/>{t(item.label)}</> }))}/></div>
          <div className="request-toolbar"><DsButton tone="tertiary" size="sm" onClick={openEditor}><Pencil size={15}/>{locale === 'en' ? 'Edit request' : 'عدّل الطلب'}</DsButton><DsButton tone="tertiary" size="sm" disabled={!request.history?.length} onClick={() => update(undoRequest(request))}><Undo2 size={15}/>{locale === 'en' ? 'Undo last change' : 'تراجع عن آخر تعديل'}</DsButton></div>
          <div className="tab-content">
            {tab === 'preview' && request.artifact && <GeneratedPreview request={request} locale={locale}/>}
            {tab === 'intent' && <><div className="section-title"><h3>{t("الطلب بصوتك")}</h3><span>{t("المصدر: صاحب المنتج")}</span></div><blockquote>{t(request.brief)}</blockquote><div className="section-title"><h3>{t("النتيجة المقصودة")}</h3><span>{t("قابلة للتعديل")}</span></div><DsTextArea aria-label={t("النتيجة المقصودة")} className="intent-input" value={t(intent)} placeholder={t("اكتب النتيجة والسلوك المطلوبين…")} onChange={e => setIntent(e.target.value)}/><label className="field">{t("تصحيح محدد")}<DsTextArea aria-label={t("تصحيح محدد")} value={note} onChange={e => setNote(e.target.value)} placeholder={t("مثال: اختيار الألوان يسبق اعتماد الهوية…")}/></label><DsButton disabled={intent === request.intent && !note.trim()} onClick={saveIntent} tone="secondary"><Check size={16}/>{t("حفظ التصحيح")}</DsButton><div className="section-title spaced"><h3>{t("قرارات المنتج")}</h3></div><ul className="decision-list"><li>{t("التفاصيل الروتينية يحسمها منفّذ الطلب.")}</li><li>{t("الأسئلة تخص القرارات التي تغيّر النتيجة بشكل مؤثر.")}</li><li>{t("الاعتماد مرتبط بالنسخة الحالية من الطلب.")}</li></ul></>}
            {tab === 'preview' && !request.artifact && (request.preview ? <><div className="section-title"><h3>{t("صاحب البراند يختار. الهوية تتكوّن.")}</h3><span>{t("معاينة مصممة · ليست توليد AI")}</span></div><div className="prototype"><div className="prototype-bar"><span><Circle size={9} fill="currentColor"/>{t("تجربة صاحب البراند")}</span><label className="upload ds-btn ds-btn--secondary ds-btn--sm"><Upload size={14}/>{t("رفع لوجو")}<input aria-label={t("رفع لوجو")} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void uploadLogo(e.target.files?.[0]); e.target.value = ''; }}/></label></div><div className="prototype-inner"><div className="mini-heading"><span>{t("01 / الاتجاه البصري")}</span><h3>{t("اختار الإحساس الأقرب لبراندك")}</h3></div><div className="directions">{directions.map(d => <button key={d.id} className={`direction ${palette.id === d.id ? 'chosen' : ''}`} aria-pressed={palette.id === d.id} onClick={() => changePreview({ direction: d.id })}><img src={d.image} alt={`مرجع بصري لاتجاه ${d.title}`}/><div><span>{t(d.title)}</span>{palette.id === d.id ? <Check size={16}/> : <Circle size={16}/>}</div></button>)}</div><div className="live-board" style={{ '--brand': palette.color, '--accent': palette.accent } as React.CSSProperties}><div className={`brand-art ${request.preview.pattern ? 'patterned' : ''} ${request.preview.logoMode === 'reverse' ? 'reversed' : ''}`}><img src={request.preview.logo || '/favicon.svg'} alt={request.preview.logo ? t("الشعار الذي رفعته") : t("شعار تجريبي من أصول المشروع")}/><strong style={{ fontFamily: request.preview.font === 'serif' ? 'Georgia, serif' : 'inherit' }}>BrandingOS</strong><span>{t("هويتك، باختياراتك.")}</span></div><div className="brand-values"><div><span>{t("الألوان المختارة")}</span><div className="swatches"><i style={{ background: palette.color }}/><i style={{ background: palette.accent }}/><i style={{ background: '#202321' }}/><i style={{ background: '#ffffff' }}/></div></div><div><span>{t("الخط")}</span><DsSegmented aria-label={t('الخط')} value={request.preview.font} onChange={value => changePreview({ font: value as 'sans' | 'serif' })} options={[{ value: 'sans', label: t('بسيط') }, { value: 'serif', label: t('تحريري') }]} /></div><div className="toggle-row"><DsSwitch label={t('نمط بصري')} checked={request.preview.pattern} onChange={pattern => changePreview({ pattern })} /></div><div><span>{t("عرض الشعار")}</span><DsSegmented aria-label={t('عرض الشعار')} value={request.preview.logoMode} onChange={value => changePreview({ logoMode: value as 'original' | 'reverse' })} options={[{ value: 'original', label: t('الأصل') }, { value: 'reverse', label: t('خلفية داكنة') }]} /></div></div></div><div className="kit-status"><Check size={15}/><span>{t("الاتجاه والألوان محددان")}</span><span>{t("نسخ الشعار والإرشادات: لم تُبنَ بعد")}</span></div></div></div><label className="field correction">{t("عدّل الفكرة قبل التنفيذ")}<DsTextArea aria-label={t("تصحيح المعاينة")} placeholder={t("قول إيه اللي محتاج يبقى مختلف…")} value={note} onChange={e => setNote(e.target.value)}/></label>{note.trim() && <DsButton onClick={saveIntent} tone="secondary"><Check size={16}/>{t("تسجيل التصحيح")}</DsButton>}</> : <div className="empty"><Layers3 size={32}/><h3>{t("المعاينة لم تُجهز بعد")}</h3><p>{aiConnected ? (locale === 'en' ? 'Use the conversation to create or update this prototype.' : 'استخدم المحادثة لإنشاء النموذج أو تحديثه.') : t("هذا طلب جديد مسجّل محليًا. لا يوجد منفّذ AI متصل لتجهيز نموذج له.")}</p><DsButton onClick={() => setTab('intent')} tone="secondary">{t("فتح فهم الطلب")}<ArrowLeft size={16}/></DsButton></div>)}
            {tab === 'plan' && <><div className="section-title"><h3>{t("مسار يناسب الطلب")}</h3><span>{request.kind === 'small' ? t("مختصر") : request.kind === 'fix' ? t("إصلاح") : t("ميزة ذات تجربة")}</span></div><ol className="plan">{stagePlan.map((stage, i) => <li key={stage}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{stage}</strong><p>{i === 0 ? t("مرجع التنفيذ الحالي والنتيجة المتفق عليها.") : i === stagePlan.length - 1 ? t("دليل تنفيذ ومراجعة للسلوك الفعلي.") : t("قرار واضح ومخرج يمكن مراجعته.")}</p></div></li>)}</ol><div className="integration-row"><FolderGit2 size={20}/><div><strong>{t("التنفيذ الخارجي")}</strong><p>{t("ملف التسليم يضم القصد والاختيارات والتصحيحات ومعايير القبول.")}</p></div><DsBadge>{aiConnected ? 'Codex · ChatGPT' : t("AI غير متصل")}</DsBadge></div><DsButton disabled={!approved} onClick={() => { download(`${request.id}-handoff.md`, handoff(request)); notify(t("تم تجهيز ملف التسليم. لم يبدأ تنفيذ تلقائي.")); }} tone="secondary"><Download size={16}/>{t("تنزيل ملف التسليم")}</DsButton></>}
            {tab === 'checks' && <><div className="section-title"><h3>{t("تحقق من النتيجة")}</h3><span>{t("مراجعة يدوية مسجّلة")}</span></div>{request.checks.map(c => <div className="check-row" key={c.id}><DsCheckbox checked={c.done} disabled={request.status !== 'review'} label={t(c.label)} onChange={done => update({ ...request, checks: request.checks.map(item => item.id === c.id ? { ...item, done } : item) })} /></div>)}{!request.checks.length && <p className="muted">{t("لم تُحدد معايير القبول لهذا الطلب بعد.")}</p>}<form className="add-check" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const label = String(new FormData(form).get('check') || '').trim(); if (!label)
        return; update({ ...revise(request, request.intent, `إضافة معيار قبول: ${label}`), checks: [...request.checks.map(c => ({ ...c, done: false })), { id: crypto.randomUUID(), label, done: false }] }); form.reset(); }}><DsInput name="check" aria-label={t("معيار قبول جديد")} placeholder={t("معيار قبول جديد…")} required maxLength={500}/><DsButton title={t("إضافة معيار قبول")} aria-label={t("إضافة معيار قبول")} tone="tertiary" className="icon-button" type="submit"><Plus size={18}/></DsButton></form><label className="field spaced">{t("دليل التنفيذ والتحقق")}<DsTextArea aria-label={t("دليل التنفيذ")} disabled={request.status !== 'review'} value={request.evidence} onChange={e => update({ ...request, evidence: e.target.value })} placeholder={t("رابط التغييرات أو رقم commit، وكيف اختُبرت النتيجة…")}/></label>{request.status === 'ready' && <DsButton onClick={() => update({ ...request, status: 'review', activity: [...request.activity, t("نُقل الطلب يدويًا للتحقق من تنفيذ خارجي.")] })} tone="secondary">{t("تسجيل تنفيذ خارجي ومراجعته")}<ArrowLeft size={16}/></DsButton>}<DsButton disabled={!canComplete(request)} onClick={() => { update(complete(request)); notify(t("اكتمل الطلب بناءً على الدليل والمراجعة المسجلين.")); }} tone="primary"><CheckCheck size={16}/>{t("إغلاق بعد التحقق")}</DsButton></>}
            {tab === 'history' && <><div className="section-title"><h3>{t("القرارات والتحديثات")}</h3><span>{request.activity.length}{t("أحداث")}</span></div><ol className="activity">{[...request.activity].reverse().map((a, i) => <li key={`${i}-${a}`}><span className="activity-dot"/><p>{t(a)}</p></li>)}</ol></>}
          </div>
          <footer className="decision-footer"><div><Sparkles size={18}/><span>{approved ? t("الاتجاه المعتمد جاهز للتسليم.") : t("اعتماد واحد للاتجاه، والتفاصيل الروتينية للمنفّذ.")}</span></div><DsButton disabled={approved || !reviewer.trim() || !request.intent.trim() || Boolean(note.trim()) || intent !== request.intent || Boolean(request.artifact && request.artifact.revision !== request.revision)} onClick={() => { update(approve(request, reviewer)); notify(t("اتحفظ اعتماد الاتجاه. تقدر تنزّل ملف التسليم من خطة العمل.")); }} tone="primary"><Check size={16}/>{approved ? t("الاتجاه معتمد") : t("اعتماد الاتجاه")}</DsButton></footer>
        </section>
        <AssistantPanel key={request.id} request={request} locale={locale} onUpdate={updateCurrent} onPreview={() => setTab('preview')} onConnection={setAiConnected}/>
        </div>
      </div>
      <footer className="page-footer"><span>{t("BuildIntent / نموذج أولي")}</span><span>{t("بيانات محلية على هذا المتصفح · لا توجد مزامنة بين المستخدمين")}</span></footer>
    </main>
    {notice && <div className="notice"><DsToast message={t(notice)} actionLabel={t('إغلاق التنبيه')} onAction={() => setNotice('')}/></div>}
    <DsModal open={modal !== null} onClose={() => setModal(null)} title={modal === 'new' ? t('طلب جديد') : modal === 'edit' ? (locale === 'en' ? 'Edit request' : 'تعديل الطلب') : t('إعدادات مساحة العمل')} actions={modal === 'new' ? <DsButton type="submit" form="new-request-form"><Plus size={16}/>{t('تسجيل الطلب')}</DsButton> : modal === 'edit' ? <DsButton type="submit" form="edit-request-form"><Check size={16}/>{t('حفظ')}</DsButton> : <DsButton disabled={!reviewer.trim()} onClick={() => { localStorage.setItem('build-intent.reviewer', reviewer.trim()); setReviewer(reviewer.trim()); setModal(null); }}><Check size={16}/>{t('حفظ')}</DsButton>}>
      {modal === 'new' ? <form id="new-request-form" onSubmit={addRequest}>
        <DsInput label={locale === 'en' ? 'Request title (optional)' : 'اسم الطلب (اختياري)'} autoFocus value={newTitle} maxLength={140} onChange={e => setNewTitle(e.target.value)}/>
        <DsTextArea label={t('الفكرة بصوتك')} value={newBrief} required maxLength={12000} onChange={e => setNewBrief(e.target.value)}/>
        <label className="field">{t('نوع الطلب')}<select className="ds-input" value={newKind} onChange={e => setNewKind(e.target.value as Request['kind'])}><option value="feature">{t('ميزة')}</option><option value="fix">{t('إصلاح مشكلة')}</option><option value="small">{t('تعديل بسيط')}</option></select></label>
      </form> : modal === 'edit' ? <form id="edit-request-form" onSubmit={saveEditor}>
        <DsInput label={t('اسم الطلب')} value={editDraft.title} required maxLength={200} onChange={event => setEditDraft({ ...editDraft, title: event.target.value })}/>
        <DsTextArea label={t('الطلب بصوتك')} value={editDraft.brief} required maxLength={16000} onChange={event => setEditDraft({ ...editDraft, brief: event.target.value })}/>
        <DsTextArea label={t('النتيجة المقصودة')} value={editDraft.intent} maxLength={16000} onChange={event => setEditDraft({ ...editDraft, intent: event.target.value })}/>
        <label className="field">{t('نوع الطلب')}<select className="ds-input" value={editDraft.kind} onChange={event => setEditDraft({ ...editDraft, kind: event.target.value as Request['kind'] })}><option value="feature">{t('ميزة')}</option><option value="fix">{t('إصلاح مشكلة')}</option><option value="small">{t('تعديل بسيط')}</option></select></label>
        <DsTextArea label={locale === 'en' ? 'Acceptance criteria (one per line)' : 'معايير القبول (معيار في كل سطر)'} value={editDraft.checks} onChange={event => setEditDraft({ ...editDraft, checks: event.target.value })}/>
      </form> : <>
        <DsInput label={t('اسم المراجع')} autoFocus value={reviewer} maxLength={80} onChange={e => setReviewer(e.target.value)}/>
        <div className="integration-row spaced"><FolderGit2 size={20}/><div><strong>GitHub</strong><p dir="ltr">BrandingOS/brand-os-studio</p></div><a href="https://github.com/BrandingOS/brand-os-studio" target="_blank" rel="noreferrer" className="icon-button" title={t('فتح المستودع')}><ArrowUpRight size={18}/></a></div>
        <p className="muted">{aiConnected ? (locale === 'en' ? 'Codex is connected through your local ChatGPT sign-in. Claude is not connected. Request records stay in this browser.' : 'Codex متصل بتسجيل دخول ChatGPT المحلي. Claude لسه مش متصل. الطلبات محفوظة في المتصفح.') : t('Codex وClaude غير متصلين بهذا النموذج. الطلبات والاعتمادات محفوظة في المتصفح فقط.')}</p>
        <DsButton tone="secondary" onClick={() => download('build-intent-workspace.json', JSON.stringify({ version: 1, requests }, null, 2), 'application/json')}><Download size={16}/>{t('تصدير مساحة العمل')}</DsButton>
      </>}
    </DsModal>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
