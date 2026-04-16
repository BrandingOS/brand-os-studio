import { useCallback } from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { toast } from 'sonner';
import type { GuidelineSettings, GuidelineSlide } from '../types/guidelines';

export const useGuidelinesEditor = () => {
  const store = useGuidelinesStore();

  const exportGuidelines = useCallback(async (format: 'pdf' | 'png' | 'jpg') => {
    toast.info(`Export as ${format.toUpperCase()} — coming soon.`);
  }, []);

  const saveAsTemplate = useCallback(async (templateName: string) => {
    toast.info(`Save "${templateName}" as template — coming soon.`);
  }, []);

  const generateSlideFromAI = useCallback(async (slideType: string, prompt: string) => {
    toast.info(`AI slide generation — coming soon.`);
  }, []);

  const previewSlide = useCallback((slideId: string) => {
    const slideIndex = store.slides.findIndex(slide => slide.id === slideId);
    if (slideIndex !== -1) {
      store.setCurrentSlide(slideIndex);
    }
  }, [store]);

  const duplicateSlide = useCallback((slideId: string) => {
    const slide = store.slides.find(s => s.id === slideId);
    if (slide) {
      const newSlide: GuidelineSlide = {
        ...slide,
        id: `${slide.id}-copy-${Date.now()}`,
        title: `${slide.title} (Copy)`,
        order: slide.order + 0.5,
      };
      store.addSlide(newSlide);
    }
  }, [store]);

  const toggleSlideVisibility = useCallback((slideId: string) => {
    const slide = store.slides.find(s => s.id === slideId);
    if (slide) {
      store.updateSlide(slideId, { enabled: !slide.enabled });
    }
  }, [store]);

  return {
    // Store state
    ...store,
    
    // Additional actions
    exportGuidelines,
    saveAsTemplate,
    generateSlideFromAI,
    previewSlide,
    duplicateSlide,
    toggleSlideVisibility,
  };
};