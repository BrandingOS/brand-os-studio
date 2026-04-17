import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateBrandVariations,
  regenerateSingleVariation,
} from '../services/brandGenerator';
import type { GeneratedBrand } from '../types';

interface UseBrandGeneratorResult {
  variations: GeneratedBrand[];
  isGenerating: boolean;
  error: string | null;
  generate: (prompt: string) => Promise<void>;
  shuffleOne: (index: number) => Promise<void>;
}

export function useBrandGenerator(): UseBrandGeneratorResult {
  const [variations, setVariations] = useState<GeneratedBrand[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef<string>('');

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const generate = useCallback(async (prompt: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    promptRef.current = prompt;
    setIsGenerating(true);
    setError(null);
    setVariations([]);
    try {
      const results = await generateBrandVariations(prompt, controller.signal);
      setVariations(results);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      console.error(err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const shuffleOne = useCallback(async (index: number) => {
    if (!promptRef.current) return;
    try {
      const next = await regenerateSingleVariation(promptRef.current);
      setVariations((list) => {
        const copy = [...list];
        copy[index] = next;
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  return { variations, isGenerating, error, generate, shuffleOne };
}
