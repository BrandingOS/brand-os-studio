import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowUpRight, Check, CheckCheck, Circle, ClipboardList, Download, FileText, FolderGit2, GitBranch, Layers3, ListChecks, MessageSquare, Plus, Search, Settings2, Sparkles, Upload, X } from 'lucide-react';
import { approve, canComplete, complete, handoff, readWorkspace, Request, revise, seed, statusLabels, storageKey } from './model';
import './styles.css';

type Tab = 'intent' | 'preview' | 'plan' | 'checks' | 'history';
const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
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
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const [notice, setNotice] = useState('');
  const [requests, setRequests] = useState<Request[]>(() => {
    try { return readWorkspace(localStorage.getItem(storageKey)); }
    catch { return structuredClone(seed); }
  });
  const [selected, setSelected] = useState(requests[0].id);
  const [tab, setTab] = useState<Tab>('preview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState<'new' | 'settings' | null>(null);
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
    } catch { setNotice('تعذر الحفظ المحلي. نزّل نسخة من مساحة العمل قبل إغلاق الصفحة.'); }
  }, [requests]);
  useEffect(() => { if (!modal) return; const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, [modal]);
  const update = (next: Request) => setRequests(current => current.map(r => r.id === next.id ? next : r));
  const notify = (message: string) => setNotice(message);
  const stagePlan = request.kind === 'small'
    ? ['تحديد التعديل', 'تنفيذ محدود', 'معاينة الفرق']
    : request.kind === 'fix' ? ['إعادة إنتاج المشكلة', 'إصلاح السبب', 'اختبار منع التكرار']
    : ['فهم النتيجة المطلوبة', 'نموذج أولي قابل للتجربة', 'تنفيذ على مراحل', 'اختبار السلوك ومراجعة النتيجة'];
  const approved = request.approvedRevision === request.revision;
  function saveIntent() { update(revise(request, intent, note)); setNote(''); notify('اتحفظ التصحيح مع نسخة جديدة من الطلب.'); }
  function changePreview(patch: Partial<NonNullable<Request['preview']>>) {
    const current = request.preview!;
    update({ ...revise(request, request.intent, 'تحديث اختيارات النموذج الأولي'), preview: { ...current, ...patch } });
  }
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) return notify('اختر PNG أو JPG أو WebP بحجم أقل من 1 MB.');
    const reader = new FileReader();
    const target = request;
    reader.onload = () => {
      if (typeof reader.result === 'string') update({ ...revise(target, target.intent, 'تغيير شعار المعاينة'), preview: { ...target.preview!, logo: reader.result } });
    };
    reader.onerror = () => notify('تعذر قراءة الصورة.'); reader.readAsDataURL(file);
  }
  function addRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newBrief.trim()) return;
    const id = `BI-${crypto.randomUUID().slice(0, 8)}`;
    const added: Request = { id, title: newTitle.trim(), brief: newBrief.trim(), intent: '', kind: newKind,
      status: 'draft', revision: 1, approvedRevision: null, reviewer: null, notes: [], evidence: '',
      checks: [], updatedAt: new Date().toISOString(), activity: ['تم تسجيل الطلب؛ فهمه التفصيلي لم يُجهز بعد.'] };
    setRequests(current => [...current, added]); setSelected(id); setTab('intent'); setModal(null); setNewTitle(''); setNewBrief('');
  }
  const visible = requests.filter(r => (filter === 'all' || (filter === 'done' ? r.status === 'done' : r.status !== 'done')) && `${r.title} ${r.id}`.toLowerCase().includes(search.toLowerCase()));
  const palette = directions.find(d => d.id === request.preview?.direction) || directions[0];
  return <div className="workspace">
    <aside className="rail">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); setFilter('all'); }}><Layers3 size={23} /><strong dir="ltr">BuildIntent<span>PRODUCT WORKSPACE</span></strong></a>
      <div className="project"><div className="project-symbol">B</div><div><strong>BrandingOS</strong><span>مساحة تطوير المنتج</span></div><FolderGit2 size={17} /></div>
      <div className="nav-label">مساحة العمل</div>
      <button className={filter === 'all' ? 'nav active' : 'nav'} onClick={() => setFilter('all')}><Layers3 size={18} /> كل الطلبات <b>{requests.length}</b></button>
      <button className={filter === 'open' ? 'nav active' : 'nav'} onClick={() => setFilter('open')}><Circle size={17} /> الشغل الجاري <b>{requests.filter(r => r.status !== 'done').length}</b></button>
      <button className={filter === 'done' ? 'nav active' : 'nav'} onClick={() => setFilter('done')}><CheckCheck size={18} /> المكتمل <b>{requests.filter(r => r.status === 'done').length}</b></button>
      <div className="rail-bottom"><div className="connection"><span className="dot" /> نموذج محلي <span>AI غير متصل</span></div><button className="nav" onClick={() => setModal('settings')}><Settings2 size={18} /> إعدادات مساحة العمل</button><div className="profile"><div className="avatar">{reviewer.slice(0, 1)}</div><div><strong>{reviewer}</strong><span>مراجع المنتج</span></div></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumbs">BrandingOS <span>/</span> تطوير المنتج</div><div className="branch"><GitBranch size={14} /><span dir="ltr">feat/build-intent-workspace</span></div></header>
      <section className="overview"><div><div className="eyebrow">PRODUCT OVERVIEW</div><h1>نبني اللي في بالك.</h1><p>BrandingOS <span>·</span> {requests.filter(r => r.status !== 'done').length} طلبات مفتوحة</p></div><button className="primary" onClick={() => setModal('new')}><Plus size={18} /> طلب جديد</button></section>
      <section className="stats" aria-label="حالة المنتج"><div><span>كل الطلبات</span><strong>{requests.length.toString().padStart(2, '0')}</strong></div><div><span>تحتاج قرارًا</span><strong>{requests.filter(r => r.status === 'preview' || r.status === 'draft').length.toString().padStart(2, '0')}<i className="amber" /></strong></div><div><span>جاهزة للتنفيذ</span><strong>{requests.filter(r => r.status === 'ready').length.toString().padStart(2, '0')}<i className="green" /></strong></div><div><span>اكتملت بتحقق مسجّل</span><strong>{requests.filter(r => r.status === 'done').length.toString().padStart(2, '0')}</strong></div></section>
      <div className="workbench">
        <section className="request-list"><div className="list-heading"><h2>طلبات المنتج</h2><span>{visible.length}</span></div><label className="search"><Search size={16} /><input aria-label="بحث في الطلبات" placeholder="بحث في الطلبات…" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <div className="request-items">{visible.map(r => <button className={`request-item ${r.id === request.id ? 'selected' : ''}`} key={r.id} onClick={() => { setSelected(r.id); setTab(r.preview ? 'preview' : 'intent'); }}><div className="item-meta"><span dir="ltr">{r.id}</span><span className={`badge ${r.status}`}>{statusLabels[r.status]}</span></div><strong>{r.title}</strong><div className="item-footer"><span>{r.kind === 'feature' ? 'ميزة' : r.kind === 'fix' ? 'إصلاح' : 'تعديل بسيط'}</span><ArrowLeft size={16} /></div></button>)}</div>
          {!visible.length && <div className="empty">لا توجد طلبات هنا.</div>}
          <div className="repo-ref"><FolderGit2 size={16} /><div><strong dir="ltr">brand-os-studio</strong><span>مرجع أولي من المستودع</span><code>e91853c4</code></div></div>
        </section>
        <section className="detail"><div className="detail-header"><div className="detail-meta"><span dir="ltr">{request.id}</span><span className={`badge ${request.status}`}>{statusLabels[request.status]}</span><span>نسخة {request.revision}</span></div><h2>{request.title}</h2><div className="detail-sub"><span>النتيجة أولًا، ثم تفاصيل التنفيذ.</span><span>{approved ? `اعتمدها ${request.reviewer}` : 'الاتجاه لم يُعتمد بعد'}</span></div></div>
          <nav className="tabs" aria-label="تفاصيل الطلب">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><t.icon size={16} />{t.label}</button>)}</nav>
          <div className="tab-content">
            {tab === 'intent' && <><div className="section-title"><h3>الطلب بصوتك</h3><span>المصدر: صاحب المنتج</span></div><blockquote>{request.brief}</blockquote><div className="section-title"><h3>النتيجة المقصودة</h3><span>قابلة للتعديل</span></div><textarea aria-label="النتيجة المقصودة" className="intent-input" value={intent} placeholder="اكتب النتيجة والسلوك المطلوبين…" onChange={e => setIntent(e.target.value)} /><label className="field">تصحيح محدد<textarea aria-label="تصحيح محدد" value={note} onChange={e => setNote(e.target.value)} placeholder="مثال: اختيار الألوان يسبق اعتماد الهوية…" /></label><button className="secondary" disabled={intent === request.intent && !note.trim()} onClick={saveIntent}><Check size={16} /> حفظ التصحيح</button><div className="section-title spaced"><h3>قرارات المنتج</h3></div><ul className="decision-list"><li>التفاصيل الروتينية يحسمها منفّذ الطلب.</li><li>الأسئلة تخص القرارات التي تغيّر النتيجة بشكل مؤثر.</li><li>الاعتماد مرتبط بالنسخة الحالية من الطلب.</li></ul></>}
            {tab === 'preview' && (request.preview ? <><div className="section-title"><h3>صاحب البراند يختار. الهوية تتكوّن.</h3><span>معاينة مصممة · ليست توليد AI</span></div><div className="prototype"><div className="prototype-bar"><span><Circle size={9} fill="currentColor" /> تجربة صاحب البراند</span><label className="upload secondary"><Upload size={14} /> رفع لوجو<input aria-label="رفع لوجو" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void uploadLogo(e.target.files?.[0]); e.target.value = ''; }} /></label></div><div className="prototype-inner"><div className="mini-heading"><span>01 / الاتجاه البصري</span><h3>اختار الإحساس الأقرب لبراندك</h3></div><div className="directions">{directions.map(d => <button key={d.id} className={`direction ${palette.id === d.id ? 'chosen' : ''}`} aria-pressed={palette.id === d.id} onClick={() => changePreview({ direction: d.id })}><img src={d.image} alt={`مرجع بصري لاتجاه ${d.title}`} /><div><span>{d.title}</span>{palette.id === d.id ? <Check size={16} /> : <Circle size={16} />}</div></button>)}</div><div className="live-board" style={{ '--brand': palette.color, '--accent': palette.accent } as React.CSSProperties}><div className={`brand-art ${request.preview.pattern ? 'patterned' : ''} ${request.preview.logoMode === 'reverse' ? 'reversed' : ''}`}><img src={request.preview.logo || '/onboarding-v3/icons/logo.svg'} alt={request.preview.logo ? 'الشعار الذي رفعته' : 'شعار تجريبي من أصول المشروع'} /><strong style={{ fontFamily: request.preview.font === 'serif' ? 'Georgia, serif' : 'inherit' }}>BrandingOS</strong><span>هويتك، باختياراتك.</span></div><div className="brand-values"><div><span>الألوان المختارة</span><div className="swatches"><i style={{ background: palette.color }} /><i style={{ background: palette.accent }} /><i style={{ background: '#202321' }} /><i style={{ background: '#ffffff' }} /></div></div><div><span>الخط</span><div className="segmented"><button aria-pressed={request.preview.font === 'sans'} onClick={() => changePreview({ font: 'sans' })}>بسيط</button><button aria-pressed={request.preview.font === 'serif'} onClick={() => changePreview({ font: 'serif' })}>تحريري</button></div></div><label className="toggle-row"><span>نمط بصري</span><input type="checkbox" checked={request.preview.pattern} onChange={e => changePreview({ pattern: e.target.checked })} /></label><div><span>عرض الشعار</span><div className="segmented"><button aria-pressed={request.preview.logoMode === 'original'} onClick={() => changePreview({ logoMode: 'original' })}>الأصل</button><button aria-pressed={request.preview.logoMode === 'reverse'} onClick={() => changePreview({ logoMode: 'reverse' })}>خلفية داكنة</button></div></div></div></div><div className="kit-status"><Check size={15} /><span>الاتجاه والألوان محددان</span><span>نسخ الشعار والإرشادات: لم تُبنَ بعد</span></div></div></div><label className="field correction">عدّل الفكرة قبل التنفيذ<textarea aria-label="تصحيح المعاينة" placeholder="قول إيه اللي محتاج يبقى مختلف…" value={note} onChange={e => setNote(e.target.value)} /></label>{note.trim() && <button className="secondary" onClick={saveIntent}><Check size={16} /> تسجيل التصحيح</button>}</> : <div className="empty"><Layers3 size={32} /><h3>المعاينة لم تُجهز بعد</h3><p>هذا طلب جديد مسجّل محليًا. لا يوجد منفّذ AI متصل لتجهيز نموذج له.</p><button className="secondary" onClick={() => setTab('intent')}>فتح فهم الطلب <ArrowLeft size={16} /></button></div>)}
            {tab === 'plan' && <><div className="section-title"><h3>مسار يناسب الطلب</h3><span>{request.kind === 'small' ? 'مختصر' : request.kind === 'fix' ? 'إصلاح' : 'ميزة ذات تجربة'}</span></div><ol className="plan">{stagePlan.map((stage, i) => <li key={stage}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{stage}</strong><p>{i === 0 ? 'مرجع التنفيذ الحالي والنتيجة المتفق عليها.' : i === stagePlan.length - 1 ? 'دليل تنفيذ ومراجعة للسلوك الفعلي.' : 'قرار واضح ومخرج يمكن مراجعته.'}</p></div></li>)}</ol><div className="integration-row"><FolderGit2 size={20} /><div><strong>التنفيذ الخارجي</strong><p>ملف التسليم يضم القصد والاختيارات والتصحيحات ومعايير القبول.</p></div><span className="badge draft">AI غير متصل</span></div><button className="secondary" disabled={!approved} onClick={() => { download(`${request.id}-handoff.md`, handoff(request)); notify('تم تجهيز ملف التسليم. لم يبدأ تنفيذ تلقائي.'); }}><Download size={16} /> تنزيل ملف التسليم</button></>}
            {tab === 'checks' && <><div className="section-title"><h3>تحقق من النتيجة</h3><span>مراجعة يدوية مسجّلة</span></div>{request.checks.map(c => <label className="check-row" key={c.id}><input type="checkbox" checked={c.done} disabled={request.status !== 'review'} onChange={e => update({ ...request, checks: request.checks.map(item => item.id === c.id ? { ...item, done: e.target.checked } : item) })} /><span>{c.label}</span></label>)}{!request.checks.length && <p className="muted">لم تُحدد معايير القبول لهذا الطلب بعد.</p>}<form className="add-check" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const label = String(new FormData(form).get('check') || '').trim(); if (!label) return; update({ ...revise(request, request.intent, `إضافة معيار قبول: ${label}`), checks: [...request.checks.map(c => ({ ...c, done: false })), { id: crypto.randomUUID(), label, done: false }] }); form.reset(); }}><input name="check" aria-label="معيار قبول جديد" placeholder="معيار قبول جديد…" required maxLength={500} /><button className="icon-button" title="إضافة معيار قبول" aria-label="إضافة معيار قبول"><Plus size={18} /></button></form><label className="field spaced">دليل التنفيذ والتحقق<textarea aria-label="دليل التنفيذ" disabled={request.status !== 'review'} value={request.evidence} onChange={e => update({ ...request, evidence: e.target.value })} placeholder="رابط التغييرات أو رقم commit، وكيف اختُبرت النتيجة…" /></label>{request.status === 'ready' && <button className="secondary" onClick={() => update({ ...request, status: 'review', activity: [...request.activity, 'نُقل الطلب يدويًا للتحقق من تنفيذ خارجي.'] })}>تسجيل تنفيذ خارجي ومراجعته <ArrowLeft size={16} /></button>}<button className="primary" disabled={!canComplete(request)} onClick={() => { update(complete(request)); notify('اكتمل الطلب بناءً على الدليل والمراجعة المسجلين.'); }}><CheckCheck size={16} /> إغلاق بعد التحقق</button></>}
            {tab === 'history' && <><div className="section-title"><h3>القرارات والتحديثات</h3><span>{request.activity.length} أحداث</span></div><ol className="activity">{[...request.activity].reverse().map((a, i) => <li key={`${i}-${a}`}><span className="activity-dot" /><p>{a}</p></li>)}</ol></>}
          </div>
          <footer className="decision-footer"><div><Sparkles size={18} /><span>{approved ? 'الاتجاه المعتمد جاهز للتسليم.' : 'اعتماد واحد للاتجاه، والتفاصيل الروتينية للمنفّذ.'}</span></div><button className="primary" disabled={approved || !request.intent.trim() || Boolean(note.trim()) || intent !== request.intent} onClick={() => { update(approve(request, reviewer)); notify('اتحفظ اعتماد الاتجاه. تقدر تنزّل ملف التسليم من خطة العمل.'); }}><Check size={16} />{approved ? 'الاتجاه معتمد' : 'اعتماد الاتجاه'}</button></footer>
        </section>
      </div>
      <footer className="page-footer"><span>BuildIntent / نموذج أولي</span><span>بيانات محلية على هذا المتصفح · لا توجد مزامنة بين المستخدمين</span></footer>
    </main>
    {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="إغلاق التنبيه" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {modal && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><section className="modal" role="dialog" aria-modal="true" aria-label={modal === 'new' ? 'طلب جديد' : 'إعدادات مساحة العمل'}><div className="modal-heading"><h2>{modal === 'new' ? 'طلب جديد' : 'إعدادات مساحة العمل'}</h2><button className="icon-button" title="إغلاق" aria-label="إغلاق" onClick={() => setModal(null)}><X size={20} /></button></div>{modal === 'new' ? <form onSubmit={addRequest}><label className="field">اسم الطلب<input autoFocus value={newTitle} maxLength={140} required onChange={e => setNewTitle(e.target.value)} /></label><label className="field">الفكرة بصوتك<textarea value={newBrief} required maxLength={12000} onChange={e => setNewBrief(e.target.value)} /></label><label className="field">نوع الطلب<select value={newKind} onChange={e => setNewKind(e.target.value as Request['kind'])}><option value="feature">ميزة</option><option value="fix">إصلاح مشكلة</option><option value="small">تعديل بسيط</option></select></label><button className="primary"><Plus size={16} /> تسجيل الطلب</button></form> : <><label className="field">اسم المراجع<input autoFocus value={reviewer} maxLength={80} onChange={e => setReviewer(e.target.value)} /></label><button className="secondary" disabled={!reviewer.trim()} onClick={() => { localStorage.setItem('build-intent.reviewer', reviewer.trim()); setReviewer(reviewer.trim()); setModal(null); }}><Check size={16} /> حفظ</button><div className="integration-row spaced"><FolderGit2 size={20} /><div><strong>GitHub</strong><p dir="ltr">BrandingOS/brand-os-studio</p></div><a href="https://github.com/BrandingOS/brand-os-studio" target="_blank" rel="noreferrer" className="icon-button" title="فتح المستودع"><ArrowUpRight size={18} /></a></div><p className="muted">Codex وClaude غير متصلين بهذا النموذج. الطلبات والاعتمادات محفوظة في المتصفح فقط.</p><button className="secondary" onClick={() => download('build-intent-workspace.json', JSON.stringify({ version: 1, requests }, null, 2), 'application/json')}><Download size={16} /> تصدير مساحة العمل</button></>}</section></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
