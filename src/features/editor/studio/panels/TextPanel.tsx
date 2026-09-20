// Text styles.
//
// Each row is a live preview in the brand's own typeface at the weight
// and relative size it will actually land at — so "Heading" shows the
// brand's heading font, not the UI's. Dragging a row onto the canvas
// places the text where it is dropped.

import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { Page } from '@/features/editor/schema';
import { InsertRow } from './InsertTile';
import type { InsertRequest } from '../ops/insertRequest';
import { TEXT_STYLES, type TextStyleId } from '../ops/insert';

interface Props {
  brandKit: BrandKit | null;
  page: Page | null;
  readOnly: boolean;
  insert: (request: InsertRequest) => void;
}

const ORDER: TextStyleId[] = ['heading', 'subheading', 'body'];
/** Preview sizes — the panel is 296px wide, the page is not. */
const PREVIEW_PX: Record<TextStyleId, number> = {
  heading: 24,
  subheading: 17,
  body: 13,
};

export function TextPanel({ brandKit, readOnly, insert }: Props) {
  return (
    <section className="st-section">
      <p className="st-section-label">Add text</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {ORDER.map((id) => {
          const spec = TEXT_STYLES[id];
          const family =
            (spec.font === 'heading'
              ? brandKit?.typography.heading.family
              : brandKit?.typography.body.family) ?? 'inherit';
          return (
            <InsertRow
              key={id}
              label={`Add a ${spec.label.toLowerCase()}`}
              disabled={readOnly}
              request={{ kind: 'text', style: id }}
              onInsert={insert}
            >
              <span
                style={{
                  fontFamily: family,
                  fontSize: PREVIEW_PX[id],
                  fontWeight: spec.weight,
                  color: 'var(--ds-text)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {spec.label}
              </span>
            </InsertRow>
          );
        })}
      </div>
      <p className="st-tile-caption" style={{ textAlign: 'left', marginTop: 8 }}>
        {brandKit
          ? 'Sized for this format and set in your brand’s typefaces.'
          : 'Sized for this format.'}
      </p>
    </section>
  );
}
