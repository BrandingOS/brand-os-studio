import * as React from 'react';
import { X, Download, Trash2, Tag, FileText, Image as ImageIcon } from 'lucide-react';
import type { Asset } from '@/shared/types/brand';

interface AssetLightboxProps {
  asset: Asset;
  onClose: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onAddTag: (tag: string) => void;
}

export function AssetLightbox({ asset, onClose, onDelete, onRename, onAddTag }: AssetLightboxProps) {
  const [name, setName] = React.useState(asset.name);
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    setName(asset.name);
  }, [asset]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = () => {
    if (!asset.url) return;
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    link.click();
  };

  const isImage = ['image', 'logo', 'icon'].includes(asset.type);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="grid w-full max-w-5xl gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:grid-cols-[1fr_320px] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div className="flex min-h-[400px] items-center justify-center bg-muted/20 p-6">
          {isImage && asset.url ? (
            <img src={asset.url} alt={asset.name} className="max-h-[70vh] max-w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="h-12 w-12" />
              <span className="text-sm">{asset.name}</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col border-l border-border bg-card">
          <header className="flex items-start justify-between gap-2 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name !== asset.name) onRename(name.trim());
                }}
                className="w-full bg-transparent text-base font-semibold text-foreground focus:outline-none"
              />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {asset.type} · {asset.category} · {formatBytes(asset.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Metadata */}
            <section>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Metadata
              </h4>
              <dl className="space-y-1.5 text-xs">
                <Row label="Source" value={asset.source} />
                <Row label="Format" value={asset.metadata?.format ?? '—'} />
                {asset.metadata?.dimensions && (
                  <Row
                    label="Dimensions"
                    value={`${asset.metadata.dimensions.width}×${asset.metadata.dimensions.height}`}
                  />
                )}
                <Row label="Created" value={new Date(asset.createdAt).toLocaleDateString()} />
              </dl>
            </section>

            {/* Tags */}
            <section>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </h4>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(asset.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {(asset.tags ?? []).length === 0 && (
                  <span className="text-[11px] text-muted-foreground">No tags</span>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    onAddTag(tagInput.trim());
                    setTagInput('');
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <Tag className="h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag…"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </form>
            </section>
          </div>

          <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center rounded-md border border-border bg-card p-2 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
