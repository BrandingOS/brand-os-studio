let audioCtx: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function tone(freq: number, duration: number, type: OscillatorType, gain: number) {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = 0;
  osc.connect(vol);
  vol.connect(ctx.destination);
  const now = ctx.currentTime;
  vol.gain.linearRampToValueAtTime(gain, now + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playWoosh() {
  tone(220, 0.22, 'sine', 0.08);
  tone(380, 0.18, 'triangle', 0.05);
}

export function playShuffle() {
  tone(520, 0.08, 'triangle', 0.06);
  window.setTimeout(() => tone(640, 0.08, 'triangle', 0.05), 60);
}

export function playChime() {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    window.setTimeout(() => tone(freq, 0.35, 'sine', 0.07), i * 90);
  });
}
