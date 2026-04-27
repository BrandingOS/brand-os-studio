/**
 * ReplaceableArtwork — wraps an SVG illustration so the user can swap
 * it for an uploaded photo, an Unsplash photo, or a 3D illustration.
 *
 *   <ReplaceableArtwork
 *     slotId="cover-A-globe"
 *     defaultQuery="globe students"
 *     scopeId={`${brandSlug}:pitch-deck`}
 *   >
 *     <GlobeWithFlags size={520} />
 *   </ReplaceableArtwork>
 *
 * If the slot has an override, the wrapper renders an `<img>` filling
 * the same bounding box (object-fit: cover). Otherwise, it renders the
 * children as-is. Clicking opens the picker dialog.
 *
 * The wrapper carries `data-editor-chrome="true"` so its clicks don't
 * trigger the InlineEditableSlide's selection logic on the host slide.
 *
 * `scopeId` is optional. When omitted we fall back to
 * `${urlSlug}:pitch-deck` for back-compat with existing pitch-deck
 * variants — they used to derive scope from the URL slug implicitly.
 * New callers (case studies, logo presentations, the v2 deck system)
 * should pass an explicit scopeId.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useArtworkSlot } from './artworkStore';
import { ArtworkPicker } from './ArtworkPicker';

interface Props {
  /**
   * Stable identifier for this artwork slot. Choose something
   * descriptive that identifies the SLIDE + position so picks survive
   * when other slots get added/removed:
   *   `cover-A-hero` · `differentiators-B-mentor` · `cta-C-celebration`.
   */
  slotId: string;
  /**
   * Storage scope. When omitted, derived from the URL slug as
   * `${slug}:pitch-deck` for back-compat with existing pitch-deck
   * variants. New callers should pass an explicit value such as
   * `${brandId}:deck:${deckId}` so picks are scoped to the right
   * surface.
   */
  scopeId?: string;
  /** The original SVG to render when no override is set. */
  children: ReactNode;
  /** Optional default Unsplash search query. */
  defaultQuery?: string;
  /** Wrapping container style — usually width/height/positioning. */
  style?: CSSProperties;
  /** Optional className. */
  className?: string;
  /** Hint to the picker about object-fit when an override is rendered. */
  fit?: 'cover' | 'contain';
}

export function ReplaceableArtwork({
  slotId,
  scopeId,
  children,
  defaultQuery,
  style,
  className,
  fit = 'cover',
}: Props) {
  const { slug } = useParams<{ slug: string }>();
  const effectiveScope = scopeId ?? `${slug ?? 'unknown'}:pitch-deck`;
  const [override, setOverride, clearOverride] = useArtworkSlot(effectiveScope, slotId);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      data-editor-chrome="true"
      data-replaceable-slot={slotId}
      className={className}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setPickerOpen(true);
      }}
      style={{
        position: 'relative',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      title="Click to replace this artwork"
    >
      {override ? (
        <img
          src={override.url}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block',
            borderRadius: 'inherit',
          }}
        />
      ) : (
        children
      )}

      {/* Hover badge — small, unobtrusive, only on hover via CSS in the
          parent stylesheet. Inline styles can't do `:hover`, so we
          render the badge as always-visible at low opacity. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 'normal',
          background: 'rgba(255,255,255,0.92)',
          color: '#001563',
          border: '1px solid rgba(0,21,99,0.16)',
          borderRadius: 999,
          pointerEvents: 'none',
          opacity: 0.85,
        }}
      >
        <ImageIcon size={11} />
        {override ? 'Replace' : 'Click to add photo'}
      </span>

      {/* Reset-to-original button — only when an override is active */}
      {override && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearOverride();
          }}
          title="Restore the original illustration"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.92)',
            color: '#c11',
            border: '1px solid rgba(193,17,17,0.18)',
            borderRadius: 999,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={11} /> Restore
        </button>
      )}

      {/* Unsplash attribution (required by their API ToS when displaying
          their photos) — small caption pinned to the bottom corner. */}
      {override?.source === 'unsplash' && override.authorName && (
        <span
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 9,
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: 4,
            pointerEvents: 'auto',
          }}
        >
          Photo:{' '}
          <a
            href={override.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {override.authorName}
          </a>
        </span>
      )}

      <ArtworkPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(o) => {
          setOverride(o);
          setPickerOpen(false);
        }}
        defaultQuery={defaultQuery}
      />
    </div>
  );
}
