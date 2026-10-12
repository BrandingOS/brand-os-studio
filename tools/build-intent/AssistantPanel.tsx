import { useEffect, useRef, useState } from 'react';
import { Send, Square, Sparkles, RotateCcw, ArrowLeft } from 'lucide-react';
import { DsButton } from '../../src/shared/ds/Button';
import { DsTextArea } from '../../src/shared/ds/Input';
import { DsStatusDot } from '../../src/shared/ds/Feedback';
import { assistantOutputSchema } from './assistant-contract';
import { editRequest, messageSchema, Request } from './model';
import type { Locale } from './i18n';

type Props = {
  request: Request;
  locale: Locale;
  onUpdate: (id: string, update: (current: Request) => Request) => void;
  onPreview: () => void;
  onConnection: (connected: boolean) => void;
};

export function AssistantPanel({ request, locale, onUpdate, onPreview, onConnection }: Props) {
  const en = locale === 'en';
  const [connected, setConnected] = useState<boolean | null>(null);
  const [draft, setDraft] = useState(() => sessionStorage.getItem(`build-intent.draft.${request.id}`) || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  useEffect(() => {
    let alive = true;
    fetch('/__build-intent/status').then(response => response.json()).then(status => {
      if (!alive) return;
      setConnected(status.connected === true); onConnection(status.connected === true);
    }).catch(() => { if (alive) { setConnected(false); onConnection(false); } });
    return () => { alive = false; controller.current?.abort(); };
  }, []);
  useEffect(() => { sessionStorage.setItem(`build-intent.draft.${request.id}`, draft); }, [draft, request.id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ block: 'nearest' }); }, [request.messages?.length, busy]);

  async function send(message = draft) {
    if (!message.trim() || busy || !connected) return;
    const baseRevision = request.revision;
    const text = message.trim();
    setDraft(current => current || text);
    const userMessage = messageSchema.parse({ id: crypto.randomUUID(), role: 'user', text, at: new Date().toISOString() });
    const pendingRequest = { ...request, messages: [...(request.messages || []), userMessage].slice(-60) };
    onUpdate(request.id, current => ({ ...current, messages: [...(current.messages || []), userMessage].slice(-60) }));
    setBusy(true); setError('');
    controller.current = new AbortController();
    try {
      const response = await fetch('/__build-intent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Build-Intent-Protocol': '1' },
        body: JSON.stringify({ request: { ...pendingRequest, history: undefined,
          messages: pendingRequest.messages.slice(-20), preview: pendingRequest.preview ? { ...pendingRequest.preview, logo: '' } : undefined },
          message: text, locale, logoPresent: Boolean(request.preview?.logo) }), signal: controller.current.signal,
      });
      const raw = await response.json();
      if (!response.ok) throw new Error(raw.error || 'Codex could not complete the request.');
      const result = assistantOutputSchema.parse(raw);
      onUpdate(request.id, current => {
        let next = current;
        let reply = result.reply;
        if (result.change && current.revision === baseRevision) {
          next = editRequest(current, {
            title: result.change.title, intent: result.change.intent, kind: result.change.kind,
            checks: result.change.checks.map(label => ({ id: crypto.randomUUID(), label, done: false })),
            artifact: { title: result.change.prototypeTitle, html: result.change.prototypeHtml, revision: current.revision + 1 },
          }, text);
        } else if (result.change) {
          reply += en ? '\nThe draft changed while I was working. This update was not applied; ask me to retry with the current version.'
            : '\nالطلب اتغيّر وأنا شغال. ما طبّقتش التعديل على نسخة قديمة؛ اطلب مني أعيده على النسخة الحالية.';
        }
        return { ...next, messages: [...(next.messages || []), { id: crypto.randomUUID(), role: 'assistant' as const, text: reply, at: new Date().toISOString() }].slice(-60) };
      });
      setDraft(current => current.trim() === text ? '' : current);
      if (result.change) onPreview();
    } catch (failure) {
      setError(failure instanceof Error && failure.name === 'AbortError'
        ? (en ? 'Stopped. Your message and draft are preserved.' : 'وقفت الطلب. رسالتك والنسخة الحالية محفوظين.')
        : (failure instanceof Error ? failure.message : 'Could not reach Codex.'));
    } finally { setBusy(false); controller.current = null; }
  }

  useEffect(() => {
    if (connected && !autoStarted.current && !request.intent && !request.messages?.length) {
      autoStarted.current = true;
      void send(request.brief);
    }
  }, [connected]);

  return <aside className="assistant-panel" aria-label={en ? 'Request conversation' : 'محادثة الطلب'}>
    <header className="assistant-header"><div><Sparkles size={17}/><strong>{en ? 'Work with AI' : 'اشتغل مع الـAI'}</strong></div>
      <DsStatusDot tone={connected ? 'success' : 'warning'} label={connected === null ? (en ? 'Connecting…' : 'جاري الاتصال…') : connected ? 'Codex · ChatGPT' : (en ? 'Not connected' : 'غير متصل')}/>
    </header>
    <div className="chat-messages" aria-live="polite">
      {!request.messages?.length && <div className="chat-message assistant"><strong>BuildIntent</strong><p>{en
        ? 'What should change in this request or prototype? Tell me the result you want.'
        : 'تحب تغيّر إيه في الطلب أو النموذج؟ قولّي النتيجة اللي عايز توصل لها.'}</p></div>}
      {(request.messages || []).map(message => <div key={message.id} className={`chat-message ${message.role}`}>
        <strong>{message.role === 'user' ? (en ? 'You' : 'إنت') : 'Codex'}</strong><p dir="auto">{message.text}</p>
      </div>)}
      {busy && <div className="chat-message assistant"><p>{en ? 'Updating the intent and prototype…' : 'براجع القصد وبعدّل النموذج…'}</p></div>}
      {error && <div className="chat-error" role="alert"><p>{error}</p><DsButton tone="tertiary" onClick={() => void send()} disabled={!connected || busy || !draft.trim()}><RotateCcw size={14}/>{en ? 'Retry' : 'حاول تاني'}</DsButton></div>}
      <div ref={messagesEnd}/>
    </div>
    <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
      <DsTextArea aria-label={en ? 'Message AI' : 'رسالة للـAI'} value={draft} maxLength={12000}
        placeholder={en ? 'Change the flow so colors come before fonts…' : 'غيّر الفلو بحيث الألوان تيجي قبل الخطوط…'}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}/>
      <div className="composer-actions"><span>{en ? 'This request’s context stays here.' : 'سياق الطلب محفوظ في المحادثة دي.'}</span>
        {busy ? <DsButton tone="secondary" size="sm" onClick={() => controller.current?.abort()}><Square size={13}/>{en ? 'Stop' : 'إيقاف'}</DsButton>
          : <DsButton type="submit" size="sm" disabled={!connected || !draft.trim()}><Send size={14}/>{en ? 'Send' : 'إرسال'}</DsButton>}
      </div>
      {!connected && connected !== null && <p className="connection-help">{en ? 'Codex needs a local ChatGPT sign-in. You can still edit the request directly.' : 'Codex محتاج تسجيل دخول محلي بحساب ChatGPT. تقدر تعدّل الطلب مباشرة في الوقت ده.'}</p>}
      {request.artifact && <DsButton tone="tertiary" size="sm" onClick={onPreview}>{en ? 'Open current prototype' : 'افتح النموذج الحالي'}<ArrowLeft size={14}/></DsButton>}
    </form>
  </aside>;
}
