/**
 * Widget elements — the non-chart shapes the Insert menu offers: cards,
 * media frames, device mockups, sticky note, link/embed/QR. Moved out of
 * `insertMenu.tsx` so the menu previews and (later) the inserted widgets
 * are the SAME component — one source of truth per shape.
 *
 * Same rules as charts.tsx: canned believable content, entrance animation
 * from elements.css (`el-rise`, `el-grow-x`, `el-fade`), literal chrome
 * colors on the dark showcase ground, accent only inside the artwork.
 */
import type { ReactNode } from 'react';
import './elements.css';
import { ELEMENT_ACCENT } from './charts';

const INK = '#E9E9EB';
const MUTED = '#8E8E95';

const rise = (i = 0) =>
  ({ '--el-d': `${i * 90}ms` }) as React.CSSProperties;

/* ── Cards ──────────────────────────────────────────────────────────── */

const cardShell = {
  background: '#161618',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
} as const;

const wireBar = (w: number | string, h = 8, o = 0.16): ReactNode => (
  <div style={{ width: w, height: h, borderRadius: h / 2, background: `rgba(255,255,255,${o})` }} />
);

export function MetricCard({ accent = ELEMENT_ACCENT }: { accent?: string }) {
  return (
    <div className="el-rise" data-element="metric-card" style={{ ...cardShell, width: 190, padding: 16 }}>
      <div
        className="el-grow-x"
        style={{ width: 80, height: 5, borderRadius: 3, background: accent, marginBottom: 12 }}
      />
      <div
        className="el-rise"
        style={{ ...rise(2), fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: INK }}
      >
        50%{' '}
        <span
          className="el-fade"
          style={{
            ...rise(4),
            fontSize: 11,
            color: '#7DC98B',
            background: 'rgba(125,201,139,0.12)',
            borderRadius: 4,
            padding: '2px 5px',
            verticalAlign: 8,
          }}
        >
          ↗ 25%
        </span>
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 30 }}>Increase in new users</div>
    </div>
  );
}

export function VerticalCard() {
  return (
    <div className="el-rise" data-element="vertical-card" style={{ ...cardShell, width: 150, padding: 14, display: 'grid', gap: 8 }}>
      <div style={{ height: 62, borderRadius: 8, background: '#26303C' }} />
      {wireBar('80%')}
      {wireBar('55%', 7, 0.1)}
    </div>
  );
}

export function HorizontalCard() {
  return (
    <div className="el-rise" data-element="horizontal-card" style={{ ...cardShell, width: 250, padding: 12, display: 'flex', gap: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: 8, background: '#26303C', flex: 'none' }} />
      <div style={{ flex: 1, paddingTop: 8, display: 'grid', gap: 8, alignContent: 'start' }}>
        {wireBar('85%')}
        {wireBar('55%', 7, 0.1)}
      </div>
    </div>
  );
}

export function ImageCard() {
  return (
    <div className="el-rise" data-element="image-card" style={{ ...cardShell, width: 170, overflow: 'hidden' }}>
      <div style={{ height: 96, background: 'linear-gradient(150deg, #33546E, #1B2733)' }} />
      <div style={{ padding: 12 }}>{wireBar('75%')}</div>
    </div>
  );
}

/* ── Media frames ───────────────────────────────────────────────────── */

export function ImageFrame() {
  return (
    <div
      className="el-rise"
      data-element="image-frame"
      style={{
        width: 200,
        height: 150,
        borderRadius: 12,
        background: 'linear-gradient(165deg, #7FAFD9 0%, #9DBFA8 55%, #5C6B55 100%)',
      }}
    />
  );
}

export function VideoFrame() {
  return (
    <div
      className="el-rise"
      data-element="video-frame"
      style={{
        width: 260,
        height: 150,
        borderRadius: 12,
        background: 'linear-gradient(140deg, #1E2530, #101318)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        className="el-fade"
        style={{
          ...rise(3),
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            marginLeft: 4,
            borderStyle: 'solid',
            borderWidth: '9px 0 9px 15px',
            borderColor: `transparent transparent transparent ${INK}`,
          }}
        />
      </span>
    </div>
  );
}

export function LogoFrame() {
  return (
    <div className="el-rise" data-element="logo-frame" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 700,
          color: INK,
        }}
      >
        ◈
      </span>
      <span style={{ width: 110, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.16)' }} />
    </div>
  );
}

/* ── Device mockups ─────────────────────────────────────────────────── */

const screen = { background: 'linear-gradient(150deg, #1E2530, #12151B)', borderRadius: 6 } as const;

export function PhoneMockup() {
  return (
    <div
      className="el-rise"
      data-element="phone-mockup"
      style={{
        width: 108,
        height: 210,
        borderRadius: 20,
        background: '#0B0B0D',
        border: '3px solid #2E2E33',
        padding: '16px 8px 8px',
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 34,
          height: 8,
          borderRadius: 5,
          background: '#1C1C1F',
        }}
      />
      <div style={{ ...screen, width: '100%', height: '100%' }} />
    </div>
  );
}

export function TabletMockup() {
  return (
    <div
      className="el-rise"
      data-element="tablet-mockup"
      style={{
        width: 180,
        height: 224,
        borderRadius: 16,
        background: '#0B0B0D',
        border: '3px solid #2E2E33',
        padding: 12,
      }}
    >
      <div style={{ ...screen, width: '100%', height: '100%' }} />
    </div>
  );
}

export function LaptopMockup() {
  return (
    <div className="el-rise" data-element="laptop-mockup" style={{ width: 270 }}>
      <div
        style={{
          height: 150,
          borderRadius: '10px 10px 0 0',
          background: '#0B0B0D',
          border: '3px solid #2E2E33',
          borderBottom: 'none',
          padding: 10,
        }}
      >
        <div style={{ ...screen, width: '100%', height: '100%' }} />
      </div>
      <div style={{ height: 10, background: '#2E2E33', borderRadius: '0 0 12px 12px' }} />
    </div>
  );
}

export function BrowserMockup() {
  return (
    <div
      className="el-rise"
      data-element="browser-mockup"
      style={{ width: 270, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', gap: 5, padding: '8px 10px', background: '#1C1C1F' }}>
        {['#E9695E', '#E5B454', '#7DC98B'].map((c) => (
          <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ ...screen, height: 140, borderRadius: 0 }} />
    </div>
  );
}

/* ── Notes & links ──────────────────────────────────────────────────── */

export function StickyNote() {
  return (
    <div
      className="el-rise"
      data-element="sticky-note"
      style={{
        width: 170,
        height: 180,
        background: '#CFDCBB',
        color: '#3A3F33',
        padding: 14,
        fontSize: 12,
        lineHeight: 1.5,
        position: 'relative',
        boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
      }}
    >
      Everyone was really committed to the project, making sure tasks were completed meticulously.
      <span style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 10, opacity: 0.55 }}>
        Ravi
      </span>
      <span
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 16px 16px',
          borderColor: 'transparent transparent rgba(0,0,0,0.18) transparent',
        }}
      />
    </div>
  );
}

export function LinkCard() {
  return (
    <div
      className="el-rise"
      data-element="link-card"
      style={{ ...cardShell, width: 270, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}
    >
      <div style={{ width: 54, height: 54, borderRadius: 8, background: '#26303C', flex: 'none' }} />
      <div style={{ flex: 1, display: 'grid', gap: 7 }}>
        {wireBar('90%')}
        {wireBar('60%', 7, 0.1)}
        <div style={{ fontSize: 10, color: MUTED }}>example.com</div>
      </div>
    </div>
  );
}

export function EmbedFrame() {
  return (
    <div
      className="el-rise"
      data-element="embed-frame"
      style={{
        width: 280,
        height: 160,
        borderRadius: 12,
        border: '1.5px dashed rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: MUTED,
      }}
    >
      Embedded page (iFrame)
    </div>
  );
}

const QR_CELLS = [
  1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1,
  0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1,
];

export function QrCode() {
  return (
    <div
      data-element="qr-code"
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 14px)',
        gap: 2,
      }}
    >
      {QR_CELLS.map((on, i) => (
        <span
          key={i}
          className={on ? 'el-fade' : undefined}
          style={{
            ...(on ? ({ '--el-d': `${(i % 9) * 45}ms` } as React.CSSProperties) : null),
            width: 14,
            height: 14,
            background: on ? '#101012' : '#fff',
          }}
        />
      ))}
    </div>
  );
}
