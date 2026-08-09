import { useEffect, useMemo, useRef } from 'react';
// Flaticon UICONS font — suggested icons come as `fi-rr-*` class names
// (same catalog the Brand Kit uses), not as components in ICON_MAP.
import '@flaticon/flaticon-uicons/css/regular/rounded.css';

type IconComponent = (p: { size?: number }) => JSX.Element;

type Props = {
  icons: string[];
  iconMap: Record<string, IconComponent>;
  iconSize?: number;
  /** Right-click handler per icon tile — the marquee duplicates tiles to
   *  fill the track, so the same name may be passed multiple times with
   *  different DOM anchors. The parent decides what to do (menu, delete,
   *  etc.). */
  onIconContextMenu?: (
    e: React.MouseEvent<HTMLDivElement>,
    name: string,
  ) => void;
};

const MIN_TILES = 16;

export function IconsMarquee({
  icons,
  iconMap,
  iconSize = 28,
  onIconContextMenu,
}: Props) {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const sequence = useMemo(() => {
    if (!icons.length) return [];
    const reps = icons.length >= MIN_TILES ? 1 : Math.ceil(MIN_TILES / icons.length);
    const base: string[] = [];
    for (let r = 0; r < reps; r++) base.push(...icons);
    return [...base, ...base];
  }, [icons]);

  useEffect(() => {
    const marquee = marqueeRef.current;
    const track = trackRef.current;
    if (!marquee || !track) return;

    const SPEED = 40;
    const FRICTION = 2.2;
    const MIN_THROW_VEL = 60;
    const MIN_ACTIVE_VEL = 20;
    const MAX_THROW_VEL = 3000;
    const RESUME_DELAY = 400;
    const SAMPLE_WINDOW = 100;

    let pos = 0;
    let paused = false;
    let dragging = false;
    let dragStartX = 0;
    let dragStartPos = 0;
    let sequenceWidth = 0;
    let lastT = 0;
    let throwing = false;
    let throwVel = 0;
    let resumeAt = 0;
    let raf = 0;
    const moveSamples: { x: number; t: number }[] = [];

    const measure = () => {
      sequenceWidth = track.scrollWidth / 2;
    };
    requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener('resize', measure);

    const wrap = (p: number) => {
      if (sequenceWidth <= 0) return p;
      while (p <= -sequenceWidth) p += sequenceWidth;
      while (p > 0) p -= sequenceWidth;
      return p;
    };

    const pushSample = (x: number, t: number) => {
      moveSamples.push({ x, t });
      while (moveSamples.length && t - moveSamples[0].t > SAMPLE_WINDOW) moveSamples.shift();
    };

    const tick = (now: number) => {
      if (!track.isConnected) return;
      if (!lastT) lastT = now;
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      if (dragging) {
        // position driven by pointermove
      } else if (throwing) {
        pos = wrap(pos + throwVel * dt);
        throwVel *= Math.exp(-FRICTION * dt);
        if (Math.abs(throwVel) < MIN_ACTIVE_VEL) {
          throwing = false;
          throwVel = 0;
          resumeAt = now + RESUME_DELAY;
        }
      } else if (!paused && sequenceWidth > 0 && now >= resumeAt) {
        pos = wrap(pos - SPEED * dt);
      }

      track.style.transform = `translate3d(${pos.toFixed(2)}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => {
      paused = true;
    };
    const onLeave = () => {
      paused = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartPos = pos;
      throwing = false;
      throwVel = 0;
      moveSamples.length = 0;
      pushSample(e.clientX, performance.now());
      try {
        marquee.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      marquee.classList.add('is-dragging');
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      pos = wrap(dragStartPos + (e.clientX - dragStartX));
      pushSample(e.clientX, performance.now());
    };
    const endDrag = (e?: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      marquee.classList.remove('is-dragging');
      try {
        if (e && e.pointerId != null) marquee.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }

      const now = performance.now();
      while (moveSamples.length && now - moveSamples[0].t > SAMPLE_WINDOW) moveSamples.shift();

      let launched = false;
      if (moveSamples.length >= 2) {
        const first = moveSamples[0];
        const last = moveSamples[moveSamples.length - 1];
        const dtSec = (last.t - first.t) / 1000;
        if (dtSec > 0.01) {
          let v = (last.x - first.x) / dtSec;
          if (v > MAX_THROW_VEL) v = MAX_THROW_VEL;
          if (v < -MAX_THROW_VEL) v = -MAX_THROW_VEL;
          if (Math.abs(v) >= MIN_THROW_VEL) {
            throwVel = v;
            throwing = true;
            launched = true;
          }
        }
      }
      if (!launched) resumeAt = now + RESUME_DELAY;
      moveSamples.length = 0;
    };
    const onPointerUp = (e: PointerEvent) => endDrag(e);
    const onPointerCancel = (e: PointerEvent) => endDrag(e);
    const onWheel = (e: WheelEvent) => {
      // Wheel / trackpad horizontal scroll feeds the wrapped track
      // position — native scrollLeft would drift past the loop's window
      // and show blank track. Vertical deltas stay with the page.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!delta) return;
      e.preventDefault();
      pos = wrap(pos - delta);
      throwing = false;
      throwVel = 0;
      resumeAt = performance.now() + RESUME_DELAY;
    };
    const onLostCapture = () => {
      dragging = false;
      marquee.classList.remove('is-dragging');
    };

    marquee.addEventListener('mouseenter', onEnter);
    marquee.addEventListener('mouseleave', onLeave);
    marquee.addEventListener('pointerdown', onPointerDown);
    marquee.addEventListener('pointermove', onPointerMove);
    marquee.addEventListener('pointerup', onPointerUp);
    marquee.addEventListener('pointercancel', onPointerCancel);
    marquee.addEventListener('lostpointercapture', onLostCapture);
    marquee.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      marquee.removeEventListener('mouseenter', onEnter);
      marquee.removeEventListener('mouseleave', onLeave);
      marquee.removeEventListener('pointerdown', onPointerDown);
      marquee.removeEventListener('pointermove', onPointerMove);
      marquee.removeEventListener('pointerup', onPointerUp);
      marquee.removeEventListener('pointercancel', onPointerCancel);
      marquee.removeEventListener('lostpointercapture', onLostCapture);
      marquee.removeEventListener('wheel', onWheel);
    };
  }, [sequence.length]);

  if (!sequence.length) return null;

  return (
    <div ref={marqueeRef} className="icons-marquee">
      <div ref={trackRef} className="icons-track">
        {sequence.map((name, i) => {
          const Icon = iconMap[name];
          const isFlaticon = !Icon && name.startsWith('fi-');
          if (!Icon && !isFlaticon) return null;
          return (
            <div
              key={`${name}-${i}`}
              className="icon-tile"
              aria-label={name}
              onContextMenu={
                onIconContextMenu ? (e) => onIconContextMenu(e, name) : undefined
              }
            >
              {Icon ? (
                <Icon size={iconSize} />
              ) : (
                <i
                  className={`fi ${name}`}
                  aria-hidden
                  style={{ fontSize: iconSize - 4, lineHeight: 1, display: 'inline-flex' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
