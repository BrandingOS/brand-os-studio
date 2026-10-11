/**
 * The owner's logo, painted any colour.
 *
 * The isolated ink is tinted on a canvas (cached per colour) and shown as an
 * `<img>`. Not a CSS mask: html2canvas cannot see masks, and the board this
 * renders on is also the board that gets exported.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { LogoSource } from '../model/types';
import { markTileDataUrl, tintedDataUrl } from '../engine/logoArt';

interface Props {
  logo: LogoSource;
  color: string;
  /** Height in px, or any CSS length. Width follows the mark's proportions. */
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

function useAsync(fn: () => Promise<string>, deps: unknown[]): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fn().then(
      (v) => live && setValue(v),
      () => live && setValue(null),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function LogoMark({ logo, color, height, width, className, style, label }: Props) {
  const src = useAsync(() => tintedDataUrl(logo, color), [logo.inkUrl, color]);
  const box: CSSProperties = {
    aspectRatio: `${logo.width} / ${logo.height}`,
    height,
    width,
    ...style,
  };
  const cls = ['lf-mark', className].filter(Boolean).join(' ');
  if (!src) return <span className={cls} style={box} role="img" aria-label={label ?? `${logo.name} logo`} />;
  return <img src={src} alt={label ?? `${logo.name} logo`} className={cls} style={box} draggable={false} />;
}

/** The logo repeated as a pattern. */
export function MarkPattern({ logo, color, ground, tile = 64, style }: { logo: LogoSource; color: string; ground: string; tile?: number; style?: CSSProperties }) {
  const src = useAsync(() => markTileDataUrl(logo, color, tile), [logo.inkUrl, color, tile]);
  return (
    <div
      className="lf-mark-pattern"
      aria-hidden="true"
      style={{
        backgroundColor: ground,
        backgroundImage: src ? `url("${src}")` : undefined,
        backgroundSize: `${tile}px ${tile}px`,
        ...style,
      }}
    />
  );
}
