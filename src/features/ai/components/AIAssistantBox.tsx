/**
 * AIAssistantBox — a reusable AI input box that can:
 * 1. Accept text prompts, file uploads, and documents
 * 2. Analyze the inputs using AI
 * 3. Auto-fill form fields based on the analysis
 * 4. Show the user what it extracted for confirmation
 *
 * Can be embedded in any setup flow (Logo Presentation, Brand Onboarding, etc.)
 */
import { useState, useRef } from 'react';
import { Sparkles, Upload, FileText, Image, X, Send, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export interface AIExtractedField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'list' | 'color' | 'image';
  confidence: 'high' | 'medium' | 'low';
}

export interface AIAssistantConfig {
  title: string;
  description: string;
  hints: string[];
  acceptedFiles?: string; // e.g. "image/*,.pdf,.doc,.docx"
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'list' | 'color' | 'image' }[];
}

interface AIAssistantBoxProps {
  config: AIAssistantConfig;
  onExtracted: (fields: AIExtractedField[]) => void;
  brandColor?: string;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  text?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AIAssistantBox({ config, onExtracted, brandColor = '#7231FF' }: AIAssistantBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [extracted, setExtracted] = useState<AIExtractedField[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const isImage = file.type.startsWith('image/');
        const uploaded: UploadedFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: isImage ? reader.result as string : undefined,
          text: !isImage ? reader.result as string : undefined,
        };
        setFiles(prev => [...prev, uploaded]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!prompt.trim() && files.length === 0) {
      toast.error('Add some input — a brief, logos, or documents');
      return;
    }

    setProcessing(true);

    // Simulate AI analysis (in production, this would call Claude API)
    await new Promise(r => setTimeout(r, 2000));

    // Extract data from the prompt and files
    const results: AIExtractedField[] = [];

    config.fields.forEach(field => {
      let value = '';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // Smart extraction based on field type and prompt content
      if (field.type === 'image') {
        const imageFile = files.find(f => f.type.startsWith('image/'));
        if (imageFile?.dataUrl) {
          value = imageFile.dataUrl;
          confidence = 'high';
        }
      } else if (field.type === 'color') {
        // Extract hex colors from prompt
        const colorMatch = prompt.match(/#[0-9A-Fa-f]{6}/);
        if (colorMatch) {
          value = colorMatch[0];
          confidence = 'high';
        }
      } else if (field.type === 'list') {
        // Extract comma-separated or bullet-pointed items
        const lines = prompt.split(/[\n,•\-]/).map(s => s.trim()).filter(Boolean);
        if (lines.length > 1) {
          value = lines.slice(0, 4).join('\n');
          confidence = 'medium';
        }
      } else {
        // Text extraction — use smart heuristics based on field key
        const lowerPrompt = prompt.toLowerCase();
        const fieldKey = field.key.toLowerCase();

        if (fieldKey.includes('name') || fieldKey.includes('title')) {
          // Extract brand/concept name
          const nameMatch = prompt.match(/(?:called|named|name is|brand:?\s*)\s*["']?([A-Z][a-zA-Z\s]+)["']?/i);
          if (nameMatch) { value = nameMatch[1].trim(); confidence = 'high'; }
          else {
            // Use first capitalized word/phrase
            const caps = prompt.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/);
            if (caps) { value = caps[0]; confidence = 'medium'; }
          }
        } else if (fieldKey.includes('brief') || fieldKey.includes('description') || fieldKey.includes('rationale')) {
          // Use the full prompt as the brief
          value = prompt.slice(0, 200);
          confidence = 'high';
        } else if (fieldKey.includes('personality') || fieldKey.includes('trait') || fieldKey.includes('tone')) {
          // Extract adjectives
          const adjectives = prompt.match(/\b(modern|bold|elegant|minimal|premium|professional|creative|innovative|trustworthy|confident|clean|sharp|sophisticated|playful|serious|warm|cool|technical|human)\b/gi);
          if (adjectives) { value = [...new Set(adjectives)].slice(0, 5).join(', '); confidence = 'high'; }
        } else if (fieldKey.includes('direction') || fieldKey.includes('style')) {
          const styles = prompt.match(/\b(geometric|angular|flowing|dynamic|structured|minimal|bold|organic|modern|classic|retro|futuristic)\b/gi);
          if (styles) { value = styles.slice(0, 3).join(' & '); confidence = 'medium'; }
        } else if (fieldKey.includes('why') || fieldKey.includes('works') || fieldKey.includes('point')) {
          // Generate points from context
          const sentences = prompt.split(/[.!]/).map(s => s.trim()).filter(s => s.length > 10);
          value = sentences.slice(0, 4).join('\n');
          confidence = 'low';
        }

        // Fallback: use document text if available
        if (!value && files.length > 0) {
          const textFile = files.find(f => f.text);
          if (textFile?.text) {
            value = textFile.text.slice(0, 150);
            confidence = 'low';
          }
        }
      }

      if (value) {
        results.push({ key: field.key, label: field.label, value, type: field.type, confidence });
      }
    });

    setExtracted(results);
    setProcessing(false);

    if (results.length === 0) {
      toast.error('Could not extract data — try adding more details');
    } else {
      toast.success(`Extracted ${results.length} fields from your input`);
    }
  };

  const handleConfirm = () => {
    if (extracted) {
      onExtracted(extracted);
      setIsOpen(false);
      setExtracted(null);
      setPrompt('');
      setFiles([]);
      toast.success('Fields auto-filled from AI analysis');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all hover:shadow-lg group"
        style={{ borderColor: `${brandColor}30`, backgroundColor: `${brandColor}05` }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${brandColor}15` }}>
          <Sparkles className="h-4 w-4" style={{ color: brandColor }} />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-white/70 group-hover:text-white/90">{config.title}</p>
          <p className="text-[10px] text-white/30">{config.description}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-white/20" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${brandColor}25`, backgroundColor: `${brandColor}04` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${brandColor}15` }}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: brandColor }} />
          <span className="text-sm font-semibold text-white/70">{config.title}</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Hints */}
        <div className="flex flex-wrap gap-1.5">
          {config.hints.map(hint => (
            <span key={hint} className="px-2 py-0.5 rounded-full text-[9px] font-medium border" style={{ borderColor: `${brandColor}20`, color: `${brandColor}aa` }}>
              {hint}
            </span>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Paste your brief, describe your brand, or just tell me what you need..."
          rows={3}
          className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/15 resize-none"
        />

        {/* File uploads */}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" multiple accept={config.acceptedFiles || 'image/*,.pdf,.doc,.docx,.txt'} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-colors">
            <Upload className="h-3 w-3" /> Upload Files
          </button>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] text-xs text-white/50">
              {f.type.startsWith('image/') ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="truncate max-w-[100px]">{f.name}</span>
              <span className="text-white/20">{formatSize(f.size)}</span>
              <button onClick={() => removeFile(i)} className="p-0.5 hover:text-red-400"><X className="h-2.5 w-2.5" /></button>
            </div>
          ))}
        </div>

        {/* Analyze button */}
        {!extracted && (
          <button onClick={handleAnalyze} disabled={processing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: brandColor }}>
            {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze & Auto-Fill</>}
          </button>
        )}

        {/* Extracted results */}
        {extracted && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Extracted Fields</p>
            {extracted.map(field => (
              <div key={field.key} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${field.confidence === 'high' ? 'bg-green-400' : field.confidence === 'medium' ? 'bg-yellow-400' : 'bg-orange-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">{field.label}</p>
                  <p className="text-xs text-white/60 truncate">{field.type === 'image' ? '📷 Image uploaded' : field.value}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: brandColor }}>
                <Check className="h-3.5 w-3.5" /> Apply to Fields
              </button>
              <button onClick={() => setExtracted(null)} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 border border-white/[0.06]">
                Retry
              </button>
            </div>

            <p className="text-[9px] text-white/15 text-center">
              <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> High</span>
              <span className="mx-2 inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /> Medium</span>
              <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Low confidence</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
