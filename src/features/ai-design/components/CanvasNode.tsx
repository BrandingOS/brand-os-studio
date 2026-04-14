/**
 * Renders one DesignNode on the infinite canvas. Stateless — the parent
 * InfiniteCanvas owns pan/zoom and selection.
 */
import type { Brand } from '@/shared/types/brand';
import type { DesignNode, TextNode, RectNode, SwatchNode, LogoNode, FrameNode } from '../types';
import { resolveHandle } from '../lib/brandCard';

function resolveColor(brand: Brand | null | undefined, value: string): string {
  if (typeof value === 'string' && value.startsWith('@')) {
    return resolveHandle(brand, value) ?? '#000000';
  }
  return value;
}

export function CanvasNode({
  node,
  brand,
  selected,
  onSelect,
}: {
  node: DesignNode;
  brand: Brand | null | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const selectRing = selected ? '0 0 0 2px #6B46FF' : 'none';

  if (node.kind === 'text') {
    const n = node as TextNode;
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(n.id);
        }}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          color: resolveColor(brand, n.color),
          fontSize: n.fontSize,
          fontWeight: n.fontWeight,
          fontFamily: n.fontFamily ?? 'Inter, system-ui, sans-serif',
          textAlign: n.align ?? 'left',
          lineHeight: 1.15,
          cursor: 'move',
          boxShadow: selectRing,
          padding: 2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {n.text}
      </div>
    );
  }

  if (node.kind === 'rect') {
    const n = node as RectNode;
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(n.id);
        }}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          background: resolveColor(brand, n.fill),
          borderRadius: n.radius ?? 0,
          border: n.stroke ? `${n.strokeWidth ?? 1}px solid ${resolveColor(brand, n.stroke)}` : 'none',
          boxShadow: selectRing,
          cursor: 'move',
        }}
      />
    );
  }

  if (node.kind === 'swatch') {
    const n = node as SwatchNode;
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(n.id);
        }}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          cursor: 'move',
          boxShadow: selectRing,
          padding: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {n.colors.map((c, i) => (
            <div
              key={i}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                background: resolveColor(brand, c),
                border: '1px solid rgba(0,0,0,0.08)',
              }}
              title={c}
            />
          ))}
        </div>
        {n.label && (
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
            {n.label}
          </div>
        )}
      </div>
    );
  }

  if (node.kind === 'logo') {
    const n = node as LogoNode;
    const src = resolveHandle(brand, `@${brand?.slug ?? 'none'}.logo.${n.variant ?? 'full'}`)
      ?? brand?.logoAssets?.full
      ?? brand?.logo;
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(n.id);
        }}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selectRing,
          cursor: 'move',
          background: 'transparent',
        }}
      >
        {src ? (
          <img
            src={src}
            alt={brand?.name ?? 'logo'}
            draggable={false}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              background: brand?.primaryColor ?? '#6B46FF',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: Math.min(n.width, n.height) / 3,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {(brand?.name ?? 'B').slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  if (node.kind === 'frame') {
    const n = node as FrameNode;
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(n.id);
        }}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          background: n.background ? resolveColor(brand, n.background) : '#ffffff',
          boxShadow: selected
            ? '0 0 0 2px #6B46FF, 0 20px 48px -16px rgba(0,0,0,0.25)'
            : '0 20px 48px -16px rgba(0,0,0,0.18)',
          borderRadius: 8,
          overflow: 'hidden',
          cursor: 'move',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: 0,
            fontSize: 11,
            color: '#6b7280',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {n.label}
        </div>
        {n.children?.map((c) => (
          <CanvasNode key={c.id} node={c} brand={brand} selected={false} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return null;
}
