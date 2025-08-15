import React from 'react';

export interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[]; // hex color strings
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  presets = [],
}) => {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 p-0 border-0 rounded"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-20 px-2 py-1 border border-border rounded text-sm"
        />
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map((hex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(hex)}
              className="w-6 h-6 rounded border border-border"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
