import React from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { GUIDELINE_TEMPLATES } from '../templates/template-registry';
import { SIZE_PRESETS } from '../types/guidelines';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Type, 
  Layout, 
  Settings, 
  Eye, 
  FileText,
  RotateCcw,
  Download,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

export const EnhancedGuidelineCustomizer: React.FC = () => {
  const { 
    settings, 
    setTemplate, 
    setSizeFormat, 
    setLanguageDirection, 
    updateSpacing, 
    updateHeader, 
    updateFooter,
    resetSettings 
  } = useGuidelinesStore();

  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to default');
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    toast.success('Settings saved successfully');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h3 className="text-lg font-semibold mb-2">Customize Guidelines</h3>
          <p className="text-sm text-muted-foreground">
            Personalize the appearance and layout of your brand guidelines
          </p>
        </div>

        {/* Template Selection */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-4 h-4" />
            <Label className="text-base font-medium">Template</Label>
            <Badge variant="secondary" className="text-xs">
              {GUIDELINE_TEMPLATES.find(t => t.id === settings.template)?.category}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {GUIDELINE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setTemplate(template.id)}
                className={`
                  relative group flex items-center gap-4 p-4 rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg
                  ${settings.template === template.id 
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                    : 'border-border hover:border-muted-foreground hover:bg-muted/20'
                  }
                `}
              >
                {/* Preview Thumbnail */}
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={template.preview}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Template Info */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {template.category}
                  </Badge>
                </div>
                
                {/* Selection Indicator */}
                {settings.template === template.id && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Size & Format */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" />
            <Label className="text-base font-medium">Size & Format</Label>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Page Format</Label>
              <Select
                value={settings.size.format}
                onValueChange={(value) => setSizeFormat(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIZE_PRESETS).map(([format, dimensions]) => (
                    <SelectItem key={format} value={format}>
                      {format} ({dimensions.width}×{dimensions.height}px)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {settings.size.format === 'Custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Width (px)</Label>
                  <Input
                    type="number"
                    value={settings.size.width}
                    onChange={(e) => {
                      const width = parseInt(e.target.value) || 1920;
                      updateSpacing({ /* would need size update method */ });
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Height (px)</Label>
                  <Input
                    type="number"
                    value={settings.size.height}
                    onChange={(e) => {
                      const height = parseInt(e.target.value) || 1080;
                      updateSpacing({ /* would need size update method */ });
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Language & Direction */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4" />
            <Label className="text-base font-medium">Language Settings</Label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Reading Direction</Label>
              <p className="text-xs text-muted-foreground">Controls text flow and layout</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${settings.language.direction === 'ltr' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                LTR
              </span>
              <Switch
                checked={settings.language.direction === 'rtl'}
                onCheckedChange={(checked) => setLanguageDirection(checked ? 'rtl' : 'ltr')}
              />
              <span className={`text-sm ${settings.language.direction === 'rtl' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                RTL
              </span>
            </div>
          </div>
        </Card>

        {/* Spacing & Layout */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4" />
            <Label className="text-base font-medium">Spacing & Layout</Label>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">Page Padding</Label>
                  <p className="text-xs text-muted-foreground">Space around content</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {settings.spacing.padding}px
                </Badge>
              </div>
              <Slider
                value={[settings.spacing.padding]}
                onValueChange={(value) => updateSpacing({ padding: value[0] })}
                min={20}
                max={120}
                step={10}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">Content Margins</Label>
                  <p className="text-xs text-muted-foreground">Space between sections</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {settings.spacing.margins}px
                </Badge>
              </div>
              <Slider
                value={[settings.spacing.margins]}
                onValueChange={(value) => updateSpacing({ margins: value[0] })}
                min={10}
                max={80}
                step={5}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">Corner Radius</Label>
                  <p className="text-xs text-muted-foreground">Roundness of elements</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {settings.spacing.cornerRadius}px
                </Badge>
              </div>
              <Slider
                value={[settings.spacing.cornerRadius]}
                onValueChange={(value) => updateSpacing({ cornerRadius: value[0] })}
                min={0}
                max={24}
                step={2}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Header & Footer */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4" />
            <Label className="text-base font-medium">Header & Footer</Label>
          </div>
          
          <div className="space-y-6">
            {/* Header Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Show Header</Label>
                <Switch
                  checked={settings.header.enabled}
                  onCheckedChange={(checked) => updateHeader({ enabled: checked })}
                />
              </div>
              
              {settings.header.enabled && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Date</Label>
                    <Switch
                      checked={settings.header.showDate}
                      onCheckedChange={(checked) => updateHeader({ showDate: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Project Name</Label>
                    <Switch
                      checked={settings.header.showProjectName}
                      onCheckedChange={(checked) => updateHeader({ showProjectName: checked })}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Custom Text</Label>
                    <Input
                      value={settings.header.customText || ''}
                      onChange={(e) => updateHeader({ customText: e.target.value })}
                      placeholder="Enter custom header text"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Show Footer</Label>
                <Switch
                  checked={settings.footer.enabled}
                  onCheckedChange={(checked) => updateFooter({ enabled: checked })}
                />
              </div>
              
              {settings.footer.enabled && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Page Numbers</Label>
                    <Switch
                      checked={settings.footer.showPageNumbers}
                      onCheckedChange={(checked) => updateFooter({ showPageNumbers: checked })}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Custom Text</Label>
                    <Input
                      value={settings.footer.customText || ''}
                      onChange={(e) => updateFooter({ customText: e.target.value })}
                      placeholder="Enter custom footer text"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSaveSettings}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};