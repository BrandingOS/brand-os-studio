import { useState, useCallback } from 'react';
import { Upload, Link, Code, Image, FileText, Trash2, Download, ExternalLink, Plus, Search, Filter, Eye } from 'lucide-react';
import type { Brand, Asset } from '@/shared/types/brand';
import type { BrandAssetKind } from '@/shared/types/brandAssets';
import { toast } from 'sonner';
import { useAssetUpload } from '@/shared/assets/useAssetUpload';

interface AssetManagerModuleProps {
  brand: Brand;
  onUpdate?: (patch: Partial<Brand>) => void;
}

type AssetFilter = 'all' | 'logo' | 'photo' | 'icon' | 'document' | 'template' | 'reference';
type AddMode = null | 'upload' | 'url' | 'embed';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAssetIcon(type: string) {
  switch (type) {
    case 'image': case 'photo': case 'reference': return Image;
    case 'logo': case 'icon': return Image;
    case 'document': case 'template': return FileText;
    default: return FileText;
  }
}

export function AssetManagerModule({ brand, onUpdate }: AssetManagerModuleProps) {
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [search, setSearch] = useState('');
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  // Add asset form state
  const [newAsset, setNewAsset] = useState({ name: '', url: '', type: 'image' as Asset['type'], category: 'photo' as Asset['category'], tags: '' });

  // v3 unified upload — writes BrandAsset to brandAssets[] atomically.
  const { upload: uploadV3 } = useAssetUpload(brand.id);

  const assets = brand.assets || [];

  const filteredAssets = assets.filter(a => {
    if (filter !== 'all' && a.type !== filter && a.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // v3 pipeline handles validation, compression, dedupe, store write.
    const kind: BrandAssetKind = file.type.startsWith('image/') ? 'image' : 'document';
    const v3Asset = await uploadV3(file, {
      kind,
      maxSizeMB: 10,
      acceptedTypes: [file.type.startsWith('image/') ? 'image/' : ''],
      silent: true,
    });

    if (!v3Asset) return; // useAssetUpload already surfaced the error toast

    // Also append to the legacy `assets[]` array so the v2 UI list here
    // keeps rendering the new entry until PR3 switches this component
    // to read from `brandAssets[]`. The v3 asset URL is fetched from
    // formats (prefer best available format).
    const url =
      v3Asset.formats.svg?.url ??
      v3Asset.formats.png?.url ??
      v3Asset.formats.webp?.url ??
      v3Asset.formats.jpg?.url ??
      v3Asset.formats.pdf?.url ??
      '';
    const asset: Asset = {
      id: v3Asset.id,
      name: file.name.replace(/\.[^.]+$/, ''),
      type: kind === 'image' ? 'image' : 'document',
      category: 'photo',
      source: 'upload',
      url,
      size: file.size,
      tags: [],
      metadata: { originalName: file.name, format: file.name.split('.').pop()?.toUpperCase() },
      createdAt: new Date(),
    };
    onUpdate?.({ assets: [...assets, asset] });
    toast.success(`Uploaded "${asset.name}"`);
    setAddMode(null);
  }, [assets, onUpdate, uploadV3]);

  const handleAddUrl = useCallback(() => {
    if (!newAsset.url || !newAsset.name) { toast.error('Name and URL required'); return; }
    const asset: Asset = {
      id: `asset_${Date.now()}`,
      name: newAsset.name,
      type: newAsset.type,
      category: newAsset.category,
      source: 'url',
      url: newAsset.url,
      size: 0,
      tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean),
      metadata: { format: newAsset.url.split('.').pop()?.toUpperCase() },
      createdAt: new Date(),
    };
    onUpdate?.({ assets: [...assets, asset] });
    toast.success(`Added "${asset.name}"`);
    setNewAsset({ name: '', url: '', type: 'image', category: 'photo', tags: '' });
    setAddMode(null);
  }, [newAsset, assets, onUpdate]);

  const handleAddEmbed = useCallback(() => {
    if (!newAsset.url || !newAsset.name) { toast.error('Name and URL required'); return; }
    const asset: Asset = {
      id: `asset_${Date.now()}`,
      name: newAsset.name,
      type: newAsset.type,
      category: newAsset.category,
      source: 'embed',
      url: newAsset.url,
      size: 0,
      tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean),
      metadata: { embedUrl: newAsset.url, format: 'EMBED' },
      createdAt: new Date(),
    };
    onUpdate?.({ assets: [...assets, asset] });
    toast.success(`Embedded "${asset.name}" — link stays live`);
    setNewAsset({ name: '', url: '', type: 'image', category: 'reference', tags: '' });
    setAddMode(null);
  }, [newAsset, assets, onUpdate]);

  const handleDelete = useCallback((id: string) => {
    onUpdate?.({ assets: assets.filter(a => a.id !== id) });
    toast.success('Asset removed');
  }, [assets, onUpdate]);

  const filters: { key: AssetFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'logo', label: 'Logos' },
    { key: 'photo', label: 'Photos' },
    { key: 'icon', label: 'Icons' },
    { key: 'document', label: 'Documents' },
    { key: 'template', label: 'Templates' },
    { key: 'reference', label: 'References' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Brand Assets</h2>
          <p className="text-muted-foreground">{assets.length} assets — upload, link, or embed</p>
        </div>
        {/* Add buttons */}
        <div className="flex gap-2">
          <button onClick={() => setAddMode('upload')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
          <button onClick={() => setAddMode('url')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Link className="h-3.5 w-3.5" /> URL
          </button>
          <button onClick={() => setAddMode('embed')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Code className="h-3.5 w-3.5" /> Embed
          </button>
        </div>
      </div>

      {/* Add Asset Panel */}
      {addMode && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {addMode === 'upload' ? <><Upload className="h-4 w-4" /> Upload File</> :
               addMode === 'url' ? <><Link className="h-4 w-4" /> Add from URL</> :
               <><Code className="h-4 w-4" /> Embed Link (stays live)</>}
            </h3>
            <button onClick={() => setAddMode(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>

          {addMode === 'upload' ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload (max 10MB)</span>
              <span className="text-xs text-muted-foreground/50">PNG, JPG, SVG, PDF, AI, PSD</span>
              <input type="file" className="hidden" accept="image/*,.pdf,.ai,.psd,.svg" onChange={handleFileUpload} />
            </label>
          ) : (
            <div className="space-y-2">
              <input type="text" placeholder="Asset name" value={newAsset.name} onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <input type="url" placeholder={addMode === 'embed' ? 'Live embed URL (stays updated)' : 'Image or file URL'} value={newAsset.url} onChange={e => setNewAsset(p => ({ ...p, url: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <div className="flex gap-2">
                <select value={newAsset.type} onChange={e => setNewAsset(p => ({ ...p, type: e.target.value as Asset['type'] }))} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  <option value="image">Image</option>
                  <option value="logo">Logo</option>
                  <option value="icon">Icon</option>
                  <option value="document">Document</option>
                  <option value="template">Template</option>
                  <option value="reference">Reference</option>
                  <option value="video">Video</option>
                </select>
                <select value={newAsset.category} onChange={e => setNewAsset(p => ({ ...p, category: e.target.value as Asset['category'] }))} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  <option value="photo">Photo</option>
                  <option value="logo">Logo</option>
                  <option value="icon">Icon</option>
                  <option value="stationery">Stationery</option>
                  <option value="social">Social</option>
                  <option value="application">Application</option>
                  <option value="reference">Reference</option>
                  <option value="mockup">Mockup</option>
                </select>
              </div>
              <input type="text" placeholder="Tags (comma separated)" value={newAsset.tags} onChange={e => setNewAsset(p => ({ ...p, tags: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <button onClick={addMode === 'embed' ? handleAddEmbed : handleAddUrl} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                {addMode === 'embed' ? 'Embed Asset' : 'Add Asset'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" />
        </div>
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredAssets.map(asset => {
            const isImage = asset.type === 'image' || asset.type === 'logo' || asset.type === 'icon' || asset.type === 'reference';
            const Icon = getAssetIcon(asset.type);
            return (
              <div key={asset.id} className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                {/* Preview */}
                <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                  {isImage && asset.url ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-contain p-3" />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground/30" />
                  )}
                  {/* Source badge */}
                  <div className="absolute top-1.5 left-1.5">
                    <span className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      asset.source === 'upload' ? 'bg-blue-100 text-blue-600' :
                      asset.source === 'embed' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {asset.source || 'url'}
                    </span>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {isImage && asset.url && (
                      <button onClick={() => setPreviewAsset(asset)} className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50">
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                    )}
                    {asset.url && asset.source !== 'embed' && (
                      <a href={asset.url} download={asset.name} className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50">
                        <Download className="h-4 w-4 text-gray-700" />
                      </a>
                    )}
                    {asset.source === 'embed' && asset.url && (
                      <a href={asset.url} target="_blank" rel="noopener" className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50">
                        <ExternalLink className="h-4 w-4 text-gray-700" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(asset.id)} className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate">{asset.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{asset.metadata?.format || asset.type}</span>
                    {asset.size > 0 && <span className="text-[10px] text-muted-foreground">{formatSize(asset.size)}</span>}
                  </div>
                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1.5">
                      {asset.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No assets yet</p>
          <p className="text-sm text-muted-foreground/50 mt-1">Upload files, add URLs, or embed live links</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewAsset(null)}>
          <div className="max-w-4xl max-h-[85vh] p-2" onClick={e => e.stopPropagation()}>
            <img src={previewAsset.url} alt={previewAsset.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <p className="text-center text-white/60 text-sm mt-2">{previewAsset.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
