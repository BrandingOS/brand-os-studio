/**
 * AssetDetailModal — the full-size look at one asset, plus everything you
 * can change about it.
 *
 * Same capabilities as the Classic lightbox (rename, category, tags,
 * download, delete, metadata) rebuilt on `--ds-*` so the deepest surface of
 * the library does not drop out of the Studio's visual language on the last
 * click. Arrow keys walk the filtered set, so reviewing a folder does not
 * mean closing and reopening for every file.
 */
import * as React from 'react';
import { ChevronLeft, ChevronRight, Download, Tag, Trash2, X } from 'lucide-react';
import { DsButton, DsChip, DsEyebrow } from '@/shared/ds';
import type { Asset } from '@/shared/types/brand';
import { AssetPreview } from './AssetPreview';
import { ASSIGNABLE_CATEGORIES, categoryLabel, formatBytes, previewKindFor } from '../model';

const SOURCE_LABEL: Partial<Record<Asset['source'], string>> = {
  upload: 'Uploaded',
  url: 'Linked',
  embed: 'Embedded',
};

export interface AssetDetailModalProps {
  asset: Asset;
  /** Position in the currently filtered list, for the counter + arrows. */
  index: number;
  total: number;
  onNavigate: (delta: 1 | -1) => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onChangeCategory: (category: Asset['category']) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function AssetDetailModal({
  asset,
  index,
  total,
  onNavigate,
  onClose,
  onRename,
  onChangeCategory,
  onAddTag,
  onRemoveTag,
  onDownload,
  onDelete,
}: AssetDetailModalProps) {
  const [name, setName] = React.useState(asset.name);
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    setName(asset.name);
  }, [asset.id, asset.name]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (e.key === 'Escape') onClose();
      if (typing) return;
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === 'ArrowLeft') onNavigate(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate]);

  const kind = previewKindFor(asset);
  const dims = asset.metadata?.dimensions;

  return (
    <div
      className="fl-detail-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fl-detail" role="dialog" aria-modal="true" aria-label={asset.name}>
        <div className="fl-detail-stage">
          <AssetPreview asset={asset} />
          {total > 1 && (
            <>
              <button
                type="button"
                className="fl-detail-nav fl-detail-nav--prev"
                aria-label="Previous asset"
                onClick={() => onNavigate(-1)}
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="fl-detail-nav fl-detail-nav--next"
                aria-label="Next asset"
                onClick={() => onNavigate(1)}
              >
                <ChevronRight size={18} strokeWidth={1.8} />
              </button>
              <span className="fl-detail-counter">
                {index + 1} / {total}
              </span>
            </>
          )}
        </div>

        <aside className="fl-detail-side">
          <header className="fl-detail-head">
            <input
              className="fl-detail-name"
              value={name}
              aria-label="Asset name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                const next = name.trim();
                if (next && next !== asset.name) onRename(next);
                else setName(asset.name);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
            <button type="button" className="fl-detail-close" aria-label="Close" onClick={onClose}>
              <X size={16} strokeWidth={1.8} />
            </button>
          </header>

          <div className="fl-detail-body">
            <section>
              <DsEyebrow>Category</DsEyebrow>
              <div className="fl-detail-cats">
                {ASSIGNABLE_CATEGORIES.map((c) => (
                  <DsChip
                    key={c}
                    active={c === asset.category}
                    onClick={() => onChangeCategory(c)}
                  >
                    {categoryLabel(c)}
                  </DsChip>
                ))}
              </div>
            </section>

            <section>
              <DsEyebrow>File</DsEyebrow>
              <dl className="fl-detail-facts">
                <Fact label="Kind" value={kind === 'vector' ? 'Vector' : kind} />
                <Fact label="Format" value={asset.metadata?.format ?? '—'} />
                {dims && <Fact label="Dimensions" value={`${dims.width} × ${dims.height}`} />}
                <Fact label="Size" value={formatBytes(asset.size)} />
                <Fact label="Source" value={SOURCE_LABEL[asset.source] ?? asset.source} />
                <Fact
                  label="Added"
                  value={
                    asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'
                  }
                />
              </dl>
            </section>

            <section>
              <DsEyebrow>Tags</DsEyebrow>
              <div className="fl-detail-tags">
                {(asset.tags ?? []).map((tag) => (
                  <span key={tag} className="fl-detail-tag">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => onRemoveTag(tag)}
                    >
                      <X size={10} strokeWidth={2.4} />
                    </button>
                  </span>
                ))}
                {(asset.tags ?? []).length === 0 && (
                  <span className="fl-detail-notags">No tags yet</span>
                )}
              </div>
              <form
                className="fl-detail-tagform"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    onAddTag(tagInput.trim());
                    setTagInput('');
                  }
                }}
              >
                <Tag size={12} strokeWidth={1.8} aria-hidden />
                <input
                  value={tagInput}
                  aria-label="Add tag"
                  placeholder="Add a tag"
                  onChange={(e) => setTagInput(e.target.value)}
                />
              </form>
            </section>
          </div>

          <footer className="fl-detail-foot">
            <DsButton tone="primary" size="sm" onClick={onDownload}>
              <Download size={13} strokeWidth={1.8} />
              Download
            </DsButton>
            <DsButton tone="danger" size="sm" onClick={onDelete}>
              <Trash2 size={13} strokeWidth={1.8} />
              Delete
            </DsButton>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="fl-detail-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
