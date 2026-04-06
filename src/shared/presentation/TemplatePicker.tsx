/**
 * TemplatePicker — modal for selecting a presentation style + content type.
 * Shows 10 style thumbnails and 5 content types.
 * User picks a style and content type → builds slides for the editor.
 */
import { useState } from 'react';
import { X, Check, BookOpen, Building2, Presentation, Rocket, Image } from 'lucide-react';
import { PRESENTATION_STYLES, type PresentationStyle } from './styles';
import { CONTENT_TYPES, type ContentType } from './templates';

const CONTENT_ICONS: Record<string, React.ElementType> = {
  BookOpen, Building2, Presentation, Rocket, Image,
};

interface TemplatePickerProps {
  onSelect: (styleId: string, contentType: ContentType) => void;
  onClose: () => void;
  /** Pre-selected content type (skip content step) */
  defaultContentType?: ContentType;
}

export function TemplatePicker({ onSelect, onClose, defaultContentType }: TemplatePickerProps) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentType | null>(defaultContentType || null);
  const [step, setStep] = useState<'style' | 'content'>(defaultContentType ? 'style' : 'style');

  const handleConfirm = () => {
    if (selectedStyle && selectedContent) {
      onSelect(selectedStyle, selectedContent);
    }
  };

  const handleStyleClick = (id: string) => {
    setSelectedStyle(id);
    if (defaultContentType) {
      // Skip content step, go directly
      onSelect(id, defaultContentType);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-[#141414] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white/80">
              {step === 'style' ? 'Choose a Style' : 'Choose Content Type'}
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {step === 'style'
                ? '10 presentation styles — same layouts, different visual treatment'
                : 'What kind of presentation are you building?'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'style' ? (
            /* Style Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PRESENTATION_STYLES.map((style) => {
                const active = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleStyleClick(style.id)}
                    className={`group relative rounded-xl border p-3 text-left transition-all duration-200 ${
                      active
                        ? 'border-white/20 bg-white/[0.06] ring-1 ring-white/10'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white/70" />
                      </div>
                    )}

                    {/* Preview swatch */}
                    <div
                      className="w-full aspect-[4/3] rounded-lg mb-2.5"
                      style={{
                        background: style.preview,
                        borderRadius: `${Math.min(style.cornerRadius, 12)}px`,
                      }}
                    />

                    <p className="text-xs font-medium text-white/70 truncate">{style.name}</p>
                    <p className="text-[9px] text-white/25 mt-0.5 line-clamp-2">{style.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Content Type Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CONTENT_TYPES.map((ct) => {
                const active = selectedContent === ct.id;
                const Icon = CONTENT_ICONS[ct.icon] || BookOpen;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setSelectedContent(ct.id)}
                    className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? 'border-white/20 bg-white/[0.06] ring-1 ring-white/10'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4.5 h-4.5 text-white/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/70">{ct.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{ct.description}</p>
                      </div>
                    </div>
                    {active && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white/70" />
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
            {selectedStyle && selectedContent && <span className="mx-2">·</span>}
            {selectedContent && (
              <span>Content: <span className="text-white/40">{CONTENT_TYPES.find(c => c.id === selectedContent)?.name}</span></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'content' && (
              <button
                onClick={() => setStep('style')}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
              >
                Back
              </button>
            )}
            {step === 'style' && selectedStyle && !defaultContentType && (
              <button
                onClick={() => setStep('content')}
                className="px-4 py-2 rounded-lg text-xs font-medium text-black bg-white hover:bg-white/90 transition-all"
              >
                Next — Choose Content
              </button>
            )}
            {step === 'content' && selectedContent && (
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg text-xs font-medium text-black bg-white hover:bg-white/90 transition-all"
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
