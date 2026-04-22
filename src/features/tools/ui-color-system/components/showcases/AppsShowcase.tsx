/**
 * AppsShowcase — three faux mobile screens side by side showing a
 * wallet, a task list, and a chat. Gives the user a feel for the
 * palette on small dense surfaces.
 */
import { ArrowUpRight, ArrowDownRight, Send, Check } from 'lucide-react';
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function AppsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Phone>
        <WalletScreen p={p} n={n} />
      </Phone>
      <Phone>
        <TasksScreen p={p} n={n} s={s} />
      </Phone>
      <Phone>
        <ChatScreen p={p} n={n} s={s} />
      </Phone>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[32px] border shadow-xl"
      style={{ aspectRatio: '9 / 17.5', background: '#0a0a0a', borderColor: '#1a1a1a' }}
    >
      <div className="h-full">{children}</div>
    </div>
  );
}

type ScaleMap = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, { hex: string }>;

function WalletScreen({ p, n }: { p: ScaleMap; n: ScaleMap }) {
  const onP = pickOn(p[600].hex, n[50].hex, n[950].hex);
  return (
    <div className="flex h-full flex-col" style={{ background: n[50].hex }}>
      <div
        className="flex flex-col gap-3 px-5 pb-5 pt-8"
        style={{
          background: `linear-gradient(135deg, ${p[500].hex}, ${p[700].hex})`,
          color: onP,
        }}
      >
        <p className="text-xs opacity-80">Balance</p>
        <p className="text-3xl font-bold tracking-tight">$8,432.10</p>
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-1"
            style={{ background: `${onP}22` }}
          >
            <ArrowUpRight className="h-3 w-3" />
            +12.4%
          </span>
          <span className="opacity-80">this week</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: n[500].hex }}>
          Recent
        </p>
        {[
          { label: 'Coffee · Blue Bottle', amount: '-$6.20', icon: ArrowDownRight, color: p[500].hex },
          { label: 'Payday — Brandos', amount: '+$3,400.00', icon: ArrowUpRight, color: p[600].hex },
          { label: 'Figma · Pro', amount: '-$15.00', icon: ArrowDownRight, color: p[500].hex },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="flex items-center gap-3 rounded-xl p-2"
              style={{ background: n[100].hex, color: n[900].hex }}
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: `${t.color}22`, color: t.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 text-[12px]">{t.label}</span>
              <span className="font-mono text-[12px]">{t.amount}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TasksScreen({ p, n, s }: { p: ScaleMap; n: ScaleMap; s: ScaleMap }) {
  return (
    <div className="flex h-full flex-col px-5 pb-5 pt-8" style={{ background: n[50].hex }}>
      <p className="text-[11px] opacity-60" style={{ color: n[500].hex }}>Today</p>
      <h2 className="mt-1 text-2xl font-bold" style={{ color: n[900].hex }}>
        Plan your week
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {[
          { label: 'Ship brand kit', done: true, pill: 'Design', pillBg: p[100].hex, pillFg: p[800].hex },
          { label: 'QA palette contrast', done: false, pill: 'QA', pillBg: s[100].hex, pillFg: s[800].hex },
          { label: 'Review onboarding', done: false, pill: 'Product', pillBg: p[100].hex, pillFg: p[800].hex },
          { label: 'Investor update', done: false, pill: 'Finance', pillBg: n[200].hex, pillFg: n[800].hex },
        ].map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-2 rounded-xl border p-3"
            style={{
              background: t.done ? n[100].hex : n[50].hex,
              borderColor: n[200].hex,
              color: n[900].hex,
            }}
          >
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
              style={{
                background: t.done ? p[600].hex : n[50].hex,
                borderColor: t.done ? p[600].hex : n[300].hex,
                color: '#fff',
              }}
            >
              {t.done && <Check className="h-3 w-3" />}
            </span>
            <span
              className="flex-1 text-[12px]"
              style={{
                textDecoration: t.done ? 'line-through' : 'none',
                opacity: t.done ? 0.6 : 1,
              }}
            >
              {t.label}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: t.pillBg, color: t.pillFg }}
            >
              {t.pill}
            </span>
          </div>
        ))}
      </div>
      <button
        className="mt-auto rounded-full py-3 text-[13px] font-semibold"
        style={{ background: p[600].hex, color: pickOn(p[600].hex, n[50].hex, n[950].hex) }}
      >
        + Add task
      </button>
    </div>
  );
}

function ChatScreen({ p, n, s }: { p: ScaleMap; n: ScaleMap; s: ScaleMap }) {
  const onP = pickOn(p[600].hex, n[50].hex, n[950].hex);
  return (
    <div className="flex h-full flex-col" style={{ background: n[50].hex }}>
      <div
        className="flex items-center gap-3 border-b px-4 pb-3 pt-8"
        style={{ borderColor: n[200].hex, background: n[50].hex }}
      >
        <div className="h-8 w-8 rounded-full" style={{ background: s[400].hex }} />
        <div className="flex-1">
          <p className="text-[12px] font-semibold" style={{ color: n[900].hex }}>Nedal</p>
          <p className="text-[10px]" style={{ color: p[600].hex }}>• online</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-4 py-3">
        <Bubble side="left" bg={n[100].hex} fg={n[900].hex}>Morning — pushed the ui branch.</Bubble>
        <Bubble side="right" bg={p[600].hex} fg={onP}>Perfect. Pulling now.</Bubble>
        <Bubble side="right" bg={p[600].hex} fg={onP}>Is the marquee scroll working?</Bubble>
        <Bubble side="left" bg={n[100].hex} fg={n[900].hex}>Yes, with throw physics ✓</Bubble>
        <Bubble side="left" bg={n[100].hex} fg={n[900].hex}>Let's ship.</Bubble>
      </div>
      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: n[200].hex, background: n[50].hex }}
      >
        <input
          className="flex-1 rounded-full border px-3 py-2 text-[12px] outline-none"
          style={{ borderColor: n[200].hex, background: n[50].hex, color: n[900].hex }}
          defaultValue="Typing…"
        />
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: p[600].hex, color: onP }}
          aria-label="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Bubble({
  side,
  bg,
  fg,
  children,
}: {
  side: 'left' | 'right';
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <span
        className="max-w-[80%] rounded-2xl px-3 py-2 text-[12px]"
        style={{
          background: bg,
          color: fg,
          borderBottomRightRadius: side === 'right' ? '4px' : undefined,
          borderBottomLeftRadius: side === 'left' ? '4px' : undefined,
        }}
      >
        {children}
      </span>
    </div>
  );
}
