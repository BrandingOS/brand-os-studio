/**
 * ChartDataEditor — the "Edit data" modal for chart blocks.
 *
 * A page-centered spreadsheet: click any cell or column name and TYPE —
 * inputs are chrome-less, nothing draws a box around the words. Hovering
 * a column header reveals an ✕ that removes the whole column; ＋ appends
 * one. Import covers the real routes into the grid: a CSV file, PASTE
 * (copying from Google Sheets, Apple Numbers, Excel and a Docs table all
 * lands as TSV on the clipboard — one parser catches every one of them),
 * and a public Google Sheets link fetched as its CSV export.
 *
 * Controlled like ChartToolbar: the host owns ChartData; Save hands back
 * a cleaned copy, Cancel discards the draft.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ChevronDown, Upload, Clipboard, Link2 } from 'lucide-react';

export interface ChartData {
  columns: string[];
  rows: string[][];
}

export interface ChartDataEditorProps {
  open: boolean;
  data: ChartData;
  onSave: (next: ChartData) => void;
  onCancel: () => void;
}

/** Parse clipboard/file text: tabs mean TSV (what Sheets/Numbers/Excel
 *  copy), otherwise CSV with just enough quote handling to be honest. */
export function parseDelimited(text: string): ChartData | null {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  if (!clean) return null;
  const delim = clean.includes('\t') ? '\t' : ',';
  const lines = clean.split('\n');
  const parseLine = (line: string): string[] => {
    if (delim === '\t') return line.split('\t');
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const grid = lines.map(parseLine);
  const width = Math.max(...grid.map((r) => r.length));
  if (width === 0) return null;
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')].map((c) => c.trim());
  const [head, ...rest] = grid;
  return { columns: pad(head), rows: rest.map(pad) };
}

/** docs.google.com/spreadsheets/d/{id}/… → its CSV export URL. */
export function googleSheetCsvUrl(url: string): string | null {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  if (!m) return null;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

const MIN_ROWS = 14;

export function ChartDataEditor({ open, data, onSave, onCancel }: ChartDataEditorProps) {
  const [draft, setDraft] = useState<ChartData>(data);
  const [importOpen, setImportOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null); // null = closed
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // A fresh draft every time the modal opens.
  useEffect(() => {
    if (open) {
      setDraft({ columns: [...data.columns], rows: data.rows.map((r) => [...r]) });
      setImportOpen(false);
      setSheetUrl(null);
      setImportError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const blanks = useMemo(
    () => Math.max(MIN_ROWS - draft.rows.length, 2),
    [draft.rows.length],
  );

  if (!open) return null;

  const setCell = (row: number, col: number, value: string) => {
    setDraft((d) => {
      const rows = d.rows.map((r) => [...r]);
      // Typing into a phantom row materializes every row up to it.
      while (rows.length <= row) rows.push(Array(d.columns.length).fill(''));
      rows[row][col] = value;
      return { ...d, rows };
    });
  };
  const setColumnName = (col: number, value: string) => {
    setDraft((d) => {
      const columns = [...d.columns];
      columns[col] = value;
      return { ...d, columns };
    });
  };
  const addColumn = () => {
    setDraft((d) => ({
      columns: [...d.columns, `Value ${d.columns.length}`],
      rows: d.rows.map((r) => [...r, '']),
    }));
  };
  const removeColumn = (col: number) => {
    setDraft((d) => ({
      columns: d.columns.filter((_, i) => i !== col),
      rows: d.rows.map((r) => r.filter((_, i) => i !== col)),
    }));
  };

  const applyImport = (parsed: ChartData | null, sourceLabel: string) => {
    if (!parsed || parsed.columns.length === 0) {
      setImportError(`Nothing readable came from ${sourceLabel}.`);
      return;
    }
    setDraft(parsed);
    setImportOpen(false);
    setSheetUrl(null);
    setImportError(null);
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => applyImport(parseDelimited(String(reader.result ?? '')), file.name);
    reader.readAsText(file);
  };
  const importClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      applyImport(parseDelimited(text), 'the clipboard');
    } catch {
      setImportError('The browser refused clipboard access — copy again and retry.');
    }
  };
  const importSheet = async (url: string) => {
    const csvUrl = googleSheetCsvUrl(url);
    if (!csvUrl) {
      setImportError('That does not look like a Google Sheets link.');
      return;
    }
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(String(res.status));
      applyImport(parseDelimited(await res.text()), 'the sheet');
    } catch {
      setImportError('Could not fetch the sheet — it must be shared as "Anyone with the link".');
    }
  };

  const save = () => {
    // Trim fully-empty trailing rows; keep interior blanks the user left.
    const rows = [...draft.rows];
    while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) rows.pop();
    onSave({ columns: [...draft.columns], rows });
  };

  const cellInput =
    'w-full bg-transparent outline-none border-0 text-[14px] px-4 py-3 placeholder:text-white/20';

  return createPortal(
    <div
      data-editor-chrome="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex flex-col w-[min(960px,94vw)] h-[min(720px,88vh)] bg-[#161616] border border-white/[0.08] rounded-[var(--ds-radius-card,14px)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
          <span className="flex-1 text-[15px] text-white/90">Edit data</span>

          {/* Import */}
          <div className="relative">
            <button
              onClick={() => {
                setImportOpen((v) => !v);
                setImportError(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/10 rounded-[var(--ds-radius-control,8px)] transition-colors"
            >
              Import <ChevronDown className="h-3.5 w-3.5 text-white/40" />
            </button>
            {importOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-10">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full px-3 py-2 text-left text-[13px] text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Upload className="h-3.5 w-3.5 text-white/40" />
                  <span className="flex-1">
                    CSV file
                    <span className="block text-[10px] text-white/30">Any exported .csv / .tsv</span>
                  </span>
                </button>
                <button
                  onClick={importClipboard}
                  className="w-full px-3 py-2 text-left text-[13px] text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Clipboard className="h-3.5 w-3.5 text-white/40" />
                  <span className="flex-1">
                    Paste copied cells
                    <span className="block text-[10px] text-white/30">
                      Google Sheets · Docs tables · Apple Numbers · Excel
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setSheetUrl((v) => (v === null ? '' : null))}
                  className="w-full px-3 py-2 text-left text-[13px] text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Link2 className="h-3.5 w-3.5 text-white/40" />
                  <span className="flex-1">
                    Google Sheets link
                    <span className="block text-[10px] text-white/30">Shared as “anyone with the link”</span>
                  </span>
                </button>
                {sheetUrl !== null && (
                  <div className="px-3 pt-1.5 pb-2 flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') importSheet(sheetUrl);
                      }}
                      placeholder="https://docs.google.com/spreadsheets/…"
                      className="flex-1 px-2.5 py-1.5 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/10 text-[12px] text-white/80 outline-none focus:border-white/30"
                    />
                    <button
                      onClick={() => importSheet(sheetUrl)}
                      className="px-2.5 py-1.5 text-[12px] rounded-[var(--ds-radius-control,8px)] border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
                    >
                      Fetch
                    </button>
                  </div>
                )}
                {importError && (
                  <div className="px-3 py-1.5 text-[11px] text-red-400/90">{importError}</div>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = '';
              }}
            />
          </div>

          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 text-white/40 hover:text-white rounded-[var(--ds-radius-control,8px)] hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${draft.columns.length}, minmax(180px, 1fr)) 44px` }}
          >
            {/* Header row */}
            {draft.columns.map((name, c) => (
              <div
                key={`h-${c}`}
                className="group relative flex items-center border-b border-r border-white/[0.06]"
              >
                <input
                  value={name}
                  aria-label={`Column ${c + 1} name`}
                  onChange={(e) => setColumnName(c, e.target.value)}
                  className={`${cellInput} text-white/40 focus:text-white/70`}
                />
                {/* Hover ✕ — kills the whole column */}
                {draft.columns.length > 1 && (
                  <button
                    aria-label={`Remove column ${name || c + 1}`}
                    onClick={() => removeColumn(c)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-[var(--ds-radius-control,8px)] text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              aria-label="Add column"
              onClick={addColumn}
              className="flex items-center justify-center border-b border-white/[0.06] text-white/30 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Data + phantom rows */}
            {Array.from({ length: draft.rows.length + blanks }).map((_, r) =>
              [
                ...draft.columns.map((_, c) => (
                  <div key={`c-${r}-${c}`} className="border-b border-r border-white/[0.06]">
                    <input
                      value={draft.rows[r]?.[c] ?? ''}
                      aria-label={`Row ${r + 1} ${draft.columns[c] || `column ${c + 1}`}`}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className={`${cellInput} text-white/85`}
                    />
                  </div>
                )),
                <div key={`x-${r}`} className="border-b border-white/[0.06]" />,
              ],
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => setDraft((d) => ({ ...d, rows: [] }))}
            className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear data
          </button>
          <span className="flex-1" />
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-[13px] text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/10 rounded-[var(--ds-radius-control,8px)] transition-colors mr-2"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3.5 py-1.5 text-[13px] text-[#1c1c1c] bg-white hover:bg-white/90 rounded-[var(--ds-radius-control,8px)] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
