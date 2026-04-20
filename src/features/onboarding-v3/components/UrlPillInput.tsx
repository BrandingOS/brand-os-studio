import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { fetchUrlPreview } from '../services/fetchUrlPreview';
import { useOnboardingStore } from '../store/onboardingStore';
import type { OnboardingAsset } from '../types';

function newId() { return `a-${crypto.randomUUID()}`; }

export function UrlPillInput() {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useOnboardingStore(s => s.sessionId);
  const addAsset = useOnboardingStore(s => s.addAsset);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true); setError(null);
    try {
      const meta = await fetchUrlPreview(sessionId, value.trim());
      const asset: OnboardingAsset = {
        id: newId(),
        filename: meta.title || value,
        mimeType: 'text/html',
        kind: 'link',
        previewUrl: meta.imageUrl,
        scratchPath: null,
        remotePath: null,
        uploadProgress: 1,
        uploadStatus: 'done',
        sourceUrl: value.trim(),
      };
      addAsset(asset);
      setValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 rounded-full border border-cosmos-border bg-cosmos-surface px-3 h-[44px]">
        <Link2 size={14} className="text-cosmos-muted shrink-0" />
        <input
          type="url"
          placeholder="or paste a URL"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-cosmos-muted"
          disabled={busy}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="text-[12px] font-medium text-cosmos-accent disabled:opacity-40"
        >
          {busy ? 'Fetching…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
