import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';

interface IconGalleryProps {
  icons?: string[];
  onIconsChange?: (icons: string[]) => void;
}

export function IconGallery({ icons = [], onIconsChange }: IconGalleryProps) {
  return (
    <div className="brand-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="brand-section-title">Iconography</h3>
        <Button variant="ghost" size="sm" className="text-xs">
          <Plus className="h-3 w-3 mr-1.5" />
          Add Icon
        </Button>
      </div>

      {icons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center brand-upload-zone">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Upload className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            No icons added yet
          </p>
          <Button variant="outline" size="sm" className="shadow-sm">
            <Plus className="h-3 w-3 mr-1.5" />
            Upload Icons
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
          {icons.map((icon, index) => (
            <div key={index} className="aspect-square bg-gray-50 rounded-xl p-3 flex items-center justify-center border border-gray-200 hover:border-primary transition-all duration-200">
              <img src={icon} alt={`Icon ${index + 1}`} className="max-w-full max-h-full object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
