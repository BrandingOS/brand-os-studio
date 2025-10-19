import { Button } from '@/components/ui/button';
import { Save, Eye } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CanvaTopBarProps {
  brandName?: string;
  onSave?: () => void;
  onPreview?: () => void;
}

export function CanvaTopBar({ brandName, onSave, onPreview }: CanvaTopBarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.();
      toast({
        title: 'Changes saved',
        description: 'Your brand guidelines have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving changes',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[var(--topbar-border)] flex items-center justify-between px-3 sticky top-0 z-10 rounded-t-2xl">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">
          {brandName || 'Brand'} <span className="text-muted-foreground">/ Guidelines</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden md:inline">Preview</span>
        </Button>
        
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>
    </header>
  );
}
