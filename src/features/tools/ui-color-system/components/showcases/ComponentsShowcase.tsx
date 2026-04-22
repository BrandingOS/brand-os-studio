/**
 * ComponentsShowcase — a library of the building blocks most
 * designers want to verify against a new palette: buttons, inputs,
 * toggles, badges, alerts.
 */
import { Check, Info, AlertTriangle, X } from 'lucide-react';
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function ComponentsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;
  const onP = pickOn(p[600].hex, n[50].hex, n[950].hex);
  const onS = pickOn(s[600].hex, n[50].hex, n[950].hex);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Buttons */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: n[50].hex, borderColor: n[200].hex, color: n[900].hex }}
      >
        <h3 className="text-sm font-semibold">Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: p[600].hex, color: onP }}
          >
            Primary
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: s[600].hex, color: onS }}
          >
            Secondary
          </button>
          <button
            className="rounded-md border px-3 py-1.5 text-[12px] font-semibold"
            style={{ borderColor: n[300].hex, color: n[900].hex }}
          >
            Outline
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ color: p[700].hex }}
          >
            Ghost
          </button>
          <button
            disabled
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold opacity-50"
            style={{ background: n[200].hex, color: n[500].hex }}
          >
            Disabled
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full px-4 py-2 text-[12px] font-semibold"
            style={{ background: p[900].hex, color: n[50].hex }}
          >
            Pill · Deep
          </button>
          <button
            className="rounded-full px-4 py-2 text-[12px] font-semibold"
            style={{ background: p[100].hex, color: p[900].hex }}
          >
            Pill · Soft
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: n[50].hex, borderColor: n[200].hex, color: n[900].hex }}
      >
        <h3 className="text-sm font-semibold">Inputs</h3>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium" style={{ color: n[600].hex }}>
            Email
          </span>
          <input
            defaultValue="hamza@brandos.design"
            className="h-9 rounded-md border px-3 text-[13px] outline-none"
            style={{ borderColor: n[300].hex, background: n[50].hex, color: n[900].hex }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium" style={{ color: n[600].hex }}>
            Password
          </span>
          <input
            type="password"
            defaultValue="••••••••"
            className="h-9 rounded-md border px-3 text-[13px] outline-none"
            style={{
              borderColor: p[500].hex,
              background: n[50].hex,
              color: n[900].hex,
              boxShadow: `0 0 0 3px ${p[100].hex}`,
            }}
          />
        </label>
        <div className="flex items-center justify-between rounded-md border p-2" style={{ borderColor: n[200].hex }}>
          <span className="text-[12px]">Enable notifications</span>
          <span
            className="relative inline-flex h-5 w-9 cursor-pointer rounded-full transition"
            style={{ background: p[500].hex }}
            role="switch"
          >
            <span
              className="absolute left-[18px] top-0.5 h-4 w-4 rounded-full shadow"
              style={{ background: n[50].hex }}
            />
          </span>
        </div>
      </div>

      {/* Badges */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: n[50].hex, borderColor: n[200].hex, color: n[900].hex }}
      >
        <h3 className="text-sm font-semibold">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <Badge bg={p[100].hex} fg={p[800].hex}>Default</Badge>
          <Badge bg={p[600].hex} fg={onP}>Primary</Badge>
          <Badge bg={s[100].hex} fg={s[800].hex}>Secondary</Badge>
          <Badge bg={n[900].hex} fg={n[50].hex}>Dark</Badge>
          <Badge bg={n[100].hex} fg={n[700].hex}>Outline</Badge>
        </div>
      </div>

      {/* Alerts */}
      <div
        className="flex flex-col gap-2 rounded-2xl border p-5"
        style={{ background: n[50].hex, borderColor: n[200].hex, color: n[900].hex }}
      >
        <h3 className="text-sm font-semibold">Alerts</h3>
        <Alert icon={<Check className="h-3.5 w-3.5" />} bg={p[100].hex} fg={p[900].hex} accent={p[600].hex} title="Changes saved" body="Your palette has been saved locally." />
        <Alert icon={<Info className="h-3.5 w-3.5" />} bg={s[100].hex} fg={s[900].hex} accent={s[600].hex} title="New export available" body="W3C tokens are ready to copy." />
        <Alert icon={<AlertTriangle className="h-3.5 w-3.5" />} bg={n[100].hex} fg={n[900].hex} accent={n[600].hex} title="Contrast warning" body="Muted-on-surface is borderline." />
      </div>
    </div>
  );
}

function Badge({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function Alert({
  icon,
  bg,
  fg,
  accent,
  title,
  body,
}: {
  icon: React.ReactNode;
  bg: string;
  fg: string;
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex items-start gap-2 rounded-md border-l-4 p-2.5"
      style={{ background: bg, borderLeftColor: accent, color: fg }}
    >
      <span className="mt-0.5" style={{ color: accent }}>
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-[12px] font-semibold">{title}</p>
        <p className="text-[11px] opacity-80">{body}</p>
      </div>
      <button aria-label="dismiss" className="opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
