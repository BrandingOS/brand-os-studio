import React, { useState, useEffect, useCallback } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { BrandGuidelinePage } from './BrandGuidelinePage';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';
import {
  Palette, Type, MessageCircle, Users, Target, Eye, Lightbulb,
  ChevronRight, ChevronLeft, Save, Loader2, Check
} from 'lucide-react';

interface GuidelineWithEditorProps {
  brand: Brand;
}

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato',
  'Playfair Display', 'Merriweather', 'Raleway', 'Oswald', 'Nunito',
  'DM Sans', 'Space Grotesk', 'Plus Jakarta Sans', 'Outfit', 'Manrope',
];

export const GuidelineWithEditor: React.FC<GuidelineWithEditorProps> = ({ brand: initialBrand }) => {
  const { update } = useBrandStore();
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [editorOpen, setEditorOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('brand');

  useEffect(() => { setBrand(initialBrand); }, [initialBrand]);

  useEffect(() => {
    if (saved) { const t = setTimeout(() => setSaved(false), 2000); return () => clearTimeout(t); }
  }, [saved]);

  const handleChange = useCallback((field: string, value: any) => {
    setBrand(prev => {
      if (field.startsWith('fonts.')) {
        const key = field.split('.')[1];
        return { ...prev, fonts: { ...prev.fonts, [key]: value } };
      }
      if (field.startsWith('guidelines.strategy.')) {
        const key = field.split('.')[2];
        return {
          ...prev,
          guidelines: {
            ...prev.guidelines,
            strategy: { ...prev.guidelines?.strategy, [key]: value }
          }
        };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(brand.id, {
        name: brand.name,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        fonts: brand.fonts,
        tone: brand.tone,
        audience: brand.audience,
        strategy: brand.strategy,
        guidelines: brand.guidelines,
      });
      setSaved(true);
      toast.success('Brand updated — guidelines refreshed');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const editorSections = [
    { id: 'brand', label: 'Brand', icon: Palette },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'strategy', label: 'Strategy', icon: Target },
    { id: 'voice', label: 'Voice', icon: MessageCircle },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Guidelines Preview (scrollable) */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${editorOpen ? 'mr-0' : ''}`}>
        <BrandGuidelinePage brand={brand} />
      </div>

      {/* Editor Toggle Tab */}
      <button
        onClick={() => setEditorOpen(!editorOpen)}
        className="self-center w-6 flex-shrink-0 h-24 bg-white border border-l-0 border-gray-200 rounded-r-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10 shadow-sm"
      >
        {editorOpen ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Editor Panel */}
      {editorOpen && (
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg">
          {/* Editor Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-semibold text-sm">Brand Editor</h3>
              <p className="text-xs text-gray-500">Changes update the guideline live</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving' : saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto px-2 py-1 gap-0.5 bg-gray-50/50">
            {editorSections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                  activeSection === s.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSection === 'brand' && (
              <>
                <FieldGroup label="Brand Name">
                  <input
                    value={brand.name}
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </FieldGroup>
                <FieldGroup label="Audience">
                  <input
                    value={brand.audience || ''}
                    onChange={e => handleChange('audience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </FieldGroup>
                <FieldGroup label="Tone">
                  <input
                    value={brand.tone || ''}
                    onChange={e => handleChange('tone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </FieldGroup>
              </>
            )}

            {activeSection === 'colors' && (
              <>
                <FieldGroup label="Primary Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.primaryColor}
                      onChange={e => handleChange('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      value={brand.primaryColor}
                      onChange={e => handleChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </FieldGroup>
                <FieldGroup label="Secondary Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.secondaryColor || '#666666'}
                      onChange={e => handleChange('secondaryColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      value={brand.secondaryColor || ''}
                      onChange={e => handleChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="#666666"
                    />
                  </div>
                </FieldGroup>
                {/* Live preview */}
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                  <div className="h-16" style={{ backgroundColor: brand.primaryColor }} />
                  <div className="h-8" style={{ backgroundColor: brand.secondaryColor || '#666' }} />
                </div>
              </>
            )}

            {activeSection === 'fonts' && (
              <>
                <FieldGroup label="Primary Font">
                  <select
                    value={brand.fonts?.primary || 'Inter'}
                    onChange={e => handleChange('fonts.primary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: brand.fonts?.primary }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </FieldGroup>
                <FieldGroup label="Secondary Font">
                  <select
                    value={brand.fonts?.secondary || 'Inter'}
                    onChange={e => handleChange('fonts.secondary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: brand.fonts?.secondary }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </FieldGroup>
              </>
            )}

            {activeSection === 'strategy' && (
              <>
                <FieldGroup label="Mission">
                  <textarea
                    value={brand.guidelines?.strategy?.mission || ''}
                    onChange={e => handleChange('guidelines.strategy.mission', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                    placeholder="Our mission is to..."
                  />
                </FieldGroup>
                <FieldGroup label="Vision">
                  <textarea
                    value={brand.guidelines?.strategy?.vision || ''}
                    onChange={e => handleChange('guidelines.strategy.vision', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                    placeholder="We envision a world where..."
                  />
                </FieldGroup>
                <FieldGroup label="Values (comma separated)">
                  <input
                    value={brand.guidelines?.strategy?.values?.join(', ') || ''}
                    onChange={e => handleChange('guidelines.strategy.values', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="Innovation, Trust, Excellence"
                  />
                </FieldGroup>
                <FieldGroup label="Positioning">
                  <textarea
                    value={brand.guidelines?.strategy?.positioning || ''}
                    onChange={e => handleChange('guidelines.strategy.positioning', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                    placeholder="What makes your brand unique..."
                  />
                </FieldGroup>
              </>
            )}

            {activeSection === 'voice' && (
              <>
                <FieldGroup label="Brand Voice">
                  <textarea
                    value={brand.tone || ''}
                    onChange={e => handleChange('tone', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                    placeholder="Professional, friendly, innovative..."
                  />
                </FieldGroup>
                <FieldGroup label="Personality Traits (comma separated)">
                  <input
                    value={brand.guidelines?.strategy?.personality?.join(', ') || ''}
                    onChange={e => handleChange('guidelines.strategy.personality', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="Modern, Bold, Trustworthy"
                  />
                </FieldGroup>
                <FieldGroup label="Target Audience">
                  <input
                    value={brand.audience || ''}
                    onChange={e => handleChange('audience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="Designers, agencies, startups..."
                  />
                </FieldGroup>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
