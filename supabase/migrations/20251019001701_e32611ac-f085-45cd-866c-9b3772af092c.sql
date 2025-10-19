-- Create guideline_presentations table
CREATE TABLE IF NOT EXISTS public.guideline_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Presentation metadata
  title TEXT NOT NULL DEFAULT 'Brand Guidelines',
  description TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Layout configuration
  layout_type TEXT DEFAULT 'canvas',
  theme_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Slides/Sections
  slides JSONB DEFAULT '[]'::jsonb,
  slide_order TEXT[] DEFAULT '{}',
  
  -- Export settings
  export_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- Create guideline_slides table
CREATE TABLE IF NOT EXISTS public.guideline_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.guideline_presentations(id) ON DELETE CASCADE,
  
  -- Slide metadata
  slide_type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Content
  content JSONB DEFAULT '{}'::jsonb,
  
  -- Visibility
  is_enabled BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  
  -- Styling
  background_color TEXT,
  text_color TEXT,
  custom_styles JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES public.guideline_presentations(id) ON DELETE CASCADE,
  CONSTRAINT unique_presentation_order UNIQUE (presentation_id, order_index)
);

-- Indexes for guideline_presentations
CREATE INDEX idx_guideline_presentations_brand_id ON public.guideline_presentations(brand_id);
CREATE INDEX idx_guideline_presentations_user_id ON public.guideline_presentations(user_id);
CREATE INDEX idx_guideline_presentations_published ON public.guideline_presentations(is_published);

-- Indexes for guideline_slides
CREATE INDEX idx_guideline_slides_presentation_id ON public.guideline_slides(presentation_id);
CREATE INDEX idx_guideline_slides_order ON public.guideline_slides(presentation_id, order_index);
CREATE INDEX idx_guideline_slides_type ON public.guideline_slides(slide_type);

-- Enable RLS
ALTER TABLE public.guideline_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guideline_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guideline_presentations
CREATE POLICY "Users can view their own presentations"
  ON public.guideline_presentations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presentations"
  ON public.guideline_presentations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presentations"
  ON public.guideline_presentations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presentations"
  ON public.guideline_presentations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for guideline_slides
CREATE POLICY "Users can view slides of their presentations"
  ON public.guideline_slides FOR SELECT
  USING (
    presentation_id IN (
      SELECT id FROM public.guideline_presentations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create slides in their presentations"
  ON public.guideline_slides FOR INSERT
  WITH CHECK (
    presentation_id IN (
      SELECT id FROM public.guideline_presentations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update slides in their presentations"
  ON public.guideline_slides FOR UPDATE
  USING (
    presentation_id IN (
      SELECT id FROM public.guideline_presentations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete slides in their presentations"
  ON public.guideline_slides FOR DELETE
  USING (
    presentation_id IN (
      SELECT id FROM public.guideline_presentations WHERE user_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER set_updated_at_guideline_presentations
  BEFORE UPDATE ON public.guideline_presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_guideline_slides
  BEFORE UPDATE ON public.guideline_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();