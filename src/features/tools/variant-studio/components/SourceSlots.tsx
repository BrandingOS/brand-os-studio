/**
 * SourceSlots — multi-source upload row in the BrandContextRail.
 *
 * Each uploaded source logo gets a slot in a horizontal strip. After
 * the last filled slot, an empty "+" slot invites the user to upload
 * another logo. Clicking a filled slot makes it the active source —
 * which is what the rail's edit-variant section, the missing-variants
 * suggestions, and any new draft will use as their basis.
 *
 * The active slot gets a primary ring. Filled slots have a small "x"
 * to remove the source from the session.
 */
import { Plus, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceLogo } from '../engine/types';

interface SourceSlotsProps {
  sources: SourceLogo[];
  activeSourceId: string | null;
  onPickFile: (file: File) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SourceSlots({
  sources,
  activeSourceId,
  onPickFile,
  onSelect,
  onRemove,
}: SourceSlotsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((s) => (
        <SourceSlot
          key={s.id}
          source={s}
          active={s.id === activeSourceId}
          onSelect={() => onSelect(s.id)}
          onRemove={() => onRemove(s.id)}
        />
      ))}
      <UploadSlot onPickFile={onPickFile} firstSlot={sources.length === 0} />
    </div>
  );
}

// ── Slots ─────────────────────────────────────────────────────

function SourceSlot({
  source,
  active,
  onSelect,
  onRemove,
}: {
  source: SourceLogo;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  // The slot itself is a div so we can nest the remove button without
  // creating an invalid <button>-in-<button>. Click anywhere on the
  // slot (except the remove button) selects it.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative h-16 w-16 cursor-pointer overflow-hidden rounded-lg border-2 bg-card transition-all',
        active
          ? 'border-primary shadow-sm ring-2 ring-primary/20'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <div className="flex h-full w-full items-center justify-center p-1.5 [&>div>svg]:h-full [&>div>svg]:w-full">
        {source.original.svg ? (
          <div
            className="flex h-full w-full items-center justify-center"
            dangerouslySetInnerHTML={{ __html: source.original.svg }}
          />
        ) : source.original.raster ? (
          <img
            src={source.original.raster}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>

      {/* Remove (×) — appears on hover, sits inside a div not a button */}
      <span
        role="button"
        tabIndex={-1}
        aria-label="Remove source"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm group-hover:flex hover:text-destructive"
      >
        <X className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

function UploadSlot({
  onPickFile,
  firstSlot,
}: {
  onPickFile: (file: File) => void;
  firstSlot: boolean;
}) {
  return (
    <label
      className={cn(
        'group flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed transition-all',
        firstSlot
          ? 'border-primary/60 bg-primary/5 text-primary hover:border-primary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
      )}
    >
      <input
        type="file"
        className="sr-only"
        accept="image/svg+xml,image/png,image/jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
        }}
      />
      {firstSlot ? <Upload className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      <span className="text-[8px] font-semibold uppercase tracking-wider">
        {firstSlot ? 'Upload' : 'Add'}
      </span>
    </label>
  );
}
