import { supabase } from '@/integrations/supabase/client';

export interface UploadHandle {
  assetId: string;
  scratchPath: string;
  promise: Promise<void>;
  cancel(): void;
}

/**
 * Uploads a single file to onboarding-scratch/{sessionId}/{assetId}.{ext}.
 * Calls onProgress(0..1) periodically (Supabase JS doesn't stream progress
 * natively; we emit 0 on start and 1 on completion, with a synthetic 0.5
 * for UX smoothness when the file is large).
 */
export function uploadToScratch(
  sessionId: string,
  assetId: string,
  file: File,
  onProgress: (pct: number) => void,
): UploadHandle {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const scratchPath = `${sessionId}/${assetId}.${ext}`;
  const abort = new AbortController();

  const promise = (async () => {
    onProgress(0);
    if (file.size > 512 * 1024) {
      setTimeout(() => onProgress(0.5), 200);
    }
    const { error } = await supabase.storage
      .from('onboarding-scratch')
      .upload(scratchPath, file, { upsert: true });
    if (abort.signal.aborted) return;
    if (error) throw error;
    onProgress(1);
  })();

  return {
    assetId,
    scratchPath,
    promise,
    cancel: () => abort.abort(),
  };
}

export async function removeFromScratch(scratchPath: string): Promise<void> {
  await supabase.storage.from('onboarding-scratch').remove([scratchPath]);
}
