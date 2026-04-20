import { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { detectAssetKind, ACCEPTED_MIME } from '../utils/assetTypeIcon';
import { uploadToScratch } from '../services/uploadAssets';
import type { OnboardingAsset } from '../types';
import { UploadTile } from './UploadTile';

const MAX_FILES = 10;
const MAX_SIZE_MB = 40;

function newAssetId() { return `a-${crypto.randomUUID()}`; }

export function OnboardingDropzone() {
  const sessionId = useOnboardingStore(s => s.sessionId);
  const assets = useOnboardingStore(s => s.assets);
  const addAsset = useOnboardingStore(s => s.addAsset);
  const removeAsset = useOnboardingStore(s => s.removeAsset);
  const updateProgress = useOnboardingStore(s => s.updateAssetProgress);
  const markDone = useOnboardingStore(s => s.markAssetDone);
  const markError = useOnboardingStore(s => s.markAssetError);
  const blobs = useRef<Map<string, string>>(new Map());

  useEffect(() => () => { blobs.current.forEach(URL.revokeObjectURL); blobs.current.clear(); }, []);

  const onDrop = useCallback((files: File[]) => {
    const room = MAX_FILES - assets.length;
    if (files.length > room) {
      toast.error(`You can add up to ${MAX_FILES} assets.`);
      files = files.slice(0, room);
    }
    files.forEach((file) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_SIZE_MB}MB.`);
        return;
      }
      const id = newAssetId();
      const kind = detectAssetKind(file.name, file.type);
      const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
      if (previewUrl) blobs.current.set(id, previewUrl);
      const asset: OnboardingAsset = {
        id, filename: file.name, mimeType: file.type, kind, previewUrl,
        scratchPath: null, remotePath: null, uploadProgress: 0, uploadStatus: 'pending',
      };
      addAsset(asset);

      const handle = uploadToScratch(sessionId, id, file, (p) => updateProgress(id, p));
      handle.promise
        .then(() => markDone(id, handle.scratchPath))
        .catch((e) => markError(id, e instanceof Error ? e.message : String(e)));
    });
  }, [assets.length, sessionId, addAsset, updateProgress, markDone, markError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxFiles: MAX_FILES,
    multiple: true,
  });

  const remove = useCallback((id: string) => {
    const url = blobs.current.get(id);
    if (url) { URL.revokeObjectURL(url); blobs.current.delete(id); }
    removeAsset(id);
  }, [removeAsset]);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative rounded-2xl bg-cosmos-surface min-h-[280px] p-6 cursor-pointer transition-colors
          ${isDragActive ? 'bg-cosmos-surface-hover' : ''}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'><rect width='100%25' height='100%25' rx='16' ry='16' fill='none' stroke='%23c8c6bd' stroke-width='2' stroke-dasharray='8 6' /></svg>\")",
          backgroundSize: '100% 100%',
          animation: isDragActive ? 'cosmos-dash-march 1.6s linear infinite' : 'none',
        }}
      >
        <input {...getInputProps()} />
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex -space-x-3">
              <img src="/onboarding-v3/icons/png.png" alt="" className="w-12 h-12" />
              <img src="/onboarding-v3/icons/jpg.png" alt="" className="w-12 h-12" />
              <img src="/onboarding-v3/icons/pdf.png" alt="" className="w-12 h-12" />
            </div>
            <p className="text-[14px] font-medium text-cosmos-primary">
              Drag & drop up to {MAX_FILES} assets
            </p>
            <p className="text-[12px] text-cosmos-secondary">
              Images, PDFs, fonts, design files. Max {MAX_SIZE_MB}MB each.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {assets.map(a => <UploadTile key={a.id} asset={a} onRemove={remove} />)}
            {assets.length < MAX_FILES && (
              <div className="aspect-square grid place-items-center rounded-xl border border-dashed border-cosmos-dash text-cosmos-secondary text-[13px]">
                + Add more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
