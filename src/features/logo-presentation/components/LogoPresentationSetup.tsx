/**
 * LogoPresentationSetup — editor for configuring logo concepts
 * before generating the presentation. Upload logos, set names,
 * write rationales, pick colors.
 */
import { useState, useRef } from 'react';
import { Upload, Plus, X, Trash2, ChevronRight, Palette, Type, Sparkles, Eye } from 'lucide-react';
import type { LogoPresentationData, LogoConcept } from '../types';
import type { Brand } from '@/shared/types/brand';
import { AIAssistantBox, type AIExtractedField } from '@/features/ai/components/AIAssistantBox';
import { toast } from 'sonner';

interface LogoPresentationSetupProps {
  brand: Brand;
  onStart: (data: LogoPresentationData) => void;
}

function createEmptyConcept(index: number): LogoConcept {
  const names = ['The Prism', 'The Signal', 'The Grid', 'The Anchor', 'The Shift'];
  const directions = ['Geometric & Angular', 'Dynamic & Growth-Oriented', 'Structured & Systematic', 'Bold & Grounded', 'Fluid & Modern'];
  return {
    id: `concept-${Date.now()}-${index}`,
    name: names[index] || `Concept ${index + 1}`,
    rationale: '',
    logoUrl: '',
    direction: directions[index] || 'Unique Direction',
    whyItWorks: ['', '', '', ''],
    colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
  };
}

function ConceptEditor({ concept, index, onChange, onRemove, brandColor }: {
  concept: LogoConcept;
  index: number;
  onChange: (c: LogoConcept) => void;
  onRemove: () => void;
  brandColor: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...concept, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateWhyPoint = (idx: number, value: string) => {
    const points = [...concept.whyItWorks];
    points[idx] = value;
    onChange({ ...concept, whyItWorks: points });
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#1a1a1a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]" style={{ backgroundColor: `${brandColor}10` }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: brandColor }}>
            {String.fromCharCode(65 + index)}
          </span>
          <span className="text-sm font-semibold text-white/80">Concept {String.fromCharCode(65 + index)}</span>
        </div>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Logo Upload */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Logo File</label>
          <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
          {concept.logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center p-2">
                <img src={concept.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => fileRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors">Replace</button>
                <button onClick={() => onChange({ ...concept, logoUrl: '' })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors">
              <Upload className="h-5 w-5" />
              <span className="text-sm">Upload Logo (SVG, PNG)</span>
            </button>
          )}
        </div>

        {/* Concept Name */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Concept Name</label>
          <input type="text" value={concept.name} onChange={e => onChange({ ...concept, name: e.target.value })} placeholder='e.g. "The Prism"'
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20" />
        </div>

        {/* Direction */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Direction / Style</label>
          <input type="text" value={concept.direction} onChange={e => onChange({ ...concept, direction: e.target.value })} placeholder="e.g. Geometric & Angular"
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20" />
        </div>

        {/* Rationale */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Rationale (1-2 sentences)</label>
          <textarea value={concept.rationale} onChange={e => onChange({ ...concept, rationale: e.target.value })} placeholder="What's the thinking behind this concept?"
            rows={2} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 resize-none" />
        </div>

        {/* Why It Works */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Why It Works (3-4 points)</label>
          <div className="space-y-1.5">
            {concept.whyItWorks.map((point, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-white/15 w-3">✓</span>
                <input type="text" value={point} onChange={e => updateWhyPoint(i, e.target.value)} placeholder={`Point ${i + 1}`}
                  className="flex-1 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/70 placeholder:text-white/10 focus:outline-none focus:border-white/15" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogoPresentationSetup({ brand, onStart }: LogoPresentationSetupProps) {
  const [concepts, setConcepts] = useState<LogoConcept[]>([
    createEmptyConcept(0),
    createEmptyConcept(1),
    createEmptyConcept(2),
  ]);
  const [brief, setBrief] = useState(brand.guidelines?.strategy?.positioning || brand.strategy || '');
  const [personality, setPersonality] = useState(
    (brand.guidelines?.strategy?.personality || [brand.tone || 'Professional']).join(', ')
  );
  const [clientName, setClientName] = useState('');

  const updateConcept = (index: number, c: LogoConcept) => {
    setConcepts(prev => prev.map((p, i) => i === index ? c : p));
  };

  const removeConcept = (index: number) => {
    if (concepts.length <= 1) { toast.error('Need at least 1 concept'); return; }
    setConcepts(prev => prev.filter((_, i) => i !== index));
  };

  const addConcept = () => {
    if (concepts.length >= 5) { toast.error('Maximum 5 concepts'); return; }
    setConcepts(prev => [...prev, createEmptyConcept(prev.length)]);
  };

  const handleGenerate = () => {
    // Validate
    const hasLogos = concepts.some(c => c.logoUrl);
    if (!hasLogos) {
      toast.error('Upload at least one logo to continue');
      return;
    }

    // Fill in missing logos with brand logo
    const filledConcepts = concepts.map(c => ({
      ...c,
      logoUrl: c.logoUrl || brand.logo || '',
      rationale: c.rationale || `A distinctive mark that captures ${brand.name}'s identity.`,
      whyItWorks: c.whyItWorks.filter(Boolean).length > 0 ? c.whyItWorks.filter(Boolean) : ['Distinctive and memorable', 'Scalable across applications', 'Aligned with brand positioning'],
    }));

    const data: LogoPresentationData = {
      brandName: brand.name,
      brandBrief: brief || `${brand.name} — building something meaningful.`,
      brandPersonality: personality.split(',').map(s => s.trim()).filter(Boolean),
      primaryColor: brand.primaryColor,
      clientName: clientName || undefined,
      concepts: filledConcepts,
    };

    onStart(data);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#111] flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold text-white/80">Logo Presentation Setup</h1>
        <button onClick={handleGenerate} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: brand.primaryColor, color: '#fff' }}>
          <Eye className="h-4 w-4" />
          Generate Presentation
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

          {/* AI Assistant */}
          <AIAssistantBox
            config={{
              title: 'AI Auto-Fill',
              description: 'Paste a brief, upload logos & documents — AI fills everything for you',
              hints: ['Upload logos (SVG/PNG)', 'Paste brand brief', 'Add color codes (#hex)', 'Upload brand document', 'Describe the brand'],
              acceptedFiles: 'image/svg+xml,image/png,image/jpeg,.pdf,.doc,.docx,.txt',
              fields: [
                { key: 'brief', label: 'Brand Brief', type: 'textarea' },
                { key: 'personality', label: 'Brand Personality', type: 'text' },
                { key: 'clientName', label: 'Client Name', type: 'text' },
                { key: 'conceptAName', label: 'Concept A Name', type: 'text' },
                { key: 'conceptARationale', label: 'Concept A Rationale', type: 'textarea' },
                { key: 'conceptALogo', label: 'Concept A Logo', type: 'image' },
                { key: 'conceptBName', label: 'Concept B Name', type: 'text' },
                { key: 'conceptBRationale', label: 'Concept B Rationale', type: 'textarea' },
                { key: 'conceptBLogo', label: 'Concept B Logo', type: 'image' },
                { key: 'conceptCName', label: 'Concept C Name', type: 'text' },
                { key: 'conceptCRationale', label: 'Concept C Rationale', type: 'textarea' },
                { key: 'conceptCLogo', label: 'Concept C Logo', type: 'image' },
              ],
            }}
            onExtracted={(fields) => {
              // Apply extracted data to form fields
              fields.forEach(f => {
                if (f.key === 'brief') setBrief(f.value);
                if (f.key === 'personality') setPersonality(f.value);
                if (f.key === 'clientName') setClientName(f.value);
                if (f.key === 'conceptAName' && concepts[0]) updateConcept(0, { ...concepts[0], name: f.value });
                if (f.key === 'conceptARationale' && concepts[0]) updateConcept(0, { ...concepts[0], rationale: f.value });
                if (f.key === 'conceptALogo' && concepts[0]) updateConcept(0, { ...concepts[0], logoUrl: f.value });
                if (f.key === 'conceptBName' && concepts[1]) updateConcept(1, { ...concepts[1], name: f.value });
                if (f.key === 'conceptBRationale' && concepts[1]) updateConcept(1, { ...concepts[1], rationale: f.value });
                if (f.key === 'conceptBLogo' && concepts[1]) updateConcept(1, { ...concepts[1], logoUrl: f.value });
                if (f.key === 'conceptCName' && concepts[2]) updateConcept(2, { ...concepts[2], name: f.value });
                if (f.key === 'conceptCRationale' && concepts[2]) updateConcept(2, { ...concepts[2], rationale: f.value });
                if (f.key === 'conceptCLogo' && concepts[2]) updateConcept(2, { ...concepts[2], logoUrl: f.value });
              });
            }}
            brandColor={brand.primaryColor}
          />

          {/* Brand Context */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Brand Context</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Brand Brief / Positioning</label>
                <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3} placeholder="What does this brand stand for?"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 resize-none" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Brand Personality (comma-separated)</label>
                  <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} placeholder="Bold, Precise, Human"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5 block">Client Name (optional)</label>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client or company name"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Concepts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Logo Concepts ({concepts.length})</h2>
              {concepts.length < 5 && (
                <button onClick={addConcept} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white border border-white/[0.08] hover:border-white/20 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add Concept
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {concepts.map((concept, i) => (
                <ConceptEditor
                  key={concept.id}
                  concept={concept}
                  index={i}
                  onChange={(c) => updateConcept(i, c)}
                  onRemove={() => removeConcept(i)}
                  brandColor={brand.primaryColor}
                />
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5">
            <p className="text-[10px] uppercase tracking-wider text-white/20 font-semibold mb-2">Tips for a great presentation</p>
            <ul className="text-xs text-white/25 space-y-1">
              <li>• Upload SVG logos for best quality (PNG works too)</li>
              <li>• Keep concept names short and memorable (2-3 words)</li>
              <li>• Write rationales as if explaining to the client face-to-face</li>
              <li>• Each "Why It Works" point should be specific, not generic</li>
              <li>• 3 concepts is ideal — enough choice without overwhelm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
