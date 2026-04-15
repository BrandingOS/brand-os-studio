import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PendingUpload {
  tileId: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
}

interface Props {
  pending: PendingUpload | null;
  onClose: () => void;
  /**
   * Fires with `saveToBrand`:
   *   - true  → caller should add the image to brand assets AND place into tile
   *   - false → caller places into tile only (one-time)
   */
  onConfirm: (args: { saveToBrand: boolean; assetName: string }) => void;
  /** If true, hides the save-to-brand checkbox (e.g., standalone mode without brand). */
  brandSaveDisabled?: boolean;
}

export function ImageUploadPrompt({ pending, onClose, onConfirm, brandSaveDisabled }: Props) {
  const [saveToBrand, setSaveToBrand] = useState(true);
  const [name, setName] = useState('');

  // Reset when a new upload arrives.
  if (pending && name === '') {
    setName(pending.fileName.replace(/\.[^.]+$/, ''));
  }

  if (!pending) return null;

  return (
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add this image?</DialogTitle>
          <DialogDescription>
            Choose whether to save this image to your brand's asset library so you can reuse it later.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden aspect-video bg-muted">
          <img src={pending.dataUrl} alt="" className="w-full h-full object-cover" />
        </div>

        {!brandSaveDisabled && (
          <label className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <Checkbox
              checked={saveToBrand}
              onCheckedChange={(v) => setSaveToBrand(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Save to brand assets</div>
              <div className="text-xs text-muted-foreground">
                The image appears in this brand's Assets section and can be reused across other designs.
              </div>
              {saveToBrand && (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Asset name"
                  className="mt-2 h-8 text-sm"
                />
              )}
            </div>
          </label>
        )}

        <label className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
          <Checkbox
            checked={brandSaveDisabled ? true : !saveToBrand}
            onCheckedChange={(v) => setSaveToBrand(v === true ? false : saveToBrand)}
            disabled={brandSaveDisabled}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Use once</div>
            <div className="text-xs text-muted-foreground">
              The image only lives inside this bento design — nothing is added to brand assets.
            </div>
          </div>
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm({ saveToBrand: brandSaveDisabled ? false : saveToBrand, assetName: name })}>
            Add image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
