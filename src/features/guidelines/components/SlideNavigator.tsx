import React from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import type { GuidelineSlide } from '../types/guidelines';
import type { Brand } from '@/shared/types/brand';
import { Button } from '@/shared/ui/Button';
import { 
  FileText, 
  Target, 
  Image, 
  Palette, 
  Type, 
  MessageCircle,
  Grid3x3,
  Share2,
  FileCheck,
  Layout,
  Plus
} from 'lucide-react';

interface SlideNavigatorProps {
  slides: GuidelineSlide[];
  currentSlide: number;
  onSlideSelect: (index: number) => void;
  brand: Brand;
}

const slideIcons = {
  cover: FileText,
  strategy: Target,
  logos: Image,
  colors: Palette,
  typography: Type,
  voice: MessageCircle,
  iconography: Grid3x3,
  social: Share2,
  stationery: FileCheck,
  applications: Layout,
};

export const SlideNavigator: React.FC<SlideNavigatorProps> = ({
  slides,
  currentSlide,
  onSlideSelect,
  brand,
}) => {
  const { panels, activePanel, setActivePanel } = useGuidelinesStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold mb-2">{brand.name}</h2>
        <p className="text-sm text-muted-foreground">Brand Guidelines Editor</p>
      </div>

      {/* Panel Toggles */}
      <div className="p-4 border-b border-border">
        <div className="space-y-2">
          {panels.map((panel) => {
            const Icon = panel.icon === 'Settings' ? Target : 
                        panel.icon === 'Edit' ? MessageCircle : Plus;
            
            return (
              <Button
                key={panel.id}
                variant={activePanel === panel.id ? 'default' : 'ghost'}
                className="w-full justify-start text-sm"
                onClick={() => setActivePanel(panel.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {panel.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Slides ({slides.length})
          </h3>
          
          <div className="space-y-1">
            {slides.map((slide, index) => {
              const Icon = slideIcons[slide.type as keyof typeof slideIcons] || FileText;
              const isActive = currentSlide === index;
              
              return (
                <button
                  key={slide.id}
                  onClick={() => onSlideSelect(index)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-foreground'
                    }
                  `}
                >
                  <div className="flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{slide.title}</p>
                    <p className={`text-xs truncate ${
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      Slide {index + 1}
                    </p>
                  </div>
                  
                  {slide.enabled && (
                    <div className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-primary-foreground' : 'bg-green-500'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add New Slide
        </Button>
      </div>
    </div>
  );
};