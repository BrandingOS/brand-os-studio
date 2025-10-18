import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';

interface IconGalleryProps {
  icons?: string[];
  onIconsChange?: (icons: string[]) => void;
}

export function IconGallery({ icons = [], onIconsChange }: IconGalleryProps) {
  return (
    <Card className="p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Iconography</h3>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Icon
        </Button>
      </div>

      {icons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            No icons added yet
          </p>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Upload Icons
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {icons.map((icon, index) => (
            <div key={index} className="flex-shrink-0 w-[120px] aspect-square bg-muted rounded-lg p-4 flex items-center justify-center snap-start border-2 border-border">
              <img src={icon} alt={`Icon ${index + 1}`} className="max-w-full max-h-full object-contain" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
