import React from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { GUIDELINE_TEMPLATES } from '../templates/template-registry';
import { SIZE_PRESETS } from '../types/guidelines';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
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

export const GuidelineCustomizer: React.FC = () => {
  const { 
    settings, 
    setTemplate, 
    setSizeFormat, 
    setLanguageDirection, 
    updateSpacing, 
    updateHeader, 
    updateFooter 
  } = useGuidelinesStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Guideline Customize</h3>
          <p className="text-sm text-muted-foreground">
            Customize the appearance and layout of your brand guidelines
          </p>
        </div>

        {/* Template Selection */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Template</Label>
          <div className="grid grid-cols-2 gap-3">
            {GUIDELINE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setTemplate(template.id)}
                className={`
                  relative aspect-video rounded-lg border-2 overflow-hidden transition-all
                  ${settings.template === template.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                  <div className="text-white text-xs">
                    <p className="font-medium">{template.name}</p>
                    <p className="opacity-80 text-xs">{template.description}</p>
                  </div>
                </div>
                {settings.template === template.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Size Settings */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Size</Label>
          <div className="space-y-3">
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
                    {format} ({dimensions.width}×{dimensions.height})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {settings.size.format === 'Custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    type="number"
                    value={settings.size.width}
                    onChange={(e) => updateSpacing({ /* custom width logic */ })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Height</Label>
                  <Input
                    type="number"
                    value={settings.size.height}
                    onChange={(e) => updateSpacing({ /* custom height logic */ })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Language Settings */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Language</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Reading Direction</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${settings.language.direction === 'ltr' ? 'font-medium' : 'text-muted-foreground'}`}>
                  LTR
                </span>
                <Switch
                  checked={settings.language.direction === 'rtl'}
                  onCheckedChange={(checked) => setLanguageDirection(checked ? 'rtl' : 'ltr')}
                />
                <span className={`text-xs ${settings.language.direction === 'rtl' ? 'font-medium' : 'text-muted-foreground'}`}>
                  RTL
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Spacing Settings */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Spacing</Label>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Padding</Label>
                <span className="text-xs text-muted-foreground">{settings.spacing.padding}px</span>
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
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Margins</Label>
                <span className="text-xs text-muted-foreground">{settings.spacing.margins}px</span>
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
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Corner Radius</Label>
                <span className="text-xs text-muted-foreground">{settings.spacing.cornerRadius}px</span>
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

        {/* Header Settings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Header</Label>
            <Switch
              checked={settings.header.enabled}
              onCheckedChange={(checked) => updateHeader({ enabled: checked })}
            />
          </div>
          
          {settings.header.enabled && (
            <div className="space-y-3">
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
        </Card>

        {/* Footer Settings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Footer</Label>
            <Switch
              checked={settings.footer.enabled}
              onCheckedChange={(checked) => updateFooter({ enabled: checked })}
            />
          </div>
          
          {settings.footer.enabled && (
            <div className="space-y-3">
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
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1">
            Reset to Default
          </Button>
          <Button className="flex-1">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};