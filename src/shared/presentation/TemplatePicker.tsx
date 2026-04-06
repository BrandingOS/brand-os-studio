/**
 * TemplatePicker — modal for selecting a presentation style + content type.
 * Shows 10 style thumbnails with real mini-slide previews.
 */
import { useState } from 'react';
import { X, Check, BookOpen, Building2, Presentation, Rocket, Image, ArrowRight, Layers } from 'lucide-react';
import { PRESENTATION_STYLES, type PresentationStyle } from './styles';
import { CONTENT_TYPES, type ContentType } from './templates';
import { StyleThumbnail } from './StyleThumbnail';

const CONTENT_ICONS: Record<string, React.ElementType> = {
  BookOpen, Building2, Presentation, Rocket, Image, Layers,
};

interface TemplatePickerProps {
  onSelect: (styleId: string, contentType: ContentType) => void;
  onClose: () => void;
  defaultContentType?: ContentType;
  brandName?: string;
  brandColor?: string;
}

export function TemplatePicker({ onSelect, onClose, defaultContentType, brandName, brandColor }: TemplatePickerProps) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentType | null>(defaultContentType || null);
  const [step, setStep] = useState<'style' | 'content'>('style');

  const handleStyleClick = (id: string) => {
    setSelectedStyle(id);
    if (defaultContentType) {
      onSelect(id, defaultContentType);
    }
  };

  const handleConfirm = () => {
    if (selectedStyle && selectedContent) {
      onSelect(selectedStyle, selectedContent);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-[#111] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white/90">
              {step === 'style' ? 'Choose a Presentation Style' : 'What are you presenting?'}
            </h2>
            <p className="text-xs text-white/30 mt-0.5">
              {step === 'style'
                ? 'Each style applies different visual treatment to the same layouts'
                : 'Pick a content type — slides are pre-built with real structure'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1.5 mr-4">
              <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 'style' ? 'bg-white text-black' : 'bg-white/10 text-white/40'}`}>1</div>
              <div className="w-4 h-px bg-white/10" />
              <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 'content' ? 'bg-white text-black' : 'bg-white/10 text-white/40'}`}>2</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'style' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {PRESENTATION_STYLES.map((style) => {
                const active = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleStyleClick(style.id)}
                    className={`group relative rounded-xl border text-left transition-all duration-200 overflow-hidden ${
                      active
                        ? 'border-white/25 bg-white/[0.06] ring-2 ring-white/15'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}

                    {/* Real mini-slide thumbnail */}
                    <div className="p-2.5 pb-0">
                      <StyleThumbnail
                        style={style}
                        brandName={brandName || 'Brand'}
                        brandColor={brandColor}
                      />
                    </div>

                    {/* Info */}
                    <div className="p-2.5 pt-2">
                      <p className="text-[11px] font-semibold text-white/80">{style.name}</p>
                      <p className="text-[9px] text-white/25 mt-0.5 leading-relaxed line-clamp-2">{style.description}</p>
                      {/* Style indicators */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: style.bgDark, border: `1px solid ${style.borderColor}22` }} />
                        <div className="w-3 h-3 rounded-sm" style={{ background: style.bgLight, border: `1px solid ${style.borderColor}22` }} />
                        <div className="w-3 h-3" style={{ background: style.bgAccent === 'brand' ? (brandColor || '#3B82F6') : style.bgAccent, borderRadius: `${Math.min(style.cardRadius, 3)}px` }} />
                        <span className="text-[8px] text-white/15 ml-auto">{style.cornerRadius}px</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {CONTENT_TYPES.map((ct) => {
                const active = selectedContent === ct.id;
                const Icon = CONTENT_ICONS[ct.icon] || BookOpen;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setSelectedContent(ct.id)}
                    className={`w-full rounded-xl border p-5 text-left transition-all duration-200 flex items-center gap-4 ${
                      active
                        ? 'border-white/20 bg-white/[0.06] ring-1 ring-white/10'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-white/10' : 'bg-white/[0.04]'}`}>
                      <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white/70' : 'text-white/30'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/80">{ct.name}</p>
                      <p className="text-xs text-white/30 mt-0.5">{ct.description}</p>
                    </div>
                    {active && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          <div className="text-[10px] text-white/20">
            {selectedStyle && (
              <span>Style: <span className="text-white/40">{PRESENTATION_STYLES.find(s => s.id === selectedStyle)?.name}</span></span>
            )}
            {selectedStyle && selectedContent && <span className="mx-2 text-white/10">·</span>}
            {selectedContent && (
              <span>Content: <span className="text-white/40">{CONTENT_TYPES.find(c => c.id === selectedContent)?.name}</span></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'content' && (
              <button onClick={() => setStep('style')} className="px-4 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                Back
              </button>
            )}
            {step === 'style' && selectedStyle && !defaultContentType && (
              <button
                onClick={() => setStep('content')}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-white/90 transition-all flex items-center gap-1.5"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {step === 'content' && selectedContent && (
              <button
                onClick={handleConfirm}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-white/90 transition-all"
              >
                Create Presentation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
