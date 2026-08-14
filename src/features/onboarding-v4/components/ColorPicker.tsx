import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

interface Props {
  open: boolean;
  initialHex: string;
  onCancel(): void;
  onApply(hex: string): void;
}

export function ColorPicker({ open, initialHex, onCancel, onApply }: Props) {
  const [h, setH] = useState(0);
  const [s, setS] = useState(1);
  const [v, setV] = useState(1);
  const [hexInput, setHexInput] = useState(initialHex);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSV = useRef(false);
  const draggingHue = useRef(false);

  // Sync when opened
  useEffect(() => {
    if (!open) return;
    const rgb = hexToRgb(initialHex) || [0, 0, 0];
    const [hh, ss, vv] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    setH(hh);
    setS(ss);
    setV(vv);
    setHexInput(initialHex.toUpperCase());
  }, [open, initialHex]);

  const rgb = useMemo(() => hsvToRgb(h, s, v), [h, s, v]);
  const hex = useMemo(() => rgbToHex(rgb[0], rgb[1], rgb[2]), [rgb]);

  useEffect(() => {
    setHexInput(hex);
  }, [hex]);

  const updateFromSV = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    setS(x / rect.width);
    setV(1 - y / rect.height);
  }, []);
  const updateFromHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setH((x / rect.width) * 360);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (draggingSV.current) updateFromSV(e.clientX, e.clientY);
      if (draggingHue.current) updateFromHue(e.clientX);
    };
    const up = () => {
      draggingSV.current = false;
      draggingHue.current = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [updateFromSV, updateFromHue]);

  const svBg = `hsl(${h}, 100%, 50%)`;
  const cursorX = s * 100;
  const cursorY = (1 - v) * 100;
  const huePct = (h / 360) * 100;

  return (
    <div className={`color-picker${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div className="cp-body">
        <div
          ref={svRef}
          className="cp-sv"
          style={{ background: svBg }}
          onMouseDown={(e) => {
            draggingSV.current = true;
            updateFromSV(e.clientX, e.clientY);
          }}
        >
          <div className="cp-sv-sat" />
          <div className="cp-sv-val" />
          <div className="cp-sv-cursor" style={{ left: `${cursorX}%`, top: `${cursorY}%` }} />
        </div>
        <div
          ref={hueRef}
          className="cp-hue"
          onMouseDown={(e) => {
            draggingHue.current = true;
            updateFromHue(e.clientX);
          }}
        >
          <div className="cp-hue-cursor" style={{ left: `${huePct}%` }} />
        </div>
        <div className="cp-footer">
          <div className="cp-hex-wrap">
            <span className="cp-swatch-preview" style={{ background: hex }} />
            <input
              type="text"
              className="cp-hex-input"
              value={hexInput}
              maxLength={7}
              spellCheck={false}
              aria-label="Hex color"
              onChange={(e) => {
                const v = e.target.value;
                setHexInput(v);
                const rgb = hexToRgb(v);
                if (rgb) {
                  const [hh, ss, vv] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
                  setH(hh);
                  setS(ss);
                  setV(vv);
                }
              }}
            />
          </div>
          <div className="cp-actions">
            <button type="button" className="cp-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="cp-add-btn" onClick={() => onApply(hex)}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
