import { useState, useCallback } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Sparkles, Check, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedField {
  key: string;
  label: string;
  value: string | string[];
}

export interface AIAssistBoxProps {
  /** Placeholder shown in the textarea */
  placeholder?: string;
  /** A simulated parser that extracts structured data from free text.
   *  Each step provides its own parser so the extraction is domain-aware. */
  parse: (text: string) => ParsedField[];
  /** Called when the user confirms the parsed results */
  onApply: (fields: ParsedField[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAssistBox({
  placeholder = 'Tell us about your brand in your own words...',
  parse,
  onApply,
}: AIAssistBoxProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedField[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Simulate an async "AI" call (just runs the local parser after a short delay)
  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    setIsParsing(true);
    // simulate network latency
    await new Promise((r) => setTimeout(r, 600));
    const result = parse(text);
    setParsed(result);
    setIsParsing(false);
  }, [text, parse]);

  const handleApply = () => {
    if (parsed) {
      onApply(parsed);
      setParsed(null);
      setText('');
      setIsCollapsed(true);
    }
  };

  const handleReset = () => {
    setParsed(null);
  };

  return (
    <Card className="p-4 sm:p-5 mb-6 border-dashed border-violet-500/30 bg-violet-500/[0.03]">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 mb-0"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">AI Assist</span>
          <span className="text-xs text-muted-foreground">
            — describe freely and we'll fill in the fields
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition"
          />

          {/* Parse button */}
          {!parsed && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleParse}
                disabled={!text.trim() || isParsing}
                className="flex items-center gap-2"
              >
                {isParsing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Parse with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Parsed results card */}
          {parsed && parsed.length > 0 && (
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                We interpreted the following:
              </p>

              <div className="space-y-2">
                {parsed.map((field) => (
                  <div
                    key={field.key}
                    className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm"
                  >
                    <span className="font-medium min-w-[120px] text-muted-foreground">
                      {field.label}:
                    </span>
                    <span>
                      {Array.isArray(field.value)
                        ? field.value.join(', ')
                        : field.value || '—'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="flex items-center gap-2"
                >
                  <Check className="h-3.5 w-3.5" /> Apply to Form
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Try Again
                </Button>
              </div>
            </div>
          )}

          {parsed && parsed.length === 0 && (
            <p className="text-sm text-muted-foreground">
              We couldn't extract structured data from your input. Try writing
              more details or fill in the fields manually below.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
