/**
 * LogoPresentationSetup — editor for configuring logo concepts
 * before generating the presentation. Upload logos, set names,
 * write rationales, pick colors.
 */
import { useState, useRef } from 'react';
import { Upload, Plus, X, Trash2, ChevronRight, Palette, Type, Sparkles, Eye } from 'lucide-react';
import type { LogoPresentationData, LogoConcept, PresentationTemplate } from '../types';
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
  const iconFileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...concept, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...concept, iconUrl: reader.result as string });
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]" style={{ backgroundColor: `${concept.color || brandColor}10` }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: concept.color || brandColor }}>
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

        {/* Icon / Symbol Upload */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Icon / Symbol (Optional)</label>
          <input ref={iconFileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleIconUpload} />
          {concept.iconUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center p-1.5">
                <img src={concept.iconUrl} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => iconFileRef.current?.click()} className="text-xs text-white/40 hover:text-white transition-colors">Replace</button>
                <button onClick={() => onChange({ ...concept, iconUrl: '' })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => iconFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="text-xs">Upload Icon (for symbol breakdown slides)</span>
            </button>
          )}
        </div>

        {/* Concept Colors */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Concept Colors</label>
          <div className="grid grid-cols-2 gap-3">
            {/* Primary Color */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-white/25">Primary Color</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={concept.color || brandColor}
                    onChange={e => onChange({ ...concept, color: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                  />
                </div>
                <input
                  type="text"
                  value={concept.color || brandColor}
                  onChange={e => onChange({ ...concept, color: e.target.value })}
                  placeholder="#1B4F72"
                  className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/60 font-mono placeholder:text-white/15 focus:outline-none focus:border-white/20 uppercase"
                />
              </div>
            </div>
            {/* Accent Color */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-white/25">Accent Color</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={concept.colorAccent || brandColor}
                    onChange={e => onChange({ ...concept, colorAccent: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                  />
                </div>
                <input
                  type="text"
                  value={concept.colorAccent || brandColor}
                  onChange={e => onChange({ ...concept, colorAccent: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/60 font-mono placeholder:text-white/15 focus:outline-none focus:border-white/20 uppercase"
                />
              </div>
            </div>
          </div>
          {/* Color Presets */}
          <div className="mt-2">
            <span className="text-[10px] text-white/20 mb-1 block">Quick Presets</span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { c: '#1B4F72', a: '#3B82F6', label: 'Blue' },
                { c: '#064E3B', a: '#10B981', label: 'Green' },
                { c: '#7C3AED', a: '#A78BFA', label: 'Purple' },
                { c: '#DC2626', a: '#F87171', label: 'Red' },
                { c: '#D97706', a: '#FBBF24', label: 'Amber' },
                { c: '#0F172A', a: '#38BDF8', label: 'Navy' },
                { c: '#831843', a: '#F472B6', label: 'Rose' },
                { c: '#1E293B', a: '#00D2A0', label: 'Slate' },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => onChange({ ...concept, color: preset.c, colorAccent: preset.a })}
                  className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/[0.06] hover:border-white/20 transition-colors group"
                  title={preset.label}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.c }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.a }} />
                  <span className="text-[9px] text-white/25 group-hover:text-white/50">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
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

function createVectorConcepts(): LogoConcept[] {
  return [
    {
      id: `concept-vector-1`,
      name: 'The Arrow',
      rationale: 'A geometric arrow integrated with the letter V — representing direction and magnitude. The horizontal strike-through evokes a trajectory line, while the downward V-form doubles as the mathematical vector symbol. This is the most literal interpretation of the brand concept.',
      logoUrl: '/brands/vector/logo-1.svg',
      iconUrl: '/brands/vector/icon-1.svg',
      direction: 'Geometric & Directional',
      color: '#1B2A4A',
      colorAccent: '#3B82F6',
      whyItWorks: [
        'The arrow instantly communicates direction — the core brand metaphor',
        'The horizontal line creates a sense of trajectory and forward momentum',
        'Clean, angular construction reads as technical and precise',
        'Scales perfectly from favicon to billboard — every detail is intentional',
      ],
      symbolBreakdown: [
        { label: 'Trajectory Line', description: 'Forward momentum and directed path' },
        { label: 'V Letterform', description: 'Brand initial as structural element' },
        { label: 'Arrow Point', description: 'Precision, decisiveness, clear direction' },
        { label: 'Angular Counter', description: 'Negative space creates mathematical balance' },
      ],
      colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
    },
    {
      id: `concept-vector-2`,
      name: 'The Signal',
      rationale: 'Two sharp triangles forming the V — the larger triangle carries momentum while the smaller detached triangle signals precision and separation. The ECTOR wordmark uses a bold, uppercase treatment that feels like a control panel readout.',
      logoUrl: '/brands/vector/logo-2.svg',
      iconUrl: '/brands/vector/icon-2.svg',
      direction: 'Bold & Structural',
      color: '#064E3B',
      colorAccent: '#10B981',
      whyItWorks: [
        'The dual-triangle form creates visual tension — large and small, direction and precision',
        'Bold uppercase wordmark reads like a system interface — structured and authoritative',
        'The negative space between triangles suggests decision points — accept or reject',
        'Highly compact — works as a strong horizontal lockup for dashboards',
      ],
      symbolBreakdown: [
        { label: 'Primary Triangle', description: 'Direction and momentum — the main vector' },
        { label: 'Secondary Triangle', description: 'Precision signal — detached for clarity' },
        { label: 'Negative Gap', description: 'Decision point — the space between chaos and control' },
        { label: 'Angular Base', description: 'Grounded stability — the foundation of structure' },
      ],
      colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
    },
    {
      id: `concept-vector-3`,
      name: 'The Trajectory',
      rationale: 'An asymmetric angular mark that suggests a plotted course — one element grounded, the other reaching upward at a precise angle. The lowercase \'ector\' wordmark softens the technical feel without losing precision.',
      logoUrl: '/brands/vector/logo-3.svg',
      iconUrl: '/brands/vector/icon-3.svg',
      direction: 'Dynamic & Angular',
      color: '#7C3AED',
      colorAccent: '#A78BFA',
      whyItWorks: [
        'The asymmetric construction creates energy — this is not static, it is moving',
        'The upward trajectory angle maps directly to career progression',
        'Lowercase wordmark balances the angular icon — approachable yet technical',
        'The split-form icon works as two distinct elements or one unified mark',
      ],
      symbolBreakdown: [
        { label: 'Grounded Element', description: 'Stability — the starting point of every vector' },
        { label: 'Upward Trajectory', description: 'Direction and growth — career path ascending' },
        { label: 'Precise Angle', description: 'Calculated, not random — structured evaluation' },
        { label: 'Split Form', description: 'Two elements unified — AI + human guidance' },
      ],
      colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
    },
    {
      id: `concept-vector-4`,
      name: 'The Control',
      rationale: 'A variant of the angular mark with a more grounded, contained geometry. The left element feels like a cockpit indicator while the right element reaches toward a target. This is the "flight deck" interpretation of the brand personality.',
      logoUrl: '/brands/vector/logo-4.svg',
      iconUrl: '/brands/vector/icon-4.svg',
      direction: 'Contained & Systematic',
      color: '#0F172A',
      colorAccent: '#F59E0B',
      whyItWorks: [
        'The contained left element grounds the mark — stability and control',
        'The reaching right element creates directionality without chaos',
        'Evokes the "high-performance flight deck" described in the brand personality',
        'The geometric precision signals a system, not a tool — exactly the brand distinction',
      ],
      symbolBreakdown: [
        { label: 'Cockpit Indicator', description: 'Control center — calm stability in the noise' },
        { label: 'Target Reach', description: 'Directed output — every action has a destination' },
        { label: 'Contained Form', description: 'System boundary — structured, not scattered' },
        { label: 'Geometric Precision', description: 'Engineered, not decorated — a system mark' },
      ],
      colorVariants: { onWhite: 'none', onDark: 'brightness(0) invert(1)', onBrand: 'brightness(0) invert(1)', mono: 'grayscale(1) brightness(0)' },
    },
  ];
}

export function LogoPresentationSetup({ brand, onStart }: LogoPresentationSetupProps) {
  const isVector = brand.slug === 'vector';
  const [concepts, setConcepts] = useState<LogoConcept[]>(
    isVector ? createVectorConcepts() : [
      createEmptyConcept(0),
      createEmptyConcept(1),
      createEmptyConcept(2),
    ]
  );
  const [brief, setBrief] = useState(brand.guidelines?.strategy?.positioning || brand.strategy || '');
  const [personality, setPersonality] = useState(
    (brand.guidelines?.strategy?.personality || [brand.tone || 'Professional']).join(', ')
  );
  const [clientName, setClientName] = useState('');
  const [template, setTemplate] = useState<PresentationTemplate>(isVector ? 'simple' : 'premium');

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
      template,
      designGoals: brand.guidelines?.strategy?.values || ['Modern and distinctive', 'Clean and scalable', 'Unique but timeless'],
      keywords: brand.guidelines?.strategy?.personality || ['geometric', 'minimal', 'innovative'],
      version: 'v1',
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

          {/* Template Selection */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Template Style</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTemplate('premium')}
                className={`rounded-xl border p-4 text-left transition-all ${template === 'premium' ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-5 rounded bg-[#0A0A0F] flex items-center justify-center"><span className="text-[6px] text-white/60 font-bold">FULL</span></div>
                  <span className="text-sm font-semibold text-white/80">Premium</span>
                </div>
                <p className="text-[10px] text-white/30">Full-bleed cinematic slides. Bold colors, dramatic reveals, immersive storytelling.</p>
              </button>
              <button
                onClick={() => setTemplate('simple')}
                className={`rounded-xl border p-4 text-left transition-all ${template === 'simple' ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-5 rounded bg-[#0A0A0F] flex items-center justify-center p-0.5"><div className="w-full h-full rounded-sm bg-[#F0F4F8]" /></div>
                  <span className="text-sm font-semibold text-white/80">Simple</span>
                </div>
                <p className="text-[10px] text-white/30">Rounded cards on dark canvas. Minimal, calm, premium. Logo is the hero.</p>
              </button>
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
