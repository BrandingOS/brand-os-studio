import tokens from '../../src/shared/ds/tokens.css?raw';
import components from '../../src/shared/ds/components.css?raw';
import type { Request } from './model';
import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { DsButton } from '../../src/shared/ds/Button';
import { DsModal } from '../../src/shared/ds/Modal';

export function previewDocument(html: string, locale: 'en' | 'ar', logo?: string): string {
  const origin = window.location.origin;
  const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: ${origin}; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'`;
  const ownerLogo = logo?.startsWith('data:image/') ? logo : '/favicon.svg';
  const fit = `:root{--ds-color-text:var(--ds-text);--ds-color-border:var(--ds-border);--ds-font-family:var(--ds-font)}body *{min-width:0}h1,h2,h3,p,label,strong{overflow-wrap:anywhere}input,textarea,select{max-width:100%}.ds-btn{max-width:100%;white-space:normal;justify-content:center}@media(max-width:480px){body{padding:8px}body>div{padding-inline:12px!important}header{flex-wrap:wrap}.ds-btn{font-size:12px;padding:10px 14px}}`;
  return `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${tokens}\n${components}\n*{box-sizing:border-box}body{margin:0;padding:20px;background:var(--ds-bg);color:var(--ds-text);font-family:var(--ds-font);letter-spacing:0}button,input,textarea{font:inherit}button{cursor:pointer}img{max-width:100%}</style></head><body>${html}<style>${fit}</style><script>document.querySelectorAll('[data-owner-logo]').forEach(image=>image.src=${JSON.stringify(ownerLogo)});</script></body></html>`;
}

export function GeneratedPreview({ request, locale }: { request: Request; locale: 'en' | 'ar' }) {
  const [expanded, setExpanded] = useState(false);
  if (!request.artifact) return null;
  return <div className="generated-preview"><div className="section-title"><h3>{request.artifact.title}</h3><span>{locale === 'en' ? 'AI prototype · not production code' : 'نموذج AI · مش كود المشروع الفعلي'}</span></div>
    {request.artifact.revision !== request.revision && <p className="preview-stale">{locale === 'en' ? 'The request changed after this prototype. Ask AI to update it before approving.' : 'الطلب اتغيّر بعد النموذج ده. اطلب من الـAI يحدّثه قبل الاعتماد.'}</p>}
    <div className="generated-toolbar"><DsButton tone="tertiary" size="sm" onClick={() => setExpanded(true)}><Maximize2 size={14}/>{locale === 'en' ? 'Expand prototype' : 'كبّر النموذج'}</DsButton></div>
    <iframe title={request.artifact.title} sandbox="allow-scripts" referrerPolicy="no-referrer"
      srcDoc={previewDocument(request.artifact.html, locale, request.preview?.logo)} />
    <DsModal open={expanded} onClose={() => setExpanded(false)} title={request.artifact.title} size="lg">
      <iframe title={locale === 'en' ? 'Expanded prototype' : 'النموذج المكبّر'} className="expanded-prototype" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={previewDocument(request.artifact.html, locale, request.preview?.logo)}/>
    </DsModal>
  </div>;
}
