import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Lock, Unlock, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { toast } from 'sonner';

interface LayersPanelProps {
  fabricCanvas: any;
  selectedObject: any;
  onSelectionChange: (object: any) => void;
}

interface LayerItem {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  object: any;
}

export function LayersPanel({ fabricCanvas, selectedObject, onSelectionChange }: LayersPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);

  // Update layers when canvas changes
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateLayers = () => {
      const objects = fabricCanvas.getObjects();
      const newLayers = objects.map((obj: any, index: number) => ({
        id: obj.id || `layer-${index}`,
        type: obj.type || 'object',
        name: obj.type === 'textbox' ? obj.text?.slice(0, 20) || 'Text' : 
              obj.type === 'image' ? 'Image' :
              obj.type === 'rect' ? 'Rectangle' :
              obj.type === 'circle' ? 'Circle' :
              `Layer ${index + 1}`,
        visible: obj.visible !== false,
        locked: !obj.selectable,
        object: obj,
      }));
      setLayers(newLayers);
    };

    // Initial load
    updateLayers();

    // Listen for canvas changes
    fabricCanvas.on('object:added', updateLayers);
    fabricCanvas.on('object:removed', updateLayers);
    fabricCanvas.on('object:modified', updateLayers);

    return () => {
      fabricCanvas.off('object:added', updateLayers);
      fabricCanvas.off('object:removed', updateLayers);
      fabricCanvas.off('object:modified', updateLayers);
    };
  }, [fabricCanvas]);

  const selectLayer = (layer: LayerItem) => {
    if (fabricCanvas && layer.object) {
      fabricCanvas.setActiveObject(layer.object);
      fabricCanvas.renderAll();
      onSelectionChange(layer.object);
    }
  };

  const toggleVisibility = (layer: LayerItem) => {
    if (layer.object) {
      layer.object.set('visible', !layer.visible);
      fabricCanvas.renderAll();
      toast.success(`Layer ${layer.visible ? 'hidden' : 'shown'}`);
    }
  };

  const toggleLock = (layer: LayerItem) => {
    if (layer.object) {
      const newLocked = !layer.locked;
      layer.object.set('selectable', !newLocked);
      layer.object.set('evented', !newLocked);
      fabricCanvas.renderAll();
      toast.success(`Layer ${newLocked ? 'locked' : 'unlocked'}`);
    }
  };

  const deleteLayer = (layer: LayerItem) => {
    if (layer.object && fabricCanvas) {
      fabricCanvas.remove(layer.object);
      fabricCanvas.renderAll();
      toast.success('Layer deleted');
    }
  };

  const moveLayer = (layer: LayerItem, direction: 'up' | 'down') => {
    if (!layer.object || !fabricCanvas) return;

    if (direction === 'up') {
      fabricCanvas.bringForward(layer.object);
    } else {
      fabricCanvas.sendBackwards(layer.object);
    }
    fabricCanvas.renderAll();
    toast.success(`Layer moved ${direction}`);
  };

  return (
    <Card className="w-80 h-full rounded-none border-l flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Layers</h2>
        <p className="text-sm text-muted-foreground">
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded"></div>
            </div>
            <p className="text-sm">No layers yet</p>
            <p className="text-xs">Add elements to see them here</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {layers.reverse().map((layer, index) => (
              <div
                key={layer.id}
                className={`group flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedObject === layer.object ? 'bg-primary/10 border border-primary/20' : ''
                }`}
                onClick={() => selectLayer(layer)}
              >
                {/* Layer Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate capitalize">
                    {layer.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {layer.type}
                  </div>
                </div>

                {/* Layer Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer, 'up');
                    }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer, 'down');
                    }}
                    disabled={index === layers.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(layer);
                    }}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 opacity-50" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(layer);
                    }}
                  >
                    {layer.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}