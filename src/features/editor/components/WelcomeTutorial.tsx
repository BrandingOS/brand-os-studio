import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  MousePointer, 
  Square, 
  Circle, 
  Type, 
  Image, 
  X,
  ChevronRight 
} from 'lucide-react';

interface WelcomeTutorialProps {
  onClose: () => void;
  brandName: string;
}

export function WelcomeTutorial({ onClose, brandName }: WelcomeTutorialProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: `Welcome to ${brandName} Editor!`,
      description: 'Let\'s get you started with the design editor. This tutorial will show you the key features.',
      icon: Palette,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This is your brand's design workspace where you can create logos, business cards, social media graphics, and more.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Tip</Badge>
            <span className="text-sm">All your designs will use your brand colors and fonts automatically!</span>
          </div>
        </div>
      )
    },
    {
      title: 'Tools Panel',
      description: 'Use the left sidebar to add elements to your design',
      icon: MousePointer,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Square className="h-4 w-4" />
              <span className="text-sm">Shapes</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Type className="h-4 w-4" />
              <span className="text-sm">Text</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Image className="h-4 w-4" />
              <span className="text-sm">Images</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Palette className="h-4 w-4" />
              <span className="text-sm">Colors</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Create!',
      description: 'You\'re all set to start designing with your brand',
      icon: ChevronRight,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Try adding some shapes, text, or images to your canvas. Remember, you can always access this tutorial again from the help menu.
          </p>
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium">Pro Tip:</p>
            <p className="text-sm text-muted-foreground">
              Your designs auto-save as you work, so you never lose progress!
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <currentStep.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentStep.content}
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i === step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={onClose}>
                  Start Creating!
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}