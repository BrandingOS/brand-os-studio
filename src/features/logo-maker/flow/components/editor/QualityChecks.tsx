import { useEffect, useState } from 'react';
import type { Canvas } from 'fabric';
import { fromCanvas, type CheckScore, type QualityReport } from '../../utils/quality-checks';
import { cn } from '@/lib/utils';

interface QualityChecksProps {
  canvas: Canvas | null;
  tick: number;
}

const DOT_COLOR: Record<CheckScore, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-amber-500',
  poor: 'bg-red-500',
};

export function QualityChecks({ canvas, tick }: QualityChecksProps) {
  const [report, setReport] = useState<QualityReport | null>(null);

  useEffect(() => {
    if (!canvas) return;
    // Primary color for contrast: heuristic — use the first non-white fill we find.
    const objs = canvas.getObjects();
    const primary =
      objs
        .map((o) => (typeof o.fill === 'string' ? o.fill : ''))
        .find((f) => f && f.toLowerCase() !== '#ffffff' && f.toLowerCase() !== 'white') || '#111111';
    setReport(fromCanvas(canvas, primary));
  }, [canvas, tick]);

  if (!report) return null;

  return (
    <div className="pt-4 border-t border-border space-y-2">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Quality check
      </h4>
      <CheckRow label="Scalability" score={report.scalability.score} note={report.scalability.note} />
      <CheckRow label="Contrast" score={report.contrast.score} note={report.contrast.note} />
      <CheckRow label="Uniqueness" score="good" note="Full check lands in Phase 5" />
      <CheckRow label="Memorability" score="good" note="Full check lands in Phase 5" />
    </div>
  );
}

function CheckRow({
  label,
  score,
  note,
}: {
  label: string;
  score: CheckScore;
  note: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', DOT_COLOR[score])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{score}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{note}</p>
      </div>
    </div>
  );
}
