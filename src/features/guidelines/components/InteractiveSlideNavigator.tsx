import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { GuidelineSlide } from '../types/guidelines';
import type { Brand } from '@/shared/types/brand';
import { 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Copy, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Plus,
  FileText,
  Palette,
  Type,
  Volume2,
  Image,
  Share2,
  Briefcase,
  Globe,
  Layers
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface InteractiveSlideNavigatorProps {
  slides: GuidelineSlide[];
  currentSlide: number;
  onSlideSelect: (index: number) => void;
  brand: Brand;
  onSlideUpdate: (slideId: string, updates: Partial<GuidelineSlide>) => void;
}

const SLIDE_ICONS = {
  cover: FileText,
  strategy: Briefcase,
  logos: Image,
  colors: Palette,
  typography: Type,
  voice: Volume2,
  iconography: Layers,
  social: Share2,
  stationery: FileText,
  applications: Globe,
};

const SLIDE_COLORS = {
  cover: 'bg-blue-100 text-blue-700 border-blue-200',
  strategy: 'bg-purple-100 text-purple-700 border-purple-200',
  logos: 'bg-green-100 text-green-700 border-green-200',
  colors: 'bg-pink-100 text-pink-700 border-pink-200',
  typography: 'bg-orange-100 text-orange-700 border-orange-200',
  voice: 'bg-teal-100 text-teal-700 border-teal-200',
  iconography: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  social: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  stationery: 'bg-gray-100 text-gray-700 border-gray-200',
  applications: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const InteractiveSlideNavigator: React.FC<InteractiveSlideNavigatorProps> = ({
  slides,
  currentSlide,
  onSlideSelect,
  brand,
  onSlideUpdate
}) => {
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);

  const handleToggleVisibility = (slideId: string, enabled: boolean) => {
    onSlideUpdate(slideId, { enabled: !enabled });
  };

  const handleDuplicateSlide = (slide: GuidelineSlide) => {
    const newSlide: GuidelineSlide = {
      ...slide,
      id: `${slide.id}-copy-${Date.now()}`,
      title: `${slide.title} (Copy)`,
      order: slide.order + 0.5,
    };
    onSlideUpdate(newSlide.id, newSlide);
  };

  const handleDeleteSlide = (slideId: string) => {
    onSlideUpdate(slideId, { enabled: false });
  };

  const getSlideIcon = (type: string) => {
    const Icon = SLIDE_ICONS[type as keyof typeof SLIDE_ICONS] || FileText;
    return Icon;
  };

  const getSlideColorClass = (type: string) => {
    return SLIDE_COLORS[type as keyof typeof SLIDE_COLORS] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getSlideProgress = (slide: GuidelineSlide) => {
    const content = slide.content || {};
    const requiredFields = {
      cover: ['title', 'subtitle'],
      strategy: ['mission', 'vision'],
      logos: ['primaryLogo'],
      colors: ['primary', 'secondary'],
      typography: ['primaryFont', 'bodyFont'],
      voice: ['voice', 'personality'],
    };

    const fields = requiredFields[slide.type as keyof typeof requiredFields] || [];
    const completedFields = fields.filter(field => content[field]);
    return fields.length > 0 ? (completedFields.length / fields.length) * 100 : 100;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Guideline Sections</h3>
        <Button variant="ghost" size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {slides.map((slide, index) => {
          const Icon = getSlideIcon(slide.type);
          const progress = getSlideProgress(slide);
          const isActive = index === currentSlide;
          
          return (
            <Card
              key={slide.id}
              className={cn(
                'p-3 cursor-pointer transition-all duration-200 hover:shadow-md',
                isActive ? 'ring-2 ring-primary/50 bg-primary/5' : 'hover:bg-muted/50',
                !slide.enabled ? 'opacity-60' : ''
              )}
              onClick={() => onSlideSelect(index)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('p-2 rounded-lg border', getSlideColorClass(slide.type))}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate">{slide.title}</h4>
                    <div className="flex items-center gap-1">
                      {/* Progress indicator */}
                      <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleVisibility(slide.id, slide.enabled)}>
                            {slide.enabled ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            {slide.enabled ? 'Hide' : 'Show'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateSlide(slide)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Page {slide.content?.pageNumber || index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(progress)}% complete
                    </span>
                  </div>

                  {/* Preview content */}
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {slide.type === 'cover' && (slide.content?.title || brand.name)}
                    {slide.type === 'strategy' && (slide.content?.mission || 'Mission statement...')}
                    {slide.type === 'colors' && `${Object.keys(slide.content?.palette || {}).length || 3} colors`}
                    {slide.type === 'typography' && (slide.content?.primaryFont || 'Font family...')}
                    {slide.type === 'voice' && (slide.content?.voice || 'Brand voice...')}
                    {slide.type === 'logos' && 'Logo variations and usage'}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Section Button */}
      <Button 
        variant="outline" 
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Section
      </Button>
    </div>
  );
};