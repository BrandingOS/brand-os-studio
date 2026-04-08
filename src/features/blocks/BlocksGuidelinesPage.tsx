/**
 * BlocksGuidelinesPage — block-based guidelines builder.
 *
 * Mounted at /b/:slug/guidelines/blocks. A NEW surface that does not touch
 * the existing CanvasGuidelinesPage / EditorWorkspace which are part of the
 * frozen editable-export baseline.
 *
 * v5 PRD Phase 8.
 */
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Plus, Eye, Edit3, Sparkles, FileText } from 'lucide-react';
import { useBlocksStore } from './blocksStore';
import { newBlock } from './registry';
import { BlockEditor } from './BlockEditor';
import { BlockRenderer } from './BlockRenderer';
import { BlockPicker } from './BlockPicker';
import type { Block, BlockType } from './types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CommentsPanel } from '@/features/comments/CommentsPanel';

export default function BlocksGuidelinesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { current, loadBySlug } = useBrandStore();
  const { getOrCreate, insertBlock, updateBlock, removeBlock, moveBlock, setTitle } = useBlocksStore();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerIndex, setPickerIndex] = React.useState<number | undefined>(undefined);
  const [mode, setMode] = React.useState<'edit' | 'preview'>('edit');

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  // Materialize the document in an effect — calling getOrCreate during
  // render would mutate the store mid-render and trip React's setState-in-
  // render guard.
  const documents = useBlocksStore((s) => s.documents);
  const doc = React.useMemo(
    () => (current ? Object.values(documents).find((d) => d.brandId === current.id) ?? null : null),
    [documents, current],
  );
  React.useEffect(() => {
    if (current && !doc) {
      getOrCreate(current.id, `${current.name} Guidelines`);
    }
  }, [current, doc, getOrCreate]);

  if (!current || !doc) {
    return (
      <BrandLayout>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </BrandLayout>
    );
  }

  const handlePick = (type: BlockType) => {
    const block = newBlock(type);
    insertBlock(doc.id, block, pickerIndex);
    setPickerIndex(undefined);
    toast.success(`Added ${type} block`);
  };

  const openPickerAt = (idx?: number) => {
    setPickerIndex(idx);
    setPickerOpen(true);
  };

  const seedSample = () => {
    if (doc.blocks.length > 0) return;
    const seeds: Block[] = [
      newBlock('heading'),
      newBlock('paragraph'),
      newBlock('color-palette'),
      newBlock('type-specimen'),
      newBlock('do-dont'),
      newBlock('callout'),
    ];
    seeds.forEach((b) => insertBlock(doc.id, b));
    toast.success('Seeded sample blocks');
  };

  return (
    <BrandLayout maxWidth="7xl">
      <PageHeader
        eyebrow="Guidelines · Block builder"
        title={
          <input
            type="text"
            value={doc.title}
            onChange={(e) => setTitle(doc.id, e.target.value)}
            className="bg-transparent text-3xl font-bold tracking-tight focus:outline-none"
          />
        }
        subtitle="Stack blocks to build your brand book. Press + or double-click any block to edit."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  mode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  mode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/b/${slug}/guidelines`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3 w-3" />
              Classic editor
            </button>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-h-[60vh]">
          {doc.blocks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/30 px-6 py-20 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-xl font-semibold text-foreground">Empty document</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Add your first block — heading, color palette, type specimen, do/don't, or any of 14 block types.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openPickerAt()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add a block
                </button>
                <button
                  type="button"
                  onClick={seedSample}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3" />
                  Seed sample
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pl-12">
              {doc.blocks.map((block, idx) => (
                <React.Fragment key={block.id}>
                  {mode === 'edit' ? (
                    <>
                      <BlockEditor
                        block={block}
                        onUpdate={(patch) => updateBlock(doc.id, block.id, patch)}
                        onMoveUp={() => moveBlock(doc.id, block.id, 'up')}
                        onMoveDown={() => moveBlock(doc.id, block.id, 'down')}
                        onDelete={() => removeBlock(doc.id, block.id)}
                        isFirst={idx === 0}
                        isLast={idx === doc.blocks.length - 1}
                      />
                      <BlockInsertButton onClick={() => openPickerAt(idx + 1)} />
                    </>
                  ) : (
                    <BlockRenderer block={block} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — outline */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-4">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Outline
            </h4>
            {doc.blocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add blocks to see them here.</p>
            ) : (
              <ol className="space-y-1.5 text-xs">
                {doc.blocks.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono text-[10px] text-muted-foreground/60">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{outlineLabel(b)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 border-t border-border pt-3">
              <div className="text-[10px] text-muted-foreground">{doc.blocks.length} blocks · last updated {new Date(doc.updatedAt).toLocaleTimeString()}</div>
            </div>
          </div>
        </aside>
      </div>

      <BlockPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />

      <CommentsPanel
        brandId={current.id}
        pageKey={`blocks/${doc.id}`}
        pageLabel={`${current.name} · Guidelines`}
      />
    </BrandLayout>
  );
}

function BlockInsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/insert flex h-2 items-center justify-center opacity-0 transition hover:h-8 hover:opacity-100">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Insert block
      </button>
    </div>
  );
}

function outlineLabel(block: Block): string {
  switch (block.type) {
    case 'heading':
      return block.text || 'Heading';
    case 'paragraph':
      return (block.text || 'Paragraph').slice(0, 40);
    case 'color-swatch':
      return `Color · ${block.name ?? block.hex}`;
    case 'color-palette':
      return `Palette · ${block.swatches.length} colors`;
    case 'type-specimen':
      return `Type · ${block.fontFamily}`;
    case 'image':
      return `Image · ${block.caption ?? 'untitled'}`;
    case 'image-grid':
      return `Image grid · ${block.images.length}`;
    case 'logo-card':
      return `Logo · ${block.variant ?? 'primary'}`;
    case 'do-dont':
      return 'Do / Don\'t';
    case 'video':
      return `Video · ${block.caption ?? 'embed'}`;
    case 'code':
      return `Code · ${block.language ?? 'snippet'}`;
    case 'download':
      return `Download · ${block.label}`;
    case 'callout':
      return `Callout · ${block.title ?? block.variant}`;
    case 'quote':
      return `Quote · ${block.author ?? '—'}`;
    case 'divider':
      return 'Divider';
    default:
      return 'Block';
  }
}
