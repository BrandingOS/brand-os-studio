import { useState } from 'react';
import type { FeelPalette } from '../types';

interface Props {
  palette: FeelPalette;
  onChange(colors: string[]): void;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function PaletteEditor({ palette, onChange }: Props) {
  const [local, setLocal] = useState<string[]>(palette.colors);
  const [errors, setErrors] = useState<(string | null)[]>([null, null, null, null, null]);

  function update(idx: number, value: string) {
    const next = [...local];
    next[idx] = value;
    setLocal(next);
    const nextErrors = [...errors];
    nextErrors[idx] = HEX_RE.test(value) ? null : 'Use #RRGGBB';
    setErrors(nextErrors);
    if (nextErrors.every(e => e === null)) onChange(next);
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-cosmos-border bg-cosmos-surface-hover grid grid-cols-5 gap-3">
      {local.map((hex, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <input
            type="color"
            value={HEX_RE.test(hex) ? hex : '#000000'}
            onChange={(e) => update(idx, e.target.value)}
            className="w-full h-10 rounded-lg border border-cosmos-border cursor-pointer"
          />
          <input
            type="text"
            value={hex}
            onChange={(e) => update(idx, e.target.value)}
            className={`h-8 rounded-md border bg-cosmos-surface px-2 text-[11px] font-mono uppercase
              ${errors[idx] ? 'border-red-500' : 'border-cosmos-border'}`}
            maxLength={7}
          />
          {errors[idx] && <p className="text-[10px] text-red-500">{errors[idx]}</p>}
        </div>
      ))}
    </div>
  );
}
