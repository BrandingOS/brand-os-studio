/**
 * Compact brand-system summary card. Shows the user the exact tokens the
 * engine will use for every output — colors, typography, voice, completeness.
 * This is the visual proof of "one brand goes in".
 */
import type { BrandTokens } from '../engine/brandTokens';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  tokens: BrandTokens;
  isAIConfigured: boolean;
}

export function BrandTokenSummary({ tokens, isAIConfigured }: Props) {
  const swatches = [
    { hex: tokens.colors.primary, label: 'Primary' },
    { hex: tokens.colors.secondary, label: 'Secondary' },
    { hex: tokens.colors.accent, label: 'Accent' },
    { hex: tokens.colors.foreground, label: 'Text' },
    { hex: tokens.colors.surfaceMuted, label: 'Surface' },
  ];
  const completionPct = Math.round(tokens.completeness.score * 100);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* Identity */}
        <div className="p-5 lg:border-r border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Brand system</div>
          <div className="mt-1 text-lg font-bold">{tokens.brandName}</div>
          <div className="mt-3 flex items-center gap-2">
            {swatches.map((s) => (
              <div key={s.label} className="text-center">
                <div className="h-9 w-9 rounded-md border border-border" style={{ background: s.hex }} title={`${s.label}: ${s.hex}`} />
                <div className="mt-1 text-[10px] text-muted-foreground truncate w-9">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <span style={{ fontFamily: tokens.typography.headingFamily }}>{cleanFamily(tokens.typography.headingFamily)}</span>
            {' · '}
            <span style={{ fontFamily: tokens.typography.bodyFamily }}>{cleanFamily(tokens.typography.bodyFamily)}</span>
          </div>
        </div>

        {/* Voice */}
        <div className="p-5 lg:border-r border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Voice</div>
          <div className="mt-1 text-sm font-semibold">{tokens.voice.tone}</div>
          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">For {tokens.voice.audience}</div>
          <div className="mt-3 flex flex-wrap gap-1">
            {tokens.voice.descriptors.slice(0, 5).map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px] font-normal">{d}</Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Engine</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            {isAIConfigured ? 'Anthropic Claude' : 'Local fallback'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isAIConfigured
              ? 'AI generates copy inside the brand contract.'
              : 'No API key set — using deterministic local copy.'}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Brand completeness</span>
              <span>{completionPct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            {tokens.completeness.missing.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Missing: {tokens.completeness.missing.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function cleanFamily(stack: string): string {
  return stack.split(',')[0].replace(/['"]/g, '').trim();
}
