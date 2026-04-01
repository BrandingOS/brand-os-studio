import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSlide } from '../types/guidelines';
import { Wand2, Loader2, RefreshCw, Lightbulb, MessageSquare, Palette, Type, Zap, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/shared/services/aiService';

interface AIContentGeneratorProps {
  brand: Brand;
  currentSlide?: GuidelineSlide;
  onContentGenerated: (content: any) => void;
}

const AI_TOOLS = [
  {
    id: 'slogan',
    name: 'Slogan Generator',
    description: 'Generate catchy taglines and slogans',
    icon: MessageSquare,
    slideTypes: ['cover', 'strategy']
  },
  {
    id: 'mission',
    name: 'Mission & Vision',
    description: 'Create compelling mission and vision statements',
    icon: Lightbulb,
    slideTypes: ['strategy']
  },
  {
    id: 'voice',
    name: 'Brand Voice',
    description: 'Define your brand personality and tone',
    icon: MessageSquare,
    slideTypes: ['voice']
  },
  {
    id: 'color-analysis',
    name: 'Color Psychology',
    description: 'Analyze and suggest color meanings',
    icon: Palette,
    slideTypes: ['colors']
  },
  {
    id: 'typography',
    name: 'Font Pairing',
    description: 'Suggest perfect font combinations',
    icon: Type,
    slideTypes: ['typography']
  }
];

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  brand,
  currentSlide,
  onContentGenerated
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('slogan');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [lastGenerationWasAI, setLastGenerationWasAI] = useState<boolean | null>(null);

  const availableTools = AI_TOOLS.filter(tool => 
    !currentSlide || tool.slideTypes.includes(currentSlide.type)
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await aiService.generateContent({
        tool: selectedTool,
        prompt: prompt.trim(),
        brand: {
          name: brand.name,
          tone: brand.tone,
          audience: brand.audience,
          primaryColor: brand.primaryColor,
          fonts: brand.fonts,
        },
      });

      setGeneratedOptions(result.options);
      setLastGenerationWasAI(result.isAI);
      toast.success(
        result.isAI
          ? 'Content generated with AI!'
          : 'Sample content generated (set VITE_ANTHROPIC_API_KEY for AI)'
      );
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseContent = (content: string) => {
    onContentGenerated({ [selectedTool]: content });
    toast.success('Content applied to guideline');
  };

  const selectedToolData = AI_TOOLS.find(tool => tool.id === selectedTool);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold mb-2">AI Content Generator</h3>
          {lastGenerationWasAI !== null && (
            <Badge variant={lastGenerationWasAI ? 'default' : 'secondary'} className="flex items-center gap-1 text-xs">
              {lastGenerationWasAI ? (
                <><Zap className="w-3 h-3" /> AI</>
              ) : (
                <><CircleDashed className="w-3 h-3" /> Mock</>
              )}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Use AI to generate and refine your brand content
        </p>
      </div>

      {/* Tool Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">AI Tools</Label>
        <div className="grid gap-2">
          {availableTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                  ${selectedTool === tool.id 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{tool.name}</div>
                  <div className="text-xs text-muted-foreground">{tool.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Section */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          {selectedToolData && <selectedToolData.icon className="w-4 h-4" />}
          <h4 className="font-medium">{selectedToolData?.name}</h4>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm">What would you like to generate?</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Example: Generate a compelling ${selectedToolData?.name.toLowerCase()} for ${brand.name}...`}
              className="mt-1 min-h-[80px]"
            />
          </div>
          
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Options */}
      {generatedOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Generated Options</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </Button>
          </div>
          
          <div className="space-y-2">
            {generatedOptions.map((option, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1">{option}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseContent(option)}
                  >
                    Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Actions</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt(`Improve the brand voice for ${brand.name}`);
              setSelectedTool('voice');
            }}
          >
            Improve Voice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt(`Create taglines for ${brand.name}`);
              setSelectedTool('slogan');
            }}
          >
            Generate Taglines
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt(`Analyze color psychology for ${brand.name}`);
              setSelectedTool('color-analysis');
            }}
          >
            Color Analysis
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt(`Suggest font pairings for ${brand.name}`);
              setSelectedTool('typography');
            }}
          >
            Font Pairing
          </Button>
        </div>
      </div>
    </div>
  );
};