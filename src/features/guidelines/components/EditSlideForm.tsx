import React from 'react';
import type { GuidelineSlide } from '../types/guidelines';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EditSlideFormProps {
  slide: GuidelineSlide;
}

export const EditSlideForm: React.FC<EditSlideFormProps> = ({ slide }) => {
  const updateSlide = useGuidelinesStore(state => state.updateSlide);

  const handleChange = (
    field: keyof GuidelineSlide['content'],
    value: string
  ) => {
    updateSlide(slide.id, {
      content: { ...slide.content, [field]: value },
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="grid gap-1">
        <Label htmlFor="slide-title">Title</Label>
        <Input
          id="slide-title"
          value={(slide.content as any).title || ''}
          onChange={e => handleChange('title', e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="slide-subtitle">Subtitle</Label>
        <Input
          id="slide-subtitle"
          value={(slide.content as any).subtitle || ''}
          onChange={e => handleChange('subtitle', e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="slide-body">Body</Label>
        <Textarea
          id="slide-body"
          value={(slide.content as any).body || ''}
          onChange={e => handleChange('body', e.target.value)}
        />
      </div>
    </div>
  );
